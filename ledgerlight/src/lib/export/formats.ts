/** Packers: CSV and Excel. */
import ExcelJS from "exceljs";
import type { InvoiceRecord } from "@/lib/types";
import { invoiceRows, lineRows } from "./rows";

type Cell = string | number | null;

/**
 * Spreadsheet apps run text that starts with = + - @ as a formula. A vendor
 * name like "=HYPERLINK(...)" could be dangerous, so we neutralise it.
 */
function safeText(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

function csvCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  const t = safeText(v);
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function toCsv<T extends object>(rows: T[], headers: (keyof T)[]): string {
  const lines = [headers.map((h) => csvCell(String(h))).join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvCell(row[h] as Cell)).join(","));
  return lines.join("\r\n") + "\r\n";
}

/** One row per line item, with the invoice details repeated. Most ERPs and QuickBooks bill imports want this shape. */
export function linesCsv(records: InvoiceRecord[]): string {
  const rows = lineRows(records);
  const headers = (rows[0] ? Object.keys(rows[0]) : ["Record ID", "Vendor", "Invoice #", "Invoice Date", "PO #", "Line", "Part #", "Description", "Qty", "UOM", "Unit Price", "Price Per", "Line Amount"]) as (keyof (typeof rows)[number])[];
  return "﻿" + toCsv(rows, headers);
}

/** One row per invoice. */
export function invoicesCsv(records: InvoiceRecord[]): string {
  const rows = invoiceRows(records);
  const headers = (rows[0] ? Object.keys(rows[0]) : ["Record ID", "Vendor", "Invoice #", "Invoice Date", "Total"]) as (keyof (typeof rows)[number])[];
  return "﻿" + toCsv(rows, headers);
}

const MONEY_COLS = new Set(["Subtotal", "Tax", "Freight", "Total", "Unit Price", "Line Amount"]);

export async function workbook(records: InvoiceRecord[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ledgerlight";
  wb.created = new Date();

  const addSheet = (name: string, rows: object[]) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    const headers = rows[0] ? Object.keys(rows[0]) : ["(no approved invoices yet)"];
    ws.columns = headers.map((h) => ({
      header: h,
      key: h,
      width: Math.min(48, Math.max(10, h.length + 2, ...rows.map((r) => String((r as Record<string, unknown>)[h] ?? "").length + 2))),
      style: MONEY_COLS.has(h) ? { numFmt: '"$"#,##0.00' } : {},
    }));
    for (const r of rows) {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) clean[k] = typeof v === "string" ? safeText(v) : v;
      ws.addRow(clean);
    }
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  };

  addSheet("Invoices", invoiceRows(records));
  addSheet("Line Items", lineRows(records));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
