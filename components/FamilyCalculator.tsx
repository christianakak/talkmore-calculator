"use client";

import { useState } from "react";
import {
  FAMILY_PER_MEMBER,
  FAMILY_POOLS,
  formatKr,
  familyAverage,
  familyTotal,
  getFamilyPool,
} from "@/lib/pricing";

export default function FamilyCalculator() {
  const [members, setMembers] = useState(2);
  const [poolId, setPoolId] = useState("f20");
  const [samlerabatt, setSamlerabatt] = useState(false);

  const pool = getFamilyPool(poolId);
  const total = familyTotal(members, pool, samlerabatt);
  const average = familyAverage(members, pool, samlerabatt);

  return (
    <div className="flex flex-col gap-3.5">
      <section className="reveal rounded-[16px] bg-card border border-line">
        <div className="px-5 py-5 flex flex-col gap-6">
          {/* Members */}
          <div>
            <p className="eyebrow mb-3">Antall medlemmer</p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMembers((m) => Math.max(2, m - 1))}
                disabled={members <= 2}
                className="w-11 h-11 rounded-[11px] border border-line text-ink text-xl grid place-items-center hover:border-ink disabled:text-muted disabled:border-line/60 disabled:cursor-not-allowed transition"
                aria-label="Færre medlemmer"
              >
                −
              </button>
              <span className="font-display text-3xl font-medium text-ink tnum w-12 text-center">
                {members}
              </span>
              <button
                type="button"
                onClick={() => setMembers((m) => Math.min(20, m + 1))}
                disabled={members >= 20}
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
                const selected = p.id === poolId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPoolId(p.id)}
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
            onClick={() => setSamlerabatt((v) => !v)}
            className={`flex items-center gap-3 rounded-[11px] border px-3.5 py-2.5 text-left transition ${
              samlerabatt ? "border-ink bg-paper-2" : "border-line bg-card hover:border-ink-soft/40"
            }`}
          >
            <span
              className={`grid place-items-center w-5 h-5 rounded-[6px] border text-[12px] leading-none ${
                samlerabatt
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-card text-transparent"
              }`}
              aria-hidden="true"
            >
              ✓
            </span>
            <span className={`text-[14px] text-ink ${samlerabatt ? "font-medium" : ""}`}>
              Samlerabatt 10%
            </span>
          </button>
        </div>
      </section>

      {/* Result */}
      <section className="reveal rounded-[16px] bg-ink text-paper p-6" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="flex items-end justify-between">
          <span className="text-paper/70 text-[13px] uppercase tracking-[0.16em]">Totalpris</span>
          <span className="font-display text-[40px] font-medium tnum leading-none">
            {formatKr(total)}
          </span>
        </div>
        <div className="mt-5 pt-5 border-t border-white/12 flex items-end justify-between">
          <div>
            <p className="text-paper/70 text-[13px]">Snittpris per medlem</p>
            <p className="text-paper/50 text-[12px]">
              {members} medlemmer · {pool.name}
              {pool.extraGb > 0 ? ` +${pool.extraGb} GB` : ""}
            </p>
          </div>
          <span className="font-display text-2xl font-medium text-accent tnum leading-none">
            {formatKr(average)}
          </span>
        </div>
      </section>
    </div>
  );
}
