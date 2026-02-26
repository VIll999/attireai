import { describe, it, expect } from "vitest";
import {
  CM_PER_INCH,
  KG_PER_LB,
  toCm,
  toInches,
  toKg,
  toLbs,
  convertForDisplay,
  convertForStorage,
  getDisplayRange,
  isValueInRange,
  clampValue,
  MEASUREMENT_RANGES,
} from "../lib/measurementUtils";

// ---------- Basic converters ----------

describe("toCm / toInches", () => {
  it("converts 1 inch to 2.54 cm", () => {
    expect(toCm(1)).toBeCloseTo(2.54, 5);
  });

  it("converts 10 inches to 25.4 cm", () => {
    expect(toCm(10)).toBeCloseTo(25.4, 5);
  });

  it("converts 2.54 cm to 1 inch", () => {
    expect(toInches(2.54)).toBeCloseTo(1, 5);
  });

  it("converts 0 inches to 0 cm", () => {
    expect(toCm(0)).toBe(0);
  });

  it("round-trips cm -> in -> cm", () => {
    const original = 175.5;
    expect(toCm(toInches(original))).toBeCloseTo(original, 5);
  });

  it("round-trips in -> cm -> in", () => {
    const original = 69.1;
    expect(toInches(toCm(original))).toBeCloseTo(original, 5);
  });
});

describe("toKg / toLbs", () => {
  it("converts 1 lb to ~0.4536 kg", () => {
    expect(toKg(1)).toBeCloseTo(KG_PER_LB, 4);
  });

  it("converts 1 kg to ~2.2046 lbs", () => {
    expect(toLbs(1)).toBeCloseTo(1 / KG_PER_LB, 4);
  });

  it("converts 0 lbs to 0 kg", () => {
    expect(toKg(0)).toBe(0);
  });

  it("round-trips kg -> lbs -> kg", () => {
    const original = 80.0;
    expect(toKg(toLbs(original))).toBeCloseTo(original, 4);
  });
});

// ---------- convertForDisplay ----------

describe("convertForDisplay", () => {
  it("returns empty string for null", () => {
    expect(convertForDisplay(null, "height", "CM")).toBe("");
  });

  it("returns cm value as-is in CM mode", () => {
    expect(convertForDisplay(170.0, "height", "CM")).toBe("170.0");
  });

  it("converts height cm to inches in IN mode", () => {
    const result = parseFloat(convertForDisplay(170.0, "height", "IN"));
    expect(result).toBeCloseTo(170.0 / CM_PER_INCH, 1);
  });

  it("converts weight kg to lbs in IN mode", () => {
    const result = parseFloat(convertForDisplay(80.0, "weight", "IN"));
    expect(result).toBeCloseTo(80.0 / KG_PER_LB, 1);
  });

  it("returns one decimal place", () => {
    const result = convertForDisplay(175.123, "chest", "CM");
    expect(result).toBe("175.1");
  });
});

// ---------- convertForStorage ----------

describe("convertForStorage", () => {
  it("returns null for empty string", () => {
    expect(convertForStorage("", "height", "CM")).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(convertForStorage("abc", "height", "CM")).toBeNull();
  });

  it("returns raw number in CM mode", () => {
    expect(convertForStorage("170", "height", "CM")).toBe(170);
  });

  it("converts inches to cm for storage in IN mode", () => {
    const stored = convertForStorage("67", "height", "IN");
    expect(stored).toBeCloseTo(67 * CM_PER_INCH, 2);
  });

  it("converts lbs to kg for weight in IN mode", () => {
    const stored = convertForStorage("176", "weight", "IN");
    expect(stored).toBeCloseTo(176 * KG_PER_LB, 2);
  });

  it("round-trips display -> storage -> display in IN mode", () => {
    const original = 170.0; // cm stored
    const displayed = convertForDisplay(original, "height", "IN");
    const storedBack = convertForStorage(displayed, "height", "IN");
    expect(storedBack).toBeCloseTo(original, 0);
  });
});

// ---------- getDisplayRange ----------

describe("getDisplayRange", () => {
  it("returns metric ranges unchanged in CM mode", () => {
    const range = getDisplayRange("height", "CM");
    expect(range).toEqual(MEASUREMENT_RANGES.height);
  });

  it("converts height range to inches in IN mode", () => {
    const range = getDisplayRange("height", "IN");
    expect(range.min).toBe(Math.round(MEASUREMENT_RANGES.height.min / CM_PER_INCH));
    expect(range.max).toBe(Math.round(MEASUREMENT_RANGES.height.max / CM_PER_INCH));
  });

  it("converts weight range to lbs in IN mode", () => {
    const range = getDisplayRange("weight", "IN");
    expect(range.min).toBe(Math.round(MEASUREMENT_RANGES.weight.min / KG_PER_LB));
    expect(range.max).toBe(Math.round(MEASUREMENT_RANGES.weight.max / KG_PER_LB));
  });
});

// ---------- isValueInRange ----------

describe("isValueInRange", () => {
  it("returns true for empty string", () => {
    expect(isValueInRange("", "height", "CM")).toBe(true);
  });

  it("returns true for value within range", () => {
    expect(isValueInRange("170", "height", "CM")).toBe(true);
  });

  it("returns false for value below min", () => {
    expect(isValueInRange("10", "height", "CM")).toBe(false);
  });

  it("returns false for value above max", () => {
    expect(isValueInRange("999", "height", "CM")).toBe(false);
  });

  it("returns true for boundary values", () => {
    expect(isValueInRange("40", "height", "CM")).toBe(true);
    expect(isValueInRange("300", "height", "CM")).toBe(true);
  });

  it("validates correctly in IN mode", () => {
    const range = getDisplayRange("height", "IN");
    expect(isValueInRange(String(range.min), "height", "IN")).toBe(true);
    expect(isValueInRange(String(range.min - 1), "height", "IN")).toBe(false);
  });
});

// ---------- clampValue ----------

describe("clampValue", () => {
  it("returns empty string for empty input", () => {
    expect(clampValue("", "height", "CM")).toBe("");
  });

  it("returns value unchanged if in range", () => {
    expect(clampValue("170", "height", "CM")).toBe("170");
  });

  it("clamps to min if below range", () => {
    expect(clampValue("5", "height", "CM")).toBe("40");
  });

  it("clamps to max if above range", () => {
    expect(clampValue("999", "height", "CM")).toBe("300");
  });

  it("clamps weight correctly in IN mode (lbs)", () => {
    const range = getDisplayRange("weight", "IN");
    expect(clampValue("9999", "weight", "IN")).toBe(String(range.max));
    expect(clampValue("0", "weight", "IN")).toBe(String(range.min));
  });
});

// ---------- Edge cases ----------

describe("edge cases", () => {
  it("handles very small fractional values", () => {
    expect(toCm(0.001)).toBeCloseTo(0.00254, 5);
  });

  it("handles large values without overflow", () => {
    expect(toCm(10000)).toBeCloseTo(25400, 1);
  });

  it("all measurement fields have defined ranges", () => {
    const fields: Array<keyof typeof MEASUREMENT_RANGES> = [
      "height", "weight", "chest", "waist", "hip", "inseam", "shoulder_width", "arm_length",
    ];
    for (const field of fields) {
      const range = MEASUREMENT_RANGES[field];
      expect(range.min).toBeLessThan(range.max);
      expect(range.min).toBeGreaterThan(0);
    }
  });
});
