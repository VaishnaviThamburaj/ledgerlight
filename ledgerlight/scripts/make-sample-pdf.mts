/**
 * Builds public/samples/sample-electrical-invoice.pdf from the sample data,
 * and records its fingerprint so the server can recognise it.
 *
 * Run with:  npm run make:sample
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { SAMPLE_FILE_NAME, SAMPLE_INVOICE as S } from "../src/lib/samples/sample-invoice.ts";

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

const doc = await PDFDocument.create();
const fixed = new Date("2026-11-12T15:04:00Z");
doc.setTitle(`Invoice ${S.invoiceNumber}`);
doc.setAuthor(S.vendorName);
doc.setCreator("Northline ERP");
doc.setProducer("Northline ERP");
doc.setCreationDate(fixed);
doc.setModificationDate(fixed);

const page = doc.addPage([612, 792]);
const regular = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const ink = rgb(0.1, 0.12, 0.16);
const muted = rgb(0.42, 0.45, 0.5);
const brand = rgb(0.05, 0.27, 0.55);
const line = rgb(0.82, 0.84, 0.87);

function text(p: PDFPage, t: string, x: number, y: number, size = 9, font: PDFFont = regular, color = ink) {
  p.drawText(t, { x, y, size, font, color });
}
function right(p: PDFPage, t: string, xRight: number, y: number, size = 9, font: PDFFont = regular, color = ink) {
  p.drawText(t, { x: xRight - font.widthOfTextAtSize(t, size), y, size, font, color });
}

// Header band
page.drawRectangle({ x: 0, y: 742, width: 612, height: 50, color: brand });
text(page, "NORTHLINE", 40, 762, 20, bold, rgb(1, 1, 1));
text(page, "ELECTRIC SUPPLY CO.", 160, 763, 11, regular, rgb(0.85, 0.9, 1));
right(page, "INVOICE", 572, 760, 22, bold, rgb(1, 1, 1));

text(page, S.vendorName, 40, 720, 10, bold);
text(page, "4120 Industrial Pkwy", 40, 707);
text(page, "Columbus, OH 43228", 40, 695);
text(page, `Phone ${S.vendorPhone}  ·  ar@northline-supply.example`, 40, 683, 8.5, regular, muted);

// Invoice facts box
const facts: [string, string][] = [
  ["Invoice No.", S.invoiceNumber],
  ["Invoice Date", date(S.invoiceDate)],
  ["Terms", S.paymentTerms],
  ["Due Date", date(S.dueDate)],
  ["Account", S.account],
  ["Customer PO", ""],
];
page.drawRectangle({ x: 352, y: 612, width: 220, height: 116, borderColor: line, borderWidth: 1 });
facts.forEach(([k, v], i) => {
  const y = 712 - i * 18;
  text(page, k, 362, y, 8.5, regular, muted);
  right(page, v || "________________", 562, y, 9.5, v ? bold : regular, v ? ink : muted);
});

// Bill to / ship
text(page, "BILL TO", 40, 650, 8, bold, muted);
text(page, S.customerName, 40, 636, 10, bold);
text(page, "88 Commerce Dr", 40, 623);
text(page, "Dublin, OH 43017", 40, 611);
text(page, "SHIP VIA", 200, 650, 8, bold, muted);
text(page, S.shipVia, 200, 636);
text(page, "SALES REP", 200, 618, 8, bold, muted);
text(page, S.salesRep, 200, 604);

// Line items table
const top = 575;
const cols = { ln: 40, item: 62, desc: 160, qty: 392, uom: 424, price: 478, per: 496, amt: 572 };
page.drawRectangle({ x: 36, y: top - 6, width: 540, height: 20, color: rgb(0.94, 0.95, 0.97) });
text(page, "#", cols.ln, top, 8, bold, muted);
text(page, "ITEM NO.", cols.item, top, 8, bold, muted);
text(page, "DESCRIPTION", cols.desc, top, 8, bold, muted);
right(page, "QTY SHIP", cols.qty + 18, top, 8, bold, muted);
text(page, "UOM", cols.uom, top, 8, bold, muted);
right(page, "PRICE", cols.price, top, 8, bold, muted);
text(page, "PER", cols.per, top, 8, bold, muted);
right(page, "AMOUNT", cols.amt, top, 8, bold, muted);

let y = top - 24;
S.lines.forEach((l, i) => {
  text(page, String(i + 1), cols.ln, y, 8.5, regular, muted);
  text(page, l.partNumber, cols.item, y, 8.5, bold);
  const desc = l.description.length > 44 ? [l.description.slice(0, 44).replace(/\s+\S*$/, ""), ""] : [l.description, ""];
  if (desc[0] !== l.description) desc[1] = l.description.slice(desc[0].length).trim();
  text(page, desc[0], cols.desc, y, 8.5);
  if (desc[1]) text(page, desc[1], cols.desc, y - 10, 8.5);
  right(page, l.quantity.toLocaleString("en-US"), cols.qty + 18, y, 8.5);
  text(page, l.unit, cols.uom, y, 8.5);
  right(page, money(l.unitPrice), cols.price, y, 8.5);
  text(page, l.pricePer === 1000 ? "M" : l.pricePer === 100 ? "C" : "EA", cols.per, y, 8.5);
  right(page, money(l.amount), cols.amt, y, 8.5);
  y -= desc[1] ? 30 : 22;
  page.drawLine({ start: { x: 36, y: y + 12 }, end: { x: 576, y: y + 12 }, thickness: 0.5, color: line });
});

// Totals
y -= 10;
const totals: [string, number, boolean][] = [
  ["Merchandise Subtotal", S.subtotal, false],
  [S.taxRateLabel, S.tax, false],
  ["Freight", S.freight, false],
  ["TOTAL DUE (USD)", S.total, true],
];
totals.forEach(([k, v, strong], i) => {
  const ty = y - i * 18;
  if (strong) page.drawRectangle({ x: 352, y: ty - 6, width: 224, height: 20, color: rgb(0.94, 0.95, 0.97) });
  text(page, k, 362, ty, strong ? 10 : 9, strong ? bold : regular, strong ? ink : muted);
  right(page, `$${money(v)}`, 572, ty, strong ? 11 : 9.5, strong ? bold : regular);
});

text(page, "Prices per M = per 1,000 ft. Returns subject to 20% restocking fee within 30 days.", 40, y - 4, 7.5, regular, muted);
text(page, "Past-due balances accrue 1.5% per month.", 40, y - 15, 7.5, regular, muted);

// Footer
page.drawLine({ start: { x: 36, y: 70 }, end: { x: 576, y: 70 }, thickness: 0.5, color: line });
text(page, "Remit to: Northline Electric Supply Co., PO Box 77120, Columbus, OH 43207", 40, 56, 8, regular, muted);
right(page, "Thank you for your business!", 572, 56, 8, bold, brand);
text(page, "SAMPLE DOCUMENT · fictional company for demonstration", 40, 40, 7, regular, rgb(0.7, 0.72, 0.75));

const bytes = await doc.save({ useObjectStreams: false });
mkdirSync("public/samples", { recursive: true });
writeFileSync(`public/samples/${SAMPLE_FILE_NAME}`, bytes);
const sha = createHash("sha256").update(bytes).digest("hex");
writeFileSync(
  "src/lib/samples/sample-hash.ts",
  `// Generated by scripts/make-sample-pdf.mts. Do not edit by hand.\nexport const SAMPLE_SHA256 = "${sha}";\n`,
);
console.log(`Wrote public/samples/${SAMPLE_FILE_NAME} (${bytes.length} bytes, sha256 ${sha.slice(0, 12)}…)`);
