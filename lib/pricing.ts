// Single source of truth for the Talkmore field-sales calculator.
// Prices decoded directly from the printed price sheet (kr/mnd).
// Discount tiers are the exact printed values, not computed, to match the sheet.

export type Tier = "platinum" | "u30_20" | "u30_35";

export interface Plan {
  id: string;
  name: string;
  /** Bonus data shown on the sheet, e.g. "+2 GB". Empty when none. */
  bonus: string;
  /** Price per tier in kr/mnd. u30_20 / u30_35 are null when the plan has no discount tiers. */
  prices: Record<Tier, number | null>;
  /** Short note, e.g. for the child plan. */
  note?: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export const TIERS: { id: Tier; label: string; short: string }[] = [
  { id: "platinum", label: "Platinum pris", short: "Full pris" },
  { id: "u30_20", label: "Under 30 · 20%", short: "20%" },
  { id: "u30_35", label: "Under 30 · 35%", short: "35%" },
];

export const PLANS: Plan[] = [
  { id: "1gb", name: "1 GB", bonus: "+2 GB", prices: { platinum: 249, u30_20: 199, u30_35: 162 } },
  { id: "5gb", name: "5 GB", bonus: "+3 GB", prices: { platinum: 299, u30_20: 239, u30_35: 194 } },
  { id: "10gb", name: "10 GB", bonus: "+4 GB", prices: { platinum: 349, u30_20: 279, u30_35: 227 } },
  { id: "18gb", name: "18 GB", bonus: "+5 GB", prices: { platinum: 399, u30_20: 319, u30_35: 259 } },
  { id: "30gb", name: "30 GB", bonus: "+10 GB", prices: { platinum: 449, u30_20: 359, u30_35: 292 } },
  { id: "ub_normal", name: "UB normal", bonus: "", prices: { platinum: 529, u30_20: 423, u30_35: 344 } },
  { id: "ub_maks", name: "UB maksimal", bonus: "", prices: { platinum: 629, u30_20: 503, u30_35: 409 } },
  {
    id: "1gb_u13",
    name: "1 GB",
    bonus: "",
    prices: { platinum: 99, u30_20: null, u30_35: null },
    note: "U13 · barneabonnement",
  },
];

export const ADDONS: Addon[] = [
  { id: "digital_trygghet", name: "Digital trygghet", price: 69 },
  { id: "tvillingsim", name: "Tvillingsim", price: 79 },
  { id: "datasim", name: "Datasim", price: 79 },
  { id: "ringepakker", name: "Ringepakker", price: 99 },
];

export const BENEFITS: string[] = [
  "Ingen binding",
  "Telenor-dekning",
  "Fri bruk i EU/EØS + UK",
  "Fri tale i Norden",
  "Data rollover",
  "Data kontroll",
  "Svindel- og nummervarsel",
  "Nettvern",
  "Nettslett",
  "Fast rabatt *",
  "5× Databoost *",
  "1000,- rabatt på mobil",
  "Trumf 4% bonus *",
  "Norwegian reward 3%",
];

export interface Line {
  id: string;
  planId: string;
  tier: Tier;
  addonIds: string[];
}

export function getPlan(planId: string): Plan {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  return plan;
}

/** Whether a plan offers the under-30 discount tiers. */
export function planHasDiscounts(plan: Plan): boolean {
  return plan.prices.u30_20 !== null;
}

/** Plan price at the given tier, falling back to platinum when the tier is unavailable. */
export function planPrice(plan: Plan, tier: Tier): number {
  return plan.prices[tier] ?? plan.prices.platinum ?? 0;
}

function addonsTotal(addonIds: string[]): number {
  return addonIds.reduce((sum, id) => {
    const addon = ADDONS.find((a) => a.id === id);
    return sum + (addon?.price ?? 0);
  }, 0);
}

/** Monthly total for a single line: plan price at chosen tier + selected add-ons. */
export function lineTotal(line: Line): number {
  const plan = getPlan(line.planId);
  return planPrice(plan, line.tier) + addonsTotal(line.addonIds);
}

/** Monthly total for the same line at the full Platinum price (add-ons unchanged). */
export function linePlatinumTotal(line: Line): number {
  const plan = getPlan(line.planId);
  return planPrice(plan, "platinum") + addonsTotal(line.addonIds);
}

export interface QuoteTotals {
  monthly: number;
  yearly: number;
  platinumMonthly: number;
  savingsMonthly: number;
  savingsYearly: number;
}

export function quoteTotals(lines: Line[]): QuoteTotals {
  const monthly = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const platinumMonthly = lines.reduce((sum, l) => sum + linePlatinumTotal(l), 0);
  const savingsMonthly = platinumMonthly - monthly;
  return {
    monthly,
    yearly: monthly * 12,
    platinumMonthly,
    savingsMonthly,
    savingsYearly: savingsMonthly * 12,
  };
}

/** Norwegian price formatting, e.g. 1044 -> "1 044,-". */
export function formatKr(value: number): string {
  return `${value.toLocaleString("nb-NO")},-`;
}
