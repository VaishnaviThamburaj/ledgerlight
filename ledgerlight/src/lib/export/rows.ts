/**
 * THE SHIPPING DOCK: turns approved invoices into flat rows.
 *
 * Every export format (CSV, Excel, and later QuickBooks, Google Sheets or an
 * ERP) starts from these same rows, so adding a new destination only means
 * writing a new "packer" for them.
 */
import type { InvoiceRecord } from "@/lib/types";

export interface InvoiceRow {
  "Record ID": string;
  "Vendor": string;
  "Vendor Address": string;
  "Invoice #": string;
  "Invoice Date": string;
  "Due Date": string;
  "PO #": string;
  "Bill-To": string;
  "Terms": string;
  "Currency": string;
  "Subtotal": number | null;
  "Tax": number | null;
  "Freight": number | null;
  "Total": number | null;
  "Line Count": number;
  "Approved At": string;
  "Approval Note": string;
  "Source File": string;
}

export interface LineRow {
  "Record ID": string;
  "Vendor": string;
  "Invoice #": string;
  "Invoice Date": string;
  "PO #": string;
  "Line": number;
  "Part #": string;
  "Description": string;
  "Qty": number | null;
  "UOM": string;
  "Unit Price": number | null;
  "Price Per": number;
  "Line Amount": number | null;
}

const s = (v: string | null | undefined) => v ?? "";

export function invoiceRows(records: InvoiceRecord[]): InvoiceRow[] {
  return records.map((r) => ({
    "Record ID": r.id,
    "Vendor": s(r.data.vendorName),
    "Vendor Address": s(r.data.vendorAddress),
    "Invoice #": s(r.data.invoiceNumber),
    "Invoice Date": s(r.data.invoiceDate),
    "Due Date": s(r.data.dueDate),
    "PO #": s(r.data.poNumber),
    "Bill-To": s(r.data.customerName),
    "Terms": s(r.data.paymentTerms),
    "Currency": r.data.currency,
    "Subtotal": r.data.subtotal,
    "Tax": r.data.tax,
    "Freight": r.data.freight,
    "Total": r.data.total,
    "Line Count": r.data.lineItems.length,
    "Approved At": s(r.approvedAt),
    "Approval Note": s(r.approvalNote),
    "Source File": r.fileName,
  }));
}

export function lineRows(records: InvoiceRecord[]): LineRow[] {
  return records.flatMap((r) =>
    r.data.lineItems.map((l, i) => ({
      "Record ID": r.id,
      "Vendor": s(r.data.vendorName),
      "Invoice #": s(r.data.invoiceNumber),
      "Invoice Date": s(r.data.invoiceDate),
      "PO #": s(r.data.poNumber),
      "Line": i + 1,
      "Part #": s(l.partNumber),
      "Description": s(l.description),
      "Qty": l.quantity,
      "UOM": s(l.unit),
      "Unit Price": l.unitPrice,
      "Price Per": l.pricePer,
      "Line Amount": l.amount,
    })),
  );
}
