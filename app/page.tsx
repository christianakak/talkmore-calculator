"use client";

import { useEffect, useRef, useState } from "react";
import FamilyCard from "@/components/FamilyCard";
import LineCard from "@/components/LineCard";
import QuoteSummary from "@/components/QuoteSummary";
import {
  FAMILY_POOLS,
  PLANS,
  PRICES_SOURCE,
  PRICES_VERIFIED,
  type FamilyConfig,
  type Line,
  combinedTotals,
  formatKr,
} from "@/lib/pricing";

const STORAGE_KEY = "talkmore-quote-v1";

function newLine(id: string): Line {
  return { id, planId: "10gb", discounts: ["u30"], addonIds: [] };
}
function newFamily(id: string): FamilyConfig {
  return { id, members: 2, poolId: "f20", samlerabatt: false };
}

const planIds = new Set(PLANS.map((p) => p.id));
const poolIds = new Set(FAMILY_POOLS.map((p) => p.id));

// Defensive load: drop anything referencing a plan/pool that no longer exists.
function sanitize(data: unknown): { lines: Line[]; families: FamilyConfig[]; counter: number } | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { lines?: unknown; families?: unknown; counter?: unknown };
  const lines = Array.isArray(d.lines)
    ? (d.lines as Line[]).filter((l) => l && planIds.has(l.planId))
    : [];
  const families = Array.isArray(d.families)
    ? (d.families as FamilyConfig[]).filter((f) => f && poolIds.has(f.poolId))
    : [];
  const counter = typeof d.counter === "number" ? d.counter : 1;
  return { lines, families, counter };
}

export default function Page() {
  const counter = useRef(1);
  const loaded = useRef(false);
  const [lines, setLines] = useState<Line[]>(() => [newLine("line-0")]);
  const [families, setFamilies] = useState<FamilyConfig[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  // Load any saved quote once on mount. Reading localStorage in a lazy initializer
  // would diverge from the server render and trip hydration, so we load in an effect.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = sanitize(JSON.parse(raw));
        if (data && (data.lines.length || data.families.length)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration-safe load
          setLines(data.lines);
          setFamilies(data.families);
          counter.current = Math.max(data.counter, 1);
        }
      }
    } catch {
      // ignore corrupt storage
    }
    loaded.current = true;
  }, []);

  // Persist on every change (after the initial load).
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lines, families, counter: counter.current }),
      );
    } catch {
      // storage full / unavailable: non-fatal
    }
  }, [lines, families]);

  const totals = combinedTotals(lines, families);
  const isEmpty = lines.length === 0 && families.length === 0;

  function addLine() {
    setLines((prev) => [...prev, newLine(`line-${counter.current++}`)]);
  }
  function duplicateLine(line: Line) {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.id === line.id);
      const copy: Line = { ...line, addonIds: [...line.addonIds], discounts: [...line.discounts], id: `line-${counter.current++}` };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
  }
  function addFamily() {
    setFamilies((prev) => [...prev, newFamily(`fam-${counter.current++}`)]);
  }
  function updateLine(updated: Line) {
    setLines((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }
  function updateFamily(updated: FamilyConfig) {
    setFamilies((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }
  function removeFamily(id: string) {
    setFamilies((prev) => prev.filter((f) => f.id !== id));
  }
  function reset() {
    setLines([newLine(`line-${counter.current++}`)]);
    setFamilies([]);
    setShowSummary(false);
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
          <header className="reveal pt-8 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow mb-3">Tilbud</p>
                <h1 className="text-[clamp(30px,7vw,44px)]">Sett sammen et tilbud.</h1>
              </div>
              {!isEmpty && (
                <button
                  type="button"
                  onClick={reset}
                  className="mt-1 shrink-0 text-[13px] font-medium text-ink-soft hover:text-ink border border-line rounded-full px-3.5 py-1.5 transition"
                >
                  Nullstill
                </button>
              )}
            </div>
            <p className="text-ink-soft mt-3 max-w-[44ch]">
              Bland enkeltabonnement og familie i samme tilbud. Velg rabatter og se total,
              snittpris og besparelse.
            </p>
          </header>

          <div className="flex flex-col gap-3.5">
            {lines.map((line, i) => (
              <div
                key={line.id}
                className="reveal"
                style={{ "--i": i + 1 } as React.CSSProperties}
              >
                <LineCard
                  line={line}
                  index={i}
                  canRemove={lines.length + families.length > 1}
                  onChange={updateLine}
                  onDuplicate={() => duplicateLine(line)}
                  onRemove={() => removeLine(line.id)}
                />
              </div>
            ))}

            {families.map((family, i) => (
              <div key={family.id} className="reveal">
                <FamilyCard
                  family={family}
                  index={i}
                  onChange={updateFamily}
                  onRemove={() => removeFamily(family.id)}
                />
              </div>
            ))}

            {isEmpty && (
              <p className="text-center text-muted text-sm py-8">
                Legg til et abonnement eller en familie for å starte.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={addLine}
                className="rounded-[16px] border border-dashed border-line text-ink-soft font-medium py-4 hover:border-ink-soft hover:text-ink transition"
              >
                + Abonnement
              </button>
              <button
                type="button"
                onClick={addFamily}
                className="rounded-[16px] border border-dashed border-line text-ink-soft font-medium py-4 hover:border-ink-soft hover:text-ink transition"
              >
                + Familie
              </button>
            </div>
          </div>

          {/* Freshness signal */}
          <p className="text-center text-[12px] text-muted mt-8">
            Priser verifisert {PRICES_VERIFIED} mot {PRICES_SOURCE}
          </p>
        </div>
      </main>

      {/* Sticky total bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto flex items-center gap-4 px-6 sm:px-4 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted leading-none mb-1">
              Total · {totals.units} {totals.units === 1 ? "abonnement" : "abonnementer"}
            </p>
            <p className="font-display text-[26px] font-medium text-ink tnum leading-none">
              {formatKr(totals.monthly)}
              <span className="text-[13px] font-normal text-muted"> /mnd</span>
            </p>
            {totals.savingsMonthly >= 1 && (
              <p className="text-[12px] text-accent font-medium mt-1 leading-none">
                Sparer {formatKr(totals.savingsYearly)} i året
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowSummary(true)}
            disabled={isEmpty}
            className="shrink-0 rounded-[11px] bg-accent text-accent-ink font-semibold text-[15px] px-5 py-3.5 shadow-[0_10px_24px_rgba(47,84,235,0.26)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(47,84,235,0.34)] transition disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
          >
            Vis oppsummering
          </button>
        </div>
      </div>

      {showSummary && (
        <QuoteSummary lines={lines} families={families} onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}
