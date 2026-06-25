import { formatKr, type InvoiceSchedule } from "@/lib/pricing";

interface InvoiceChartProps {
  schedule: InvoiceSchedule;
  firstMonthFree: boolean;
}

const PLOT = 150; // px drawing height for the tallest bar

/** The "Første 3 fakturaer" bar chart plus the plain-language breakdown beneath it. */
export default function InvoiceChart({ schedule, firstMonthFree }: InvoiceChartProps) {
  const { bars, labels, restDays, restAmount, monthly, portMonth } = schedule;
  const max = Math.max(...bars, 1);
  const barH = (v: number) => Math.max(10, Math.round((v / max) * PLOT));
  // A dashed line at the recurring price makes the first-invoice overshoot legible.
  const showRef = bars[0] !== monthly && monthly > 0;
  const refBottom = Math.round((monthly / max) * PLOT);

  return (
    <div className="mt-7">
      <p className="eyebrow mb-3.5">Første 3 fakturaer</p>

      <div className="relative">
        {/* Recurring-price reference line */}
        {showRef && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
            style={{ bottom: `${refBottom}px` }}
          >
            <div className="h-px flex-1 border-t border-dashed border-ink/30" />
            <span className="ml-2 shrink-0 bg-card px-1.5 text-[10.5px] font-semibold text-muted">
              fast pris {formatKr(monthly)}
            </span>
          </div>
        )}

        <div className="flex items-end justify-around gap-2.5" style={{ height: `${PLOT + 38}px` }}>
          {bars.map((val, i) => {
            const first = i === 0;
            return (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                {first && restAmount > 0 && (
                  <div className="mb-[2px] text-[10.5px] font-bold text-accent">
                    +{formatKr(restAmount)}
                  </div>
                )}
                <div className="mb-[6px] whitespace-nowrap text-[14px] font-bold tnum text-ink">
                  {formatKr(val)}
                </div>
                <div
                  className={`relative w-full max-w-[74px] rounded-t-[10px] rounded-b-[3px] ${
                    first ? "bg-ink" : "bg-ink/25"
                  }`}
                  style={{ height: `${barH(val)}px` }}
                >
                  {first && (
                    <div className="absolute inset-x-0 top-2 text-center text-[9.5px] font-bold uppercase tracking-[0.08em] text-white/85">
                      1. faktura
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Month labels, aligned under the columns */}
      <div className="mt-2.5 flex justify-around gap-2.5">
        {labels.map((label, i) => (
          <div key={i} className="flex-1 text-center text-[12px] font-semibold text-ink-soft">
            {label}
            <small className="block font-normal text-[10.5px] text-muted">
              {i === 0 ? "restdager + 1 mnd" : "fast pris"}
            </small>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="mt-5 border-t border-line pt-3.5 text-[13px] text-ink-soft">
        {restAmount > 0 ? (
          <>
            <b className="text-ink">1. faktura ({labels[0]}):</b> {restDays} restdager i {portMonth} (
            {formatKr(restAmount)}) + {labels[0]} ({formatKr(monthly)}) ={" "}
            <b className="text-accent">{formatKr(bars[0])}</b>.
          </>
        ) : firstMonthFree ? (
          <>
            <b className="text-ink">Første måned gratis.</b> Restdagene i {portMonth} er gratis.
            Kunden betaler {formatKr(monthly)} fra {labels[0]}.
          </>
        ) : (
          <>
            Porteringsdato sist i måneden: ingen restdager. Fast pris {formatKr(monthly)} fra{" "}
            {labels[0]}.
          </>
        )}
      </div>
    </div>
  );
}
