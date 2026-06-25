"use client";

import { useState } from "react";
import {
  ADDONS,
  BENEFITS,
  DISCOUNTS,
  type FamilyConfig,
  type Line,
  combinedTotals,
  discountApplies,
  familyConfigTotal,
  formatKr,
  getFamilyPool,
  getPlan,
  lineTotal,
} from "@/lib/pricing";

function activeDiscountLabels(line: Line): string[] {
  const plan = getPlan(line.planId);
  return DISCOUNTS.filter(
    (d) => line.discounts.includes(d.id) && discountApplies(d.id, plan),
  ).map((d) => d.label);
}

function lineDescription(line: Line): string {
  const plan = getPlan(line.planId);
  const addons = line.addonIds
    .map((id) => ADDONS.find((a) => a.id === id)?.name)
    .filter(Boolean);
  const parts = [`${plan.name}${plan.tag ? ` ${plan.tag}` : ""}${plan.bonus ? ` ${plan.bonus}` : ""}`];
  if (addons.length) parts.push(addons.join(" + "));
  return parts.join(" · ");
}

function lineSubtitle(line: Line): string {
  if (getPlan(line.planId).flat) return "Fast pris";
  const discounts = activeDiscountLabels(line);
  return discounts.length ? discounts.join(" · ") : "Ingen rabatt";
}

function familyDescription(f: FamilyConfig): string {
  const pool = getFamilyPool(f.poolId);
  return `Familie · ${f.members} medlemmer · ${pool.name}${pool.extraGb > 0 ? ` +${pool.extraGb} GB` : ""}`;
}

function buildShareText(lines: Line[], families: FamilyConfig[]): string {
  const totals = combinedTotals(lines, families);
  const rows: string[] = [];
  lines.forEach((l, i) =>
    rows.push(`${i + 1}. ${lineDescription(l)} (${lineSubtitle(l)}): ${formatKr(lineTotal(l))}/mnd`),
  );
  families.forEach((f) => {
    const sub = f.samlerabatt ? "Samlerabatt 10%" : "Ingen rabatt";
    rows.push(`• ${familyDescription(f)} (${sub}): ${formatKr(familyConfigTotal(f))}/mnd`);
  });
  const out = ["Talkmore · tilbud", "", ...rows, "", `Total: ${formatKr(totals.monthly)}/mnd`];
  if (totals.savingsMonthly > 0) {
    out.push(
      `Du sparer ${formatKr(totals.savingsMonthly)}/mnd (${formatKr(totals.savingsYearly)} i året)`,
    );
  }
  return out.join("\n");
}

interface QuoteSummaryProps {
  lines: Line[];
  families: FamilyConfig[];
  onClose: () => void;
}

export default function QuoteSummary({ lines, families, onClose }: QuoteSummaryProps) {
  const totals = combinedTotals(lines, families);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildShareText(lines, families));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const rows = [
    ...lines.map((l) => ({
      key: l.id,
      title: lineDescription(l),
      subtitle: lineSubtitle(l),
      price: lineTotal(l),
    })),
    ...families.map((f) => ({
      key: f.id,
      title: familyDescription(f),
      subtitle: f.samlerabatt ? "Samlerabatt 10%" : "Ingen rabatt",
      price: familyConfigTotal(f),
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/30 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Lukk" onClick={onClose} />
      <div className="bg-paper rounded-t-[24px] max-h-[92dvh] overflow-y-auto overscroll-contain shadow-[0_-32px_80px_rgba(18,53,45,0.16)] border-t border-line">
        <div className="sticky top-0 z-10 bg-paper/95 backdrop-blur px-6 py-5 flex items-center justify-between border-b border-line">
          <div>
            <p className="eyebrow mb-1">Talkmore</p>
            <h2 className="font-display text-xl font-medium text-ink leading-none">
              Kundeoversikt
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line w-9 h-9 grid place-items-center text-ink-soft hover:border-ink hover:text-ink transition"
            aria-label="Lukk oversikt"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pt-6 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.5rem))] flex flex-col gap-7 max-w-[640px] mx-auto">
          {/* Rows */}
          <div>
            {rows.map((r, i) => (
              <div
                key={r.key}
                className={`flex items-start justify-between gap-4 py-3.5 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-ink">{r.title}</p>
                  <p className="text-[12px] text-muted">{r.subtitle}</p>
                </div>
                <span className="font-display font-medium text-ink tnum whitespace-nowrap">
                  {formatKr(r.price)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals on a petrol panel */}
          <div className="rounded-[24px] bg-ink text-paper p-6">
            <div className="flex items-end justify-between">
              <span className="text-paper/70 text-[13px] uppercase tracking-[0.16em]">
                Total per måned
              </span>
              <span className="font-display text-[40px] font-medium tnum leading-none">
                {formatKr(totals.monthly)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px]">
              <span className="text-paper/50">
                Snittpris · {totals.units} {totals.units === 1 ? "abonnement" : "abonnementer"}
              </span>
              <span className="text-paper/70 tnum">{formatKr(totals.averageMonthly)}</span>
            </div>
            {totals.savingsMonthly > 0 && (
              <div className="mt-5 pt-5 border-t border-white/12 flex items-end justify-between">
                <div>
                  <p className="text-paper/70 text-[13px]">Besparelse mot full pris</p>
                  <p className="text-paper/50 text-[12px] tnum">
                    {formatKr(totals.baseMonthly)}/mnd uten rabatt
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-medium text-accent tnum leading-none">
                    {formatKr(totals.savingsYearly)}
                  </p>
                  <p className="text-paper/60 text-[12px] mt-1">i året</p>
                </div>
              </div>
            )}
          </div>

          {/* Benefits, hairline structure */}
          <div>
            <p className="eyebrow mb-3">Inkludert i alle abonnement</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 border-t border-line">
              {BENEFITS.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2.5 py-2 text-[14px] text-ink-soft border-b border-line"
                >
                  <span className="text-ink-soft mt-0.5 leading-none">·</span>
                  {b}
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-muted mt-3">* Vilkår gjelder.</p>
          </div>

          <button
            type="button"
            onClick={copy}
            className="w-full rounded-[11px] bg-accent text-accent-ink font-semibold py-3.5 shadow-[0_10px_24px_rgba(47,84,235,0.26)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(47,84,235,0.34)] transition"
          >
            {copied ? "Kopiert" : "Kopier tilbud som tekst"}
          </button>
        </div>
      </div>
    </div>
  );
}
