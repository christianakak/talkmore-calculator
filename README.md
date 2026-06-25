# Talkmore – Salgskalkulator

Mobile-first field-sales calculator for Talkmore subscriptions. A rep assembles a
multi-line household quote, sees the combined monthly price and yearly savings vs full
(Platinum) price, and shows the customer a clean summary.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run test     # unit tests for the pricing math
npm run build    # production build
```

## How it works

- **`lib/pricing.ts`** — single source of truth. All plans, add-ons, benefits and the
  money math (`lineTotal`, `quoteTotals`) live here. Prices are the exact values printed
  on the source price sheet.
- **`app/page.tsx`** — the calculator: a list of subscription lines + a sticky total bar.
- **`components/LineCard.tsx`** — one line: plan, discount tier, add-ons.
- **`components/QuoteSummary.tsx`** — the customer-facing summary (totals, savings,
  included benefits, copy-as-text).

## Pricing data (kr/mnd)

Each plan has three price tiers, matching the sheet's red-text discount key:

| Tier | Meaning |
|------|---------|
| Platinum pris | Full price |
| Under 30 / 20% | 20% off (under-30 customer) |
| Under 30 / 35% | 35% off (under-30 customer) |

| Plan | Bonus | Platinum | −20% | −35% |
|------|-------|---------:|-----:|-----:|
| 1 GB | +2 GB | 249 | 199 | 162 |
| 5 GB | +3 GB | 299 | 239 | 194 |
| 10 GB | +4 GB | 349 | 279 | 227 |
| 18 GB | +5 GB | 399 | 319 | 259 |
| 30 GB | +10 GB | 449 | 359 | 292 |
| UB normal | — | 529 | 423 | 344 |
| UB maksimal | — | 629 | 503 | 409 |
| 1 GB (U13) | — | 99 | — | — |

Add-ons: Digital trygghet 69 · Tvillingsim 79 · Datasim 79 · Ringepakker 99.

To update prices, edit `lib/pricing.ts` and run `npm run test` to re-validate.
