"use client";

import { useEffect, useRef, useState } from "react";
import Accordion from "@/components/Accordion";
import Calculator from "@/components/Calculator";
import FamilyCalculator from "@/components/FamilyCalculator";
import { BENEFITS, PRICES_SOURCE, PRICES_VERIFIED } from "@/lib/pricing";

const TYPE_KEY = "tm-type-v1";
type Kind = "enkelt" | "familie";

export default function Page() {
  const [kind, setKind] = useState<Kind>("enkelt");
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TYPE_KEY);
      if (raw === "familie" || raw === "enkelt") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe load
        setKind(raw);
      }
    } catch {
      // ignore
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(TYPE_KEY, kind);
    } catch {
      // non-fatal
    }
  }, [kind]);

  return (
    <main className="relative z-10 mx-auto w-full max-w-[680px] flex-1 px-4 pb-16 pt-7">
      {/* Header */}
      <header className="px-1 pb-5">
        <div className="text-[14px] font-bold tracking-[0.04em] text-ink">
          Talkmore<span className="text-teal-d">.</span>{" "}
          <span className="font-normal text-muted">Priskalkulator</span>
        </div>
        <h1 className="mt-3.5 text-[clamp(30px,7vw,42px)]">Priskalkulator 📱</h1>
        <p className="mt-2 max-w-[46ch] text-muted">
          Sett sammen kundens Talkmore-abonnement og se pris, rabatt og første faktura — rett i
          hånden ute på stand.
        </p>
      </header>

      {/* Explainers */}
      <Accordion title="Hvorfor er første faktura høyere?" defaultOpen>
        <p className="mb-2.5">
          Når en kunde porterer til Talkmore betaler de for <b>resten av dagene i inneværende
          måned</b> i tillegg til den første hele måneden — alt på den <b>første fakturaen</b>.
          Fakturaen sendes alltid den <b>1. i påfølgende måned</b>.
        </p>
        <p className="mb-2.5">
          Derfor blir den <b>første fakturaen alltid høyere</b> enn den faste månedsprisen. Månedene
          etter er helt vanlige.
        </p>
        <div className="mt-3 rounded-[14px] border border-line bg-[#fafafa] px-4 py-3.5">
          <span className="mb-2 inline-block rounded-full bg-teal-bg px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-[0.08em] text-teal-d">
            Eksempel
          </span>
          <ul className="ml-[18px] list-disc text-[13.8px]">
            <li className="mb-1.5">
              Porteringsdato <b>20. juni</b>, månedspris <b>349 kr</b>.
            </li>
            <li className="mb-1.5">
              349 kr / 30 dager = <b>11,63 kr per dag</b>. 10 dager igjen i juni = <b>116 kr</b>.
            </li>
            <li className="mb-1.5">
              <b>1. faktura (1. juli):</b> 116 kr + 349 kr (juli) = <b>465 kr</b>.
            </li>
            <li>
              <b>August og september:</b> 349 kr som normalt. ✅
            </li>
          </ul>
        </div>
        <div className="mt-2.5 rounded-[12px] border border-[#dff0f7] bg-[#f6fbfd] px-3.5 py-3 text-[13.5px] text-[#3c6c80]">
          💡 <b>Tilleggstjenester (VAS)</b> og <b>«Første måned gratis»</b> dekker akkurat disse
          restdagene — de er gratis i porteringsmåneden, og full pris fra første hele måned.
        </div>
      </Accordion>

      <Accordion title="Fordeler i abonnementet">
        <ul className="grid grid-cols-2 gap-x-5 text-[13.8px]">
          {BENEFITS.map((b) => (
            <li key={b} className="mb-1.5 ml-[18px] list-disc break-inside-avoid">
              {b}
            </li>
          ))}
        </ul>
      </Accordion>

      {/* Calculator card */}
      <div className="mt-6 rounded-[18px] border border-ink/15 bg-card px-[18px] py-5 shadow-[0_3px_14px_rgba(0,0,0,0.07)]">
        {/* Enkelt / Familie segmented control */}
        <div className="flex rounded-[12px] bg-[#f3f3f3] p-1">
          {(["enkelt", "familie"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`flex-1 rounded-[9px] px-1.5 py-[9px] text-[13.5px] font-semibold transition ${
                kind === k ? "bg-ink text-white" : "text-muted"
              }`}
            >
              {k === "enkelt" ? "Enkeltabonnement" : "Familieabonnement"}
            </button>
          ))}
        </div>

        <div className="mt-1">{kind === "enkelt" ? <Calculator /> : <FamilyCalculator />}</div>
      </div>

      {/* Footer */}
      <footer className="mt-9 text-center text-[12px] text-muted">
        Veiledende priser. Priser verifisert {PRICES_VERIFIED} mot {PRICES_SOURCE}.
      </footer>
    </main>
  );
}
