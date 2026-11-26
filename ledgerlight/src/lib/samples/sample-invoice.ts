/**
 * The built-in sample: a realistic electrical-supply invoice.
 *
 * It contains one deliberate mistake so the demo shows the auditor at work:
 * line 4 says $110.40 but 12 × $8.45 is really $101.40 (a $9.00 overcharge).
 * It also has no customer PO number, which raises a yellow warning.
 *
 * This file has no imports so the PDF-building script can read it directly.
 */

export const SAMPLE_FILE_NAME = "sample-electrical-invoice.pdf";

export const SAMPLE_INVOICE = {
  vendorName: "Northline Electric Supply Co.",
  vendorAddress: "4120 Industrial Pkwy, Columbus, OH 43228",
  vendorPhone: "(614) 555-0142",
  invoiceNumber: "INV-2026-118734",
  invoiceDate: "2026-11-12",
  dueDate: "2026-12-12",
  paymentTerms: "Net 30",
  customerName: "Acme Facility Services LLC",
  customerAddress: "88 Commerce Dr, Dublin, OH 43017",
  account: "ACME-0042",
  shipVia: "Northline Truck",
  salesRep: "D. Romero",
  lines: [
    { partNumber: "THHN12-BLK-2500", description: "THHN/THWN-2 12 AWG Solid Copper, Black, 2500 ft Reel", quantity: 2500, unit: "FT", unitPrice: 142.5, pricePer: 1000, amount: 356.25 },
    { partNumber: "EMT34-10", description: "3/4 in. EMT Conduit, 10 ft Length", quantity: 40, unit: "EA", unitPrice: 7.18, pricePer: 1, amount: 287.2 },
    { partNumber: "QO120", description: "Square D QO 20A 1-Pole Plug-On Circuit Breaker", quantity: 24, unit: "EA", unitPrice: 11.85, pricePer: 1, amount: 284.4 },
    { partNumber: "LEV-5320-W", description: "Leviton 15A 125V Duplex Receptacle, White (Box/10)", quantity: 12, unit: "BX", unitPrice: 8.45, pricePer: 1, amount: 110.4 },
    { partNumber: "RACO-232", description: "4 in. Square Box, 1-1/2 in. Deep, Welded", quantity: 50, unit: "EA", unitPrice: 2.36, pricePer: 1, amount: 118.0 },
    { partNumber: "IDEAL-30-452", description: "Wire-Nut Twist-On Connectors, Yellow (Box/100)", quantity: 6, unit: "BX", unitPrice: 14.95, pricePer: 1, amount: 89.7 },
    { partNumber: "PVC1-S40-10", description: "1 in. PVC Schedule 40 Conduit, 10 ft Length", quantity: 25, unit: "EA", unitPrice: 6.12, pricePer: 1, amount: 153.0 },
  ],
  subtotal: 1398.95,
  taxRateLabel: "Sales Tax (7.5%)",
  tax: 104.92,
  freight: 45.0,
  total: 1548.87,
};
