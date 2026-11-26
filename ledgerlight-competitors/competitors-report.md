# Competitive Intelligence Report: Ledgerlight
*Skill: startup-competitors | Generated: 2026-11-24 | Depth: Light (fast-track)*

Tags: **[Data]** sourced, **[Estimate]** my calculation, **[Assumption]** unverified premise, **[Opinion]** judgment.

---

## 0. What the prototype actually is (from the codebase)

- **Job:** Supplier invoice PDF in → Claude (`claude-opus-5-5`, effort `medium`, Zod-structured output) copies header + every line item → plain-code auditor checks line math (incl. per-C / per-M pricing), subtotal, total, tax sanity, required fields, dates, duplicates, low confidence → split-screen review desk (PDF left, traffic-light fields right) → approve → Excel/CSV export. Storage: local `.data/` or Supabase. Auth: one shared `APP_PASSWORD`.
- **Real user:** The README says "for electrical, plumbing and industrial-parts *distributors*", but the sample data is *Acme Facility Services* receiving a bill *from* Northline Electric Supply. The person using it is the **AP clerk / office manager at a contractor or facility-services firm that buys from supply houses**, not the distributor. Fix that copy before anyone outside sees it. **[Data: `.data/invoices.json`, `README.md`]**
- **Genuine edge vs. generic tools:** per-C/per-M price math, "copy don't fix" extraction + deterministic auditor, review-only-what's-flagged UX. **[Opinion]**
- **Missing for a paying customer:** no QuickBooks/ERP push (CSV only), no PO / quote / contract-price matching, no job or cost-code assignment, no email-inbox intake, no multi-user accounts, no per-invoice cost logging (`response.usage` is not stored).

---

## Executive Summary

Invoice line-item extraction is a crowded, commoditizing layer: horizontal OCR tools (Dext, Docparser, Nanonets, Rossum), free-ish bookkeeping features (QuickBooks AI Bill Entry, Ramp) and funded construction-AP verticals (Field Materials, Vergo, ProcureDesk, BuildTools, Ottimate) all claim it. **[Data]** The construction verticals already sell the thing Ledgerlight hints at but doesn't do: matching supply-house lines to POs, quotes and receipts, and coding them to jobs. **[Data]** Ledgerlight's per-C/M auditor and flagged-only review are real but narrow differentiators. **[Opinion]** API cost is not the problem (≈$0.05–0.15 per invoice on Opus 5.5, cents on Haiku) so 75–90% gross margin is reachable. **[Estimate]** The real risk is demand: small contractors today book supply-house bills as a lump sum, so "every line item into Excel" isn't a job they pay for; "catch the supply house overcharging me and bill it to the right job" is. **[Data + Opinion]**

## Market Concentration

- **Structure:** Fragmented at the extraction layer, consolidating at the construction-AP layer (platforms bundling PO + receiving + invoice + job costing). **[Opinion]**
- **Entry barriers:** Low for extraction (any LLM API does it), medium-high for the workflow layer (ERP integrations: QuickBooks, Sage 300 CRE, Vista, Foundation; distributor relationships). **[Data: Vergo]**
- **Distributor-side substitutes:** Graybar lets account holders download invoice history to CSV; Graybar and Ferguson support EDI 810 invoices. ServiceTitan's Ferguson integration does POs, catalog and contract pricing but explicitly does **not** pull the vendor invoice back. **[Data]** So big-distributor invoices are partly a solved data problem; small/local supply houses, counter tickets and scanned PDFs are not.

## Key Players at a Glance

| Player | Type | Pricing (published or reported) | Strength | Weakness | Threat |
|---|---|---|---|---|---|
| **QuickBooks AI Bill Entry** | Bundled in QBO Bill Pay; included in Advanced | $0 extra for QBO Advanced | Already where the books live; line items, duplicates, category suggestions | Generic; no per-C/M logic, no PO/quote match; US only | **High** |
| **Dext Prepare** | Horizontal bookkeeping capture | From $25.21/mo (250 docs, 5 users) but only **5 line-item docs** included; AI Assist line items from $20.50/mo or ~$0.50/doc PAYG | Brand with bookkeepers, Xero/QBO integration | Line items metered; reviewers note slower AI processing, inaccurate suggestions | Medium |
| **Hubdoc (Xero)** | Free with Xero | Included | Free | Header only; Xero reportedly has no plans for line items | Low |
| **Docparser / Nanonets / Parseur** | Template or ML parsers | Docparser $39/100 docs; Nanonets ~ $0.30/doc PAYG, 500 free pages | Flexible, API | Table rows "tricky"; templates break when vendor layouts shift; learning curve | Medium |
| **Rossum** | Enterprise IDP | ~$18K/yr starter (third-party estimate) | Accuracy, enterprise workflow | Price, sales-led | Low (different buyer) |
| **Field Materials** | Construction procurement + AP AI | Not published (demo) | 3-way match (PO/receipt/invoice), price verification, material-pricing intelligence (Feb 2026), per-cost-code tracking | Sales-led; reviewer reports errors on similar item names | **High** |
| **Vergo** | Construction AP automation | **$0.50/invoice + platform fee** | Line-level job/cost-code splitting, duplicate detection, Sage/Vista/Foundation sync | Platform fee opaque; mid-market focus | **High** |
| **ProcureDesk** | Electrical-contractor AP | Not found | Explicitly names Graybar/Rexel/WESCO, THHN, EMT; line-by-line PO/receipt match | Unknown traction | High |
| **BuildTools, Ottimate, Ramp, Projul, hh2** | Construction AP / bill pay | Ottimate usage-based, contact sales; Ramp bill pay free | Cost codes, approvals, payments | Ottimate reviews: misread invoices, dropped pages, 1/5 value rating from one reviewer | Medium |
| **Manual / lump-sum entry** | Status quo | Clerk time | Zero switching | Overcharges go unseen | **High** (biggest real competitor) |

