"use client";

import { useEffect, useState } from "react";
import {
  type DiscountId,
  discountLabel,
  effectiveDiscount,
  familiePrice,
  getPlan,
  type OrderLine,
  orderChart,
  type Plan,
  planPrice,
  plansFor,
  portMonthName,
  formatKr,
  type SubType,
  VAS,
  vasTotal,
} from "@/lib/pricing";

// Remaining-spots counts shown on the red "X igjen" scarcity badges. Editable.
// p25 = Permanent 25 (Enkelt), p30 = Sommerkampanje (Enkelt), familieP20 = Familie Permanent 20.
const SCARCITY_LEFT = { p25: 5, p30: 3, familieP20: 6 };

// VAS display order (row-major over a 2-col grid): left column = Digital trygghet + Ringepakke,
// right column = Datasim + Tvillingsim. Datasim/Tvillingsim/Ringepakke can be added more than once.
const VAS_ORDER = ["dt", "data", "ring", "tvil"] as const;
const VAS_STEPPER = new Set(["data", "ring", "tvil"]);

interface Cfg {
  type: SubType;
  prodId: string;
  /** Where the plan was selected: the ABONNEMENT grid or a campaign square.
      Controls which card is highlighted and how the order line is named. */
  via: "grid" | "camp";
  u30: boolean;
  disc: DiscountId;
  fmf: boolean;
  /** Familie only: number of people on the plan (2–10). */
  persons: number;
  /** Add-on id → quantity. Digital trygghet is 0/1; the rest can be > 1. */
  vas: Record<string, number>;
}

