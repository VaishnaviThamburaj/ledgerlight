"use client";

/** The editable line-items table, with a traffic light on every row. */
import { Light } from "@/components/ui";
import { formatMoney, round2 } from "@/lib/money";
import type { LineField, LineItem } from "@/lib/types";
import { levelOf, lineLevel, lineTarget, type Issue, type ValidationResult } from "@/lib/validation/validate";
import { BOX, fieldDomId, NumberInput } from "./fields";

const cell = "w-full rounded-md border px-2 py-1.5 text-[13px] text-slate-900 outline-none transition focus:ring-4 disabled:bg-transparent disabled:border-transparent";

export function LineItemsEditor({
  lines,
  result,
  disabled,
  currency,
  onChange,
  onAdd,
  onRemove,
}: {
  lines: LineItem[];
  result: ValidationResult;
  disabled: boolean;
  currency: string;
  onChange: (id: string, patch: Partial<LineItem>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const lvl = (id: string, f: LineField) => levelOf(result, lineTarget(id, f));
  const lineIssues = (id: string): Issue[] => result.issues.filter((i) => i.target.startsWith(`line:${id}:`));

  return (
    <div id={fieldDomId("lineItems")}>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[680px] text-left">
          <thead className="bg-slate-50 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="w-8 py-2 pl-3" />
              <th className="w-[118px] px-1.5 py-2">Part #</th>
              <th className="px-1.5 py-2">Description</th>
              <th className="w-[64px] px-1.5 py-2 text-right">Qty</th>
              <th className="w-[52px] px-1.5 py-2">UOM</th>
              <th className="w-[84px] px-1.5 py-2 text-right">Unit price</th>
              <th className="w-[60px] px-1.5 py-2">Per</th>
              <th className="w-[92px] px-1.5 py-2 text-right">Amount</th>
              <th className="w-8 pr-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const issues = lineIssues(l.id);
              const expected = l.quantity !== null && l.unitPrice !== null ? round2((l.quantity * l.unitPrice) / (l.pricePer || 1)) : null;
              return (
                <LineRows key={l.id}>
                  <tr className={`align-top ${issues.length ? "" : "border-b border-slate-100"}`}>
                    <td className="py-3 pl-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
                        <Light level={lineLevel(result, l.id)} />
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        id={fieldDomId(lineTarget(l.id, "partNumber"))}
                        aria-label={`Line ${i + 1} part number`}
                        value={l.partNumber ?? ""}
                        disabled={disabled}
                        onChange={(e) => onChange(l.id, { partNumber: e.target.value || null })}
                        className={`${cell} font-mono ${BOX[lvl(l.id, "partNumber")]}`}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        id={fieldDomId(lineTarget(l.id, "description"))}
                        aria-label={`Line ${i + 1} description`}
                        value={l.description ?? ""}
                        disabled={disabled}
                        onChange={(e) => onChange(l.id, { description: e.target.value || null })}
                        className={`${cell} ${BOX[lvl(l.id, "description")]}`}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <NumberInput
                        id={fieldDomId(lineTarget(l.id, "quantity"))}
                        ariaLabel={`Line ${i + 1} quantity`}
                        value={l.quantity}
                        disabled={disabled}
                        onChange={(v) => onChange(l.id, { quantity: v })}
                        className={`${cell} text-right tabular-nums ${BOX[lvl(l.id, "quantity")]}`}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        aria-label={`Line ${i + 1} unit of measure`}
                        value={l.unit ?? ""}
                        disabled={disabled}
                        onChange={(e) => onChange(l.id, { unit: e.target.value.toUpperCase() || null })}
                        className={`${cell} ${BOX.ok}`}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <NumberInput
                        id={fieldDomId(lineTarget(l.id, "unitPrice"))}
                        ariaLabel={`Line ${i + 1} unit price`}
                        value={l.unitPrice}
                        disabled={disabled}
                        decimals={2}
                        onChange={(v) => onChange(l.id, { unitPrice: v })}
                        className={`${cell} text-right tabular-nums ${BOX[lvl(l.id, "unitPrice")]}`}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <select
                        aria-label={`Line ${i + 1} price per`}
                        value={l.pricePer}
                        disabled={disabled}
                        onChange={(e) => onChange(l.id, { pricePer: Number(e.target.value) })}
                        className={`${cell} ${BOX.ok} pr-1`}
                      >
                        <option value={1}>EA</option>
                        <option value={100}>C</option>
                        <option value={1000}>M</option>
                      </select>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <NumberInput
                        id={fieldDomId(lineTarget(l.id, "amount"))}
                        ariaLabel={`Line ${i + 1} amount`}
                        value={l.amount}
                        disabled={disabled}
                        decimals={2}
                        onChange={(v) => onChange(l.id, { amount: v })}
                        className={`${cell} text-right font-medium tabular-nums ${BOX[lvl(l.id, "amount")]}`}
                      />
                      {expected !== null && l.amount !== null && Math.abs(expected - l.amount) > 0.01 && !disabled ? (
                        <button
                          type="button"
                          onClick={() => onChange(l.id, { amount: expected })}
                          className="mt-1 w-full rounded px-1 text-right text-[11px] font-medium text-blue-700 hover:bg-blue-50"
                          title="Replace with quantity × price"
                        >
                          Use {formatMoney(expected, currency)}
                        </button>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-2 text-right">
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => onRemove(l.id)}
                          aria-label={`Remove line ${i + 1}`}
                          className="mt-1 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M6 6l12 12M18 6 6 18" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                  {issues.length > 0 && (
                    <tr className="border-b border-slate-100">
                      <td />
                      <td colSpan={8} className="px-1.5 pb-2.5">
                        {issues.map((iss, k) => (
                          <p key={k} className={`text-xs leading-snug ${iss.level === "error" ? "text-rose-700" : "text-amber-800"}`}>
                            <span className="font-semibold">{iss.title.replace(/^Line \d+: /, "")}.</span> {iss.message}
                          </p>
                        ))}
                      </td>
                    </tr>
                  )}
                </LineRows>
              );
            })}
            {lines.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                  No line items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <button type="button" onClick={onAdd} className="mt-2 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">
          + Add line
        </button>
      )}
    </div>
  );
}

function LineRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
