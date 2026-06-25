"use client";

import {
  ADDONS,
  type DiscountId,
  type Line,
  type Plan,
  discountApplies,
  discountedPlanPrice,
  formatKr,
  getPlan,
  lineTotal,
  PLANS,
  toggleDiscount,
} from "@/lib/pricing";

interface LineCardProps {
  line: Line;
  index: number;
  canRemove: boolean;
  onChange: (line: Line) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

// Discount groups rendered as single-select segmented rows.
const SAMLE: { id: DiscountId; label: string }[] = [
  { id: "samle", label: "10%" },
  { id: "samle20", label: "20%" },
];
const U30: { id: DiscountId; label: string }[] = [
  { id: "u30", label: "20%" },
  { id: "u3030", label: "30%" },
  { id: "u3035", label: "35%" },
];

function Segmented({
  label,
  options,
  plan,
  discounts,
  onPick,
  onClear,
}: {
  label: string;
  options: { id: DiscountId; label: string }[];
  plan: Plan;
  discounts: DiscountId[];
  onPick: (id: DiscountId) => void;
  onClear: (ids: DiscountId[]) => void;
}) {
  const groupIds = options.map((o) => o.id);
  const noneSelected = !discounts.some((d) => groupIds.includes(d));
  return (
    <div>
      <p className="text-[12px] text-ink-soft mb-1.5">{label}</p>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onClear(groupIds)}
          className={`flex-1 rounded-[9px] border py-2 text-[13px] transition ${
            noneSelected
              ? "border-ink bg-ink text-paper"
              : "border-line text-ink-soft hover:border-ink-soft/40"
          }`}
        >
          Ingen
        </button>
        {options.map((o) => {
          const applies = discountApplies(o.id, plan);
          const selected = applies && discounts.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              disabled={!applies}
              onClick={() => onPick(o.id)}
              className={`flex-1 rounded-[9px] border py-2 text-[13px] tnum transition ${
                selected
                  ? "border-ink bg-ink text-paper"
                  : applies
                    ? "border-line text-ink hover:border-ink-soft/40"
                    : "border-line/60 text-muted/50 cursor-not-allowed"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LineCard({
  line,
  index,
  canRemove,
  onChange,
  onDuplicate,
  onRemove,
}: LineCardProps) {
  const plan = getPlan(line.planId);

  function setDiscount(id: DiscountId) {
    onChange({ ...line, discounts: toggleDiscount(line.discounts, id) });
  }
  function clearGroup(ids: DiscountId[]) {
    onChange({ ...line, discounts: line.discounts.filter((d) => !ids.includes(d)) });
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

  const base = plan.price;
  const discounted = discountedPlanPrice(plan, line.discounts);
  const hasDiscount = Math.round(discounted) < base;

  return (
    <section className="rounded-[16px] bg-card border border-line">
      <header className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-medium text-muted tnum">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h2 className="font-display text-[17px] font-medium text-ink">Abonnement</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDuplicate}
            className="text-[13px] font-medium text-ink-soft hover:text-ink transition-colors"
          >
            Kopier
          </button>
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
        </div>
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
                  onClick={() =>
                    onChange({ ...line, planId: p.id, discounts: p.flat ? [] : line.discounts })
                  }
                  className={`flex flex-col items-start rounded-[11px] border px-3.5 py-2.5 text-left transition ${
                    selected
                      ? "border-ink bg-paper-2"
                      : "border-line bg-card hover:border-ink-soft/40"
                  }`}
                >
                  <span className="font-display font-medium text-ink leading-tight">
                    {p.name}
                    {p.tag && <span className="text-muted font-normal text-[12px]"> {p.tag}</span>}
                    {p.bonus && <span className="text-ink-soft font-normal"> {p.bonus}</span>}
                  </span>
                  <span className="text-[12px] text-muted tnum">{formatKr(p.price)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Discounts: two single-select groups (hidden for flat plans) */}
        {!plan.flat && (
          <div>
            <p className="eyebrow mb-3">Rabatter</p>
            <div className="flex flex-col gap-3">
              <Segmented
                label="Samlerabatt"
                options={SAMLE}
                plan={plan}
                discounts={line.discounts}
                onPick={setDiscount}
                onClear={clearGroup}
              />
              <Segmented
                label="U30"
                options={U30}
                plan={plan}
                discounts={line.discounts}
                onPick={setDiscount}
                onClear={clearGroup}
              />
            </div>
          </div>
        )}

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
          <span className="flex items-baseline gap-2">
            {hasDiscount && (
              <span className="text-[13px] text-muted line-through tnum">{formatKr(base)}</span>
            )}
            <span className="font-display text-2xl font-medium text-ink tnum">
              {formatKr(lineTotal(line))}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
