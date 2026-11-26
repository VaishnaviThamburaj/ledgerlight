/** The two small status pills in the header: is the AI connected? where is data saved? */
import { connection } from "next/server";
import { readerStatus } from "@/lib/extraction";
import { getStore } from "@/lib/storage";

export async function SetupStatus() {
  await connection(); // read settings at request time, not build time
  let reader = { name: "claude", configured: false };
  try {
    reader = readerStatus();
  } catch {
    /* unknown provider: shown as not connected */
  }
  const store = getStore();

  return (
    <div className="flex items-center gap-2 text-xs">
      <Pill ok={reader.configured} title={reader.configured ? "The AI reader is connected." : "Add ANTHROPIC_API_KEY to read real documents. The sample works without it."}>
        {reader.configured ? `AI reader: ${reader.name === "claude" ? "Claude" : reader.name}` : "AI reader: demo only"}
      </Pill>
      <Pill
        ok={store.kind === "supabase"}
        warn={store.kind === "local" && store.durable}
        title={
          store.kind === "supabase"
            ? "Records and PDFs are saved in Supabase."
            : store.durable
              ? "Saved in the .data folder on this computer. Connect Supabase for permanent online storage."
              : "Temporary storage: data will be lost. Connect Supabase."
        }
      >
        {store.kind === "supabase" ? "Saved to Supabase" : store.durable ? "Saved on this computer" : "Temporary storage"}
      </Pill>
    </div>
  );
}

function Pill({ ok, warn, title, children }: { ok: boolean; warn?: boolean; title: string; children: React.ReactNode }) {
  const tone = ok ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : warn ? "bg-slate-100 text-slate-600 ring-slate-400/30" : "bg-amber-50 text-amber-800 ring-amber-600/25";
  const dot = ok ? "bg-emerald-500" : warn ? "bg-slate-400" : "bg-amber-400";
  return (
    <span title={title} className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ring-1 ring-inset md:inline-flex ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
