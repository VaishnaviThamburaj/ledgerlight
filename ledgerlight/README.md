# Ledgerlight

Invoice capture for electrical, plumbing and industrial-parts distributors.

Upload a supplier invoice PDF. AI copies every field and line item, plain-code rules double-check the math, a person reviews only the flagged fields, and approved invoices export to Excel/CSV.

**Getting started:** see [SETUP.md](SETUP.md).

## How it fits together

| Piece | What it does | Where |
|---|---|---|
| Front desk | Upload box and "Test with Sample" button | `src/components/UploadPanel.tsx`, `src/app/api/documents/route.ts` |
| Reader (plug socket) | Turns a PDF into our standard invoice form. Claude today; add Reducto/LlamaParse/Mistral by adding one file | `src/lib/extraction/` |
| Auditor | Plain-code checks: line math (incl. per-C / per-M pricing), subtotal, total, required fields, dates, tax sanity, duplicates, low confidence | `src/lib/validation/validate.ts` |
| Review desk | Split screen: PDF left, traffic-light form right, live re-checking, autosave, approve | `src/components/review/` |
| Filing cabinet | Supabase (table + private PDF bucket) or local `.data/` folder | `src/lib/storage/`, `supabase/setup.sql` |
| Shipping dock | Approved invoices to Excel (2 sheets) or CSV | `src/lib/export/`, `src/app/api/export/route.ts` |
| Front door lock | Optional password for the whole app (`APP_PASSWORD`) | `src/proxy.ts` |
| Workflow | arrive → store → read → check → review → approve | `src/lib/documents.ts` |

## Adding a new reader

1. Create `src/lib/extraction/<name>.ts` implementing `DocumentParser` (see `types.ts`) and return `normalizeRawInvoice(...)` or your own `ExtractionResult`.
2. Register it in `PARSERS` in `src/lib/extraction/index.ts`.
3. Set `EXTRACTION_PROVIDER=<name>`.

## Adding a new export destination (QuickBooks, Google Sheets, ERP)

Start from `invoiceRows()` / `lineRows()` in `src/lib/export/rows.ts`. Every destination uses the same flat rows.
