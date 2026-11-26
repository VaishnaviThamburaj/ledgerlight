/** THE INBOX: upload, see everything waiting for review, export what's approved. */
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { UploadPanel } from "@/components/UploadPanel";
import { Badge, FlagCounts } from "@/components/ui";
import { summarize } from "@/lib/documents";
import { formatMoney } from "@/lib/money";
import { getStore } from "@/lib/storage";
import { validateInvoice } from "@/lib/validation/validate";

export default function InboxPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Supplier invoices, read and checked for you.</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          Upload an invoice. AI copies every field and line, plain math rules double-check it, and you only look at what&apos;s flagged before exporting.
        </p>
      </div>

      <UploadPanel />

      <Suspense fallback={<InboxSkeleton />}>
        <InboxList />
      </Suspense>
    </main>
  );
}

async function InboxList() {
  await connection();
  let records;
  try {
    records = await getStore().list();
  } catch (err) {
    return (
      <div role="alert" className="mt-10 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        <p className="font-semibold">Couldn&apos;t load your invoices.</p>
        <p className="mt-1">{err instanceof Error ? err.message : String(err)}</p>
      </div>
    );
  }

  const all = records.map(summarize);
  const rows = records.map((r) => {
    const v =
      r.status === "approved"
        ? null
        : validateInvoice(r.data, r.extraction.confidence, { otherInvoices: all.filter((o) => o.id !== r.id), verifiedTargets: r.verifiedTargets });
    return { r, v };
  });
  const waiting = records.filter((r) => r.status === "needs_review").length;
  const approved = records.filter((r) => r.status === "approved");
  const approvedValue = approved.reduce((s, r) => s + (r.data.total ?? 0), 0);

  return (
    <section className="mt-10">
      <div className="mb-4 grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Waiting for review" value={String(waiting)} />
        <Stat label="Approved" value={String(approved.length)} />
        <Stat label="Approved value" value={formatMoney(approvedValue)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">All documents</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-xs text-slate-500">Export approved:</span>
            <ExportLink href="/api/export?format=xlsx" disabled={!approved.length}>Excel</ExportLink>
            <ExportLink href="/api/export?format=csv" disabled={!approved.length}>CSV · line items</ExportLink>
            <ExportLink href="/api/export?format=csv-invoices" disabled={!approved.length}>CSV · invoices</ExportLink>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-500">
            No documents yet. Upload a PDF or click <span className="font-medium text-slate-700">Test with Sample Electrical Invoice</span>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Vendor</th>
                  <th className="px-3 py-2.5 font-medium">Invoice #</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-3 py-2.5 font-medium">Checks</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ r, v }) => (
                  <tr key={r.id} className="group hover:bg-slate-50">
                    <td className="max-w-[260px] px-5 py-3">
                      <Link href={`/review/${r.id}`} className="block truncate font-medium text-slate-900 group-hover:text-blue-700">
                        {r.data.vendorName ?? <span className="text-slate-400 italic">Unknown vendor</span>}
                      </Link>
                      <span className="block truncate text-xs text-slate-400">{r.fileName}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[13px] text-slate-700">{r.data.invoiceNumber ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{r.data.invoiceDate ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-medium text-slate-900 tabular-nums">{formatMoney(r.data.total, r.data.currency)}</td>
                    <td className="px-3 py-3">{v ? <FlagCounts errors={v.errors} warnings={v.warnings} /> : <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-3 py-3">
                      {r.status === "approved" ? <Badge tone="green">Approved</Badge> : <Badge tone="amber">Needs review</Badge>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/review/${r.id}`} className="rounded-md px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">
                        {r.status === "approved" ? "View" : "Review →"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-lg font-semibold text-slate-900 tabular-nums sm:text-xl">{value}</p>
    </div>
  );
}

function ExportLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled)
    return (
      <span title="Approve an invoice first" className="cursor-not-allowed rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-300">
        {children}
      </span>
    );
  return (
    <a href={href} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
      {children}
    </a>
  );
}

function InboxSkeleton() {
  return (
    <div className="mt-10 space-y-3">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-xl bg-slate-200/70" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
    </div>
  );
}