## Competitive Matrix (condensed)

| Capability | Ledgerlight | QBO AI Bill Entry | Dext | Docparser/Nanonets | Field Materials | Vergo |
|---|---|---|---|---|---|---|
| Line-item extraction | Strong | Adequate | Adequate (metered) | Adequate (template pain) | Strong | Strong |
| Per-C / per-M price math | **Strong** | Missing? | Missing? | Missing | Unknown | Unknown |
| Deterministic math audit w/ plain-English flags | **Strong** | Weak | Weak | Missing | Adequate | Adequate |
| PO / quote / contract-price match | Missing | Missing | Missing | Missing | Strong | Strong |
| Job / cost-code coding | Missing | Adequate (class/customer) | Adequate | Missing | Strong | Strong |
| Accounting/ERP sync | Missing (CSV only) | Native | Strong | Via Zapier/API | Strong | Strong |
| Email-inbox intake | Missing | Strong | Strong | Strong | Strong | Strong |
| Self-serve, under $100/mo | Possible | Yes | Yes | Yes | No | No |

"?" = not found in research; verify by trial. **Gap no one owns cheaply:** self-serve, trade-specific *price auditing* (per-C/M, contract price vs billed, backorder/short-ship, freight creep) for 5–50-person electrical/plumbing shops on QuickBooks. **[Opinion]**

## Customer Sentiment (complaints that matter)

- **Contractors don't enter line items today.** Mike Holt forum electricians: enter supply-house invoices "as a lump sum" and split across jobs; tracking every item in QB "needs a full-time office staffer." **[Data]** → Line items alone aren't a felt pain; job costing and overcharges are.
- **Templates break on vendor layout shifts** (Docparser Capterra review). **[Data]** → LLM extraction is a real advantage over template parsers, but every competitor now claims it.
- **AI accuracy distrust:** Dext "AI suggestions are inaccurate" at times; Ottimate "does not always read invoices correctly", drops pages; Field Materials confuses similar item names. **[Data]** → Ledgerlight's auditor + flagged-only review is a credible answer; make "we show you exactly why we're unsure" the pitch.
- **Hubdoc users ask for line items** and Xero reportedly won't build it. **[Data, via competitor blog — lower confidence]**
- **DATA GAP:** No Reddit threads surfaced in 3 targeted searches. Go read r/electricians, r/Plumbing, r/Bookkeeping, r/QuickBooks manually, or (better) talk to 10 office managers.

---

## Pricing & Margins

### API cost per invoice (Anthropic list prices, Nov 2026)

Opus 5.5 $4 / $20 per M tokens in/out; Sonnet 5.5 $2 / $10; Haiku 5.5 $0.10 / $0.50; Batch API −50%. **[Data]**

Assumptions **[Estimate]**: PDF ≈ 1.5–3K input tokens/page (text + page image); prompt + schema ≈ 1.5K; output JSON ≈ 100 tokens/line + 500 header; adaptive thinking at `medium` ≈ 1–4K output tokens.

| Invoice | Input tok | Output tok (JSON + thinking) | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|---|---|---|
| 1 page, 8 lines | ~4K | ~3K | **~$0.08** | ~$0.04 | ~$0.002 |
| 2 pages, 20 lines (sample-like) | ~7K | ~5K | **~$0.13** | ~$0.06 | ~$0.003 |
| 5 pages, 60 lines | ~15K | ~10K | **~$0.26** | ~$0.13 | ~$0.006 |

Retries/re-reads add ~10–20%. **Measure, don't trust this table:** the app doesn't log `response.usage` yet; add it to the stored record and you'll have exact cost per invoice in a week.

### Infra

