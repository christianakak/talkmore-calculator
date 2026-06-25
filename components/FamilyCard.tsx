"use client";

import {
  FAMILY_PER_MEMBER,
  FAMILY_POOLS,
  type FamilyConfig,
  familyAverage,
  familyConfigTotal,
  formatKr,
  getFamilyPool,
} from "@/lib/pricing";

interface FamilyCardProps {
  family: FamilyConfig;
  index: number;
  onChange: (family: FamilyConfig) => void;
  onRemove: () => void;
}

export default function FamilyCard({ family, index, onChange, onRemove }: FamilyCardProps) {
  const pool = getFamilyPool(family.poolId);
  const total = familyConfigTotal(family);
  const average = familyAverage(family.members, pool, family.samlerabatt);

  return (
    <section className="rounded-[16px] bg-card border border-line">
      <header className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-medium text-muted tnum">F{index + 1}</span>
          <h2 className="font-display text-[17px] font-medium text-ink">Familie</h2>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-[13px] font-medium text-ink-soft hover:text-ink transition-colors"
          aria-label={`Fjern familie ${index + 1}`}
        >
          Fjern
        </button>
      </header>

      <div className="px-5 py-5 flex flex-col gap-6">
        {/* Members */}
        <div>
          <p className="eyebrow mb-3">Antall medlemmer</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onChange({ ...family, members: Math.max(2, family.members - 1) })}
              disabled={family.members <= 2}
              className="w-11 h-11 rounded-[11px] border border-line text-ink text-xl grid place-items-center hover:border-ink disabled:text-muted disabled:border-line/60 disabled:cursor-not-allowed transition"
              aria-label="Færre medlemmer"
            >
              −
            </button>
            <span className="font-display text-3xl font-medium text-ink tnum w-12 text-center">
              {family.members}
            </span>
            <button
              type="button"
              onClick={() => onChange({ ...family, members: Math.min(20, family.members + 1) })}
              disabled={family.members >= 20}
              className="w-11 h-11 rounded-[11px] border border-line text-ink text-xl grid place-items-center hover:border-ink disabled:text-muted disabled:cursor-not-allowed transition"
              aria-label="Flere medlemmer"
            >
              +
            </button>
            <span className="text-[12px] text-muted ml-1">
              {formatKr(FAMILY_PER_MEMBER)} per medlem
            </span>
          </div>
        </div>

        {/* Pool */}
        <div>
          <p className="eyebrow mb-3">Delt datapakke</p>
          <div className="grid grid-cols-2 gap-2">
            {FAMILY_POOLS.map((p) => {
              const selected = p.id === family.poolId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ ...family, poolId: p.id })}
                  className={`flex flex-col items-start rounded-[11px] border px-3.5 py-2.5 text-left transition ${
                    selected
                      ? "border-ink bg-paper-2"
                      : "border-line bg-card hover:border-ink-soft/40"
                  }`}
                >
                  <span className="font-display font-medium text-ink leading-tight">
                    {p.name}
                    {p.extraGb > 0 && (
                      <span className="text-ink-soft font-normal"> +{p.extraGb} GB</span>
                    )}
                  </span>
                  <span className="text-[12px] text-muted tnum">basis {formatKr(p.basis)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Samlerabatt */}
        <button
          type="button"
          onClick={() => onChange({ ...family, samlerabatt: !family.samlerabatt })}
          className={`flex items-center gap-3 rounded-[11px] border px-3.5 py-2.5 text-left transition ${
            family.samlerabatt
              ? "border-ink bg-paper-2"
              : "border-line bg-card hover:border-ink-soft/40"
          }`}
        >
          <span
            className={`grid place-items-center w-5 h-5 rounded-[6px] border text-[12px] leading-none ${
              family.samlerabatt
                ? "border-accent bg-accent text-accent-ink"
                : "border-line bg-card text-transparent"
            }`}
            aria-hidden="true"
          >
            ✓
          </span>
          <span className={`text-[14px] text-ink ${family.samlerabatt ? "font-medium" : ""}`}>
            Samlerabatt 10%
          </span>
        </button>

        {/* Result */}
        <div className="flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-[13px] text-ink-soft">
            Totalpris
            <span className="text-muted"> · snitt {formatKr(average)}</span>
          </span>
          <span className="font-display text-2xl font-medium text-ink tnum">{formatKr(total)}</span>
        </div>
      </div>
    </section>
  );
}
