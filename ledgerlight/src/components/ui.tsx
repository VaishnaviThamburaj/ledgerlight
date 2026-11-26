/** Small shared visual pieces: the logo, traffic-light dots and badges. */
import type { Level } from "@/lib/validation/validate";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center gap-[3px] rounded-lg bg-slate-900 px-1.5"
      style={{ height: size }}
      aria-hidden
    >
      <span className="h-[7px] w-[7px] rounded-full bg-rose-500" />
      <span className="h-[7px] w-[7px] rounded-full bg-amber-400" />
      <span className="h-[7px] w-[7px] rounded-full bg-emerald-400" />
    </span>
  );
}

const DOT: Record<Level, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-400",
  error: "bg-rose-500",
};

const LABEL: Record<Level, string> = { ok: "Passed checks", warning: "Needs a look", error: "Needs fixing" };

export function Light({ level, className = "" }: { level: Level; className?: string }) {
  return (
    <span
      title={LABEL[level]}
      aria-label={LABEL[level]}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${DOT[level]} ${className}`}
    />
  );
}

export function Badge({ tone, children }: { tone: "green" | "amber" | "rose" | "slate" | "blue"; children: React.ReactNode }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
    rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
    slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function FlagCounts({ errors, warnings }: { errors: number; warnings: number }) {
  if (!errors && !warnings)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <Light level="ok" /> All clear
      </span>
    );
  return (
    <span className="inline-flex items-center gap-3 text-xs font-medium">
      {errors > 0 && (
        <span className="inline-flex items-center gap-1.5 text-rose-700">
          <Light level="error" /> {errors}
        </span>
      )}
      {warnings > 0 && (
        <span className="inline-flex items-center gap-1.5 text-amber-700">
          <Light level="warning" /> {warnings}
        </span>
      )}
    </span>
  );
}
