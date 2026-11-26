"use client";

/**
 * THE REVIEW DESK.
 * Left: the original PDF. Right: what was read, as editable boxes with
 * traffic lights. Every edit re-runs the checker instantly, autosaves as a
 * draft, and Approve locks it in for export.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Light } from "@/components/ui";
import { formatMoney, round2 } from "@/lib/money";
import type { DocumentType, FieldKey, InvoiceData, InvoiceRecord, InvoiceSummary, LineItem } from "@/lib/types";
import { FIELD_LABELS, levelOf, validateInvoice, type Issue } from "@/lib/validation/validate";
import { fieldDomId, MoneyField, TextField } from "./fields";
import { LineItemsEditor } from "./LineItemsEditor";

type SaveState = "idle" | "saving" | "saved" | "error";

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "invoice", label: "Invoice" },
  { value: "credit_memo", label: "Credit memo" },
  { value: "quote", label: "Quote" },
  { value: "packing_slip", label: "Packing slip" },
  { value: "statement", label: "Statement" },
  { value: "other", label: "Other" },
];

export function ReviewDesk({ record, others }: { record: InvoiceRecord; others: InvoiceSummary[] }) {
  const router = useRouter();
  const [data, setData] = useState<InvoiceData>(record.data);
  const [verified, setVerified] = useState<string[]>(record.verifiedTargets);
  const [status, setStatus] = useState(record.status);
  const [approvedAt, setApprovedAt] = useState(record.approvedAt);
  const [note, setNote] = useState(record.approvalNote ?? "");
  const [dirty, setDirty] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [busy, setBusy] = useState<null | "approve" | "reopen" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const lineCounter = useRef(0);

  const locked = status === "approved";
  const conf = record.extraction.confidence;

  const result = useMemo(
    () => validateInvoice(data, conf, { otherInvoices: others, verifiedTargets: verified }),
    [data, conf, others, verified],
  );

  // ---------------------------------------------------------------- editing
  const touch = (target: string) => setVerified((v) => (v.includes(target) ? v : [...v, target]));

  function setField<K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    touch(key);
    setDirty(true);
  }

  function setLine(id: string, patch: Partial<LineItem>) {
    setData((d) => ({ ...d, lineItems: d.lineItems.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    touch(`line:${id}`);
    setDirty(true);
  }

  function addLine() {
    lineCounter.current += 1;
    const id = `new${Date.now().toString(36)}${lineCounter.current}`;
    setData((d) => ({
      ...d,
      lineItems: [...d.lineItems, { id, partNumber: null, description: null, quantity: null, unit: "EA", unitPrice: null, pricePer: 1, amount: null }],
    }));
    setDirty(true);
    setTimeout(() => document.getElementById(fieldDomId(`line:${id}:partNumber`))?.focus(), 50);
  }

  function removeLine(id: string) {
    setData((d) => ({ ...d, lineItems: d.lineItems.filter((l) => l.id !== id) }));
    setDirty(true);
  }

  // ---------------------------------------------------------------- autosave draft
  useEffect(() => {
    if (!dirty || locked) return;
    const timer = setTimeout(async () => {
      setSave("saving");
      try {
        const res = await fetch(`/api/documents/${record.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, verifiedTargets: verified }),
        });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error);
        setDirty(false);
        setSave("saved");
      } catch {
        setSave("error");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [data, verified, dirty, locked, record.id]);

  // ---------------------------------------------------------------- actions
  async function approve() {
    setBusy("approve");
    setError(null);
    try {
      const res = await fetch(`/api/documents/${record.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, verifiedTargets: verified, note: note.trim() || null }),
      });
      const json = (await res.json().catch(() => ({}))) as { approvedAt?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Couldn't approve. Please try again.");
      setStatus("approved");
      setApprovedAt(json.approvedAt ?? new Date().toISOString());
      setDirty(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't approve.");
    } finally {
      setBusy(null);
    }
  }

  async function reopen() {
    setBusy("reopen");
    setError(null);
    try {
      const res = await fetch(`/api/documents/${record.id}/reopen`, { method: "POST" });
      if (!res.ok) throw new Error();
      setStatus("needs_review");
      setApprovedAt(null);
      router.refresh();
    } catch {
      setError("Couldn't reopen. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this document and its PDF? This can't be undone.")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/documents/${record.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/");
      router.refresh();
    } catch {
      setBusy(null);
      setError("Couldn't delete. Please try again.");
    }
  }

  function jumpTo(target: string) {
    const id = target.startsWith("line:") ? fieldDomId(target) : fieldDomId(target === "documentType" ? "documentType" : target);
    const el = document.getElementById(id) ?? document.getElementById(fieldDomId("lineItems"));
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) setTimeout(() => el.focus({ preventScroll: true }), 300);
    el.classList.remove("ll-flash");
    void el.offsetWidth;
    el.classList.add("ll-flash");
  }

  // ---------------------------------------------------------------- helpers for rendering
  const f = (key: FieldKey) => ({
    target: key,
    label: FIELD_LABELS[key],
    level: levelOf(result, key),
    issues: result.byTarget[key],
    confidence: verified.includes(key) ? undefined : conf[key],
    onLooksRight: () => touch(key),
    disabled: locked,
  });

  const lineSum = round2(data.lineItems.reduce((s, l) => s + (l.amount ?? 0), 0));
  const computedTotal = round2((data.subtotal ?? lineSum) + (data.tax ?? 0) + (data.freight ?? 0));
  const issuesSorted = [...result.issues].sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
  const isDemo = record.extraction.provider === "demo";

  return (
    <div className="grid flex-1 lg:h-[calc(100vh-57px)] lg:flex-none lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* ------------------------------------------------ LEFT: original PDF */}
      <section className="flex flex-col border-b border-slate-200 bg-slate-100 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 text-sm">
          <Link href="/" className="rounded-md px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Back to inbox">
            ←
          </Link>
          <span className="truncate font-medium text-slate-800" title={record.fileName}>
            {record.fileName}
          </span>
          <a
            href={`/api/documents/${record.id}/file`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Open in new tab ↗
          </a>
        </div>
        <iframe
          title="Original document"
          src={`/api/documents/${record.id}/file#toolbar=1&navpanes=0&view=FitH`}
          className="hidden h-[75vh] w-full flex-1 bg-slate-100 md:block lg:h-auto"
        />
        {/* Phones can't show a PDF inside a page, so offer a button instead. */}
        <div className="p-4 md:hidden">
          <a
            href={`/api/documents/${record.id}/file`}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200"
          >
            View the original PDF ↗
          </a>
        </div>
      </section>

      {/* ------------------------------------------------ RIGHT: extracted data */}
      <section className="flex min-h-0 flex-col bg-[#f6f7f9]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 sm:px-6">
            {/* Summary */}
            <SummaryCard
              locked={locked}
              approvedAt={approvedAt}
              note={record.approvalNote}
              errors={result.errors}
              warnings={result.warnings}
              provider={record.extraction.provider}
              model={record.extraction.model}
              isDemo={isDemo}
              notes={record.extraction.notes}
            />

            {/* Issue checklist */}
            {!locked && issuesSorted.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">What needs your eyes</p>
                <ul>
                  {issuesSorted.map((issue, i) => (
                    <IssueRow key={`${issue.target}-${issue.rule}-${i}`} issue={issue} onClick={() => jumpTo(issue.target)} />
                  ))}
                </ul>
              </div>
            )}

            {/* Vendor & invoice */}
            <Card title="Vendor & invoice">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="mb-1 flex items-center gap-2">
                    <Light level={levelOf(result, "documentType")} />
                    <label htmlFor={fieldDomId("documentType")} className="text-xs font-medium text-slate-600">
                      Document type
                    </label>
                  </div>
                  <select
                    id={fieldDomId("documentType")}
                    value={data.documentType}
                    disabled={locked}
                    onChange={(e) => setField("documentType", e.target.value as DocumentType)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 disabled:bg-slate-50 sm:w-56"
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {result.byTarget.documentType?.map((iss, i) => (
                    <p key={i} className={`mt-1.5 text-xs ${iss.level === "error" ? "text-rose-700" : "text-amber-800"}`}>
                      <span className="font-semibold">{iss.title}.</span> {iss.message}
                    </p>
                  ))}
                </div>
                <TextField {...f("vendorName")} value={data.vendorName} onChange={(v) => setField("vendorName", v)} className="sm:col-span-2" />
                <TextField {...f("vendorAddress")} value={data.vendorAddress} onChange={(v) => setField("vendorAddress", v)} className="sm:col-span-2" />
                <TextField {...f("invoiceNumber")} mono value={data.invoiceNumber} onChange={(v) => setField("invoiceNumber", v)} />
                <TextField {...f("poNumber")} mono value={data.poNumber} onChange={(v) => setField("poNumber", v)} placeholder="e.g. PO-55120" />
                <TextField {...f("invoiceDate")} type="date" value={data.invoiceDate} onChange={(v) => setField("invoiceDate", v)} />
                <TextField {...f("dueDate")} type="date" value={data.dueDate} onChange={(v) => setField("dueDate", v)} />
                <TextField {...f("paymentTerms")} value={data.paymentTerms} onChange={(v) => setField("paymentTerms", v)} placeholder="e.g. Net 30" />
                <TextField {...f("customerName")} value={data.customerName} onChange={(v) => setField("customerName", v)} />
              </div>
            </Card>

            {/* Line items */}
            <Card
              title="Line items"
              aside={
                <span className="text-xs text-slate-500">
                  {data.lineItems.length} line{data.lineItems.length === 1 ? "" : "s"} · {formatMoney(lineSum, data.currency)}
                </span>
              }
            >
              <LineItemsEditor
                lines={data.lineItems}
                result={result}
                disabled={locked}
                currency={data.currency}
                onChange={setLine}
                onAdd={addLine}
                onRemove={removeLine}
              />
              {result.byTarget.lineItems?.map((iss, i) => (
                <p key={i} className="mt-2 text-xs text-rose-700">
                  <span className="font-semibold">{iss.title}.</span> {iss.message}
                </p>
              ))}
            </Card>

            {/* Totals */}
            <Card title="Totals">
              <div className="grid gap-4 sm:grid-cols-2">
                <MoneyField {...f("subtotal")} value={data.subtotal} onChange={(v) => setField("subtotal", v)} hint={`Lines add up to ${formatMoney(lineSum, data.currency)}`} />
                <MoneyField {...f("tax")} value={data.tax} onChange={(v) => setField("tax", v)} />
                <MoneyField {...f("freight")} value={data.freight} onChange={(v) => setField("freight", v)} />
                <MoneyField
                  {...f("total")}
                  value={data.total}
                  onChange={(v) => setField("total", v)}
                  hint={`Subtotal + tax + freight = ${formatMoney(computedTotal, data.currency)}`}
                />
              </div>
            </Card>
            <div className="h-2" />
          </div>
        </div>

        {/* Action bar */}
        <ActionBar
          locked={locked}
          errors={result.errors}
          warnings={result.warnings}
          save={save}
          dirty={dirty}
          busy={busy}
          error={error}
          note={note}
          setNote={setNote}
          onApprove={approve}
          onReopen={reopen}
          onDelete={remove}
        />
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ pieces

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {aside}
      </div>
      {children}
    </div>
  );
}

