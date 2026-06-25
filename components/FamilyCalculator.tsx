"use client";

import { useEffect, useRef, useState } from "react";
import InvoiceChart from "@/components/InvoiceChart";
import Toggle from "@/components/Toggle";
import {
  FAMILY_PER_MEMBER,
  FAMILY_POOLS,
  familyAverage,
  familyTotal,
  getFamilyPool,
  invoiceSchedule,
} from "@/lib/pricing";

const STORAGE_KEY = "tm-familie-v1";
const nf = (n: number) => Math.round(n).toLocaleString("nb-NO");
const poolIds = new Set(FAMILY_POOLS.map((p) => p.id));

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mt-4 mb-[7px]";
const fieldCls =
  "w-full rounded-[12px] border border-line bg-white px-3 py-[11px] text-[15px] font-semibold text-ink";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

interface FamilyState {
  poolId: string;
  members: number;
  samlerabatt: boolean;
  portDate: string;
}

const initialState: FamilyState = {
  poolId: "f20",
  members: 2,
  samlerabatt: false,
  portDate: "",
};

export default function FamilyCalculator() {
  const [st, setSt] = useState<FamilyState>(initialState);
  const loaded = useRef(false);

  useEffect(() => {
    let next = initialState;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<FamilyState>;
        if (d && typeof d.poolId === "string" && poolIds.has(d.poolId)) {
          next = { ...initialState, ...d };
        }
      }
    } catch {
      // ignore corrupt storage
    }
    if (!next.portDate) next = { ...next, portDate: todayIso() };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe initial load
    setSt(next);
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch {
      // non-fatal
    }
  }, [st]);

  function patch(p: Partial<FamilyState>) {
    setSt((prev) => ({ ...prev, ...p }));
  }

  const pool = getFamilyPool(st.poolId);
  const monthly = familyTotal(st.members, pool, st.samlerabatt);
  const perPerson = familyAverage(st.members, pool, st.samlerabatt);
  const saved = familyTotal(st.members, pool, false) - monthly;

  // Computed only once a real porting date is set (see Calculator.tsx).
  const schedule = st.portDate
    ? invoiceSchedule({
        planMonthly: monthly,
        addonsMonthly: 0,
        portDate: st.portDate,
        firstMonthFree: false,
      })
    : null;

  return (
    <div>
      {/* Pool */}
      <label className={labelCls} htmlFor="poolSel">
        Delt datapakke
      </label>
      <select
        id="poolSel"
        className={fieldCls}
        value={st.poolId}
        onChange={(e) => patch({ poolId: e.target.value })}
      >
        {FAMILY_POOLS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.extraGb > 0 ? ` (+${p.extraGb} GB)` : ""} · basis {nf(p.basis)} kr
          </option>
        ))}
      </select>

      {/* Members */}
      <label className={labelCls}>Antall medlemmer</label>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => patch({ members: Math.max(2, st.members - 1) })}
          disabled={st.members <= 2}
          className="grid h-12 w-12 place-items-center rounded-[12px] border border-line text-2xl text-ink transition hover:border-teal disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Færre medlemmer"
        >
          −
        </button>
        <span className="w-12 text-center font-display text-3xl text-ink tnum">{st.members}</span>
        <button
          type="button"
          onClick={() => patch({ members: Math.min(20, st.members + 1) })}
          disabled={st.members >= 20}
          className="grid h-12 w-12 place-items-center rounded-[12px] border border-line text-2xl text-ink transition hover:border-teal disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Flere medlemmer"
        >
          +
        </button>
        <span className="ml-1 text-[12.5px] text-muted">{nf(FAMILY_PER_MEMBER)} kr per medlem</span>
      </div>

      {/* Porting date */}
      <label className={labelCls} htmlFor="famPortDate">
        Porteringsdato
      </label>
      <input
        id="famPortDate"
        type="date"
        className={fieldCls}
        value={st.portDate}
        onChange={(e) => patch({ portDate: e.target.value })}
      />

      {/* Samlerabatt */}
      <label className={labelCls}>Rabatt</label>
      <Toggle
        label="Samlerabatt 20%"
        hint="hele familien"
        checked={st.samlerabatt}
        onChange={() => patch({ samlerabatt: !st.samlerabatt })}
      />

      {/* Hero */}
      <div className="mt-6 rounded-[16px] border border-line border-t-2 border-t-accent bg-card px-5 py-5 text-center shadow-[var(--shadow)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Fast månedspris
        </div>
        <div className="mt-1 font-display text-[46px] leading-[1.02] text-ink tnum">
          {nf(monthly)}{" "}
          <small className="font-sans text-[18px] font-semibold text-accent">kr/mnd</small>
        </div>
        <div className="mt-1.5 text-[12.5px] text-ink-soft">
          {st.members} medlemmer · {nf(perPerson)} kr per person
        </div>
        {saved >= 1 && (
          <span className="mt-3 inline-block rounded-full bg-accent-dim px-3 py-[4px] text-[12px] font-bold text-accent">
            Sparer {nf(saved)} kr/mnd vs. full pris
          </span>
        )}
      </div>

      {schedule && <InvoiceChart schedule={schedule} firstMonthFree={false} />}
    </div>
  );
}
