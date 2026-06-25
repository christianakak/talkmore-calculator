# Official Talkmore pricing model

Source: the official Talkmore price calculator at https://talkmore.kundeportal.no/
(a Vite SPA built by FIKO AS, embedded into their order system via `postMessage`).
Decoded from the production JS bundle `assets/index-CW5njFwb.js` on 2026-06-25.
This is the authoritative model. Keep `lib/pricing.ts` in sync with it.

## Enkelt (single subscription) base prices

| Plan | Base kr/mnd | bundle `gb` value |
|------|------:|------|
| 1 GB | 249 | 1 |
| 5 GB | 299 | 5 |
| 10 GB | 349 | 10 |
| 18 GB | 399 | 18 |
| 30 GB | 449 | 30 |
| Ubegrenset | 529 | 0 |
| Ubegrenset Maksimal | 629 | -1 |

## Discounts (stackable toggles, not exclusive tiers)

The running total applies these multipliers in order:

```
price
  × 0.90  if Samlerabatt (10% rabatt)      flag: samle
  × 0.80  if U30 (20%)                      flag: u30
  × 0.70  if U30 (30%)                      flag: u3030
  × 0.65  if U30 (35%)                      flag: u3035
  × 0.80  if Samlerabatt 20% (20% rabatt)   flag: samle20  (NOT on Ubegrenset Maksimal, gb === -1)
```

Source (cart total, verbatim from bundle):

```js
r.forEach(b => {
  const $ = b.samle   ? b.price * .9 : b.price,
        E = b.u30     ? $ * .8       : $,
        F = b.u3030   ? E * .7       : E,
        A = b.u3035   ? F * .65      : F,
        T = b.samle20 ? A * .8       : A;
  m += T;
});
```

Notes:
- `U30 (20%)`, `U30 (30%)`, `U30 (35%)` are the three under-30 levels. In practice one is chosen.
- Samlerabatt (10% or 20%) is a separate axis (bundle discount) and can stack on a U30 level.
- The paper sheet's "Under 30 / 20%" and "Under 30 / 35%" rows == U30 (20%) and U30 (35%).
  The sheet omitted the 30% level and the samlerabatt axis.

## Familie (family / shared plan)

```
total = (members * 210) + basis        // members >= 2
total = total * 0.8                     // if samlerabatt
```

> Note: the decoded production bundle applied `* 0.9` (10%) for the family samlerabatt,
> but field/sales use confirms it is **20% (`* 0.8`)**. `lib/pricing.ts` follows the 20% rate.

| Shared pool | Extra GB | basis |
|------|------:|------:|
| 5 GB | +2 | 9 |
| 10 GB | +4 | 109 |
| 20 GB | +4 | 229 |
| 40 GB | +5 | 379 |
| 80 GB | +10 | 479 |
| Ubegrenset | – | 629 |

Example: family of 3 on the 20 GB pool = 3*210 + 229 = 859 kr/mnd (687 with 20% samlerabatt).

## UI labels seen in the official tool
Enkelt · Familie · Enkeltabonnement · Ubegrenset · Ubegrenset Maksimal · Ekstra GB ·
Ingen rabatt · 10% rabatt · 20% rabatt · U30 (20%) · U30 (30%) · U30 (35%) ·
Antall medlemmer · Valgte produkter · Totalpris · Snittpris · Legg til i bestilling · Nullstill.

## Integration note
The official tool posts the built order to its parent window:
`postMessage({ type: "talkmoreOrderCalculatorEnk" | "talkmoreOrderCalculatorFam", message })`.
Relevant if we ever embed our calculator into the same order system.
