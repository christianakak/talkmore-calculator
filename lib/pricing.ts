// Single source of truth for the Talkmore field-sales calculator.
// Mirrors the official tool at https://talkmore.kundeportal.no/ (see docs/official-pricing.md).
// Prices and discount math are decoded from the official production bundle.

// When the prices below were last checked against the official calculator.
// Bump this whenever you re-verify lib/pricing.ts against talkmore.kundeportal.no.
export const PRICES_VERIFIED = "25.06.2026";
export const PRICES_SOURCE = "talkmore.kundeportal.no";

export type DiscountId = "samle" | "u30" | "u3030" | "u3035" | "samle20";

export interface Discount {
  id: DiscountId;
  label: string;
  factor: number;
  note?: string;
}

// Order matters: the official cart applies these multipliers in this exact sequence.
export const DISCOUNTS: Discount[] = [
  { id: "samle", label: "Samlerabatt 10%", factor: 0.9 },
  { id: "u30", label: "U30 (20%)", factor: 0.8 },
  { id: "u3030", label: "U30 (30%)", factor: 0.7 },
  { id: "u3035", label: "U30 (35%)", factor: 0.65 },
  { id: "samle20", label: "Samlerabatt 20%", factor: 0.8, note: "Ikke på Ubegrenset Maksimal" },
];

// The official tool uses ONE radio group for all discounts: a subscription gets
// at most one discount (a U30 level OR a samlerabatt rate OR none). Selecting one
// clears any other. This keeps prices identical to the official calculator.
export function toggleDiscount(current: DiscountId[], id: DiscountId): DiscountId[] {
  return current.includes(id) ? [] : [id];
}

export interface Plan {
  id: string;
  name: string;
  /** 0 = Ubegrenset, -1 = Ubegrenset Maksimal, otherwise the GB amount. */
  gb: number;
  /** Bonus data from the price sheet (informational, does not affect price). */
  bonus: string;
  /** Base monthly price in kr before discounts. */
  price: number;
  /** Flat-price plan with no discounts (e.g. the U13 child plan). */
  flat?: boolean;
  /** Short tag shown next to the name, e.g. "U13". */
  tag?: string;
}

export const PLANS: Plan[] = [
  { id: "1gb", name: "1 GB", gb: 1, bonus: "+2 GB", price: 249 },
  { id: "5gb", name: "5 GB", gb: 5, bonus: "+3 GB", price: 299 },
  { id: "10gb", name: "10 GB", gb: 10, bonus: "+4 GB", price: 349 },
  { id: "18gb", name: "18 GB", gb: 18, bonus: "+5 GB", price: 399 },
  { id: "30gb", name: "30 GB", gb: 30, bonus: "+10 GB", price: 449 },
  { id: "ub", name: "Ubegrenset", gb: 0, bonus: "", price: 529 },
  { id: "ub_maks", name: "Ubegrenset Maksimal", gb: -1, bonus: "", price: 629 },
  { id: "1gb_u13", name: "1 GB", gb: 1, bonus: "", price: 99, flat: true, tag: "U13" },
];

export interface Addon {
  id: string;
  name: string;
  price: number;
}

// From the printed price sheet. Add-ons are not discounted.
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
  discounts: DiscountId[];
  addonIds: string[];
}

export function getPlan(planId: string): Plan {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  return plan;
}

/** Whether a discount applies to a given plan (Samlerabatt 20% is excluded on Ubegrenset Maksimal). */
export function discountApplies(discountId: DiscountId, plan: Plan): boolean {
  if (plan.flat) return false;
  if (discountId === "samle20" && plan.gb === -1) return false;
  return true;
}

export function addonsTotal(addonIds: string[]): number {
  return addonIds.reduce((sum, id) => {
    const addon = ADDONS.find((a) => a.id === id);
    return sum + (addon?.price ?? 0);
  }, 0);
}

// Money is kept PRECISE internally and rounded only at display (formatKr), so a
// multi-line total matches the official cart exactly (it sums precise, then rounds).

