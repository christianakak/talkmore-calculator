import { describe, expect, it } from "vitest";
import {
  PLANS,
  TIERS,
  getPlan,
  lineTotal,
  planHasDiscounts,
  planPrice,
  quoteTotals,
  type Line,
} from "./pricing";

describe("plan pricing", () => {
  it("matches the printed sheet for every plan and tier", () => {
    const expected: Record<string, [number, number | null, number | null]> = {
      "1gb": [249, 199, 162],
      "5gb": [299, 239, 194],
      "10gb": [349, 279, 227],
      "18gb": [399, 319, 259],
      "30gb": [449, 359, 292],
      ub_normal: [529, 423, 344],
      ub_maks: [629, 503, 409],
      "1gb_u13": [99, null, null],
    };
    for (const plan of PLANS) {
      const [plat, t20, t35] = expected[plan.id];
      expect(plan.prices.platinum).toBe(plat);
      expect(plan.prices.u30_20).toBe(t20);
      expect(plan.prices.u30_35).toBe(t35);
    }
  });

  it("discount tiers are 20% and 35% off platinum (rounded to whole kr)", () => {
    for (const plan of PLANS) {
      if (!planHasDiscounts(plan)) continue;
      const plat = plan.prices.platinum!;
      expect(plan.prices.u30_20).toBe(Math.round(plat * 0.8));
      expect(plan.prices.u30_35).toBe(Math.round(plat * 0.65));
    }
  });

  it("U13 plan has no discount tiers and falls back to platinum", () => {
    const u13 = getPlan("1gb_u13");
    expect(planHasDiscounts(u13)).toBe(false);
    expect(planPrice(u13, "u30_20")).toBe(99);
    expect(planPrice(u13, "u30_35")).toBe(99);
  });
});

describe("lineTotal", () => {
  it("adds plan price at the chosen tier", () => {
    expect(lineTotal({ id: "a", planId: "18gb", tier: "u30_20", addonIds: [] })).toBe(319);
  });

  it("adds selected add-ons on top", () => {
    // 18 GB @ −35% (259) + Tvillingsim (79) + Digital trygghet (69) = 407
    const line: Line = {
      id: "a",
      planId: "18gb",
      tier: "u30_35",
      addonIds: ["tvillingsim", "digital_trygghet"],
    };
    expect(lineTotal(line)).toBe(259 + 79 + 69);
  });
});

describe("quoteTotals", () => {
  const lines: Line[] = [
    { id: "1", planId: "ub_maks", tier: "u30_20", addonIds: [] }, // 503
    { id: "2", planId: "5gb", tier: "u30_35", addonIds: ["tvillingsim"] }, // 194 + 79 = 273
    { id: "3", planId: "1gb_u13", tier: "platinum", addonIds: [] }, // 99
  ];

  it("sums monthly and yearly", () => {
    const t = quoteTotals(lines);
    expect(t.monthly).toBe(503 + 273 + 99); // 875
    expect(t.yearly).toBe(875 * 12);
  });

  it("computes savings vs platinum (add-ons cancel out)", () => {
    const t = quoteTotals(lines);
    // platinum: 629 + (299 + 79) + 99 = 1106
    expect(t.platinumMonthly).toBe(629 + 299 + 79 + 99);
    expect(t.savingsMonthly).toBe(t.platinumMonthly - t.monthly);
    expect(t.savingsYearly).toBe(t.savingsMonthly * 12);
  });

  it("has zero savings for an all-platinum quote", () => {
    const t = quoteTotals([{ id: "1", planId: "30gb", tier: "platinum", addonIds: ["datasim"] }]);
    expect(t.savingsMonthly).toBe(0);
  });
});

describe("metadata", () => {
  it("exposes three tiers", () => {
    expect(TIERS.map((t) => t.id)).toEqual(["platinum", "u30_20", "u30_35"]);
  });
});
