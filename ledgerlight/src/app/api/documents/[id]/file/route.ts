/** GET /api/documents/:id/file — streams the original PDF for the left side of the review desk. */
import { getStore } from "@/lib/storage";
import { connection } from "next/server";
import { errorResponse } from "@/lib/http";
import { UserFacingError } from "@/lib/documents";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection(); // always run live, never pre-built
  try {
    const { id } = await params;
    const store = getStore();
    const record = await store.get(id);
    if (!record) throw new UserFacingError("Document not found.", 404);
    const pdf = await store.readFile(record.filePath);
    const name = record.fileName.replace(/[^\w.\- ]/g, "_");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