/** Plan price after all selected discounts, applied in the official order. Precise (unrounded). */
export function discountedPlanPrice(plan: Plan, discounts: DiscountId[]): number {
  let price = plan.price;
  for (const d of DISCOUNTS) {
    if (!discounts.includes(d.id)) continue;
    if (!discountApplies(d.id, plan)) continue;
    price *= d.factor;
  }
  return price;
}

/** Monthly total for a single line: discounted plan price + selected add-ons. */
export function lineTotal(line: Line): number {
  return discountedPlanPrice(getPlan(line.planId), line.discounts) + addonsTotal(line.addonIds);
}

/** Monthly total at full price (no discounts), add-ons unchanged. Used for savings. */
export function lineBaseTotal(line: Line): number {
  return getPlan(line.planId).price + addonsTotal(line.addonIds);
}

export interface QuoteTotals {
  monthly: number;
  yearly: number;
  baseMonthly: number;
  savingsMonthly: number;
  savingsYearly: number;
  averageMonthly: number;
}

export function quoteTotals(lines: Line[]): QuoteTotals {
  const monthly = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const baseMonthly = lines.reduce((sum, l) => sum + lineBaseTotal(l), 0);
  const savingsMonthly = baseMonthly - monthly;
  return {
    monthly,
    yearly: monthly * 12,
    baseMonthly,
    savingsMonthly,
    savingsYearly: savingsMonthly * 12,
    averageMonthly: lines.length ? monthly / lines.length : 0,
  };
}

// ---- Familie (shared / family plan) ----

export interface FamilyPool {
  id: string;
  name: string;
  gb: number; // 0 = Ubegrenset
  extraGb: number;
  basis: number;
}

export const FAMILY_PER_MEMBER = 210;

export const FAMILY_POOLS: FamilyPool[] = [
  { id: "f5", name: "5 GB", gb: 5, extraGb: 2, basis: 9 },
  { id: "f10", name: "10 GB", gb: 10, extraGb: 4, basis: 109 },
  { id: "f20", name: "20 GB", gb: 20, extraGb: 4, basis: 229 },
  { id: "f40", name: "40 GB", gb: 40, extraGb: 5, basis: 379 },
  { id: "f80", name: "80 GB", gb: 80, extraGb: 10, basis: 479 },
  { id: "fub", name: "Ubegrenset", gb: 0, extraGb: 0, basis: 629 },
];

export function getFamilyPool(poolId: string): FamilyPool {
  const pool = FAMILY_POOLS.find((p) => p.id === poolId);
  if (!pool) throw new Error(`Unknown family pool: ${poolId}`);
  return pool;
}

/** Samlerabatt rate for a family. Field-confirmed at 20% (the decoded bundle showed 10%). */
export const FAMILY_SAMLERABATT_FACTOR = 0.8;

/** Family monthly total: members × 210 + pool basis, optionally with 20% samlerabatt. Precise. */
export function familyTotal(members: number, pool: FamilyPool, samlerabatt: boolean): number {
  const base = members * FAMILY_PER_MEMBER + pool.basis;
  return samlerabatt ? base * FAMILY_SAMLERABATT_FACTOR : base;
}

/** Average price per member (Snittpris). Precise; round at display. */
export function familyAverage(members: number, pool: FamilyPool, samlerabatt: boolean): number {
  if (members <= 0) return 0;
  return familyTotal(members, pool, samlerabatt) / members;
}

/** A configured family block in a quote. */
export interface FamilyConfig {
  id: string;
  members: number;
  poolId: string;
  samlerabatt: boolean;
}

export function familyConfigTotal(f: FamilyConfig): number {
  return familyTotal(f.members, getFamilyPool(f.poolId), f.samlerabatt);
}

/** Family total at full price (without samlerabatt), for savings. */
export function familyConfigBase(f: FamilyConfig): number {
  return familyTotal(f.members, getFamilyPool(f.poolId), false);
}

