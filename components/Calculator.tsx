"use client";

import { useEffect, useState } from "react";
import {
  type DiscountId,
  DISCOUNT_LABEL,
  effectiveDiscount,
  getPlan,
  type OrderLine,
  orderChart,
  planPrice,
  plansFor,
  portMonthName,
  formatKr,
  type SubType,
  VAS,
  vasTotal,
} from "@/lib/pricing";

interface Cfg {
  type: SubType;
  prodId: string;
  extra: boolean;
  u30: boolean;
  disc: DiscountId;
  fmf: boolean;
  vas: string[];
}

const INITIAL: Cfg = {
  type: "enkelt",
  prodId: "e10",
  extra: false,
  u30: false,
  disc: "full",
  fmf: false,
  vas: [],
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export default function Calculator() {
  const [cfg, setCfg] = useState<Cfg>(INITIAL);
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [port, setPort] = useState("");

  // Default the porting date to today after mount (hydration-safe: keeps new Date()
  // out of the server render so there is no hydration mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount default
    setPort(todayIso());
  }, []);

  const list = plansFor(cfg.type);
  const prod = getPlan(cfg.type, cfg.prodId);
  const familie = cfg.type === "familie";
  const single = !!prod.single;

  // Effective discount for display + price, coerced for plan/u30/familie constraints
  // without mutating state during render.
  let curDisc: DiscountId = cfg.disc;
  if (familie && curDisc === "p35") curDisc = "p20";
  if (single && curDisc !== "full") curDisc = "full";
  if (curDisc === "p35" && !cfg.u30) curDisc = "p20";
  curDisc = effectiveDiscount(prod, curDisc);

  const price = planPrice(prod, curDisc);
  const full = prod.priser.full;
  const monthly = price + vasTotal(cfg.vas);
  const fmfOn = cfg.fmf && !familie && !!prod.fmf;
  const fullName = (familie ? "Familie " : "") + prod.navn;

  function patch(p: Partial<Cfg>) {
    setCfg((prev) => ({ ...prev, ...p }));
  }

  function changeType(type: SubType) {
    patch({ type, prodId: plansFor(type)[0].id, extra: false, fmf: false, disc: "full", u30: false });
  }
  function changePlan(id: string) {
    patch({ prodId: id, extra: false, fmf: false });
  }
  function toggleU30() {
    const u30 = !cfg.u30;
    patch({ u30, disc: !u30 && cfg.disc === "p35" ? "p20" : cfg.disc });
  }
  function toggleVas(id: string) {
    patch({ vas: cfg.vas.includes(id) ? cfg.vas.filter((v) => v !== id) : [...cfg.vas, id] });
  }

  function addToOrder() {
    const vasNames = VAS.filter((v) => cfg.vas.includes(v.id)).map((v) => v.navn);
    setOrder((prev) => [
      ...prev,
      {
        navn: fullName,
        disc: curDisc,
        discLbl: DISCOUNT_LABEL[curDisc],
        perPers: familie ? (prod.perPers ?? null) : null,
        ekstraGb: cfg.extra && prod.ekstra > 0 ? prod.ekstra : 0,
        vasNames,
        price,
        fmf: fmfOn,
        monthly,
      },
    ]);
  }

  function metaOf(it: OrderLine): string {
    const bits: string[] = [];
    if (it.disc !== "full") bits.push(it.discLbl);
    if (it.ekstraGb > 0) bits.push(`+${it.ekstraGb} GB`);
    if (it.fmf) bits.push("1. mnd gratis");
    it.vasNames.forEach((n) => bits.push(n));
    return bits.join(" · ");
  }

  const discDefs: { k: DiscountId; label: string }[] = [
    { k: "full", label: "Full pris" },
    { k: "p20", label: "−20 %" },
    { k: "p35", label: "−35 %" },
  ];

  const hasOrder = order.length > 0;
  const chart = orderChart(order, port);
  const maxBar = Math.max(...chart.bars, 0);

  return (
    <div className="wrap">
      <div className="tmlogo">TALKMORE</div>
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
                const sub =
                  familie && p.perPers != null ? `Per pers ${formatKr(p.perPers)},-` : "kr/mnd";
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`psq${p.id === cfg.prodId ? " on" : ""}`}
                    onClick={() => changePlan(p.id)}
                  >
                    <span className="sg">{p.navn}</span>
                    <span className="sp">{formatKr(p.priser.full)},-</span>
                    <span className="ss">{sub}</span>
                  </button>
                );
              })}
            </div>

            {prod.ekstra > 0 && (
              <div id="extraWrap">
                <div
                  className={`tog${cfg.extra ? " on" : ""}`}
                  role="switch"
                  aria-checked={cfg.extra}
                  onClick={() => patch({ extra: !cfg.extra })}
                >
                  <span>
                    Gi ekstra GB <span className="tp">+{prod.ekstra} GB</span>
                  </span>
                  <span className="sw" />
                </div>
              </div>
            )}

            <div>
              <label className="flabel">Rabatt</label>
              {!familie && (
                <div
                  className={`tog${cfg.u30 ? " on" : ""}`}
                  role="switch"
                  aria-checked={cfg.u30}
                  onClick={toggleU30}
                >
                  <span>
                    Kunde under 30 år <span className="tp">låser opp 35 %</span>
                  </span>
                  <span className="sw" />
                </div>
              )}
              <div className="disc">
                {discDefs
                  .filter((d) => !(familie && d.k === "p35"))
                  .map((d) => {
                    const tierPrice = prod.priser[d.k];
                    const disabled = (single && d.k !== "full") || (d.k === "p35" && !cfg.u30);
                    const showScar = (d.k === "p20" || d.k === "p35") && !disabled && !single;
                    return (
                      <button
                        key={d.k}
                        type="button"
                        disabled={disabled}
                        className={curDisc === d.k ? "on" : ""}
                        onClick={() => patch({ disc: d.k })}
                      >
                        {showScar && <span className="scar">Få igjen</span>}
                        {d.label}
                        <span className="dk">{tierPrice !== undefined ? `${formatKr(tierPrice)} kr` : "–"}</span>
                      </button>
                    );
                  })}
              </div>
              <div className="permanent">
                <LockIcon />
                <span>
                  <b>Fast rabatt.</b> Kunden beholder rabatten så lenge abonnementet er aktivt hos
                  Talkmore.
                </span>
              </div>
            </div>

            {!familie && prod.fmf && (
              <div id="fmfWrap">
                <label className="flabel">Kampanje</label>
                <div
                  className={`tog${fmfOn ? " on" : ""}`}
                  role="switch"
                  aria-checked={fmfOn}
                  onClick={() => patch({ fmf: !cfg.fmf })}
                >
                  <span>
                    Første måned gratis <span className="tp">restdager i porteringsmåneden</span>
                  </span>
                  <span className="sw" />
                </div>
              </div>
            )}

            <label className="flabel">
              Tilleggstjenester <span className="hint">· 1. måned gratis</span>
            </label>
            <div className="vasgrid">
              {VAS.map((v) => (
                <div
                  key={v.id}
                  className={`tog${cfg.vas.includes(v.id) ? " on" : ""}`}
                  role="switch"
                  aria-checked={cfg.vas.includes(v.id)}
                  onClick={() => toggleVas(v.id)}
                >
                  <span>
                    {v.navn} <span className="tp">+{v.pris} kr</span>
                  </span>
                  <span className="sw" />
                </div>
              ))}
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

            <div className="linesum">
              <div className="ls-l">
                <div className="ls-name">
                  {fullName}
                  {curDisc !== "full" ? ` · ${DISCOUNT_LABEL[curDisc]}` : ""}
                </div>
                {curDisc !== "full" && (
                  <div className="ls-save">Sparer {formatKr(full - price)} kr/mnd</div>
                )}
              </div>
              <div className="ls-val">{formatKr(monthly)} kr/mnd</div>
            </div>
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
                        Ingen restdager å betale i {portMonthName(port)} — kunden betaler{" "}
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

      {/* ====== FORKLARING ====== */}
      <details>
        <summary>
          Hvorfor er første faktura høyere? <span className="chev">▼</span>
        </summary>
        <div className="dbody">
          <p>
            Kunden betaler for <b>restdagene i inneværende måned</b> i tillegg til den første hele
            måneden — alt på den <b>første fakturaen</b>, som sendes den <b>1. i påfølgende måned</b>.
            Derfor er første faktura alltid høyere enn den faste prisen.
          </p>
          <div className="example">
            <ul>
              <li>
                Porteringsdato <b>20. juni</b>, månedspris <b>349 kr</b>.
              </li>
              <li>
                349 / 30 = <b>11,63 kr/dag</b>. 10 dager igjen i juni = <b>116 kr</b>.
              </li>
              <li>
                <b>1. faktura (1. juli):</b> 116 + 349 = <b>465 kr</b>.
              </li>
              <li>August og september: 349 kr som normalt.</li>
            </ul>
          </div>
          <div className="note">
            Tilleggstjenester og «Første måned gratis» dekker nettopp disse restdagene — gratis i
            porteringsmåneden, full pris fra første hele måned.
          </div>
        </div>
      </details>
    </div>
  );
}
