/**
 * THE AUDITOR.
 *
 * Plain code (no AI) that double-checks what the reader copied off the PDF.
 * Every rule here is a simple, explainable test: either the math works or it
 * doesn't. Each problem becomes an "issue" with a plain-English message that
 * a bookkeeper can act on.
 *
 * The same function runs on the server (when a document first arrives) and
 * in the browser (instantly, every time someone edits a field), so the
 * traffic lights always match the numbers on screen.
 */
import { formatMoney, round2, sameMoney } from "@/lib/money";
import type {
  ConfidenceMap,
  FieldKey,
  InvoiceData,
  InvoiceSummary,
  LineField,
  LineItem,
} from "@/lib/types";

export type Level = "ok" | "warning" | "error";

export interface Issue {
  /** What the issue is attached to: a FieldKey, "lineItems", or "line:<id>:<field>". */
  target: string;
  level: "warning" | "error";
  title: string;
  message: string;
  /** Machine name of the rule, handy for analytics and tests. */
  rule: string;
}

export interface ValidationContext {
  /** Other invoices already in the system, for duplicate detection. */
  otherInvoices?: InvoiceSummary[];
  /** Targets a human has edited or marked "looks right" (skip low-confidence flags). */
  verifiedTargets?: Iterable<string>;
  /** Today's date as YYYY-MM-DD. Injected so results are repeatable in tests. */
  today?: string;
}

export interface ValidationResult {
  issues: Issue[];
  errors: number;
  warnings: number;
  byTarget: Record<string, Issue[]>;
}

/** Confidence below this is red; below WARN is yellow. */
export const CONFIDENCE_ERROR = 0.5;
export const CONFIDENCE_WARN = 0.8;

export const FIELD_LABELS: Record<FieldKey, string> = {
  vendorName: "Vendor name",
  vendorAddress: "Vendor address",
  invoiceNumber: "Invoice number",
  invoiceDate: "Invoice date",
  dueDate: "Due date",
  poNumber: "PO number",
  customerName: "Bill-to customer",
  paymentTerms: "Payment terms",
  subtotal: "Subtotal",
  tax: "Sales tax",
  freight: "Freight / shipping",
  total: "Invoice total",
};

export const lineTarget = (id: string, field: LineField) => `line:${id}:${field}`;

const REQUIRED: FieldKey[] = ["vendorName", "invoiceNumber", "invoiceDate", "total"];

