"use client";

/** Editable form boxes that light up green / yellow / red. */
import { useState } from "react";
import { Light } from "@/components/ui";
import { formatPlain, parseNumberInput } from "@/lib/money";
import type { Issue, Level } from "@/lib/validation/validate";

export const fieldDomId = (target: string) => `field-${target}`;

export const BOX: Record<Level, string> = {
  ok: "border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20",
  warning: "border-amber-400 bg-amber-50/70 focus:border-amber-500 focus:ring-amber-500/25",
  error: "border-rose-400 bg-rose-50/70 focus:border-rose-500 focus:ring-rose-500/25",
};

const inputBase =
  "w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-700";

interface Common {
  target: string;
  label: string;
  level: Level;
  issues?: Issue[];
  confidence?: number;
  onLooksRight?: () => void;
  className?: string;
  hint?: React.ReactNode;
}

function Shell({ target, label, level, issues, confidence, onLooksRight, className = "", hint, children }: Common & { children: React.ReactNode }) {
  const lowConfidenceOnly = issues?.length && issues.every((i) => i.rule === "low_confidence");
  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-2">
        <Light level={level} />
        <label htmlFor={fieldDomId(target)} className="text-xs font-medium text-slate-600">
          {label}
        </label>
        {confidence !== undefined && level === "ok" && (
          <span className="ml-auto text-[11px] text-slate-400 tabular-nums" title="How sure the AI reader was">
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      {children}
      {issues?.map((issue, i) => (
        <p key={i} className={`mt-1.5 text-xs leading-snug ${issue.level === "error" ? "text-rose-700" : "text-amber-800"}`}>
          <span className="font-semibold">{issue.title}.</span> {issue.message}
        </p>
      ))}
      {lowConfidenceOnly && onLooksRight ? (
        <button type="button" onClick={onLooksRight} className="mt-1.5 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
          ✓ Looks right
        </button>
      ) : null}
      {hint && !issues?.length ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function TextField(
  props: Common & { value: string | null; onChange: (v: string | null) => void; type?: "text" | "date"; placeholder?: string; disabled?: boolean; mono?: boolean },
) {
  const { target, level, value, onChange, type = "text", placeholder, disabled, mono } = props;
  return (
    <Shell {...props}>
      <input
        id={fieldDomId(target)}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        aria-invalid={level === "error"}
        className={`${inputBase} ${BOX[level]} ${mono ? "font-mono text-[13px]" : ""}`}
      />
    </Shell>
  );
}

export function MoneyField(props: Common & { value: number | null; onChange: (v: number | null) => void; disabled?: boolean; currency?: string }) {
  const { target, level, value, onChange, disabled } = props;
  return (
    <Shell {...props}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400">$</span>
        <NumberInput
          id={fieldDomId(target)}
          value={value}
          onChange={onChange}
          disabled={disabled}
          decimals={2}
          className={`${inputBase} ${BOX[level]} pl-7 text-right tabular-nums`}
          ariaInvalid={level === "error"}
        />
      </div>
    </Shell>
  );
}

/**
 * A number box that lets people type freely ("1,240.50", "$12") and only
 * converts to a number behind the scenes.
 */
export function NumberInput({
  id,
  value,
  onChange,
  disabled,
  className,
  ariaInvalid,
  ariaLabel,
  decimals,
}: {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  className?: string;
  ariaInvalid?: boolean;
  ariaLabel?: string;
  decimals?: number;
}) {
  const [text, setText] = useState(formatPlain(value, decimals));
  const [bad, setBad] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  // Follow outside changes (e.g. a "Use $101.40" click) without fighting the typist.
  if (value !== lastValue) {
    setLastValue(value);
    if (parseNumberInput(text) !== value) {
      setText(formatPlain(value, decimals));
      setBad(false);
    }
  }

  return (
    <input
      id={id}
      inputMode="decimal"
      value={text}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid || bad}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = parseNumberInput(e.target.value);
        if (parsed === null) {
          setBad(false);
          onChange(null);
        } else if (Number.isNaN(parsed)) {
          setBad(true);
        } else {
          setBad(false);
          onChange(parsed);
        }
      }}
      className={`${className} ${bad ? "!border-rose-500" : ""}`}
    />
  );
}
