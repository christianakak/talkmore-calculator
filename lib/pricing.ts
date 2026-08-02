// Single source of truth for the Talkmore field-sales calculator (v3).
// Full (list) prices and the Familie model mirror the approved reference build
// (see docs/official-pricing.md). Discounted tiers are the full price minus a
// fixed percentage, rounded to the nearest krone:
//   Permanent 15 = −15 %, Fast Ung / Permanent 20 = −20 %,
//   Permanent 25 = −25 %, Sommerkampanje = −30 %.

// When the prices below were last checked against the official model.
export const PRICES_VERIFIED = "02.08.2026";
export const PRICES_SOURCE = "talkmore.kundeportal.no";

export type SubType = "enkelt" | "familie";

// A plan only offers the tiers it lists in `priser`.
// Enkelt (non-U30): full, p15 (Permanent 15), p25 (Permanent 25).
// Enkelt (U30):     full, p20 (Fast Ung), p30 (Sommerkampanje).
// Familie:          full, p20 (Permanent 20).
export type DiscountId = "full" | "p15" | "p20" | "p25" | "p30";

// Customer-facing codewords. Percentages must never appear in the UI. The p20
// label is dynamic: it reads "Fast Ung" when the line is sold under the "under 30"
// (U30) campaign, otherwise "Permanent 20".
export function discountLabel(disc: DiscountId, u30: boolean): string {
  switch (disc) {
    case "full":
      return "Full pris";
    case "p15":
      return "Permanent 15";
    case "p20":
      return u30 ? "Fast Ung" : "Permanent 20";
    case "p25":
      return "Permanent 25";
    case "p30":
      return "Sommerkampanje";
  }
}

export interface Plan {
  id: string;
  navn: string;
  /** GB amount, or null for Ubegrenset. */
  gb: number | null;
  /** Bonus GB granted by the running "Ekstra GB" campaign (0 = none). */
  ekstra: number;
  /** Whether "Porteringsrabatt" applies (Enkelt data plans only). */
  fmf?: boolean;
  /** Unlimited plan flag (informational). */
  ub?: boolean;
  /** Single-tier plan (U13): only full price, no discounts. */
  single?: boolean;
  /** Familie only: indicative price per person. */
  perPers?: number;
  /** Explicit price per discount tier. `full` is always present. */
  priser: Partial<Record<DiscountId, number>> & { full: number };
}

// Enkelt tiers derived as rounded percentages of the full price:
// p15 = 15% off, p20 (Fast Ung) = 20% off, p25 = 25% off, p30 (Sommerkampanje) = 30% off.
export const ENKELT: Plan[] = [
  { id: "u13", navn: "1 GB (U13)", gb: 1, ekstra: 0, fmf: true, single: true, priser: { full: 99 } },
  { id: "e1", navn: "1 GB", gb: 1, ekstra: 2, fmf: true, priser: { full: 249, p15: 212, p20: 199, p25: 187, p30: 174 } },
  { id: "e5", navn: "5 GB", gb: 5, ekstra: 3, fmf: true, priser: { full: 299, p15: 254, p20: 239, p25: 224, p30: 209 } },
  { id: "e10", navn: "10 GB", gb: 10, ekstra: 4, fmf: true, priser: { full: 349, p15: 297, p20: 279, p25: 262, p30: 244 } },
  { id: "e18", navn: "18 GB", gb: 18, ekstra: 5, fmf: true, priser: { full: 399, p15: 339, p20: 319, p25: 299, p30: 279 } },
  { id: "e30", navn: "30 GB", gb: 30, ekstra: 10, fmf: true, priser: { full: 449, p15: 382, p20: 359, p25: 337, p30: 314 } },
  { id: "ubn", navn: "UB Normal", gb: null, ekstra: 0, fmf: false, ub: true, priser: { full: 529, p15: 450, p20: 423, p25: 397, p30: 370 } },
  { id: "ubm", navn: "UB Maksimal", gb: null, ekstra: 0, fmf: false, ub: true, priser: { full: 629, p15: 535, p20: 503, p25: 472, p30: 440 } },
];

export const FAMILIE: Plan[] = [
  { id: "f5", navn: "5 GB", gb: 5, ekstra: 2, perPers: 215, priser: { full: 429, p20: 343 } },
  { id: "f10", navn: "10 GB", gb: 10, ekstra: 4, perPers: 265, priser: { full: 529, p20: 423 } },
  { id: "f20", navn: "20 GB", gb: 20, ekstra: 4, perPers: 325, priser: { full: 649, p20: 519 } },
  { id: "f40", navn: "40 GB", gb: 40, ekstra: 5, perPers: 400, priser: { full: 799, p20: 639 } },
  { id: "f80", navn: "80 GB", gb: 80, ekstra: 10, perPers: 450, priser: { full: 899, p20: 719 } },
  { id: "fub", navn: "Ubegrenset", gb: null, ekstra: 0, ub: true, perPers: 525, priser: { full: 1049, p20: 839 } },
];

export interface Addon {
  id: string;
  navn: string;
  pris: number;
}