export function validateInvoice(
  data: InvoiceData,
  confidence: ConfidenceMap = {},
  ctx: ValidationContext = {},
): ValidationResult {
  const issues: Issue[] = [];
  const verified = new Set(ctx.verifiedTargets ?? []);
  const today = ctx.today ?? new Date().toISOString().slice(0, 10);
  const money = (n: number) => formatMoney(n, data.currency || "USD");

  const add = (issue: Issue) => issues.push(issue);

  // ---------------------------------------------------------------- 1. Document type
  if (data.documentType && data.documentType !== "invoice") {
    const kind: Record<string, string> = {
      credit_memo: "a credit memo",
      quote: "a quote, not a bill",
      packing_slip: "a packing slip, not a bill",
      statement: "an account statement, not a single invoice",
      other: "something other than an invoice",
    };
    add({
      target: "documentType",
      level: data.documentType === "credit_memo" ? "warning" : "error",
      title: "Not a regular invoice",
      message: `This document looks like ${kind[data.documentType] ?? "a non-invoice"}. Make sure it should be entered as a bill.`,
      rule: "document_type",
    });
  }

  // ---------------------------------------------------------------- 2. Required fields
  for (const key of REQUIRED) {
    const v = data[key];
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) {
      add({
        target: key,
        level: "error",
        title: `${FIELD_LABELS[key]} is missing`,
        message: `We couldn't find the ${FIELD_LABELS[key].toLowerCase()} on this document. Please type it in from the PDF.`,
        rule: "required",
      });
    }
  }

  if (!data.poNumber || data.poNumber.trim() === "") {
    add({
      target: "poNumber",
      level: "warning",
      title: "No PO number",
      message:
        "Distributor invoices usually reference your purchase order. Without it, this bill can't be matched to what was ordered. Check the PDF or your PO log.",
      rule: "po_missing",
    });
  }

  if (!data.dueDate && !data.paymentTerms) {
    add({
      target: "dueDate",
      level: "warning",
      title: "No due date or terms",
      message: "We couldn't find a due date or payment terms (like Net 30). Without one, this bill may be paid late.",
      rule: "due_missing",
    });
  }

  // ---------------------------------------------------------------- 3. Low confidence
  for (const [target, score] of Object.entries(confidence)) {
    if (target.startsWith("line:")) continue; // handled per line below
    if (verified.has(target)) continue;
    const key = target as FieldKey;
    const v = data[key];
    const empty = v === null || v === undefined || (typeof v === "string" && v.trim() === "");
    if (empty) continue; // "missing" rules already cover it
    if (score < CONFIDENCE_WARN) {
      add({
        target,
        level: score < CONFIDENCE_ERROR ? "error" : "warning",
        title: "Hard to read",
        message: `The reader was only ${Math.round(score * 100)}% sure about this value (blurry, handwritten or unclear). Compare it with the PDF, then click "Looks right".`,
        rule: "low_confidence",
      });
    }
  }

  // ---------------------------------------------------------------- 4. Line items
  if (data.lineItems.length === 0) {
    add({
      target: "lineItems",
      level: "error",
      title: "No line items",
      message: "We didn't find any line items. Add each product line from the PDF so the totals can be checked.",
      rule: "no_lines",
    });
  }

  data.lineItems.forEach((line, index) => checkLine(line, index + 1, confidence, verified, add, money));

  // ---------------------------------------------------------------- 5. Totals
  const lineSum = round2(
    data.lineItems.reduce((sum, l) => sum + (typeof l.amount === "number" ? l.amount : 0), 0),
  );
  const allLinesHaveAmounts = data.lineItems.length > 0 && data.lineItems.every((l) => typeof l.amount === "number");

  if (data.subtotal !== null && allLinesHaveAmounts && !sameMoney(lineSum, data.subtotal)) {
    const diff = round2(data.subtotal - lineSum);
    add({
      target: "subtotal",
      level: "error",
      title: "Lines don't add up to the subtotal",
      message: `The line items add up to ${money(lineSum)}, but the subtotal says ${money(data.subtotal)} (${diff > 0 ? "over" : "under"} by ${money(Math.abs(diff))}). A line may be missing, duplicated or misread.`,
      rule: "subtotal_mismatch",
    });
  }

  if (data.total !== null) {
    const base = data.subtotal ?? (allLinesHaveAmounts ? lineSum : null);
    if (base !== null) {
      const expected = round2(base + (data.tax ?? 0) + (data.freight ?? 0));
      if (!sameMoney(expected, data.total)) {
        const diff = round2(data.total - expected);
        const parts = [`${data.subtotal !== null ? "subtotal" : "line items"} ${money(base)}`];
        if (data.tax) parts.push(`tax ${money(data.tax)}`);
        if (data.freight) parts.push(`freight ${money(data.freight)}`);
        add({
          target: "total",
          level: "error",
          title: "Total doesn't match",
          message: `${capitalize(parts.join(" + "))} = ${money(expected)}, but the invoice total says ${money(data.total)} (${diff > 0 ? "over" : "under"} by ${money(Math.abs(diff))}). Check for a missed fee, discount or misread number.`,
          rule: "total_mismatch",
        });
      }
    }
    if (data.total <= 0 && data.documentType === "invoice") {
      add({
        target: "total",
        level: "warning",
        title: "Zero or negative total",
        message: "The total is zero or negative. If this is a credit memo, change the document type so it isn't paid as a bill.",
        rule: "total_nonpositive",
      });
    }
  }

  if (data.tax !== null) {
    const base = data.subtotal ?? lineSum;
    if (data.tax < 0) {
      add({ target: "tax", level: "error", title: "Negative tax", message: "Sales tax can't be negative. Check the PDF.", rule: "tax_negative" });
    } else if (base > 0 && data.tax / base > 0.15) {
      add({
        target: "tax",
        level: "warning",
        title: "Tax looks high",
        message: `Tax is ${Math.round((data.tax / base) * 100)}% of the subtotal, which is unusually high for US sales tax. It may include freight or another fee.`,
        rule: "tax_high",
      });
    }
  }

  // ---------------------------------------------------------------- 6. Dates
  checkDate("invoiceDate", data.invoiceDate, today, add);
  checkDate("dueDate", data.dueDate, today, add, true);
  if (isIsoDate(data.invoiceDate) && isIsoDate(data.dueDate) && data.dueDate! < data.invoiceDate!) {
    add({
      target: "dueDate",
      level: "warning",
      title: "Due before invoice date",
      message: "The due date is earlier than the invoice date. One of the two dates was probably misread.",
      rule: "due_before_invoice",
    });
  }

  // ---------------------------------------------------------------- 7. Duplicates
  if (data.vendorName && data.invoiceNumber && ctx.otherInvoices?.length) {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const dupe = ctx.otherInvoices.find(
      (o) =>
        o.vendorName &&
        o.invoiceNumber &&
        norm(o.vendorName) === norm(data.vendorName!) &&
        norm(o.invoiceNumber) === norm(data.invoiceNumber!),
    );
    if (dupe) {
      add({
        target: "invoiceNumber",
        level: "error",
        title: "Possible duplicate",
        message: `Invoice #${data.invoiceNumber} from ${data.vendorName} is already in the system${dupe.status === "approved" ? " and was approved" : ""}. Paying the same bill twice is the most expensive mistake in accounts payable.`,
        rule: "duplicate",
      });
    }
  }

  const byTarget: Record<string, Issue[]> = {};
  for (const issue of issues) (byTarget[issue.target] ??= []).push(issue);

  return {
    issues,
    byTarget,
    errors: issues.filter((i) => i.level === "error").length,
    warnings: issues.filter((i) => i.level === "warning").length,
  };
}

