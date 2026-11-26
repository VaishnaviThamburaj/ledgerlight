/**
 * Turns a reader's raw answer into our standard invoice form.
 * Readers name things differently; this is the one translator they all share.
 */
import { z } from "zod";
import type { ConfidenceMap, ExtractionResult, InvoiceData, LineItem } from "@/lib/types";

const text = (description: string) =>
  z.object({
    value: z.string().nullable().describe(description),
    confidence: z.number().describe("0 to 1. How sure you are that the value was read correctly."),
  });

const amount = (description: string) =>
  z.object({
    value: z.number().nullable().describe(description),
    confidence: z.number().describe("0 to 1. How sure you are that the value was read correctly."),
  });

/** The exact answer shape we ask an AI reader to fill in. */
export const RawInvoiceSchema = z.object({
  document_type: z.enum(["invoice", "credit_memo", "quote", "packing_slip", "statement", "other"]),
  vendor_name: text("Company that issued the invoice (the seller / remit-to)."),
  vendor_address: text("Vendor's street address, city, state and ZIP on one line."),
  invoice_number: text("Invoice number exactly as printed."),
  invoice_date: text("Invoice date as YYYY-MM-DD."),
  due_date: text("Due date as YYYY-MM-DD, only if printed."),
  po_number: text("Customer purchase order (PO) number, only if printed. Null if blank."),
  customer_name: text("Bill-to / sold-to customer company name."),
  payment_terms: text("Payment terms, e.g. 'Net 30' or '2% 10 Net 30'."),
  currency: z.string().describe("ISO currency code, e.g. USD or CAD."),
  subtotal: amount("Merchandise subtotal before tax and freight, only if printed."),
  tax: amount("Total sales tax, only if printed."),
  freight: amount("Freight, shipping, delivery, fuel surcharge and handling combined, only if printed."),
  total: amount("Final invoice total / amount due."),
  line_items: z.array(
    z.object({
      part_number: z.string().nullable().describe("Vendor catalog / SKU / item number. Use the manufacturer part number if that is the only one."),
      description: z.string().nullable(),
      quantity: z.number().nullable().describe("Quantity shipped/invoiced (not ordered or backordered)."),
      unit: z.string().nullable().describe("Unit of measure as printed: EA, FT, BX, PK, RL, LB, C, M, etc."),
      unit_price: z.number().nullable(),
      price_per: z.number().describe("1 if the price is per each unit. 100 if priced per C (hundred). 1000 if priced per M (thousand)."),
      amount: z.number().nullable().describe("Extended line amount exactly as printed."),
      confidence: z.number().describe("0 to 1. How sure you are about this whole line."),
    }),
  ),
  reviewer_notes: z
    .array(z.string())
    .describe("Short notes a bookkeeper should know: cut-off pages, handwriting, stamps, backorders, multiple invoices in one file. Empty if none."),
});

export type RawInvoice = z.infer<typeof RawInvoiceSchema>;

let counter = 0;
export function newLineId(): string {
  counter += 1;
  return `l${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const clean = (s: string | null | undefined) => {
  if (s === null || s === undefined) return null;
  const t = s.trim();
  return t === "" ? null : t;
};

const clamp = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export function normalizeRawInvoice(raw: RawInvoice, provider: string, model?: string): ExtractionResult {
  const confidence: ConfidenceMap = {};
  const pickText = (key: keyof InvoiceData, f: { value: string | null; confidence: number }) => {
    const v = clean(f.value);
    if (v !== null) confidence[key] = clamp(f.confidence);
    return v;
  };
  const pickNum = (key: keyof InvoiceData, f: { value: number | null; confidence: number }) => {
    const v = typeof f.value === "number" && Number.isFinite(f.value) ? f.value : null;
    if (v !== null) confidence[key] = clamp(f.confidence);
    return v;
  };

  const lineItems: LineItem[] = raw.line_items.map((l) => {
    const id = newLineId();
    confidence[`line:${id}`] = clamp(l.confidence);
    return {
      id,
      partNumber: clean(l.part_number),
      description: clean(l.description),
      quantity: l.quantity,
      unit: clean(l.unit)?.toUpperCase() ?? null,
      unitPrice: l.unit_price,
      pricePer: [1, 100, 1000].includes(l.price_per) ? l.price_per : 1,
      amount: l.amount,
    };
  });

  const data: InvoiceData = {
    documentType: raw.document_type,
    vendorName: pickText("vendorName", raw.vendor_name),
    vendorAddress: pickText("vendorAddress", raw.vendor_address),
    invoiceNumber: pickText("invoiceNumber", raw.invoice_number),
    invoiceDate: pickText("invoiceDate", raw.invoice_date),
    dueDate: pickText("dueDate", raw.due_date),
    poNumber: pickText("poNumber", raw.po_number),
    customerName: pickText("customerName", raw.customer_name),
    paymentTerms: pickText("paymentTerms", raw.payment_terms),
    currency: clean(raw.currency)?.toUpperCase() ?? "USD",
    subtotal: pickNum("subtotal", raw.subtotal),
    tax: pickNum("tax", raw.tax),
    freight: pickNum("freight", raw.freight),
    total: pickNum("total", raw.total),
    lineItems,
  };

  return { data, confidence, provider, model, notes: raw.reviewer_notes ?? [] };
}
