import { describe, expect, it } from "vitest";
import {
  FAMILY_POOLS,
  combinedTotals,
  discountApplies,
  discountedPlanPrice,
  familyAverage,
  familyConfigTotal,
  familyTotal,
  formatKr,
  getFamilyPool,
  getPlan,
  lineTotal,
  quoteTotals,
  toggleDiscount,
  type DiscountId,
  type FamilyConfig,
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
    for (const id of Object.keys(expected)) {
      expect(getPlan(id).price).toBe(expected[id]);
    }
  });

  it("the U13 plan is a flat 99 with no discounts", () => {
    const u13 = getPlan("1gb_u13");
    expect(u13.price).toBe(99);
    expect(u13.flat).toBe(true);
    expect(discountApplies("u30", u13)).toBe(false);
    expect(discountedPlanPrice(u13, ["u30", "samle", "u3035"])).toBe(99);
  });
});

describe("discountedPlanPrice — precise math, official multipliers", () => {
  const p1gb = getPlan("1gb"); // 249

  it("keeps full precision internally (no per-line rounding)", () => {
    expect(discountedPlanPrice(p1gb, ["u30"])).toBeCloseTo(199.2, 5); // 249 * .8
    expect(discountedPlanPrice(p1gb, ["u3030"])).toBeCloseTo(174.3, 5); // 249 * .7
    expect(discountedPlanPrice(p1gb, ["u3035"])).toBeCloseTo(161.85, 5); // 249 * .65
    expect(discountedPlanPrice(p1gb, ["samle", "u30"])).toBeCloseTo(179.28, 5); // .9 * .8
  });

  it("displays the same whole-kr values as the printed sheet", () => {
    expect(formatKr(discountedPlanPrice(p1gb, ["u30"]))).toBe("199,-");
    expect(formatKr(discountedPlanPrice(p1gb, ["u3035"]))).toBe("162,-");
  });

  it("applies discounts in official order regardless of selection order", () => {
    expect(discountedPlanPrice(p1gb, ["u30", "samle"])).toBeCloseTo(
      discountedPlanPrice(p1gb, ["samle", "u30"]),
      5,
    );
  });

  it("samlerabatt 20% does not apply to Ubegrenset Maksimal", () => {
    const maks = getPlan("ub_maks");
    expect(discountApplies("samle20", maks)).toBe(false);
    expect(discountedPlanPrice(maks, ["samle20"])).toBe(629);
    const ub = getPlan("ub");
    expect(discountedPlanPrice(ub, ["samle20"])).toBeCloseTo(423.2, 5); // 529 * .8
  });
});

describe("multi-line total matches the official cart (sum precise, then round)", () => {
  it("two discounted lines round to the official total, not the sum of rounded lines", () => {
    const lines: Line[] = [
      { id: "1", planId: "1gb", discounts: ["samle", "u30"], addonIds: [] },
      { id: "2", planId: "1gb", discounts: ["samle", "u30"], addonIds: [] },
    ];
    const t = quoteTotals(lines);
    // precise per line = 179.28; official total = round(358.56) = 359
    expect(formatKr(t.monthly)).toBe("359,-");
    // and NOT round(179.28)*2 = 358
    expect(Math.round(t.monthly)).not.toBe(Math.round(179.28) * 2);
  });
});

describe("toggleDiscount — single-select within a group", () => {
  it("picking a second U30 level replaces the first", () => {
    let d: DiscountId[] = [];
    d = toggleDiscount(d, "u30");
    expect(d).toEqual(["u30"]);
    d = toggleDiscount(d, "u3035");
    expect(d).toEqual(["u3035"]); // u30 cleared
  });

  it("samlerabatt and U30 are independent groups that coexist", () => {
    let d: DiscountId[] = [];
    d = toggleDiscount(d, "samle");
    d = toggleDiscount(d, "u30");
    expect(new Set(d)).toEqual(new Set(["samle", "u30"]));
    d = toggleDiscount(d, "samle20"); // replaces samle within the samlerabatt group
    expect(new Set(d)).toEqual(new Set(["samle20", "u30"]));
  });

  it("toggling the selected option off clears it", () => {
    expect(toggleDiscount(["u30"], "u30")).toEqual([]);
  });
});

describe("lineTotal and quoteTotals", () => {
  it("adds non-discounted add-ons on top of the discounted plan", () => {
    const line: Line = { id: "a", planId: "18gb", discounts: ["u30"], addonIds: ["tvillingsim"] };
    expect(lineTotal(line)).toBeCloseTo(319.2 + 79, 5);
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
    expect(familyTotal(3, getFamilyPool("f20"), false)).toBe(3 * 210 + 229); // 859
  });

  it("applies 10% samlerabatt (precise)", () => {
    expect(familyTotal(3, getFamilyPool("f20"), true)).toBeCloseTo(859 * 0.9, 5); // 773.1
  });

  it("average is total / members", () => {
    expect(familyAverage(3, getFamilyPool("f20"), false)).toBeCloseTo(859 / 3, 5);
  });
});

describe("combinedTotals (Enkelt + Familie in one quote)", () => {
  const lines: Line[] = [
    { id: "1", planId: "ub_maks", discounts: ["u30"], addonIds: [] }, // 503.2
    { id: "2", planId: "1gb_u13", discounts: [], addonIds: [] }, // 99 flat
  ];
  const families: FamilyConfig[] = [
    { id: "f", members: 3, poolId: "f20", samlerabatt: true }, // 773.1
  ];

  it("sums lines and families precisely", () => {
    const t = combinedTotals(lines, families);
    expect(t.monthly).toBeCloseTo(629 * 0.8 + 99 + familyConfigTotal(families[0]), 5);
    expect(formatKr(t.monthly)).toBe(formatKr(503.2 + 99 + 773.1));
  });

  it("counts units as one per line plus each family's members", () => {
    const t = combinedTotals(lines, families);
    expect(t.units).toBe(2 + 3);
    expect(t.averageMonthly).toBeCloseTo(t.monthly / 5, 5);
  });

  it("savings include family samlerabatt and exclude flat U13", () => {
    const t = combinedTotals(lines, families);
    expect(t.baseMonthly).toBe(629 + 99 + 859); // full price, no discounts/samlerabatt
    expect(t.savingsMonthly).toBeCloseTo(t.baseMonthly - t.monthly, 5);
  });

  it("handles an empty quote", () => {
    const t = combinedTotals([], []);
    expect(t.monthly).toBe(0);
    expect(t.averageMonthly).toBe(0);
  });
});
