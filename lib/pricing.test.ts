import { describe, expect, it } from "vitest";
import {
  discountLabel,
  effectiveDiscount,
  ENKELT,
  familiePrice,
  FAMILIE,
  formatKr,
  getPlan,
  invoiceLabels,
  lineMonthly,
  orderChart,
  type OrderLine,
  planPrice,
  remainingDays,
  VAS,
  vasTotal,
} from "./pricing";

const plan = (id: string) => getPlan("enkelt", id);
const fam = (id: string) => getPlan("familie", id);

describe("Enkelt plans (match the reference build)", () => {
  it("has the eight Enkelt plans at the right full prices", () => {
    expect(ENKELT.map((p) => [p.id, p.priser.full])).toEqual([
      ["u13", 99], ["e1", 249], ["e5", 299], ["e10", 349],
      ["e18", 399], ["e30", 449], ["ubn", 529], ["ubm", 629],
    ]);
  });

  it("each data plan exposes full / p15 / p20 / p25 / p30 tiers (rounded %)", () => {
    expect(plan("e10").priser).toEqual({ full: 349, p15: 297, p20: 279, p25: 262, p30: 244 });
    expect(plan("ubm").priser).toEqual({ full: 629, p15: 535, p20: 503, p25: 472, p30: 440 });
  });

  it("Fast Ung (p20 = 20% off) still applies to UB Maksimal", () => {
    expect(planPrice(plan("ubm"), "p20")).toBe(503);
  });

  it("U13 is a flat 99 with no discount tiers", () => {
    expect(plan("u13").priser).toEqual({ full: 99 });
    expect(planPrice(plan("u13"), "p25")).toBe(99); // falls back to full
    expect(planPrice(plan("u13"), "p30")).toBe(99);
  });
});

describe("Familie (fixed tiers, per person, full / −20 % only)", () => {
  it("has the six pools at the right full prices and per-person figures", () => {
    expect(FAMILIE.map((p) => [p.id, p.priser.full, p.perPers])).toEqual([
      ["f5", 429, 215], ["f10", 529, 265], ["f20", 649, 325],
      ["f40", 799, 400], ["f80", 899, 450], ["fub", 1049, 525],
    ]);
  });

  it("offers Permanent 20 (p20) but none of the Enkelt-only tiers", () => {
    expect(planPrice(fam("f20"), "p20")).toBe(519);
    expect(effectiveDiscount(fam("f20"), "p30")).toBe("full"); // no p30 tier -> full
    expect(planPrice(fam("f20"), "p30")).toBe(649);
    expect(effectiveDiscount(fam("f20"), "p15")).toBe("full");
  });
});

describe("effectiveDiscount", () => {
  it("keeps a tier the plan offers", () => {
    expect(effectiveDiscount(plan("e10"), "p30")).toBe("p30");
    expect(effectiveDiscount(plan("e10"), "p15")).toBe("p15");
  });
  it("falls back to full when the tier is missing", () => {
    expect(effectiveDiscount(plan("u13"), "p30")).toBe("full");
    expect(effectiveDiscount(fam("f5"), "p30")).toBe("full");
  });
});

describe("VAS add-ons", () => {
  it("has the four services at the right prices", () => {
    expect(VAS.map((v) => [v.id, v.pris])).toEqual([
      ["dt", 69], ["tvil", 79], ["data", 79], ["ring", 99],
    ]);
  });
  it("sums add-ons by quantity; unknown ids contribute 0", () => {
    expect(vasTotal({ dt: 1, ring: 1 })).toBe(168);
    expect(vasTotal({})).toBe(0);
    expect(vasTotal({ nope: 3 })).toBe(0);
  });
  it("multiplies repeatable add-ons by their count", () => {
    expect(vasTotal({ data: 2 })).toBe(158); // 79 * 2
    expect(vasTotal({ tvil: 3, ring: 1 })).toBe(79 * 3 + 99);
  });
  it("lineMonthly adds non-discounted add-ons on top of the discounted plan", () => {
    expect(lineMonthly(plan("e10"), "p20", { dt: 1 })).toBe(279 + 69);
  });
});

