/**
 * THE WORKFLOW: what happens to a document, step by step.
 *
 *   arrive -> save original PDF -> AI reads it -> auditor checks it
 *          -> human reviews/edits -> human approves -> ready to export
 *
 * The web routes call these functions; they don't contain business logic.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { extractDocument } from "@/lib/extraction";
import { getStore } from "@/lib/storage";
import type { InvoiceData, InvoiceRecord, InvoiceSummary } from "@/lib/types";
import { validateInvoice, type ValidationResult } from "@/lib/validation/validate";

export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export class UserFacingError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export function looksLikePdf(bytes: Buffer) {
  return bytes.subarray(0, 5).toString("latin1") === "%PDF-";
}

/** A brand-new document arrives: store it, read it, save the record. */
export async function ingestDocument(input: { pdf: Buffer; fileName: string; isSample?: boolean }) {
  if (input.pdf.length === 0) throw new UserFacingError("That file is empty.");
  if (input.pdf.length > MAX_PDF_BYTES) throw new UserFacingError("That PDF is larger than 20 MB. Try compressing or splitting it.");
  if (!looksLikePdf(input.pdf)) throw new UserFacingError("That file isn't a PDF. Please upload a .pdf file.");

  const extraction = await extractDocument(input);

  const store = getStore();
  const id = randomUUID();
  const filePath = await store.saveFile(id, input.pdf);
  const now = new Date().toISOString();
  const record: InvoiceRecord = {
    id,
    fileName: input.fileName,
    filePath,
    status: "needs_review",
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
    approvalNote: null,
    data: extraction.data,
    originalData: structuredClone(extraction.data),
    extraction: {
      provider: extraction.provider,
      model: extraction.model,
      confidence: extraction.confidence,
      notes: extraction.notes,
    },
    verifiedTargets: [],
  };
  await store.create(record);
  return record;
}

export function summarize(r: InvoiceRecord): InvoiceSummary {
  return { id: r.id, status: r.status, vendorName: r.data.vendorName, invoiceNumber: r.data.invoiceNumber, approvedAt: r.approvedAt };
}

/** Everything else in the system, for duplicate checks. */
export async function otherInvoices(excludeId: string): Promise<InvoiceSummary[]> {
  return (await getStore().list()).filter((r) => r.id !== excludeId).map(summarize);
}

export async function checkRecord(record: InvoiceRecord, data: InvoiceData = record.data, verified = record.verifiedTargets): Promise<ValidationResult> {
  return validateInvoice(data, record.extraction.confidence, {
    otherInvoices: await otherInvoices(record.id),
    verifiedTargets: verified,
  });
}

async function mustGet(id: string) {
  const record = await getStore().get(id);
  if (!record) throw new UserFacingError("We couldn't find that document. It may have been deleted.", 404);
  return record;
}

/** Save the human's edits without approving. */
export async function saveDraft(id: string, data: InvoiceData, verifiedTargets: string[]) {
  const record = await mustGet(id);
  if (record.status === "approved") throw new UserFacingError("This invoice is already approved. Reopen it before editing.", 409);
  const updated: InvoiceRecord = { ...record, data: sanitize(data), verifiedTargets: uniq(verifiedTargets), updatedAt: new Date().toISOString() };
  await getStore().update(updated);
  return updated;
}

/**
 * Approve. Red flags block approval unless the reviewer types a reason,
 * which is stored with the record as an audit note.
 */
export async function approve(id: string, data: InvoiceData, verifiedTargets: string[], note: string | null) {
  const record = await mustGet(id);
  const clean = sanitize(data);
  const verified = uniq(verifiedTargets);
  const result = await checkRecord(record, clean, verified);
  const reason = note?.trim() || null;
  if (result.errors > 0 && !reason) {
    throw new UserFacingError(
      `There ${result.errors === 1 ? "is 1 red flag" : `are ${result.errors} red flags`} left. Fix ${result.errors === 1 ? "it" : "them"}, or type a reason to approve anyway.`,
      409,
    );
  }
  const now = new Date().toISOString();
  const updated: InvoiceRecord = { ...record, data: clean, verifiedTargets: verified, status: "approved", approvedAt: now, approvalNote: reason, updatedAt: now };
  await getStore().update(updated);
  return updated;
}

export async function reopen(id: string) {
  const record = await mustGet(id);
  const updated: InvoiceRecord = { ...record, status: "needs_review", approvedAt: null, updatedAt: new Date().toISOString() };
  await getStore().update(updated);
  return updated;
}

export async function deleteDocument(id: string) {
  await mustGet(id);
  await getStore().remove(id);
}

// ------------------------------------------------------------------ helpers

const uniq = (list: string[]) => Array.from(new Set(list.filter((s) => typeof s === "string")));

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Never trust what a browser sends: rebuild the form field by field. */
function sanitize(d: InvoiceData): InvoiceData {
  const types = ["invoice", "credit_memo", "quote", "packing_slip", "statement", "other"] as const;
  return {
    documentType: types.includes(d.documentType) ? d.documentType : "invoice",
    vendorName: str(d.vendorName),
    vendorAddress: str(d.vendorAddress),
    invoiceNumber: str(d.invoiceNumber),
    invoiceDate: str(d.invoiceDate),
    dueDate: str(d.dueDate),
    poNumber: str(d.poNumber),
    customerName: str(d.customerName),
    paymentTerms: str(d.paymentTerms),
    currency: str(d.currency)?.toUpperCase().slice(0, 3) ?? "USD",
    subtotal: num(d.subtotal),
    tax: num(d.tax),
    freight: num(d.freight),
    total: num(d.total),
    lineItems: (Array.isArray(d.lineItems) ? d.lineItems : []).slice(0, 1000).map((l) => ({
      id: str(l.id) ?? randomUUID(),
      partNumber: str(l.partNumber),
      description: str(l.description),
      quantity: num(l.quantity),
      unit: str(l.unit)?.toUpperCase() ?? null,
      unitPrice: num(l.unitPrice),
      pricePer: [1, 100, 1000].includes(l.pricePer) ? l.pricePer : 1,
      amount: num(l.amount),
    })),
  };
}
