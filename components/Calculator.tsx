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

// Remaining-spots counts shown on the scarcity badges. Update here to change everywhere.
const SCARCITY: Partial<Record<DiscountId, number>> = { p20: 6, p35: 3 };

// VAS display order (row-major over a 2-col grid): left column = Digital trygghet + Ringepakke,
// right column = Datasim + Tvillingsim. Datasim/Tvillingsim/Ringepakke can be added more than once.
const VAS_ORDER = ["dt", "data", "ring", "tvil"] as const;
const VAS_STEPPER = new Set(["data", "ring", "tvil"]);

interface Cfg {
  type: SubType;
  prodId: string;
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
  const single = !!prod.single;

  // The discount that actually applies to a given plan, coerced for u30/single/familie
  // constraints. Used both for the selected line and for every product card (real-time).
  function dispDiscFor(p: Plan): DiscountId {
    let d = cfg.disc;
    if (familie && d === "p35") d = "p20";
    if (p.single && d !== "full") d = "full";
    if (d === "p35" && !cfg.u30) d = "p20";
    return effectiveDiscount(p, d);
  }

  function planTotal(p: Plan, d: DiscountId): number {
    return familie ? familiePrice(p, d, cfg.persons) : planPrice(p, d);
  }

  const curDisc = dispDiscFor(prod);
  const price = planTotal(prod, curDisc);
  const monthly = price + vasTotal(cfg.vas);
  const fmfOn = cfg.fmf && !familie && !!prod.fmf;
  const fullName = familie ? `Familie ${prod.navn} · ${cfg.persons} pers` : prod.navn;

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
      fmf: false,
      disc: "full",
      u30: false,
      persons: 2,
      vas: {},
    });
  }
  function changePlan(id: string) {
    patch({ prodId: id, fmf: false, persons: 2 });
  }
  function toggleU30() {
    const u30 = !cfg.u30;
    patch({ u30, disc: !u30 && cfg.disc === "p35" ? "p20" : cfg.disc });
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

  const discKeys: DiscountId[] = ["full", "p20", "p35"];

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
                    className={`psq${p.id === cfg.prodId ? " on" : ""}`}
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
                      <div className="gbsq" key={p.id}>
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
                      </div>
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
              {discKeys
                .filter((k) => !(familie && k === "p35"))
                .map((k) => {
                  const disabled = (single && k !== "full") || (k === "p35" && !cfg.u30);
                  // p20 badge only in its "Permanent 20" state (U30 off); p35 badge always when live.
                  const showScar =
                    !disabled && !single && (k === "p35" || (k === "p20" && !cfg.u30));
                  const n = SCARCITY[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={disabled}
                      className={`${curDisc === k ? "on" : ""}${showScar ? " scarce" : ""}`}
                      onClick={() => patch({ disc: k })}
                    >
                      {showScar && n !== undefined && <span className="scar">{n} igjen</span>}
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
