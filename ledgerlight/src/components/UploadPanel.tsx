"use client";

/**
 * THE FRONT DESK: drag-and-drop upload plus the "Test with Sample" button.
 * The sample goes through exactly the same pipeline as a real upload.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SAMPLE_URL = "/samples/sample-electrical-invoice.pdf";

const STAGES = ["Uploading the PDF…", "AI is reading every line…", "Checking the math…", "Almost done…"];

export function UploadPanel() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | { label: string; stage: number }>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setBusy((b) => (b ? { ...b, stage: Math.min(b.stage + 1, STAGES.length - 1) } : b)), 4500);
    return () => clearInterval(timer);
  }, [busy]);

  async function send(files: File[]) {
    setError(null);
    const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) {
      setError("Please choose a PDF file.");
      return;
    }
    let lastId: string | null = null;
    for (const [i, file] of pdfs.entries()) {
      setBusy({ label: pdfs.length > 1 ? `${file.name} (${i + 1} of ${pdfs.length})` : file.name, stage: 0 });
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/documents", { method: "POST", body });
        const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!res.ok || !json.id) throw new Error(json.error || "Upload failed. Please try again.");
        lastId = json.id;
      } catch (e) {
        setBusy(null);
        setError(`${file.name}: ${e instanceof Error ? e.message : "Upload failed."}`);
        router.refresh();
        return;
      }
    }
    if (pdfs.length === 1 && lastId) {
      router.push(`/review/${lastId}`);
    } else {
      setBusy(null);
      router.refresh();
    }
  }

  async function runSample() {
    setError(null);
    setBusy({ label: "Sample electrical invoice", stage: 0 });
    try {
      const res = await fetch(SAMPLE_URL);
      if (!res.ok) throw new Error("Couldn't load the sample file.");
      const blob = await res.blob();
      await send([new File([blob], "sample-electrical-invoice.pdf", { type: "application/pdf" })]);
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : "Couldn't load the sample.");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) void send(Array.from(e.dataTransfer.files));
        }}
        className={`relative flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-8 text-center transition ${
          dragging ? "border-blue-500 bg-blue-50/60" : "border-slate-300 hover:border-slate-400"
        }`}
      >
        {busy ? (
          <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
            <div>
              <p className="font-medium text-slate-900">{STAGES[busy.stage]}</p>
              <p className="mt-1 max-w-sm truncate text-sm text-slate-500">{busy.label}</p>
              <p className="mt-3 text-xs text-slate-400">Usually 15–60 seconds, depending on length.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 16V4m0 0-4 4m4-4 4 4" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-900">Drop supplier invoices here</p>
            <p className="mt-1 text-sm text-slate-500">PDF scans, photos-to-PDF or digital invoices · up to 20 MB each</p>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Choose PDF files
            </button>
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                void send(files);
              }}
            />
          </>
        )}
      </div>

      <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
        <div>
          <p className="text-xs font-semibold tracking-wider text-blue-300 uppercase">60-second demo</p>
          <p className="mt-2 text-lg leading-snug font-semibold">Test with a sample electrical invoice</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            A 7-line wire, conduit and breaker invoice, with one hidden overcharge for the checker to catch.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={runSample}
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Test with Sample Electrical Invoice
          </button>
          <a href={SAMPLE_URL} target="_blank" rel="noreferrer" className="text-center text-xs text-slate-400 underline-offset-2 hover:text-white hover:underline">
            View the sample PDF
          </a>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 lg:col-span-2">
          {error}
        </div>
      )}
    </div>
  );
}
