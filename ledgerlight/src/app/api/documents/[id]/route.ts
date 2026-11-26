/**
 * PATCH  /api/documents/:id  — save the reviewer's edits (draft)
 * DELETE /api/documents/:id  — remove a document and its PDF
 */
import { deleteDocument, saveDraft } from "@/lib/documents";
import { errorResponse, readJson } from "@/lib/http";
import type { InvoiceData } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await readJson<{ data: InvoiceData; verifiedTargets?: string[] }>(req);
    const record = await saveDraft(id, body.data, body.verifiedTargets ?? []);
    return Response.json({ ok: true, updatedAt: record.updatedAt });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await deleteDocument(id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
