// Single source of truth for the Talkmore field-sales calculator (v3).
// Prices, discount tiers and the Familie model mirror the approved reference
// build (see docs/official-pricing.md). Numbers are stored explicitly per tier
// so they match the reference exactly — never derived from a percentage here.

// When the prices below were last checked against the official model.
export const PRICES_VERIFIED = "26.06.2026";
export const PRICES_SOURCE = "talkmore.kundeportal.no";

export type SubType = "enkelt" | "familie";

// One radio group, three states. A plan only offers the tiers it lists in `priser`.
export type DiscountId = "full" | "p20" | "p35";

export const DISCOUNT_LABEL: Record<DiscountId, string> = {
  full: "Full pris",
  p20: "−20 %",
  p35: "−35 %",
};

export interface Plan {
  id: string;
  navn: string;
  /** GB amount, or null for Ubegrenset. */
  gb: number | null;
  /** Bonus GB the rep can grant (0 = none, hides the extra-GB toggle). */
  ekstra: number;
  /** Whether "Første måned gratis" applies (Enkelt data plans only). */
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

export const ENKELT: Plan[] = [
  { id: "e1", navn: "1 GB", gb: 1, ekstra: 2, fmf: true, priser: { full: 249, p20: 199, p35: 162 } },
  { id: "e5", navn: "5 GB", gb: 5, ekstra: 3, fmf: true, priser: { full: 299, p20: 239, p35: 194 } },
  { id: "e10", navn: "10 GB", gb: 10, ekstra: 4, fmf: true, priser: { full: 349, p20: 279, p35: 227 } },
  { id: "e18", navn: "18 GB", gb: 18, ekstra: 5, fmf: true, priser: { full: 399, p20: 319, p35: 259 } },
  { id: "e30", navn: "30 GB", gb: 30, ekstra: 10, fmf: true, priser: { full: 449, p20: 359, p35: 292 } },
  { id: "ubn", navn: "UB Normal", gb: null, ekstra: 0, fmf: false, ub: true, priser: { full: 529, p20: 423, p35: 344 } },
  { id: "ubm", navn: "UB Maksimal", gb: null, ekstra: 0, fmf: false, ub: true, priser: { full: 629, p20: 503, p35: 409 } },
  { id: "u13", navn: "1 GB (U13)", gb: 1, ekstra: 0, fmf: true, single: true, priser: { full: 99 } },
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

export function vasTotal(vasIds: string[]): number {
  return VAS.reduce((sum, v) => sum + (vasIds.includes(v.id) ? v.pris : 0), 0);
}

/** Monthly total for one configured line: discounted plan + selected add-ons. */
export function lineMonthly(plan: Plan, disc: DiscountId, vasIds: string[]): number {
  return planPrice(plan, disc) + vasTotal(vasIds);
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
  ekstraGb: number;
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
