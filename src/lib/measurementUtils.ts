// Unit conversion constants
export const CM_PER_INCH = 2.54;
export const KG_PER_LB = 0.453592;

// Basic converters
export const toCm = (inches: number) => inches * CM_PER_INCH;
export const toInches = (cm: number) => cm / CM_PER_INCH;
export const toKg = (lbs: number) => lbs * KG_PER_LB;
export const toLbs = (kg: number) => kg / KG_PER_LB;

export type Unit = "CM" | "IN";

export type FieldKey =
  | "height"
  | "weight"
  | "chest"
  | "waist"
  | "hip"
  | "inseam"
  | "shoulder_width"
  | "arm_length";

// Realistic human body ranges in CM/kg (metric)
export const MEASUREMENT_RANGES: Record<FieldKey, { min: number; max: number }> = {
  height: { min: 40, max: 300 },
  weight: { min: 2, max: 350 },
  chest: { min: 30, max: 180 },
  waist: { min: 20, max: 170 },
  hip: { min: 30, max: 180 },
  inseam: { min: 20, max: 110 },
  shoulder_width: { min: 15, max: 70 },
  arm_length: { min: 20, max: 100 },
};

export function convertForDisplay(cmValue: number | null, field: FieldKey, unit: Unit): string {
  if (cmValue === null || cmValue === undefined) return "";
  if (unit === "CM") return cmValue.toFixed(1);
  if (field === "weight") return toLbs(cmValue).toFixed(1);
  return toInches(cmValue).toFixed(1);
}

export function convertForStorage(displayValue: string, field: FieldKey, unit: Unit): number | null {
  const num = parseFloat(displayValue);
  if (isNaN(num)) return null;
  if (unit === "CM") return num;
  if (field === "weight") return toKg(num);
  return toCm(num);
}

export function getDisplayRange(field: FieldKey, unit: Unit): { min: number; max: number } {
  const range = MEASUREMENT_RANGES[field];
  if (unit === "CM") return range;
  if (field === "weight") return { min: Math.round(toLbs(range.min)), max: Math.round(toLbs(range.max)) };
  return { min: Math.round(toInches(range.min)), max: Math.round(toInches(range.max)) };
}

export function isValueInRange(value: string, field: FieldKey, unit: Unit): boolean {
  if (value === "") return true;
  const num = parseFloat(value);
  if (isNaN(num)) return true;
  const { min, max } = getDisplayRange(field, unit);
  return num >= min && num <= max;
}

export function clampValue(value: string, field: FieldKey, unit: Unit): string {
  if (value === "") return "";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  const { min, max } = getDisplayRange(field, unit);
  if (num < min) return min.toString();
  if (num > max) return max.toString();
  return value;
}
