# Talkmore pricing model (v3)

Source of truth: the **approved reference build** supplied by management
(`priskalkulator (1).html`, June 2026). `lib/pricing.ts` mirrors its numbers
exactly. Prices are stored explicitly per tier, never derived from a percentage.

> ⚠️ This model intentionally differs from the older decode of the live tool at
> https://talkmore.kundeportal.no/ (see git history of this file). Management
> asked us to match the reference build exactly. If the live tool is the eventual
> arbiter, re-verify these numbers there before a wide rollout.

## Discounts: one radio group, three states

`full` · `−20 %` (`p20`) · `−35 %` (`p35`). A plan only offers the tiers listed
in its `priser`. `−35 %` is gated behind the "Kunde under 30 år" toggle.
The 10 % and 30 % tiers from the old model are gone.

## Enkelt (single subscription)

| Plan | full | −20 % | −35 % | extra GB | FMF |
|------|----:|----:|----:|----:|:--:|
| 1 GB | 249 | 199 | 162 | +2 | yes |
| 5 GB | 299 | 239 | 194 | +3 | yes |
| 10 GB | 349 | 279 | 227 | +4 | yes |
| 18 GB | 399 | 319 | 259 | +5 | yes |
| 30 GB | 449 | 359 | 292 | +10 | yes |
| UB Normal | 529 | 423 | 344 | – | no |
| UB Maksimal | 629 | 503 | 409 | – | no |
| 1 GB (U13) | 99 | – | – | – | yes |

- `−20 %` now **does** apply to UB Maksimal (it was excluded in the old model).
- U13 is a single flat tier: no discounts.

## Familie (fixed tiers, full / −20 % only)

No member counter and no per-member math anymore: each tier is a fixed total with
an indicative per-person figure. Familie offers only `full` and `−20 %`
(no U30, no `−35 %`).

| Pool | full | −20 % | per person | extra GB |
|------|----:|----:|----:|----:|
| 5 GB | 429 | 343 | 215 | +2 |
| 10 GB | 529 | 423 | 265 | +4 |
| 20 GB | 649 | 519 | 325 | +4 |
| 40 GB | 799 | 639 | 400 | +5 |
| 80 GB | 899 | 719 | 450 | +10 |
| Ubegrenset | 1049 | 839 | 525 | – |

## Add-ons (VAS), not discounted, free the first month

Digital trygghet 69 · Tvillingsim 79 · Datasim 79 · Ringepakke 99.

## First invoice (porting), 30-day convention

Rest days = `max(0, 30 − portingDay)`. Rest-days charge is computed on the
**plan price only** (add-ons and "Første måned gratis" are free that month) and
billed on the first invoice on top of the first whole month. Applies to the whole
order.

## Order / cart

Each configured line is added to an order; the chart and totals are computed
across all lines. The porting date applies to the whole order.