describe("first-invoice timing (30-day convention)", () => {
  it("mid-month port leaves rest days", () => {
    expect(remainingDays("2026-06-20")).toBe(10);
    expect(remainingDays("2026-06-01")).toBe(29);
  });
  it("end-of-month port has no rest days", () => {
    expect(remainingDays("2026-06-30")).toBe(0);
    expect(remainingDays("2026-01-31")).toBe(0);
  });
  it("labels are the next three months, with year rollover", () => {
    expect(invoiceLabels("2026-12-10")).toEqual(["Januar", "Februar", "Mars"]);
  });
});

describe("orderChart", () => {
  const mk = (price: number, fmf = false, vas = 0): OrderLine => ({
    navn: "x", disc: "full", discLbl: "Full pris", perPers: null,
    vasNames: [], price, fmf, monthly: price + vas,
  });

  it("adds rest days (plan only) on top of the first month", () => {
    // port 20th -> 10 rest days; 349/30*10 = 116 (rounded)
    const c = orderChart([mk(349)], "2026-06-20");
    expect(c.rem).toBe(10);
    expect(c.subRem).toBe(116);
    expect(c.bars).toEqual([465, 349, 349]);
  });

  it("rest days are computed on the plan only, add-ons are free the first month", () => {
    const c = orderChart([mk(349, false, 69)], "2026-06-20"); // monthly 418, but rest on 349
    expect(c.subRem).toBe(116);
    expect(c.bars).toEqual([116 + 418, 418, 418]);
  });

  it("first month free zeroes the rest-days charge", () => {
    const c = orderChart([mk(349, true)], "2026-06-20");
    expect(c.subRem).toBe(0);
    expect(c.bars).toEqual([349, 349, 349]);
  });

  it("sums rest days across multiple lines", () => {
    const c = orderChart([mk(349), mk(299)], "2026-06-20");
    expect(c.subRem).toBe(116 + Math.round((299 / 30) * 10));
    expect(c.totMonthly).toBe(648);
  });

  it("empty order is all zeros", () => {
    const c = orderChart([], "2026-06-20");
    expect(c.totMonthly).toBe(0);
    expect(c.bars).toEqual([0, 0, 0]);
  });
});

describe("discountLabel (codewords, never percentages)", () => {
  it("maps p20 dynamically on the U30 campaign", () => {
    expect(discountLabel("p20", false)).toBe("Permanent 20");
    expect(discountLabel("p20", true)).toBe("Fast Ung");
  });
  it("permanent and campaign tiers are static", () => {
    expect(discountLabel("p15", false)).toBe("Permanent 15");
    expect(discountLabel("p25", false)).toBe("Permanent 25");
    expect(discountLabel("p30", true)).toBe("Sommerkampanje");
    expect(discountLabel("full", false)).toBe("Full pris");
  });
  it("never contains a percent sign", () => {
    for (const d of ["full", "p15", "p20", "p25", "p30"] as const) {
      for (const u of [true, false]) {
        expect(discountLabel(d, u)).not.toContain("%");
      }
    }
  });
});

describe("familiePrice (2-person base + flat surcharge)", () => {
  it("2 persons equals the listed tier price", () => {
    expect(familiePrice(fam("f20"), "full", 2)).toBe(649);
    expect(familiePrice(fam("f20"), "p20", 2)).toBe(519);
  });
  it("regression A: 20 GB, 4 persons, Permanent 20 = 855", () => {
    expect(familiePrice(fam("f20"), "p20", 4)).toBe(855);
  });
  it("regression B: Ubegrenset, 4 persons -> full 1469, Permanent 20 -> 1175", () => {
    expect(familiePrice(fam("fub"), "full", 4)).toBe(1469);
    expect(familiePrice(fam("fub"), "p20", 4)).toBe(1175);
  });
  it("p20 total equals round(full total * 0.8) for every tier and person count", () => {
    for (const p of FAMILIE) {
      for (let n = 2; n <= 10; n++) {
        expect(familiePrice(p, "p20", n)).toBe(Math.round(familiePrice(p, "full", n) * 0.8));
      }
    }
  });
});

describe("formatKr", () => {
  it("rounds and uses the nb-NO thousands separator", () => {
    expect(formatKr(226.85)).toBe("227");
    // nb-NO groups with a non-breaking space; normalise before comparing.
    expect(formatKr(1049).replace(/\s/g, " ")).toBe("1 049");
  });
});