// ---- Combined quote (Enkelt lines + Familie blocks) ----

export interface CombinedTotals {
  monthly: number;
  yearly: number;
  baseMonthly: number;
  savingsMonthly: number;
  savingsYearly: number;
  /** Total subscriptions: one per Enkelt line plus each family's members. */
  units: number;
  averageMonthly: number;
}

export function combinedTotals(lines: Line[], families: FamilyConfig[]): CombinedTotals {
  const linesMonthly = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const familiesMonthly = families.reduce((sum, f) => sum + familyConfigTotal(f), 0);
  const monthly = linesMonthly + familiesMonthly;

  const linesBase = lines.reduce((sum, l) => sum + lineBaseTotal(l), 0);
  const familiesBase = families.reduce((sum, f) => sum + familyConfigBase(f), 0);
  const baseMonthly = linesBase + familiesBase;

  const savingsMonthly = baseMonthly - monthly;
  const units = lines.length + families.reduce((sum, f) => sum + f.members, 0);

  return {
    monthly,
    yearly: monthly * 12,
    baseMonthly,
    savingsMonthly,
    savingsYearly: savingsMonthly * 12,
    units,
    averageMonthly: units ? monthly / units : 0,
  };
}

/** Norwegian price formatting, e.g. 1044 -> "1 044,-". */
export function formatKr(value: number): string {
  return `${Math.round(value).toLocaleString("nb-NO")},-`;
}

// ---- First-invoice timing (porting) ----
//
// When a customer ports mid-month they pay for the remaining days of the porting
// month PLUS the first whole month, both on the first invoice (sent the 1st of the
// following month). We use the 30-day-month convention the sales team works with.
// Value-added services and "Første måned gratis" are free during the porting month,
// so the rest-days amount is computed on the PLAN price only — never the add-ons.

export const MONTHS_NB = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
] as const;

export function monthNameNb(date: Date): string {
  const name = MONTHS_NB[date.getMonth()];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export interface InvoiceSchedule {
  /** Days left in the porting month under the 30-day convention. */
  restDays: number;
  /** Rest-days charge on the first invoice (0 if first month free or end-of-month). */
  restAmount: number;
  /** Recurring monthly total (plan + add-ons). */
  monthly: number;
  /** The first three invoice amounts: [restdays + month1, month2, month3]. */
  bars: [number, number, number];
  /** Month names for the three invoices (the invoice is sent the 1st of each). */
  labels: [string, string, string];
  /** The month the customer ports in (where the rest days fall). */
  portMonth: string;
}

/**
 * First three invoices for a ported subscription. `planMonthly` is the discounted
 * plan price (no add-ons); `addonsMonthly` is added to the recurring total but is
 * free during the porting month. Precise internally — round at display.
 */
export function invoiceSchedule(opts: {
  planMonthly: number;
  addonsMonthly: number;
  portDate: Date | string;
  firstMonthFree: boolean;
}): InvoiceSchedule {
  const { planMonthly, addonsMonthly, firstMonthFree } = opts;
  const d = opts.portDate instanceof Date ? opts.portDate : new Date(`${opts.portDate}T00:00:00`);
  const valid = !Number.isNaN(d.getTime());
  const day = valid ? d.getDate() : 1;

  const restDays = Math.max(0, 30 - day);
  const restAmount = firstMonthFree ? 0 : Math.round((planMonthly / 30) * restDays);
  const monthly = planMonthly + addonsMonthly;

  // Invoice k (k = 1..3) is sent the 1st of the k-th month after the porting month.
  const ref = valid ? d : new Date();
  const labels = [1, 2, 3].map((k) =>
    monthNameNb(new Date(ref.getFullYear(), ref.getMonth() + k, 1)),
  ) as [string, string, string];

  return {
    restDays,
    restAmount,
    monthly,
    bars: [restAmount + monthly, monthly, monthly],
    labels,
    portMonth: monthNameNb(ref),
  };
}
