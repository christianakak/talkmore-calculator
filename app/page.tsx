"use client";

import { useRef, useState } from "react";
import LineCard from "@/components/LineCard";
import QuoteSummary from "@/components/QuoteSummary";
import { type Line, formatKr, quoteTotals } from "@/lib/pricing";

function newLine(id: string): Line {
  return { id, planId: "10gb", tier: "u30_20", addonIds: [] };
}

export default function Page() {
  const counter = useRef(1);
  const [lines, setLines] = useState<Line[]>(() => [newLine("line-0")]);
  const [showSummary, setShowSummary] = useState(false);

  const totals = quoteTotals(lines);

  function addLine() {
    const id = `line-${counter.current++}`;
    setLines((prev) => [...prev, newLine(id)]);
  }

  function updateLine(updated: Line) {
    setLines((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="relative z-10 flex-1 flex flex-col">
      {/* Chrome */}
      <div className="flex items-center justify-between px-6 sm:px-9 pb-1 pt-[max(1.75rem,calc(env(safe-area-inset-top)+0.5rem))]">
        <span className="font-display text-[19px] font-bold tracking-tight text-ink">
          Talkmore<span className="text-accent">.</span>
        </span>
        <span className="eyebrow text-ink">Salgskalkulator</span>
      </div>

      <main className="flex-1 px-5 sm:px-9 pb-44">
        <div className="max-w-[640px] mx-auto">
          {/* Heading */}
          <header className="reveal pt-8 pb-7">
            <p className="eyebrow mb-3">Tilbud</p>
            <h1 className="text-[clamp(30px,7vw,44px)]">Sett sammen et tilbud.</h1>
            <p className="text-ink-soft mt-3 max-w-[44ch]">
              Legg til abonnement, velg kundetype og se månedspris og besparelse mot full
              pris.
            </p>
          </header>

          <div className="flex flex-col gap-3.5">
            {lines.map((line, i) => (
              <div key={line.id} className="reveal" style={{ "--i": i + 1 } as React.CSSProperties}>
                <LineCard
                  line={line}
                  index={i}
                  canRemove={lines.length > 1}
                  onChange={updateLine}
                  onRemove={() => removeLine(line.id)}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addLine}
              className="reveal w-full rounded-[16px] border border-dashed border-line text-ink-soft font-medium py-4 hover:border-ink-soft hover:text-ink transition"
              style={{ "--i": lines.length + 1 } as React.CSSProperties}
            >
              Legg til abonnement
            </button>
          </div>
        </div>
      </main>

      {/* Sticky total bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto flex items-center gap-4 px-6 sm:px-4 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted leading-none mb-1">
              Total · {lines.length} {lines.length === 1 ? "abonnement" : "abonnementer"}
            </p>
            <p className="font-display text-[26px] font-medium text-ink tnum leading-none">
              {formatKr(totals.monthly)}
              <span className="text-[13px] font-normal text-muted"> /mnd</span>
            </p>
            {totals.savingsMonthly > 0 && (
              <p className="text-[12px] text-accent font-medium mt-1 leading-none">
                Sparer {formatKr(totals.savingsYearly)} i året
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowSummary(true)}
            className="shrink-0 rounded-[11px] bg-accent text-accent-ink font-semibold text-[15px] px-5 py-3.5 shadow-[0_10px_24px_rgba(47,84,235,0.26)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(47,84,235,0.34)] transition"
          >
            Vis oppsummering
          </button>
        </div>
      </div>

      {showSummary && <QuoteSummary lines={lines} onClose={() => setShowSummary(false)} />}
    </div>
  );
}