Vercel Pro ($20/seat) + Supabase Pro ($25) ≈ **$45–70/mo fixed** until hundreds of customers; PDF storage is pennies. **[Estimate]**

### What a customer is worth

Small electrical/plumbing contractor: **~150–600 supplier invoices/month** **[Assumption — validate in interviews]**.

| Plan | Price | Invoices incl. | API cost @ Opus (avg $0.12) | Gross margin | @ Sonnet ($0.06) |
|---|---|---|---|---|---|
| Starter | $99/mo | 200 | $24 | ~76% | ~88% |
| Shop | $249/mo | 600 | $72 | ~71% | ~86% |
| Overage | $0.35/invoice | — | $0.12 | ~66% | ~83% |

Benchmarks: Vergo $0.50/invoice + platform fee; Dext line items ~$0.50/doc; Nanonets ~$0.30/doc; Docparser ~$0.39/doc at entry. **[Data]** So $0.25–0.50/invoice is market; $99–249/mo flat is defensible if it replaces 10–30 clerk hours. Margin lever: route clean 1-page invoices to Sonnet/Haiku and only re-read on Opus when the auditor flags something — likely gets blended cost under $0.05. **[Estimate]**

### Pricing model that fits best

**Flat monthly tier by invoice volume, with "money found" shown on the dashboard** (overcharges caught, credits requested). Not per-seat (one AP clerk). Not pure per-invoice (makes buyers ration uploads). Once price-matching exists, test a "first month free, keep it if we find more than the fee" guarantee. **[Opinion]**

**Can it make good money?** As a lifestyle/indie SaaS: yes, plausibly. 300 shops × $150 ≈ **$540K ARR at ~80% GM** is realistic in a niche with ~70K US electrical contractors and ~120K plumbing/HVAC firms **[Assumption, rough industry counts]**. As a venture-scale "AI invoice OCR" company: no; the extraction layer is commoditizing and well-funded verticals own the workflow. **[Opinion]**

---

## Strategic Opportunities

### 1. Supply-house overcharge auditor (not "invoice to Excel")
- **What:** Upload contract/quote price sheet or POs; flag billed price ≠ agreed price, per-C/M errors, backorders billed, freight/fuel creep, duplicate rebills. Show $ recovered.
- **Evidence:** Sample approval note already reads "Vendor overcharged $9.00 on line 4. Credit requested."; Field Materials claims 5–10% material savings from price verification; contractors currently don't look at lines at all.
- **Confidence:** Medium.
- **How:** Add a `priceSheet` per vendor + a `contract_price_mismatch` rule in `validate.ts`; CSV import of the price list. That's a week, not a quarter.

### 2. QuickBooks-first, job-coded output
- **What:** Push approved invoices as QBO Bills with customer/job (class) per line.
- **Evidence:** Lump-sum + split-across-jobs is the current workflow; every competitor syncs to accounting.
- **Confidence:** High that it's required; Medium that it differentiates.

### 3. Local / regional supply houses and scanned counter tickets
- **What:** Win where EDI/CSV isn't offered — small supply houses, will-call counter tickets, photos from trucks.
- **Evidence:** Graybar/Ferguson have CSV/EDI; small houses don't. Claude reads scans/photos natively.
- **Confidence:** Medium.

## Strategic Risks

### Risk: Extraction is a feature everyone gives away
- **Evidence:** QBO AI Bill Entry included in Advanced; Ramp bill pay free; Dext from $25/mo.
- **Severity:** High. **Mitigation:** Sell outcome ($ caught, job costing), not extraction.

### Risk: Vertical incumbents already sell the workflow
- **Evidence:** Field Materials, Vergo, ProcureDesk, BuildTools all do PO/receipt/invoice matching and cost codes.
- **Severity:** High for mid-market (50+ employees, Sage/Vista). **Mitigation:** Stay below them: self-serve, QBO-only, <$250/mo, 10-minute setup, no demo call.

### Risk: Big distributors go direct-to-data
- **Evidence:** Graybar CSV export, EDI 810 at Graybar/Ferguson, ServiceTitan–Ferguson procurement deepening.
- **Severity:** Medium. **Mitigation:** Ingest CSV/EDI too; be the auditor regardless of input format.

## Competitive Moat Assessment

| Moat | Present? | Who | Strength |
|---|---|---|---|
| Network effects | Weak | Field Materials (material price intelligence across customers) | Weak–medium |
| Switching costs | Yes | ERP-integrated AP tools; QBO itself | Strong |
| Data moat | Possible | Whoever accumulates per-vendor, per-SKU price history | Medium |
| Brand/trust | Yes | Intuit, Dext with bookkeepers | Strong |
| Scale | Weak | — | Weak |

New entrant's only realistic moat: **per-SKU price history across shops** (what Graybar charges for THHN12 in Columbus this month) — a benchmark no single contractor has. Start collecting it from day one (with consent). **[Opinion]**

