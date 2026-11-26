/**
 * Picks which reader to use.
 *
 * To add a new reader (Reducto, LlamaParse, Mistral OCR ...):
 *   1. Create src/lib/extraction/<name>.ts that implements DocumentParser
 *      and returns our standard form (see normalize.ts for the shape).
 *   2. Add it to PARSERS below.
 *   3. Set EXTRACTION_PROVIDER=<name> in your environment.
 * Nothing else in the app has to change.
 */
import { ClaudeParser } from "./claude";
import { sampleAnswerKey } from "./sample-key";
import { ExtractionError, type DocumentParser, type ParseInput } from "./types";
import type { ExtractionResult } from "@/lib/types";

const PARSERS: Record<string, () => DocumentParser> = {
  claude: () => new ClaudeParser(),
};

export function getParser(): DocumentParser {
  const name = (process.env.EXTRACTION_PROVIDER || "claude").toLowerCase();
  const make = PARSERS[name];
  if (!make) {
    throw new ExtractionError(`Unknown EXTRACTION_PROVIDER "${name}"`, `The reader "${name}" isn't installed. Check EXTRACTION_PROVIDER in your settings.`);
  }
  return make();
}

export function readerStatus() {
  const parser = getParser();
  return { name: parser.name, configured: parser.isConfigured() };
}

export async function extractDocument(input: ParseInput & { isSample?: boolean }): Promise<ExtractionResult> {
  const parser = getParser();
  if (!parser.isConfigured()) {
    if (input.isSample) return sampleAnswerKey();
    throw new ExtractionError(
      `${parser.name} not configured`,
      "The AI reader isn't connected yet. Add your ANTHROPIC_API_KEY to .env.local and restart the app. (The sample invoice works without it.)",
    );
  }
  return parser.extract(input);
}

export { ExtractionError };
