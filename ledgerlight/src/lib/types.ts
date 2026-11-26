/**
 * The shapes of data that flow through the app.
 *
 * Think of these as the blank forms every invoice gets copied onto.
 * Every part of the app (the AI reader, the checker, the review screen,
 * the filing cabinet and the export) agrees on these same forms.
 */

/** The single-value fields at the top and bottom of an invoice. */
export type HeaderField =
  | "vendorName"
  | "vendorAddress"
  | "invoiceNumber"
  | "invoiceDate"
  | "dueDate"
  | "poNumber"
  | "customerName"
  | "paymentTerms";

export type MoneyField = "subtotal" | "tax" | "freight" | "total";

export type FieldKey = HeaderField | MoneyField;

export type LineField =
  | "partNumber"
  | "description"
  | "quantity"
  | "unit"
  | "unitPrice"
  | "pricePer"
  | "amount";

export interface LineItem {
  /** Stable id so the screen can track a row while it is edited. */
  id: string;
  /** Vendor catalog / SKU / item number, e.g. "QO120" or "THHN12BK-500". */
  partNumber: string | null;
  description: string | null;
  quantity: number | null;
  /** Unit of measure as printed: EA, FT, BX, PK, RL, C, M ... */
  unit: string | null;
  unitPrice: number | null;
  /**
   * What the unit price is "per". Electrical and plumbing distributors often
   * price wire, fittings and fasteners per 100 (C) or per 1,000 (M).
   * 1 = per each, 100 = per C, 1000 = per M.
   */
  pricePer: number;
  /** Extended line amount as printed on the invoice. */
  amount: number | null;
}

export type DocumentType =
  | "invoice"
  | "credit_memo"
  | "quote"
  | "packing_slip"
  | "statement"
  | "other";

export interface InvoiceData {
  documentType: DocumentType;
  vendorName: string | null;
  vendorAddress: string | null;
  invoiceNumber: string | null;
  /** ISO date, YYYY-MM-DD */
  invoiceDate: string | null;
  /** ISO date, YYYY-MM-DD */
  dueDate: string | null;
  poNumber: string | null;
  customerName: string | null;
  paymentTerms: string | null;
  currency: string;
  subtotal: number | null;
  tax: number | null;
  /** Freight, shipping, delivery, fuel surcharge, handling. */
  freight: number | null;
  total: number | null;
  lineItems: LineItem[];
}

/**
 * How sure the reader was about each value, from 0 (not found) to 1 (crisp).
 * Keys are a FieldKey ("total") or a line key ("line:<id>").
 */
export type ConfidenceMap = Record<string, number>;

export interface ExtractionResult {
  data: InvoiceData;
  confidence: ConfidenceMap;
  /** Which reader produced this, e.g. "claude" or "demo". */
  provider: string;
  model?: string;
  /** Anything the reader wants a human to know ("page 2 is cut off"). */
  notes: string[];
}

export type InvoiceStatus = "needs_review" | "approved";

export interface InvoiceRecord {
  id: string;
  fileName: string;
  /** Where the original PDF lives inside storage. */
  filePath: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvalNote: string | null;
  /** The current (possibly human-corrected) values. */
  data: InvoiceData;
  /** Exactly what the reader produced, kept for audit and accuracy tracking. */
  originalData: InvoiceData;
  extraction: {
    provider: string;
    model?: string;
    confidence: ConfidenceMap;
    notes: string[];
  };
  /** Field targets a human explicitly marked "looks right". */
  verifiedTargets: string[];
}

/** A short summary used for duplicate checks and lists. */
export interface InvoiceSummary {
  id: string;
  status: InvoiceStatus;
  vendorName: string | null;
  invoiceNumber: string | null;
  approvedAt: string | null;
}
