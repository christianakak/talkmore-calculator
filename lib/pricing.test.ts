import { describe, expect, it } from "vitest";
import {
  FAMILY_POOLS,
  PLANS,
  discountApplies,
  discountedPlanPrice,
  familyAverage,
  familyTotal,
  getFamilyPool,
  getPlan,
  lineTotal,
  quoteTotals,
  type Line,
} from "./pricing";

describe("base plan prices (match official tool)", () => {
  it("has the seven official Enkelt plans at the right prices", () => {
    const expected: Record<string, number> = {
      "1gb": 249,
      "5gb": 299,
      "10gb": 349,
      "18gb": 399,
      "30gb": 449,
      ub: 529,
      ub_maks: 629,
    };
    expect(PLANS.length).toBe(7);
    for (const plan of PLANS) {
      expect(plan.price).toBe(expected[plan.id]);
    }
  });
});

describe("discountedPlanPrice (official multipliers, rounded)", () => {
  const p1gb = getPlan("1gb"); // 249

  it("U30 20% and 35% reproduce the printed sheet rows", () => {
    expect(discountedPlanPrice(p1gb, ["u30"])).toBe(199); // 249 * .8 = 199.2 -> 199
    expect(discountedPlanPrice(p1gb, ["u3035"])).toBe(162); // 249 * .65 = 161.85 -> 162
  });

  it("U30 30% is 0.7 of base", () => {
    expect(discountedPlanPrice(p1gb, ["u3030"])).toBe(Math.round(249 * 0.7)); // 174
  });

  it("samlerabatt stacks on top of U30 in order", () => {
    // samle (.9) then u30 (.8): 249 * .9 * .8 = 179.28 -> 179
    expect(discountedPlanPrice(p1gb, ["samle", "u30"])).toBe(179);
  });

  it("applies discounts in the official order regardless of selection order", () => {
    expect(discountedPlanPrice(p1gb, ["u30", "samle"])).toBe(
      discountedPlanPrice(p1gb, ["samle", "u30"]),
    );
  });

  it("samlerabatt 20% does not apply to Ubegrenset Maksimal", () => {
    const maks = getPlan("ub_maks"); // 629, gb -1
    expect(discountApplies("samle20", maks)).toBe(false);
    expect(discountedPlanPrice(maks, ["samle20"])).toBe(629);
    // but it does apply to a normal plan
    const ub = getPlan("ub"); // 529
    expect(discountApplies("samle20", ub)).toBe(true);
    expect(discountedPlanPrice(ub, ["samle20"])).toBe(Math.round(529 * 0.8)); // 423
  });
});

describe("lineTotal and quoteTotals", () => {
  it("adds non-discounted add-ons on top of the discounted plan", () => {
    const line: Line = {
      id: "a",
      planId: "18gb", // 399
      discounts: ["u30"], // -> 319
      addonIds: ["tvillingsim"], // +79
    };
    expect(lineTotal(line)).toBe(319 + 79);
  });

  it("computes monthly, yearly, savings and average", () => {
    const lines: Line[] = [
      { id: "1", planId: "ub_maks", discounts: ["u30"], addonIds: [] }, // 629 -> 503
      { id: "2", planId: "5gb", discounts: ["u3035"], addonIds: ["tvillingsim"] }, // 194 + 79 = 273
    ];
    const t = quoteTotals(lines);
    expect(t.monthly).toBe(503 + 273); // 776
    expect(t.yearly).toBe(776 * 12);
    expect(t.baseMonthly).toBe(629 + 299 + 79); // 1007
    expect(t.savingsMonthly).toBe(t.baseMonthly - t.monthly);
    expect(t.savingsYearly).toBe(t.savingsMonthly * 12);
    expect(t.averageMonthly).toBe(Math.round(776 / 2));
  });

  it("has zero savings with no discounts", () => {
    const t = quoteTotals([{ id: "1", planId: "30gb", discounts: [], addonIds: ["datasim"] }]);
    expect(t.savingsMonthly).toBe(0);
  });
});

describe("Familie", () => {
  it("has the six official pools", () => {
    expect(FAMILY_POOLS.map((p) => p.basis)).toEqual([9, 109, 229, 379, 479, 629]);
  });

  it("total = members * 210 + basis", () => {
    const pool = getFamilyPool("f20"); // basis 229
    expect(familyTotal(3, pool, false)).toBe(3 * 210 + 229); // 859
  });

  it("applies 10% samlerabatt to the family total", () => {
    const pool = getFamilyPool("f20");
    expect(familyTotal(3, pool, true)).toBe(Math.round((3 * 210 + 229) * 0.9)); // 773
  });

  it("average is total divided by members", () => {
    const pool = getFamilyPool("f20");
    expect(familyAverage(3, pool, false)).toBe(Math.round(859 / 3));
  });
});
