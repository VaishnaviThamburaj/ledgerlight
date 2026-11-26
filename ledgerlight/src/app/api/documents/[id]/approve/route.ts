/** POST /api/documents/:id/approve — the 1-click approve (re-checked on the server). */
import { approve } from "@/lib/documents";
import { errorResponse, readJson } from "@/lib/http";
import type { InvoiceData } from "@/lib/types";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson<{ data: InvoiceData; verifiedTargets?: string[]; note?: string | null }>(req);
    const record = await approve(id, body.data, body.verifiedTargets ?? [], body.note ?? null);
    return Response.json({ ok: true, approvedAt: record.approvedAt });
  } catch (err) {
    return errorResponse(err);
  }
}