/** The colour of the light for one target. */
export function levelOf(result: ValidationResult, target: string): Level {
  const list = result.byTarget[target];
  if (!list?.length) return "ok";
  return list.some((i) => i.level === "error") ? "error" : "warning";
}

/** The worst colour across every part of one line. */
export function lineLevel(result: ValidationResult, lineId: string): Level {
  let worst: Level = "ok";
  for (const [target, list] of Object.entries(result.byTarget)) {
    if (!target.startsWith(`line:${lineId}:`)) continue;
    if (list.some((i) => i.level === "error")) return "error";
    worst = "warning";
  }
  return worst;
}

// ------------------------------------------------------------------ helpers

function checkLine(
  line: LineItem,
  n: number,
  confidence: ConfidenceMap,
  verified: Set<string>,
  add: (i: Issue) => void,
  money: (n: number) => string,
) {
  const t = (f: LineField) => lineTarget(line.id, f);
  const missing: string[] = [];
  if (line.quantity === null) missing.push("quantity");
  if (line.unitPrice === null) missing.push("unit price");
  if (line.amount === null) missing.push("line amount");

  if (!line.description && !line.partNumber) {
    add({ target: t("description"), level: "error", title: `Line ${n}: no description`, message: `Line ${n} has no description or part number. Type in what was bought.`, rule: "line_empty" });
  } else if (!line.partNumber) {
    add({
      target: t("partNumber"),
      level: "warning",
      title: `Line ${n}: no part number`,
      message: `Line ${n} has no catalog / part number, so it can't be matched to your inventory automatically.`,
      rule: "line_no_part",
    });
  }

  if (missing.length) {
    const field: LineField = line.quantity === null ? "quantity" : line.unitPrice === null ? "unitPrice" : "amount";
    add({
      target: t(field),
      level: line.amount === null ? "error" : "warning",
      title: `Line ${n}: missing ${missing.join(" and ")}`,
      message: `Line ${n} is missing its ${missing.join(" and ")}, so we can't check its math. Fill it in from the PDF.`,
      rule: "line_missing",
    });
  }

  if (line.quantity !== null && line.unitPrice !== null && line.amount !== null) {
    const per = line.pricePer > 0 ? line.pricePer : 1;
    const expected = round2((line.quantity * line.unitPrice) / per);
    if (!sameMoney(expected, line.amount)) {
      const diff = round2(line.amount - expected);
      let hint = "";
      for (const alt of [1, 100, 1000]) {
        if (alt !== per && sameMoney(round2((line.quantity * line.unitPrice) / alt), line.amount)) {
          hint =
            alt === 1
              ? ' It would match if the price were "per each". Change "Per" to 1.'
              : ` It would match if the price were per ${alt === 100 ? "100 (C)" : "1,000 (M)"}, which is common for wire and fittings. Change "Per" to ${alt}.`;
        }
      }
      const perText = per === 1 ? "" : ` ÷ ${per}`;
      add({
        target: t("amount"),
        level: "error",
        title: `Line ${n}: math doesn't work`,
        message: `${fmtQty(line.quantity)} × ${money(line.unitPrice)}${perText} = ${money(expected)}, but the line says ${money(line.amount)} (${diff > 0 ? "over" : "under"} by ${money(Math.abs(diff))}).${hint}`,
        rule: "line_math",
      });
    }
  }

  if (line.quantity !== null && line.quantity < 0) {
    add({
      target: t("quantity"),
      level: "warning",
      title: `Line ${n}: negative quantity`,
      message: `Line ${n} has a negative quantity. That usually means a return or credit. Confirm it's intended.`,
      rule: "line_negative",
    });
  }

  const key = `line:${line.id}`;
  const score = confidence[key];
  if (score !== undefined && score < CONFIDENCE_WARN && !verified.has(key)) {
    add({
      target: t("description"),
      level: score < CONFIDENCE_ERROR ? "error" : "warning",
      title: `Line ${n}: hard to read`,
      message: `The reader was only ${Math.round(score * 100)}% sure about line ${n}. Compare it with the PDF.`,
      rule: "line_low_confidence",
    });
  }
}

function checkDate(
  key: "invoiceDate" | "dueDate",
  value: string | null,
  today: string,
  add: (i: Issue) => void,
  futureOk = false,
) {
  if (!value) return;
  if (!isIsoDate(value)) {
    add({ target: key, level: "error", title: "Not a valid date", message: `"${value}" isn't a real calendar date. Enter it as shown on the PDF.`, rule: "date_invalid" });
    return;
  }
  if (futureOk) return;
  if (value > today) {
    add({ target: key, level: "warning", title: "Date is in the future", message: "The invoice date is after today. The year or month may have been misread.", rule: "date_future" });
  } else {
    const ageDays = (Date.parse(today) - Date.parse(value)) / 86_400_000;
    if (ageDays > 365) {
      add({ target: key, level: "warning", title: "Very old invoice", message: "This invoice is more than a year old. Check the year, and whether it was already paid.", rule: "date_old" });
    }
  }
}

export function isIsoDate(value: string | null | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function fmtQty(q: number) {
  return Number.isInteger(q) ? q.toLocaleString("en-US") : String(q);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
