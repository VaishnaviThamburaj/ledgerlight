/** POST /api/documents/:id/reopen — move an approved invoice back to review. */
import { reopen } from "@/lib/documents";
import { errorResponse } from "@/lib/http";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await reopen(id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