const INITIAL: Cfg = {
  type: "enkelt",
  prodId: "e10",
  via: "grid",
  u30: false,
  disc: "full",
  fmf: false,
  persons: 2,
  vas: {},
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Today as dd.MM.yyyy for the extra-GB campaign header. Manual padding (no locale
// API) so the separator is always a dot, never a slash.
function todayDmy(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

const CheckMark = () => (
  <span className="chkbox">
    <svg viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </span>
);

export default function Calculator() {
  const [cfg, setCfg] = useState<Cfg>(INITIAL);
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [port, setPort] = useState("");
  const [today, setToday] = useState("");

  // Default the porting date and campaign date to today after mount (hydration-safe:
  // keeps new Date() out of the server render so there is no hydration mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount defaults
    setPort(todayIso());
    setToday(todayDmy());
  }, []);

  const list = plansFor(cfg.type);
  const prod = getPlan(cfg.type, cfg.prodId);
  const familie = cfg.type === "familie";

  // The discount tiers offered in the current context (Familie / Enkelt · U30 on/off).
  // Single plans (U13) only ever get full price.
  function availableDiscs(p: Plan): DiscountId[] {
    if (p.single) return ["full"];
    if (cfg.type === "familie") return ["full", "p20"];
    // U30 keeps the permanent tiers visible AND adds Fast Ung + Sommerkampanje,
    // so reps can show the customer the extra "under 30" options as leverage.
    return cfg.u30
      ? ["full", "p15", "p25", "p20", "p30"]
      : ["full", "p15", "p25"];
  }

  // The discount that actually applies to a given plan: the selected tier if it is
  // offered in this context, otherwise full. Used for the line and every card.
  function dispDiscFor(p: Plan): DiscountId {
    const d = availableDiscs(p).includes(cfg.disc) ? cfg.disc : "full";
    return effectiveDiscount(p, d);
  }

  function planTotal(p: Plan, d: DiscountId): number {
    return familie ? familiePrice(p, d, cfg.persons) : planPrice(p, d);
  }

  const curDisc = dispDiscFor(prod);
  const price = planTotal(prod, curDisc);
  const monthly = price + vasTotal(cfg.vas);
  const fmfOn = cfg.fmf && !familie && !!prod.fmf;
  // Sold via a campaign square -> the order line carries the campaign GB total
  // (what the rep clicked and the customer saw), otherwise the base plan name.
  const dispNavn =
    cfg.via === "camp" && prod.ekstra > 0 ? `${(prod.gb ?? 0) + prod.ekstra} GB` : prod.navn;
  const fullName = familie ? `Familie ${dispNavn} · ${cfg.persons} pers` : dispNavn;

  // Plans that receive bonus GB from the running campaign (informational only).
  const ekstraPlans = list.filter((p) => p.ekstra > 0);

  function patch(p: Partial<Cfg>) {
    setCfg((prev) => ({ ...prev, ...p }));
  }

  // Tab switch resets every selectable control (discounts, U30, Porteringsrabatt,
  // VAS, persons) — the order itself is kept and cleared manually by the rep.
  function changeType(type: SubType) {
    patch({
      type,
      prodId: plansFor(type)[0].id,
      via: "grid",
      fmf: false,
      disc: "full",
      u30: false,
      persons: 2,
      vas: {},
    });
  }
  // Keep the person count when switching products within a tab; only a tab
  // switch (changeType) resets it back to 2.
  function changePlan(id: string, via: "grid" | "camp" = "grid") {
    patch({ prodId: id, via, fmf: false });
  }
  // Toggling U30 swaps the whole Enkelt discount set (Permanent 15/25 <-> Fast Ung/
  // Sommerkampanje), so reset the selection to full to avoid a stale tier.
  function toggleU30() {
    // Keep the current selection; dispDiscFor coerces it if it's not valid in the
    // new state, so a permanent tier stays picked when U30 is switched on.
    patch({ u30: !cfg.u30 });
  }

  const vasQty = (id: string) => cfg.vas[id] ?? 0;
  function setVas(id: string, q: number) {
    const next = { ...cfg.vas };
    if (q <= 0) delete next[id];
    else next[id] = q;
    patch({ vas: next });
  }
  const toggleVas = (id: string) => setVas(id, vasQty(id) ? 0 : 1);
  const stepVas = (id: string, d: number) => setVas(id, Math.max(0, Math.min(10, vasQty(id) + d)));

  function addToOrder() {
    const vasNames = VAS.filter((v) => vasQty(v.id) > 0).map((v) => {
      const q = vasQty(v.id);
      return q > 1 ? `${v.navn} ×${q}` : v.navn;
    });
    setOrder((prev) => [
      ...prev,
      {
        navn: fullName,
        disc: curDisc,
        // Store the codeword as sold (p20 depends on U30 at this moment); never recompute later.
        discLbl: discountLabel(curDisc, cfg.u30),
        perPers: familie ? Math.round(price / cfg.persons) : null,
        vasNames,
        price,
        fmf: fmfOn,
        monthly,
      },
    ]);
    // Fresh VAS for the next line — the rep should not have to un-tick manually.
    patch({ vas: {} });
  }

  function metaOf(it: OrderLine): string {
    const bits: string[] = [];
    if (it.disc !== "full") bits.push(it.discLbl);
    if (it.fmf) bits.push("Porteringsrabatt");
    it.vasNames.forEach((n) => bits.push(n));
    return bits.join(" · ");
  }

  // The discount buttons to show, in order, for the current context.
  const discKeys = availableDiscs(prod);

  const hasOrder = order.length > 0;
  const chart = orderChart(order, port);
  const maxBar = Math.max(...chart.bars, 0);

  return (
    <div className="wrap">
      <div className="tmlogo">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, no optimization needed */}
        <img src="/talkmore-logo.png" alt="Talkmore" className="tmlogo-img" />
      </div>
      <h1>Priskalkulator</h1>

      <div className="layout">
        {/* ====== KONFIGURATOR ====== */}
        <div className="col-main">
          <div className="card">
            <div className="seg">
              {(["enkelt", "familie"] as SubType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cfg.type === t ? "on" : ""}
                  onClick={() => changeType(t)}
                >
                  {t === "enkelt" ? "Enkeltabonnement" : "Familieabonnement"}
                </button>
              ))}
            </div>

            <label className="flabel">Abonnement</label>
            <div className="grid">
              {list.map((p) => {
                const pDisc = dispDiscFor(p);
                const pPrice = planTotal(p, pDisc);
                const sub = familie
                  ? `Per pers ${formatKr(pPrice / cfg.persons)},-`
                  : "kr/mnd";
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`psq${p.id === cfg.prodId && cfg.via === "grid" ? " on" : ""}`}
                    onClick={() => changePlan(p.id)}
                  >
                    <span className="sg">{p.navn}</span>
                    <span className="sp">{formatKr(pPrice)},-</span>
                    <span className="ss">{sub}</span>
                  </button>
                );
              })}
            </div>

            {familie && (
              <div className="stepper">
                <span className="st-lbl">Antall personer</span>
                <div className="st-ctrl">
                  <button
                    type="button"
                    className="st-btn"
                    aria-label="Færre personer"
                    disabled={cfg.persons <= 2}
                    onClick={() => patch({ persons: Math.max(2, cfg.persons - 1) })}
                  >
                    −
                  </button>
                  <span className="st-val">{cfg.persons}</span>
                  <button
                    type="button"
                    className="st-btn"
                    aria-label="Flere personer"
                    disabled={cfg.persons >= 10}
                    onClick={() => patch({ persons: Math.min(10, cfg.persons + 1) })}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {ekstraPlans.length > 0 && (
              /* key remounts the panel on tab switch so it always starts collapsed */
              <details className="gbcamp" key={cfg.type}>
                <summary>
                  <span className="gbchev" aria-hidden>
                    <svg viewBox="0 0 24 24">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                  <span className="gbtxt">Midlertidig Kampanje {today}</span>
                </summary>
                <div className="gbgrid">
                  {ekstraPlans.map((p) => {
                    const sqPrice = planTotal(p, dispDiscFor(p));
                    return (
                      /* Selects the plan just like the ABONNEMENT grid, so the rep
                         can add the campaign product straight to the order. */
                      <button
                        type="button"
                        className={`gbsq${p.id === cfg.prodId && cfg.via === "camp" ? " on" : ""}`}
                        key={p.id}
                        onClick={() => changePlan(p.id, "camp")}
                      >
                        <div className="gbsq-top">
                          {p.gb} GB <span className="gbsq-plus">+ {p.ekstra} GB</span>
                        </div>
                        <div className="gbsq-tot">{(p.gb ?? 0) + p.ekstra} GB</div>
                        <div className="gbsq-price">{formatKr(sqPrice)},-</div>
                        {familie && (
                          <div className="gbsq-pp">Per pers {formatKr(sqPrice / cfg.persons)},-</div>
                        )}
                        <div className="gbsq-sub">Samme pris</div>
                        <div className="gbsq-sub">GB beholdes fast</div>
                      </button>
                    );
                  })}
                </div>
              </details>
            )}

            <label className="flabel">Rabatt</label>
            {!familie && (
              <div
                className={`tog${cfg.u30 ? " on" : ""}`}
                role="switch"
                aria-checked={cfg.u30}
                onClick={toggleU30}
              >
                <span>
                  Kunde under 30 år <span className="tp">låser opp Sommerkampanje</span>
                </span>
                <span className="sw" />
              </div>
            )}
            <div className="disc">
              {discKeys.map((k) => {
                // Familie Permanent 20 keeps its badge; on Enkelt the badges sit on
                // Permanent 25 and Sommerkampanje. Everything else has none.
                const scarN = familie
                  ? k === "p20"
                    ? SCARCITY_LEFT.familieP20
                    : undefined
                  : k === "p25"
                    ? SCARCITY_LEFT.p25
                    : k === "p30"
                      ? SCARCITY_LEFT.p30
                      : undefined;
                const showScar = scarN !== undefined;
                return (
                  <button
                    key={k}
                    type="button"
                    className={`${curDisc === k ? "on" : ""}${showScar ? " scarce" : ""}`}
                    onClick={() => patch({ disc: k })}
                  >
                    {showScar && <span className="scar">{scarN} igjen</span>}
                    {discountLabel(k, cfg.u30)}
                  </button>
                );
              })}
            </div>
            <div className="permanent">
              <div className="perm-title">Fast rabatt</div>
              <div className="perm-sub">
                Kunden beholder rabatten så lenge abonnementet er aktivt hos Talkmore.
              </div>
            </div>

            {!familie && prod.fmf && (
              <div id="fmfWrap">
                <label className="flabel">Kampanje</label>
                <div
                  className={`chkrow${fmfOn ? " on" : ""}`}
                  id="fmfTog"
                  role="checkbox"
                  aria-checked={fmfOn}
                  onClick={() => patch({ fmf: !cfg.fmf })}
                >
                  <CheckMark />
                  <span className="chktx">Porteringsrabatt</span>
                </div>
              </div>
            )}

            <label className="flabel">
              Tilleggstjenester <span className="hint">· 1. måned gratis</span>
            </label>
            <div className="vasgrid">
              {VAS_ORDER.map((id) => {
                const v = VAS.find((x) => x.id === id)!;
                const q = vasQty(id);
                const stepper = VAS_STEPPER.has(id);
                const info = (
                  <span className="vas-info">
                    <span className="vas-name">{v.navn}</span>
                    <span className="vas-price">+{v.pris} kr</span>
                  </span>
                );
                if (!stepper) {
                  return (
                    <div
                      key={id}
                      className={`vasstep chk${q ? " on" : ""}`}
                      role="checkbox"
                      aria-checked={q > 0}
                      onClick={() => toggleVas(id)}
                    >
                      {info}
                      <CheckMark />
                    </div>
                  );
                }
                return (
                  <div key={id} className={`vasstep${q ? " on" : ""}`}>
                    {info}
                    <div className="st-ctrl">
                      <button
                        type="button"
                        className="st-btn"
                        aria-label={`Færre ${v.navn}`}
                        disabled={q <= 0}
                        onClick={() => stepVas(id, -1)}
                      >
                        −
                      </button>
                      <span className="st-val">{q}</span>
                      <button
                        type="button"
                        className="st-btn"
                        aria-label={`Flere ${v.navn}`}
                        disabled={q >= 10}
                        onClick={() => stepVas(id, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="flabel" htmlFor="portDate">
              Porteringsdato <span className="hint">· gjelder hele ordren</span>
            </label>
            <input
              type="date"
              id="portDate"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />

            <button type="button" className="addbtn" onClick={addToOrder}>
              Legg til i ordre
            </button>
          </div>
        </div>

        {/* ====== ORDRE ====== */}
        <div className="col-side">
          <div className="card">
            <div className="ohead">
              <h2>Ordre</h2>
              {hasOrder && (
                <button type="button" className="clear" onClick={() => setOrder([])}>
                  Tøm ordre
                </button>
              )}
            </div>

            {!hasOrder && <div className="empty">Ingen produkter lagt til ennå.</div>}
            {order.map((it, i) => {
              const meta = metaOf(it);
              return (
                <div className="oitem" key={i}>
                  <div className="oinfo">
                    <div className="oname">{it.navn}</div>
                    {meta && <div className="ometa">{meta}</div>}
                  </div>
                  <div className="oprice">{formatKr(it.monthly)} kr</div>
                  <button
                    type="button"
                    className="orm"
                    aria-label="Fjern"
                    onClick={() => setOrder((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {hasOrder && (
              <div>
                <div className="ototal">
                  <span className="tl">Fast månedspris totalt</span>
                  <span className="tv">
                    {formatKr(chart.totMonthly)} <small>kr/mnd</small>
                  </span>
                </div>
                <div className="chartwrap">
                  <div className="clbl">Kundens første 3 fakturaer</div>
                  <div className="chart">
                    {chart.bars.map((val, i) => {
                      const first = i === 0;
                      const h = maxBar ? Math.max(8, Math.round((val / maxBar) * 150)) : 8;
                      return (
                        <div className="col" key={i}>
                          {first && chart.subRem > 0 && (
                            <div className="delta">+{formatKr(chart.subRem)} kr</div>
                          )}
                          <div className="cv">{formatKr(val)}</div>
                          <div className={`bar${first ? " first" : ""}`} style={{ height: `${h}px` }}>
                            {first && <div className="ftag">1. FAKTURA</div>}
                          </div>
                          <div className="cm">
                            {chart.labels[i]}
                            <small>{first ? "restdager + 1 mnd" : "fast pris"}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="breakdown">
                    {chart.subRem > 0 ? (
                      <>
                        <b>1. faktura ({chart.labels[0]}):</b> {chart.rem} restdager i{" "}
                        {portMonthName(port)} ({formatKr(chart.subRem)} kr) + {chart.labels[0]} (
                        {formatKr(chart.totMonthly)} kr) = <b>{formatKr(chart.bars[0])} kr</b>.
                      </>
                    ) : (
                      <>
                        Ingen restdager å betale i {portMonthName(port)} · kunden betaler{" "}
                        {formatKr(chart.totMonthly)} kr fra {chart.labels[0]}.
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
