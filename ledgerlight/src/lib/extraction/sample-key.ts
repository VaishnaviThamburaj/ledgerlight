/**
 * Answer key for the built-in sample invoice.
 *
 * Used ONLY when no AI key is set yet AND the file is the built-in sample,
 * so the demo button works on a brand-new install. The screen shows a clear
 * "Demo mode" label whenever this is used. Real uploads always need a key.
 */
import { SAMPLE_INVOICE } from "@/lib/samples/sample-invoice";
import type { ExtractionResult } from "@/lib/types";
import { newLineId } from "./normalize";

export function sampleAnswerKey(): ExtractionResult {
  const s = SAMPLE_INVOICE;
  const confidence: Record<string, number> = {
    vendorName: 0.99,
    vendorAddress: 0.97,
    invoiceNumber: 0.99,
    invoiceDate: 0.98,
    dueDate: 0.97,
    customerName: 0.98,
    paymentTerms: 0.97,
    subtotal: 0.99,
    tax: 0.98,
    freight: 0.96,
    total: 0.99,
  };
  const lineItems = s.lines.map((l) => {
    const id = newLineId();
    confidence[`line:${id}`] = 0.97;
    return { id, ...l };
  });
  return {
    provider: "demo",
    notes: ["Demo mode: this is the built-in answer key for the sample invoice. Add your Anthropic API key to have the AI read real documents."],
    confidence,
    data: {
      documentType: "invoice",
      vendorName: s.vendorName,
      vendorAddress: s.vendorAddress,
      invoiceNumber: s.invoiceNumber,
      invoiceDate: s.invoiceDate,
      dueDate: s.dueDate,
      poNumber: null,
      customerName: s.customerName,
      paymentTerms: s.paymentTerms,
      currency: "USD",
      subtotal: s.subtotal,
      tax: s.tax,
      freight: s.freight,
      total: s.total,
      lineItems,
    },
  };
}