// Value-added services. Not discounted; free the first (porting) month.
export const VAS: Addon[] = [
  { id: "dt", navn: "Digital trygghet", pris: 69 },
  { id: "tvil", navn: "Tvillingsim", pris: 79 },
  { id: "data", navn: "Datasim", pris: 79 },
  { id: "ring", navn: "Ringepakke", pris: 99 },
];

export const MONTHS_NB = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
] as const;

export function plansFor(type: SubType): Plan[] {
  return type === "enkelt" ? ENKELT : FAMILIE;
}

export function getPlan(type: SubType, id: string): Plan {
  const list = plansFor(type);
  return list.find((p) => p.id === id) ?? list[0];
}

/** The discount that actually applies: falls back to full if the plan has no such tier. */
export function effectiveDiscount(plan: Plan, disc: DiscountId): DiscountId {
  return plan.priser[disc] !== undefined ? disc : "full";
}

/** Discounted plan price (no add-ons), using the explicit per-tier price. */
export function planPrice(plan: Plan, disc: DiscountId): number {
  return plan.priser[effectiveDiscount(plan, disc)] as number;
}

// Listed Familie prices are the 2-person base. Each person beyond 2 adds a flat
// surcharge; "Permanent 20" (p20) discounts the whole family total, which is the
// same as discounting the surcharge by 20% (210 × 0.8 = 168, an exact integer).
export const EXTRA_PERSON_PRICE = 210; // kr/mnd per person beyond 2 — confirmed

/** Full discounted family total for `persons` people (2-person base + surcharge). */
export function familiePrice(plan: Plan, disc: DiscountId, persons: number): number {
  const eff = effectiveDiscount(plan, disc);
  const base = plan.priser[eff] as number;
  const extra = Math.max(0, persons - 2);
  return eff === "p20"
    ? base + Math.round(extra * EXTRA_PERSON_PRICE * 0.8)
    : base + extra * EXTRA_PERSON_PRICE;
}

/** Sum of add-ons by quantity. Datasim/Tvillingsim/Ringepakke may be added more than once. */
export function vasTotal(qty: Record<string, number>): number {
  return VAS.reduce((sum, v) => sum + v.pris * (qty[v.id] ?? 0), 0);
}

/** Monthly total for one configured line: discounted plan + selected add-ons (by quantity). */
export function lineMonthly(plan: Plan, disc: DiscountId, qty: Record<string, number>): number {
  return planPrice(plan, disc) + vasTotal(qty);
}

export function formatKr(value: number): string {
  return Math.round(value).toLocaleString("nb-NO");
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- First-invoice timing (porting), 30-day convention ----

function parsePort(portIso: string): Date {
  return new Date(`${portIso}T00:00:00`);
}

/** Days left in the porting month (30-day convention). */
export function remainingDays(portIso: string): number {
  const d = parsePort(portIso);
  const day = Number.isNaN(d.getTime()) ? 1 : d.getDate();
  return Math.max(0, 30 - day);
}

/** Month names for the next three invoices (sent the 1st of each following month). */
export function invoiceLabels(portIso: string): [string, string, string] {
  const d = parsePort(portIso);
  const ref = Number.isNaN(d.getTime()) ? new Date() : d;
  return [1, 2, 3].map((k) =>
    capitalize(MONTHS_NB[new Date(ref.getFullYear(), ref.getMonth() + k, 1).getMonth()]),
  ) as [string, string, string];
}

export function portMonthName(portIso: string): string {
  const d = parsePort(portIso);
  const ref = Number.isNaN(d.getTime()) ? new Date() : d;
  return capitalize(MONTHS_NB[ref.getMonth()]);
}

// ---- Order / cart ----

export interface OrderLine {
  navn: string;
  disc: DiscountId;
  discLbl: string;
  perPers: number | null;
  vasNames: string[];
  /** Discounted plan price only (add-ons free the first month). */
  price: number;
  fmf: boolean;
  /** Recurring monthly total (plan + add-ons). */
  monthly: number;
}

export interface OrderChart {
  totMonthly: number;
  rem: number;
  subRem: number;
  bars: [number, number, number];
  labels: [string, string, string];
}

/** The three first-invoice bars for the whole order, given a porting date. */
export function orderChart(order: OrderLine[], portIso: string): OrderChart {
  const totMonthly = order.reduce((s, it) => s + it.monthly, 0);
  const rem = remainingDays(portIso);
  const subRem = order.reduce((s, it) => s + (it.fmf ? 0 : Math.round((it.price / 30) * rem)), 0);
  return {
    totMonthly,
    rem,
    subRem,
    bars: [subRem + totMonthly, totMonthly, totMonthly],
    labels: invoiceLabels(portIso),
  };
}

export const BENEFITS: string[] = [
  "Ingen binding",
  "Telenor-dekning",
  "Fri bruk i EU/EØS + UK",
  "Fri tale i Norden",
  "Data rollover",
  "Datakontroll",
  "Svindel- og nummervarsel",
  "Nettvern",
  "Nettslett",
  "Fast rabatt",
  "5× Databoost",
  "1000,- rabatt på mobil",
  "Trumf 4 % bonus",
  "Norwegian Reward 3 %",
];
