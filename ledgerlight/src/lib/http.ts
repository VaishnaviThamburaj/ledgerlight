/** Shared helpers for the web routes: friendly errors, never raw stack traces. */
import "server-only";
import { UserFacingError } from "@/lib/documents";
import { ExtractionError } from "@/lib/extraction/types";

export function errorResponse(err: unknown) {
  if (err instanceof UserFacingError) return Response.json({ error: err.message }, { status: err.status });
  if (err instanceof ExtractionError) {
    console.error("[extraction]", err.message);
    return Response.json({ error: err.userMessage }, { status: 502 });
  }
  console.error("[server]", err);
  const msg = err instanceof Error && err.message.startsWith("Supabase") ? err.message : "Something went wrong on our side. Please try again.";
  return Response.json({ error: msg }, { status: 500 });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new UserFacingError("The request was not valid.");
  }
}