## Data Gaps & Research Limitations

- No Reddit evidence found; sentiment relies on G2/Capterra/forum snippets and vendor content. Fix: 10 customer interviews + manual Reddit read.
- Field Materials, ProcureDesk, BuildTools, Ottimate, Adaptive prices unpublished. Fix: request demos posing as a 15-person EC.
- QBO AI Bill Entry real line-item accuracy on supply-house invoices unknown. Fix: run 20 real invoices through it side-by-side with Ledgerlight.
- Invoice volume per contractor is an assumption. Fix: ask in interviews: "How many supplier bills did you enter last month?"
- Token costs are estimates; prototype doesn't log usage.
- Funding/hiring signals not researched (Light tier).

## Red Flags
- Target user stated in README (distributors) contradicts the product (their customers).
- The most-cited current practice (lump-sum entry) means the core output (every line in Excel) may have no buyer.
- QuickBooks ships line-item capture at no extra cost to Advanced users.

## Yellow Flags
- Default model is Opus at medium effort; fine for margin, but there's no cost telemetry.
- Single shared password; multi-tenant accounts needed before any second customer.
- Funded verticals (Field Materials, Vergo) could add a self-serve SMB tier.

## Sources
- [Parseur — construction invoice processing tools](https://parseur.com/blog/construction-invoice-processing-tools)
- [Vergo — line items and job codes](https://www.getvergo.com/learn/automatically-extract-line-items-and-job-codes-from-construction-invoices)
- [Vergo — best AP software for electrical contractors](https://www.getvergo.com/learn/best-ap-automation-software-for-electrical-contractors)
- [Vergo pricing](https://www.getvergo.com/pricing)
- [BuildTools — AI invoice processing](https://www.buildtools.com/features/ai-invoice-processing-construction)
- [ProcureDesk — electrical contractor AP](https://www.procuredesk.com/product/accounts-payable-automation-for-commercial-electrical-contractors/)
- [Field Materials — invoice reconciliation](https://www.fieldmaterials.com/platform/invoices)
- [Field Materials — pricing intelligence launch (SMACNA)](https://www.smacna.org/news/news-archive/article/2026/02/17/field-materials-launches-construction-material-pricing-intelligence)
- [Field Materials G2 reviews](https://www.g2.com/products/field-materials)
- [Dext US pricing](https://www.dext.com/us/pricing/prepare-direct/)
- [Dext line item extraction](https://dext.com/us/business/products/line-item-extraction)
- [Dext G2 reviews](https://www.g2.com/products/dext-prepare/reviews)
- [Hubdoc alternatives (invoicedataextraction.com)](https://invoicedataextraction.com/blog/hubdoc-alternatives-xero)
- [Docparser vs Nanonets (G2)](https://www.g2.com/compare/docparser-vs-nanonets)
- [Parseur — IDP pricing 2026](https://parseur.com/blog/idp-pricing)
- [imagetotable.ai — invoice extraction price comparison](https://imagetotable.ai/ko/blog/invoice-extraction-tools-price-comparison-2026)
- [Docparser Capterra reviews](https://www.capterra.com/p/154445/Docparser/reviews/?page=2)
- [Nanonets Capterra reviews](https://www.capterra.com/reviews/193484/Nanonets-OCR)
- [Ottimate G2 pricing/reviews](https://www.g2.com/products/ottimate/pricing)
- [QuickBooks — AI line-item extraction](https://quickbooks.intuit.com/r/running-a-business/line-item-ai-extraction/)
- [QuickBooks Bill Pay eliminates manual entry](https://www.firmofthefuture.com/product-update/quickbooks-bill-pay-eliminates-manual-bill-entry/)
- [Beancount — QBO AI bill ingestion guide](https://beancount.io/blog/2026/09/14/quickbooks-bill-pay-ai-bill-ingestion-manual-data-entry-guide)
- [Mike Holt forum — QuickBooks questions](https://forums.mikeholt.com/threads/a-few-quickbooks-questions.29396/latest)
- [ServiceTitan — full procurement integration FAQ](https://help.servicetitan.com/residential-s-r/docs/full-procurement-integration-partner-faq.md)
- [ServiceTitan–Ferguson partnership](https://www.servicetitan.com/blog/servicetitan-and-ferguson-partner)
- [Graybar invoice history guide (PDF)](https://res.cloudinary.com/dngevqko7/image/upload/v1770695054/osh-invoice-history-2020.pdf)
- [Graybar EDI (Zenbridge)](https://zenbridge.io/trading-partners/graybarelectricco-edi-integration)
- [Ferguson EDI 810 (Stacksync)](https://www.stacksync.com/edi/ferguson-enterprises/ferguson-enterprises-via-sps-commerce/x12-810-invoice)
- Anthropic API pricing: claude-api skill model table (cached 2026-11-03)
