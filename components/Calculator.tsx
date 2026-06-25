"use client";

import { useEffect, useRef, useState } from "react";
import InvoiceChart from "@/components/InvoiceChart";
import Toggle from "@/components/Toggle";
import {
  ADDONS,
  addonsTotal,
  type DiscountId,
  discountApplies,
  discountedPlanPrice,
  getPlan,
  invoiceSchedule,
  PLANS,
  toggleDiscount,
} from "@/lib/pricing";

const STORAGE_KEY = "tm-enkelt-v1";
const U30_IDS: DiscountId[] = ["u30", "u3030", "u3035"];

const DISCOUNT_SUFFIX: Record<DiscountId, string> = {
  samle: " −10%",
  u30: " −20%",
  u3030: " −30%",
  u3035: " −35%",
  samle20: " −20%",
};

const nf = (n: number) => Math.round(n).toLocaleString("nb-NO");
const planIds = new Set(PLANS.map((p) => p.id));

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

interface EnkeltState {
  planId: string;
  extra: boolean;
  portDate: string;
  u30: boolean;
  discounts: DiscountId[];
  firstMonthFree: boolean;
  addonIds: string[];
}

const initialState: EnkeltState = {
  planId: "10gb",
  extra: false,
  portDate: "",
  u30: false,
  discounts: [],
  firstMonthFree: false,
  addonIds: [],
};

