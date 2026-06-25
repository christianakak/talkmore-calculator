import { formatKr, type InvoiceSchedule } from "@/lib/pricing";

interface InvoiceChartProps {
  schedule: InvoiceSchedule;
  firstMonthFree: boolean;
}

/** The "Første 3 fakturaer" bar chart + the plain-language breakdown beneath it. */
export default function InvoiceChart({ schedule, firstMonthFree }: InvoiceChartProps) {
  const { bars, labels, restDays, restAmount, monthly, portMonth } = schedule;
  const max = Math.max(...bars);

  return (
    <div className="mt-6">
      <p className="eyebrow mb-3.5">Første 3 fakturaer</p>

      <div className="flex h-[220px] items-end justify-around gap-3.5 px-1">
        {bars.map((val, i) => {
          const first = i === 0;
          const h = max ? Math.max(8, Math.round((val / max) * 150)) : 8;
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
              {first && restAmount > 0 && (
                <div className="mb-[3px] text-[10.5px] font-bold text-warn">
                  +{formatKr(restAmount)}
                </div>
              )}
              <div className="mb-[7px] whitespace-nowrap text-[15px] font-bold tnum text-ink">
                {formatKr(val)}
              </div>
              <div
                className={`relative w-full max-w-[78px] rounded-t-[12px] rounded-b-[4px] ${
                  first
                    ? "bg-gradient-to-b from-teal-d to-[#256f8f]"
                    : "bg-gradient-to-b from-[#9fd6ec] to-teal"
                }`}
                style={{ height: `${h}px` }}
              >
                {first && (
                  <div className="absolute inset-x-0 top-2 text-center text-[9.5px] font-bold tracking-[0.04em] text-white">
                    1. FAKTURA
                  </div>
                )}
              </div>
              <div className="mt-[9px] text-center text-[12.5px] font-semibold text-ink">
                {labels[i]}
                <small className="block font-normal text-[11px] text-muted">
                  {first ? "restdager + 1 mnd" : "fast pris"}
                </small>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-[12px] border border-line bg-[#fafafa] px-3.5 py-3 text-[13px] text-ink">
        {restAmount > 0 ? (
          <>
            <b className="text-teal-d">
              1. faktura ({labels[0]}):
            </b>{" "}
            {restDays} restdager i {portMonth} ({formatKr(restAmount)}) + {labels[0]} (
            {formatKr(monthly)}) = <b className="text-teal-d">{formatKr(bars[0])}</b>.
          </>
        ) : firstMonthFree ? (
          <>
            <b className="text-teal-d">Første måned gratis</b> 🎁 — restdagene i {portMonth} er
            gratis. Kunden betaler {formatKr(monthly)} fra {labels[0]}.
          </>
        ) : (
          <>
            Porteringsdato sist i måneden — ingen restdager. Fast pris {formatKr(monthly)} fra{" "}
            {labels[0]}.
          </>
        )}
      </div>
    </div>
  );
}
