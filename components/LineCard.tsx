"use client";

import {
  ADDONS,
  PLANS,
  TIERS,
  type Line,
  type Tier,
  formatKr,
  getPlan,
  lineTotal,
  planHasDiscounts,
  planPrice,
} from "@/lib/pricing";

interface LineCardProps {
  line: Line;
  index: number;
  canRemove: boolean;
  onChange: (line: Line) => void;
  onRemove: () => void;
}

export default function LineCard({ line, index, canRemove, onChange, onRemove }: LineCardProps) {
  const plan = getPlan(line.planId);
  const hasDiscounts = planHasDiscounts(plan);

  function selectPlan(planId: string) {
    const next = getPlan(planId);
    const tier: Tier = planHasDiscounts(next) ? line.tier : "platinum";
    onChange({ ...line, planId, tier });
  }

  function toggleAddon(addonId: string) {
    const has = line.addonIds.includes(addonId);
    onChange({
      ...line,
      addonIds: has
        ? line.addonIds.filter((id) => id !== addonId)
        : [...line.addonIds, addonId],
    });
  }

  return (
    <section className="rounded-[16px] bg-card border border-line">
      <header className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-medium text-muted tnum">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h2 className="font-display text-[17px] font-medium text-ink">Abonnement</h2>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[13px] font-medium text-ink-soft hover:text-ink transition-colors"
            aria-label={`Fjern abonnement ${index + 1}`}
          >
            Fjern
          </button>
        )}
      </header>

      <div className="px-5 py-5 flex flex-col gap-6">
        {/* Plan picker */}
        <div>
          <p className="eyebrow mb-3">Abonnement</p>
          <div className="grid grid-cols-2 gap-2">
            {PLANS.map((p) => {
              const selected = p.id === line.planId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPlan(p.id)}
                  className={`flex flex-col items-start rounded-[11px] border px-3.5 py-2.5 text-left transition ${
                    selected
                      ? "border-ink bg-paper-2"
                      : "border-line bg-card hover:border-ink-soft/40"
                  }`}
                >
                  <span className="font-display font-medium text-ink leading-tight">
                    {p.name}
                    {p.bonus && <span className="text-ink-soft font-normal"> {p.bonus}</span>}
                  </span>
                  <span className="text-[12px] text-muted">
                    {p.note ?? `fra ${formatKr(planPrice(p, "u30_35"))}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Discount tier */}
        <div>
          <p className="eyebrow mb-3">Kundetype</p>
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((t) => {
              const available = t.id === "platinum" || hasDiscounts;
              const selected = t.id === line.tier;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!available}
                  onClick={() => onChange({ ...line, tier: t.id })}
                  className={`rounded-[11px] border px-2 py-2.5 text-center transition ${
                    selected
                      ? "border-ink bg-ink text-paper"
                      : available
                        ? "border-line bg-card text-ink hover:border-ink-soft/40"
                        : "border-line/60 bg-paper-2/50 text-muted cursor-not-allowed"
                  }`}
                >
                  <span className="block text-[11px] leading-tight opacity-75">{t.label}</span>
                  <span className="block font-display font-medium tnum mt-0.5">
                    {available ? formatKr(planPrice(plan, t.id)) : "n/a"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Add-ons */}
        <div>
          <p className="eyebrow mb-3">Tilleggstjenester</p>
          <div className="flex flex-wrap gap-2">
            {ADDONS.map((a) => {
              const selected = line.addonIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAddon(a.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition ${
                    selected
                      ? "border-ink bg-paper-2 text-ink font-medium"
                      : "border-line bg-card text-ink-soft hover:border-ink-soft/40"
                  }`}
                >
                  {selected && <span className="text-accent leading-none">+</span>}
                  {a.name}
                  <span className="text-muted tnum">{a.price}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-[13px] text-ink-soft">Pris per måned</span>
          <span className="font-display text-2xl font-medium text-ink tnum">
            {formatKr(lineTotal(line))}
          </span>
        </div>
      </div>
    </section>
  );
}
