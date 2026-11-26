/**
 * GET /api/export?format=xlsx | csv | csv-invoices
 * Downloads every APPROVED invoice. Unapproved ones are never exported.
 */
import { invoicesCsv, linesCsv, workbook } from "@/lib/export/formats";
import { connection } from "next/server";
import { errorResponse } from "@/lib/http";
import { getStore } from "@/lib/storage";

export async function GET(req: Request) {
  await connection(); // always run live, never pre-built
  try {
    const format = new URL(req.url).searchParams.get("format") ?? "xlsx";
    const approved = (await getStore().list()).filter((r) => r.status === "approved").reverse();
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "csv" || format === "csv-invoices") {
      const body = format === "csv" ? linesCsv(approved) : invoicesCsv(approved);
      const name = format === "csv" ? `approved-invoice-lines-${stamp}.csv` : `approved-invoices-${stamp}.csv`;
      return new Response(body, {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
      });
    }

    const xlsx = await workbook(approved);
    return new Response(new Uint8Array(xlsx), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="approved-invoices-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
