/**
 * THE PLUG SOCKET for document readers.
 *
 * Any reader (Claude, Reducto, LlamaParse, Mistral OCR, ...) just has to
 * fit this shape: take a PDF in, give our standard invoice form back.
 * The rest of the app never needs to know which reader did the work.
 */
import type { ExtractionResult } from "@/lib/types";

export interface ParseInput {
  pdf: Buffer;
  fileName: string;
}

export interface DocumentParser {
  /** Short id, stored with every record so you know who read it. */
  readonly name: string;
  /** True when its keys/settings are present. */
  isConfigured(): boolean;
  extract(input: ParseInput): Promise<ExtractionResult>;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    /** A message that is safe and helpful to show a non-technical user. */
    public readonly userMessage: string,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}
