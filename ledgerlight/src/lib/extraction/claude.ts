/**
 * Reader #1: Claude.
 *
 * Sends the PDF straight to Claude (it can see the pages, including scans
 * and photos) and asks it to fill in our invoice form. The answer is forced
 * into an exact shape (RawInvoiceSchema), so we never have to guess at
 * free-form text.
 *
 * Important: we tell Claude to COPY numbers as printed and never fix math.
 * Checking the math is the auditor's job (src/lib/validation), not the AI's.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { normalizeRawInvoice, RawInvoiceSchema } from "./normalize";
import { ExtractionError, type DocumentParser, type ParseInput } from "./types";

const DEFAULT_MODEL = "claude-opus-5-5";

const INSTRUCTIONS = `You are an accounts-payable data-entry specialist for electrical, plumbing and industrial-parts distributors.

Read the attached document and fill in the invoice form.

Rules:
- Copy values EXACTLY as printed. Never calculate, infer or "fix" a number. If the line math or totals look wrong, still copy what is printed; a separate system checks the math.
- If a field is not printed, return null with confidence 0. Do not guess.
- Confidence (0 to 1): 0.95+ for crisp printed text, about 0.6 for blurry, faint, stamped or handwritten values, below 0.5 if you are unsure.
- Dates as YYYY-MM-DD.
- Line items: one entry per invoiced product line, in order. Skip lines that are only comments, and skip backordered lines with zero shipped. Use the quantity SHIPPED / INVOICED, not the quantity ordered.
- Distributors often price wire, conduit fittings and fasteners per C (100) or per M (1,000). If the price column or unit says C, /C, per 100, M, /M or per 1000, set price_per to 100 or 1000. Otherwise use 1.
- Freight: combine shipping, delivery, freight, fuel surcharge and handling into one number. Tax is sales tax only.
- vendor_name is the company that issued the invoice (who gets paid), not the bill-to customer.
- Add a short reviewer note for anything a bookkeeper must know (missing pages, handwritten changes, "PAID" stamps, several invoices in one file, core charges, restocking fees).`;

export class ClaudeParser implements DocumentParser {
  readonly name = "claude";

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async extract({ pdf, fileName }: ParseInput) {
    const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    const client = new Anthropic({ timeout: 110_000, maxRetries: 1 });

    let response;
    try {
      response = await client.beta.messages.parse({
        model,
        max_tokens: 16000,
        // If a safety check ever declines the request, the API retries it on
        // a fallback model automatically instead of failing.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: {
          effort: "medium",
          format: betaZodOutputFormat(RawInvoiceSchema),
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdf.toString("base64") },
                title: fileName,
              },
              { type: "text", text: INSTRUCTIONS },
            ],
          },
        ],
      });
    } catch (err) {
      throw toExtractionError(err);
    }

    if (response.stop_reason === "refusal") {
      throw new ExtractionError("Claude declined the request", "The AI reader declined to process this document. Try a different file, or enter it by hand.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new ExtractionError("Output truncated", "This document is too long to read in one go (too many line items). Try splitting the PDF into smaller files.");
    }
    const raw = response.parsed_output;
    if (!raw) {
      throw new ExtractionError("No parsed output", "The AI reader returned an answer we couldn't understand. Please try again.");
    }

    return normalizeRawInvoice(raw, this.name, response.model);
  }
}

function toExtractionError(err: unknown): ExtractionError {
  if (err instanceof Anthropic.AuthenticationError) {
    return new ExtractionError(err.message, "Your Anthropic API key was rejected. Check ANTHROPIC_API_KEY in your .env.local file.");
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new ExtractionError(err.message, "Your Anthropic account can't use this model yet. Check your plan and billing in the Anthropic Console.");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new ExtractionError(err.message, "The AI reader is busy (rate limit reached). Wait a minute and try again.");
  }
  if (err instanceof Anthropic.BadRequestError) {
    const credit = /credit balance/i.test(err.message);
    return new ExtractionError(
      err.message,
      credit
        ? "Your Anthropic account is out of credit. Add credit in the Anthropic Console (Billing), then try again."
        : "The AI reader couldn't open this PDF. It may be password-protected, damaged, or too large (over 32 MB / 600 pages).",
    );
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new ExtractionError(err.message, "Couldn't reach the AI reader. Check your internet connection and try again.");
  }
  if (err instanceof Anthropic.APIError) {
    return new ExtractionError(err.message, "The AI reader had a temporary problem. Please try again in a moment.");
  }
  const message = err instanceof Error ? err.message : String(err);
  return new ExtractionError(message, "Something went wrong while reading the document. Please try again.");
}
