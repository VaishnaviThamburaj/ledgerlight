/**
 * POST /api/documents  — the front desk.
 * Receives an uploaded PDF, has it read and checked, and returns its new id.
 */
import { createHash } from "node:crypto";
import { ingestDocument, UserFacingError } from "@/lib/documents";
import { errorResponse } from "@/lib/http";
import { SAMPLE_SHA256 } from "@/lib/samples/sample-hash";

// Reading a long invoice can take a while; give the AI up to 2 minutes.
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new UserFacingError("No file was received. Please choose a PDF and try again.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new UserFacingError("No file was received. Please choose a PDF and try again.");

    const pdf = Buffer.from(await file.arrayBuffer());
    const isSample = createHash("sha256").update(pdf).digest("hex") === SAMPLE_SHA256;
    const record = await ingestDocument({ pdf, fileName: file.name || "document.pdf", isSample });
    return Response.json({ id: record.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