export default function Calculator() {
  const [st, setSt] = useState<EnkeltState>(initialState);
  const loaded = useRef(false);

  // Hydration-safe load: read storage / default the porting date to today after mount.
  useEffect(() => {
    let next = initialState;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<EnkeltState>;
        if (d && typeof d.planId === "string" && planIds.has(d.planId)) {
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
      // storage full / unavailable: non-fatal
    }
  }, [st]);

  const plan = getPlan(st.planId);
  const isUnlimited = plan.gb === 0 || plan.gb === -1;
  const bonusGb = plan.bonus ? parseInt(plan.bonus.replace(/[^0-9]/g, ""), 10) || 0 : 0;
  const totalGb = (plan.gb > 0 ? plan.gb : 0) + (st.extra ? bonusGb : 0);
  const fmfAvailable = !isUnlimited;

  function patch(p: Partial<EnkeltState>) {
    setSt((prev) => ({ ...prev, ...p }));
  }

  function changePlan(id: string) {
    const p = getPlan(id);
    const valid = st.discounts.filter((d) => discountApplies(d, p));
    patch({
      planId: id,
      extra: false,
      discounts: p.flat ? [] : valid,
      u30: p.flat ? false : st.u30,
      firstMonthFree: p.gb === 0 || p.gb === -1 ? false : st.firstMonthFree,
    });
  }

  function toggleU30() {
    const next = !st.u30;
    const clear = !next && st.discounts.some((d) => U30_IDS.includes(d));
    patch({ u30: next, discounts: clear ? [] : st.discounts });
  }

  function pickDiscount(id: DiscountId | "full") {
    if (id === "full") patch({ discounts: [] });
    else patch({ discounts: toggleDiscount(st.discounts, id) });
  }

  function toggleAddon(id: string) {
    patch({
      addonIds: st.addonIds.includes(id)
        ? st.addonIds.filter((a) => a !== id)
        : [...st.addonIds, id],
    });
  }

  const planPrice = discountedPlanPrice(plan, st.discounts);
  const addons = addonsTotal(st.addonIds);
  const monthly = planPrice + addons;
  const saved = plan.price - planPrice;

  const selected = st.discounts[0];
  const mix =
    `${plan.name}${selected ? DISCOUNT_SUFFIX[selected] : ""} (${nf(planPrice)} kr)` +
    ADDONS.filter((a) => st.addonIds.includes(a.id))
      .map((a) => `  +  ${a.name} (${a.price} kr)`)
      .join("");

  // Computed only once a real porting date is set (the mount effect defaults it to
  // today) — this keeps new Date() out of the render path and avoids hydration drift.
  const schedule = st.portDate
    ? invoiceSchedule({
        planMonthly: planPrice,
        addonsMonthly: addons,
        portDate: st.portDate,
        firstMonthFree: st.firstMonthFree,
      })
    : null;

  const baseChips: { id: DiscountId | "full"; label: string }[] = [
    { id: "full", label: "Full pris" },
    { id: "samle", label: "10% rabatt" },
    { id: "samle20", label: "20% rabatt" },
  ];
  const u30Chips: { id: DiscountId; label: string }[] = [
    { id: "u30", label: "U30 20%" },
    { id: "u3030", label: "U30 30%" },
    { id: "u3035", label: "U30 35%" },
  ];
  const chips = st.u30 ? [...baseChips, ...u30Chips] : baseChips;

  return (
    <div>
      {/* Plan */}
      <label className={labelCls} htmlFor="planSel">
        Abonnement
      </label>
      <select
        id="planSel"
        className={fieldCls}
        value={st.planId}
        onChange={(e) => changePlan(e.target.value)}
      >
        {PLANS.map((p) => {
          const gb = p.gb === 0 || p.gb === -1 ? "Ubegrenset" : `${p.gb} GB`;
          return (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.tag ? ` (${p.tag})` : ""} · {nf(p.price)} kr/mnd · {gb}
            </option>
          );
        })}
      </select>
      <div className="mt-2 inline-block rounded-full border border-[#d4eef6] bg-teal-bg px-3.5 py-[5px] text-[13px] font-bold text-teal-d">
        📶 {isUnlimited ? "Ubegrenset data" : `${totalGb} GB${st.extra ? ` (inkl. +${bonusGb} GB)` : ""}`}
      </div>

      {/* Extra GB (informational) */}
      {!isUnlimited && bonusGb > 0 && (
        <>
          <label className={labelCls} htmlFor="extraSel">
            Ekstra GB
          </label>
          <select
            id="extraSel"
            className={fieldCls}
            value={st.extra ? "1" : "0"}
            onChange={(e) => patch({ extra: e.target.value === "1" })}
          >
            <option value="0">Ingen ekstra · {plan.gb} GB</option>
            <option value="1">
              +{bonusGb} GB · {plan.gb + bonusGb} GB totalt
            </option>
          </select>
        </>
      )}

      {/* Porting date */}
      <label className={labelCls} htmlFor="portDate">
        Porteringsdato
      </label>
      <input
        id="portDate"
        type="date"
        className={fieldCls}
        value={st.portDate}
        onChange={(e) => patch({ portDate: e.target.value })}
      />

      {/* Discounts */}
      {!plan.flat && (
        <>
          <label className={labelCls}>Rabatt</label>
          <Toggle
            label="Kunde under 30 år"
            hint="låser opp U30-rabatt"
            checked={st.u30}
            onChange={toggleU30}
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            {chips.map((c) => {
              const price = c.id === "full" ? plan.price : discountedPlanPrice(plan, [c.id]);
              const sel = c.id === "full" ? st.discounts.length === 0 : st.discounts.includes(c.id);
              const disabled = c.id === "full" ? false : !discountApplies(c.id, plan);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDiscount(c.id)}
                  className={`relative rounded-[12px] border px-1 py-2.5 text-center text-[13px] font-semibold leading-tight transition ${
                    sel ? "border-teal bg-teal-bg text-teal-d" : "border-line bg-white text-muted"
                  } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {c.label}
                  <span
                    className={`mt-[3px] block text-[15px] font-bold tnum ${
                      sel ? "text-teal-d" : "text-ink"
                    }`}
                  >
                    {nf(price)} kr
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Campaign */}
      {fmfAvailable && (
        <>
          <label className={labelCls}>Kampanje</label>
          <Toggle
            label="Første måned gratis"
            hint="restdager i porteringsmåneden"
            checked={st.firstMonthFree}
            onChange={() => patch({ firstMonthFree: !st.firstMonthFree })}
          />
        </>
      )}

      {/* VAS */}
      <label className={labelCls}>
        Tilleggstjenester (VAS){" "}
        <span className="font-normal normal-case tracking-normal text-muted">· 1. mnd gratis</span>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {ADDONS.map((a) => (
          <Toggle
            key={a.id}
            label={a.name}
            hint={`+${a.price} kr`}
            checked={st.addonIds.includes(a.id)}
            onChange={() => toggleAddon(a.id)}
          />
        ))}
      </div>

      {/* Hero */}
      <div className="mt-5 rounded-[16px] border-[1.5px] border-teal bg-gradient-to-b from-[#f4fbfe] to-white px-4 py-4 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Fast månedspris
        </div>
        <div className="font-display text-[42px] leading-[1.05] text-ink">
          {nf(monthly)} <small className="text-[18px] text-muted">kr/mnd</small>
        </div>
        <div className="mt-1 text-[12.5px] text-muted">{mix}</div>
        {saved >= 1 && (
          <span className="mt-2 inline-block rounded-full bg-teal-bg px-3 py-[3px] text-[12px] font-bold text-teal-d">
            Sparer {nf(saved)} kr/mnd vs. full pris
          </span>
        )}
      </div>

      {schedule && <InvoiceChart schedule={schedule} firstMonthFree={st.firstMonthFree} />}
    </div>
  );
}