function IssueRow({ issue, onClick }: { issue: Issue; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50">
        <Light level={issue.level} className="mt-1" />
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-medium ${issue.level === "error" ? "text-rose-800" : "text-amber-900"}`}>{issue.title}</span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-600">{issue.message}</span>
        </span>
        <span className="mt-0.5 shrink-0 text-xs text-slate-400">Show →</span>
      </button>
    </li>
  );
}

function SummaryCard(props: {
  locked: boolean;
  approvedAt: string | null;
  note: string | null;
  errors: number;
  warnings: number;
  provider: string;
  model?: string;
  isDemo: boolean;
  notes: string[];
}) {
  const { locked, approvedAt, errors, warnings, isDemo, notes } = props;
  let tone = "border-emerald-200 bg-emerald-50";
  let title = "Everything checks out";
  let body = "Every required field is present, the math adds up and nothing looks unusual. Give it a quick glance and approve.";
  if (locked) {
    title = "Approved";
    body = `Approved ${approvedAt ? new Date(approvedAt).toLocaleString() : ""}. This invoice is included in exports.`;
  } else if (errors > 0) {
    tone = "border-rose-200 bg-rose-50";
    title = `${errors} red flag${errors === 1 ? "" : "s"}${warnings ? ` · ${warnings} to double-check` : ""}`;
    body = "Something doesn't add up or is missing. Fix the red fields below, or approve with a written reason.";
  } else if (warnings > 0) {
    tone = "border-amber-200 bg-amber-50";
    title = `${warnings} thing${warnings === 1 ? "" : "s"} to double-check`;
    body = "Nothing is wrong with the math, but a few fields deserve a quick look before you approve.";
  }

  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex gap-1.5 pt-1" aria-hidden>
          <span className={`h-3 w-3 rounded-full ${!locked && errors ? "bg-rose-500" : "bg-rose-200"}`} />
          <span className={`h-3 w-3 rounded-full ${!locked && !errors && warnings ? "bg-amber-400" : "bg-amber-100"}`} />
          <span className={`h-3 w-3 rounded-full ${locked || (!errors && !warnings) ? "bg-emerald-500" : "bg-emerald-100"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{body}</p>
          {locked && props.note ? (
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium">Reviewer note:</span> {props.note}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isDemo ? <Badge tone="blue">Demo mode</Badge> : <Badge tone="slate">Read by {props.provider === "claude" ? "Claude" : props.provider}</Badge>}
        </div>
      </div>
      {notes.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-black/5 pt-3 text-xs text-slate-600">
          {notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionBar(props: {
  locked: boolean;
  errors: number;
  warnings: number;
  save: SaveState;
  dirty: boolean;
  busy: null | "approve" | "reopen" | "delete";
  error: string | null;
  note: string;
  setNote: (v: string) => void;
  onApprove: () => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const { locked, errors, warnings, save, dirty, busy, error, note, setNote } = props;
  const needsReason = errors > 0;
  const canApprove = !busy && (!needsReason || note.trim().length >= 3);
  const saveText = dirty || save === "saving" ? "Saving…" : save === "saved" ? "Draft saved" : save === "error" ? "Couldn't save draft" : "";

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_12px_-6px_rgb(15_23_42_/_0.08)] sm:px-6">
      {error && (
        <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      {locked ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Light level="ok" /> Approved and ready to export
          </span>
          <button type="button" onClick={props.onReopen} disabled={Boolean(busy)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            {busy === "reopen" ? "Reopening…" : "Reopen for edits"}
          </button>
          <a href="/api/export?format=xlsx" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Download Excel
          </a>
          <Link href="/" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
            Back to inbox
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {needsReason && (
            <div>
              <label htmlFor="approve-note" className="text-xs font-medium text-rose-800">
                To approve with red flags, write a short reason (saved to the audit trail):
              </label>
              <input
                id="approve-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Vendor overcharge on line 4. Short-paying $9.00, credit requested."
                className="mt-1 w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20"
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-auto text-xs text-slate-500" aria-live="polite">
              {saveText}
            </span>
            <button type="button" onClick={props.onDelete} disabled={Boolean(busy)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700">
              {busy === "delete" ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={props.onApprove}
              disabled={!canApprove}
              className={`rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                needsReason ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {busy === "approve"
                ? "Approving…"
                : needsReason
                  ? "Approve anyway"
                  : warnings
                    ? `Approve (${warnings} warning${warnings === 1 ? "" : "s"})`
                    : "Approve ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
