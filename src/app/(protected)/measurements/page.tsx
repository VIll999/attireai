"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import {
  getMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  getSizeRecommendations,
  MeasurementResponse,
  SizingResponse,
  SizingRecommendation,
} from "@/lib/api";
import AppNav from "@/components/AppNav";

// Conversion helpers
const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.453592;

const toCm = (inches: number) => inches * CM_PER_INCH;
const toInches = (cm: number) => cm / CM_PER_INCH;
const toKg = (lbs: number) => lbs * KG_PER_LB;
const toLbs = (kg: number) => kg / KG_PER_LB;

type Unit = "CM" | "IN";

const MEASUREMENT_FIELDS = [
  { key: "height", cmUnit: "cm", inUnit: "in" },
  { key: "weight", cmUnit: "kg", inUnit: "lbs" },
  { key: "chest", cmUnit: "cm", inUnit: "in" },
  { key: "waist", cmUnit: "cm", inUnit: "in" },
  { key: "hip", cmUnit: "cm", inUnit: "in" },
  { key: "inseam", cmUnit: "cm", inUnit: "in" },
  { key: "shoulder_width", cmUnit: "cm", inUnit: "in" },
  { key: "arm_length", cmUnit: "cm", inUnit: "in" },
] as const;

type FieldKey = (typeof MEASUREMENT_FIELDS)[number]["key"];

interface FormValues {
  name: string;
  height: string;
  weight: string;
  chest: string;
  waist: string;
  hip: string;
  inseam: string;
  shoulder_width: string;
  arm_length: string;
  is_primary: boolean;
}

const emptyForm: FormValues = {
  name: "",
  height: "",
  weight: "",
  chest: "",
  waist: "",
  hip: "",
  inseam: "",
  shoulder_width: "",
  arm_length: "",
  is_primary: false,
};

function convertForDisplay(cmValue: number | null, field: FieldKey, unit: Unit): string {
  if (cmValue === null || cmValue === undefined) return "";
  if (unit === "CM") return cmValue.toFixed(1);
  // Convert to imperial
  if (field === "weight") return toLbs(cmValue).toFixed(1);
  return toInches(cmValue).toFixed(1);
}

function convertForStorage(displayValue: string, field: FieldKey, unit: Unit): number | null {
  const num = parseFloat(displayValue);
  if (isNaN(num)) return null;
  if (unit === "CM") return num;
  // Convert from imperial to metric for storage
  if (field === "weight") return toKg(num);
  return toCm(num);
}

// Reasonable ranges in CM/kg (metric)
const MEASUREMENT_RANGES: Record<FieldKey, { min: number; max: number }> = {
  height: { min: 50, max: 275 },
  weight: { min: 15, max: 350 },
  chest: { min: 40, max: 200 },
  waist: { min: 30, max: 200 },
  hip: { min: 40, max: 200 },
  inseam: { min: 25, max: 120 },
  shoulder_width: { min: 20, max: 80 },
  arm_length: { min: 30, max: 110 },
};

function getDisplayRange(field: FieldKey, unit: Unit): { min: number; max: number } {
  const range = MEASUREMENT_RANGES[field];
  if (unit === "CM") return range;
  if (field === "weight") return { min: Math.round(toLbs(range.min)), max: Math.round(toLbs(range.max)) };
  return { min: Math.round(toInches(range.min)), max: Math.round(toInches(range.max)) };
}

function clampValue(value: string, field: FieldKey, unit: Unit): string {
  if (value === "") return "";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  const { min, max } = getDisplayRange(field, unit);
  if (num < min) return String(min);
  if (num > max) return String(max);
  return value;
}

export default function MeasurementsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [unit, setUnit] = useState<Unit>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferredUnit");
      if (saved === "CM" || saved === "IN") return saved;
    }
    return "CM";
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Sizing state
  const [sizingData, setSizingData] = useState<SizingResponse | null>(null);
  const [sizingLoading, setSizingLoading] = useState(false);
  const [sizingError, setSizingError] = useState("");
  const [sizingGender, setSizingGender] = useState<"male" | "female">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sizingGender");
      if (saved === "male" || saved === "female") return saved;
    }
    return "male";
  });
  const [sizingProfileId, setSizingProfileId] = useState<string | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  const fieldLabels: Record<string, string> = {
    height: t("measurements.height"),
    weight: t("measurements.weight"),
    chest: t("measurements.chest"),
    waist: t("measurements.waist"),
    hip: t("measurements.hip"),
    inseam: t("measurements.inseam"),
    shoulder_width: t("measurements.shoulderWidth"),
    arm_length: t("measurements.armLength"),
  };

  const fetchMeasurements = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMeasurements(user.uid);
      setMeasurements(data);
    } catch (err) {
      console.error("Failed to fetch measurements:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  // Fetch sizing recommendations
  const fetchSizing = useCallback(async (profileId: string, gender: "male" | "female") => {
    if (!user) return;
    setSizingLoading(true);
    setSizingError("");
    try {
      const data = await getSizeRecommendations(user.uid, profileId, gender);
      setSizingData(data);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setSizingError(error.message || t("sizing.error"));
      setSizingData(null);
    } finally {
      setSizingLoading(false);
    }
  }, [user, t]);

  // Auto-fetch sizing when measurements load or profile/gender changes
  useEffect(() => {
    if (measurements.length === 0 || isEditing) return;
    const profileId = sizingProfileId || measurements.find(m => m.is_primary)?.id || measurements[0]?.id;
    if (!profileId) return;
    if (sizingProfileId !== profileId) setSizingProfileId(profileId);
    const profile = measurements.find(m => m.id === profileId);
    if (profile && profile.chest && profile.waist && profile.hip) {
      fetchSizing(profileId, sizingGender);
    } else {
      setSizingData(null);
    }
  }, [measurements, sizingProfileId, sizingGender, isEditing, fetchSizing]);

  const handleGenderChange = (gender: "male" | "female") => {
    setSizingGender(gender);
    localStorage.setItem("sizingGender", gender);
  };

  const toggleBrandExpand = (brand: string) => {
    setExpandedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  };

  const handleEdit = (m: MeasurementResponse) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      height: convertForDisplay(m.height, "height", unit),
      weight: convertForDisplay(m.weight, "weight", unit),
      chest: convertForDisplay(m.chest, "chest", unit),
      waist: convertForDisplay(m.waist, "waist", unit),
      hip: convertForDisplay(m.hip, "hip", unit),
      inseam: convertForDisplay(m.inseam, "inseam", unit),
      shoulder_width: convertForDisplay(m.shoulder_width, "shoulder_width", unit),
      arm_length: convertForDisplay(m.arm_length, "arm_length", unit),
      is_primary: m.is_primary,
    });
    setIsEditing(true);
    setError("");
  };

  const handleNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, name: `Profile ${measurements.length + 1}` });
    setIsEditing(true);
    setError("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) {
      setError(t("measurements.profileNameRequired"));
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        height: convertForStorage(form.height, "height", unit),
        weight: convertForStorage(form.weight, "weight", unit),
        chest: convertForStorage(form.chest, "chest", unit),
        waist: convertForStorage(form.waist, "waist", unit),
        hip: convertForStorage(form.hip, "hip", unit),
        inseam: convertForStorage(form.inseam, "inseam", unit),
        shoulder_width: convertForStorage(form.shoulder_width, "shoulder_width", unit),
        arm_length: convertForStorage(form.arm_length, "arm_length", unit),
      };

      if (editingId) {
        await updateMeasurement(user.uid, editingId, { ...payload, is_primary: form.is_primary });
        setSuccessMessage(t("measurements.measurementsUpdated"));
      } else {
        await createMeasurement(user.uid, { ...payload, is_primary: form.is_primary });
        setSuccessMessage(t("measurements.measurementsSaved"));
      }

      await fetchMeasurements();
      setIsEditing(false);
      setEditingId(null);
      setForm(emptyForm);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save measurements:", err);
      setError(t("measurements.failedSave"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteMeasurement(user.uid, id);
      await fetchMeasurements();
      setSuccessMessage(t("measurements.profileDeleted"));
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Failed to delete measurement:", err);
      setError(t("measurements.failedDelete"));
    }
  };

  const handleUnitToggle = (newUnit: Unit) => {
    if (newUnit === unit) return;

    // Convert form values if editing
    if (isEditing) {
      const converted = { ...form };
      for (const field of MEASUREMENT_FIELDS) {
        const val = form[field.key];
        if (val === "") continue;
        const num = parseFloat(val);
        if (isNaN(num)) continue;

        if (field.key === "weight") {
          converted[field.key] =
            newUnit === "IN" ? toLbs(num).toFixed(1) : toKg(num).toFixed(1);
        } else {
          converted[field.key] =
            newUnit === "IN" ? toInches(num).toFixed(1) : toCm(num).toFixed(1);
        }
      }
      setForm(converted);
    }

    setUnit(newUnit);
    localStorage.setItem("preferredUnit", newUnit);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <AppNav activePage="measurements" />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">{t("measurements.title")}</h1>
            <p className="text-stone-600 dark:text-stone-400 mt-1">{t("measurements.subtitle")}</p>
          </div>
          {/* Unit Toggle */}
          <div className="flex items-center bg-white dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-lg p-1">
            <button
              onClick={() => handleUnitToggle("CM")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                unit === "CM" ? "bg-amber-600 text-white" : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {t("measurements.cmKg")}
            </button>
            <button
              onClick={() => handleUnitToggle("IN")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                unit === "IN" ? "bg-amber-600 text-white" : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {t("measurements.inLbs")}
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 text-sm">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-8">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : isEditing ? (
          /* Edit / Create Form */
          <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-white mb-6">
              {editingId ? t("measurements.editMeasurements") : t("measurements.newProfile")}
            </h2>

            <div className="space-y-5">
              {/* Profile Name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  {t("measurements.profileName")}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors dark:bg-stone-800/50 dark:text-white"
                  placeholder={t("measurements.profileNamePlaceholder")}
                />
              </div>

              {/* Measurement Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MEASUREMENT_FIELDS.map((field) => {
                  const range = getDisplayRange(field.key, unit);
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                        {fieldLabels[field.key]}
                        <span className="text-stone-400 ml-1">
                          ({unit === "CM" ? field.cmUnit : field.inUnit})
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={range.min}
                        max={range.max}
                        value={form[field.key]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        onBlur={(e) => {
                          const clamped = clampValue(e.target.value, field.key, unit);
                          if (clamped !== e.target.value) {
                            setForm((prev) => ({ ...prev, [field.key]: clamped }));
                          }
                        }}
                        className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors dark:bg-stone-800/50 dark:text-white"
                        placeholder={`${range.min} – ${range.max}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Primary Toggle (only show when editing existing or when there are other profiles) */}
            {(editingId || measurements.length > 0) && (
              <label className="flex items-center gap-3 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                  className="w-4 h-4 text-amber-600 border-stone-300 dark:border-stone-600 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  {t("measurements.setAsPrimary")}
                </span>
                {form.is_primary && (
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {t("measurements.usedForRecommendations")}
                  </span>
                )}
              </label>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={handleSave}
                disabled={isSaving || !form.name.trim()}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t("measurements.saving") : t("measurements.saveMeasurements")}
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2.5 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-lg font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                {t("measurements.cancel")}
              </button>
            </div>
          </div>
        ) : measurements.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-12 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">{t("measurements.noMeasurements")}</h3>
            <p className="text-stone-600 dark:text-stone-400 mb-6">
              {t("measurements.noMeasurementsDesc")}
            </p>
            <button
              onClick={handleNew}
              className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              {t("measurements.addMeasurements")}
            </button>
          </div>
        ) : (
          /* Measurement Profiles List */
          <div className="space-y-4">
            {measurements.map((m) => (
              <div key={m.id} className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-stone-900 dark:text-white">{m.name}</h3>
                      {m.is_primary && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 uppercase tracking-wider text-xs font-medium rounded-full">
                          {t("measurements.primary")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg font-medium transition-colors"
                      >
                        {t("measurements.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg font-medium transition-colors"
                      >
                        {t("measurements.delete")}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {MEASUREMENT_FIELDS.map((field) => {
                      const val = m[field.key];
                      const display = convertForDisplay(val, field.key, unit);
                      return (
                        <div key={field.key} className="bg-stone-50 dark:bg-stone-800/30 rounded-lg p-3">
                          <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">{fieldLabels[field.key]}</p>
                          <p className="text-sm font-medium text-stone-900 dark:text-white">
                            {display ? `${display} ${unit === "CM" ? field.cmUnit : field.inUnit}` : "\u2014"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleNew}
              className="w-full py-3 border-2 border-dashed border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-500 rounded-xl hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition-colors"
            >
              {t("measurements.addAnotherProfile")}
            </button>
          </div>
        )}

        {/* Size Recommendations Section */}
        {!isEditing && measurements.length > 0 && (
          <SizeRecommendationsSection
            measurements={measurements}
            sizingData={sizingData}
            sizingLoading={sizingLoading}
            sizingError={sizingError}
            sizingGender={sizingGender}
            sizingProfileId={sizingProfileId || measurements.find(m => m.is_primary)?.id || measurements[0]?.id}
            expandedBrands={expandedBrands}
            onGenderChange={handleGenderChange}
            onProfileChange={(id) => setSizingProfileId(id)}
            onToggleBrand={toggleBrandExpand}
            t={t}
          />
        )}
      </main>
    </div>
  );
}

/* ── Category Labels Map ── */
const CATEGORY_LABELS: Record<string, string> = {
  "Sportswear": "sportswear",
  "Fast Fashion": "fastFashion",
  "Denim": "denim",
  "Basics": "basics",
  "Luxury": "luxury",
  "Contemporary": "contemporary",
  "Outdoor": "outdoor",
};

/* ── Confidence Badge Component ── */
function ConfidenceBadge({ confidence, t }: { confidence: string; t: (key: string) => string }) {
  const styles: Record<string, string> = {
    "Best Fit": "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400",
    "Good Fit": "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
    "May Run Small": "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400",
    "May Run Large": "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400",
  };
  const labels: Record<string, string> = {
    "Best Fit": t("sizing.bestFit"),
    "Good Fit": t("sizing.goodFit"),
    "May Run Small": t("sizing.mayRunSmall"),
    "May Run Large": t("sizing.mayRunLarge"),
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[confidence] || "bg-stone-100 dark:bg-stone-800 text-stone-600"}`}>
      {labels[confidence] || confidence}
    </span>
  );
}

/* ── Fit Slider Component ── */
function FitSlider({ label, position, inRange, sizeRange, userValue }: {
  label: string;
  position: number;
  inRange: boolean;
  sizeRange: [number, number];
  userValue: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-stone-500 dark:text-stone-400 w-12 shrink-0">{label}</span>
      <div className="flex-1 relative">
        <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div className="h-full bg-stone-300 dark:bg-stone-600 rounded-full" style={{ width: "100%" }} />
        </div>
        {/* User position dot */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-stone-900 shadow-sm ${
            inRange ? "bg-green-500" : "bg-orange-500"
          }`}
          style={{ left: `${Math.max(0, Math.min(100, position * 100))}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
      <span className="text-xs text-stone-500 dark:text-stone-400 w-20 text-right shrink-0">
        {userValue} / {sizeRange[0]}-{sizeRange[1]}
      </span>
    </div>
  );
}

/* ── Body Type Icon ── */
function BodyTypeIcon({ bodyType }: { bodyType: string }) {
  const icons: Record<string, React.ReactNode> = {
    "Hourglass": (
      <>
        <ellipse cx="12" cy="5" rx="4" ry="2" />
        <ellipse cx="12" cy="19" rx="4" ry="2" />
        <path d="M8 5c0 4 4 5.5 4 7s-4 3-4 7" />
        <path d="M16 5c0 4-4 5.5-4 7s4 3 4 7" />
      </>
    ),
    "Pear": (
      <>
        <ellipse cx="12" cy="5" rx="3" ry="2" />
        <ellipse cx="12" cy="19" rx="5" ry="2" />
        <path d="M9 5c0 4 3 5 3 7s-5 3-5 7" />
        <path d="M15 5c0 4-3 5-3 7s5 3 5 7" />
      </>
    ),
    "Inverted Triangle": (
      <>
        <ellipse cx="12" cy="5" rx="5" ry="2" />
        <ellipse cx="12" cy="19" rx="3" ry="2" />
        <path d="M7 5c0 4 2 5 5 7 0 2-2 3-3 7" />
        <path d="M17 5c0 4-2 5-5 7 0 2 2 3 3 7" />
      </>
    ),
    "Rectangle": (
      <>
        <ellipse cx="12" cy="5" rx="3.5" ry="2" />
        <ellipse cx="12" cy="19" rx="3.5" ry="2" />
        <path d="M8.5 5c0 4.5 0 9.5 0 14" />
        <path d="M15.5 5c0 4.5 0 9.5 0 14" />
      </>
    ),
    "Apple": (
      <>
        <ellipse cx="12" cy="5" rx="3.5" ry="2" />
        <ellipse cx="12" cy="19" rx="3" ry="2" />
        <path d="M8.5 5c-1.5 3-2.5 6-2 9 .5 2 2.5 3 5.5 5" />
        <path d="M15.5 5c1.5 3 2.5 6 2 9-.5 2-2.5 3-5.5 5" />
      </>
    ),
  };
  return (
    <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {icons[bodyType] || icons["Rectangle"]}
    </svg>
  );
}

/* ── Size Recommendations Section ── */
function SizeRecommendationsSection({
  measurements,
  sizingData,
  sizingLoading,
  sizingError,
  sizingGender,
  sizingProfileId,
  expandedBrands,
  onGenderChange,
  onProfileChange,
  onToggleBrand,
  t,
}: {
  measurements: MeasurementResponse[];
  sizingData: SizingResponse | null;
  sizingLoading: boolean;
  sizingError: string;
  sizingGender: "male" | "female";
  sizingProfileId: string;
  expandedBrands: Set<string>;
  onGenderChange: (g: "male" | "female") => void;
  onProfileChange: (id: string) => void;
  onToggleBrand: (brand: string) => void;
  t: (key: string) => string;
}) {
  const selectedProfile = measurements.find(m => m.id === sizingProfileId);
  const hasSizingMeasurements = selectedProfile && selectedProfile.chest && selectedProfile.waist && selectedProfile.hip;

  // Group recommendations by category
  const grouped: Record<string, SizingRecommendation[]> = {};
  if (sizingData) {
    for (const rec of sizingData.recommendations) {
      if (!grouped[rec.category]) grouped[rec.category] = [];
      grouped[rec.category].push(rec);
    }
  }

  return (
    <div className="mt-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">{t("sizing.title")}</h2>
          <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">{t("sizing.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Gender Toggle */}
          <div className="flex items-center bg-white dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-lg p-1">
            <button
              onClick={() => onGenderChange("male")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                sizingGender === "male" ? "bg-amber-600 text-white" : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {t("sizing.male")}
            </button>
            <button
              onClick={() => onGenderChange("female")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                sizingGender === "female" ? "bg-amber-600 text-white" : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {t("sizing.female")}
            </button>
          </div>
          {/* Profile Selector */}
          {measurements.length > 1 && (
            <select
              value={sizingProfileId}
              onChange={(e) => onProfileChange(e.target.value)}
              className="px-3 py-2 text-sm border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
            >
              {measurements.map(m => (
                <option key={m.id} value={m.id}>{m.name}{m.is_primary ? " *" : ""}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Missing measurements message */}
      {!hasSizingMeasurements && (
        <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-8 text-center">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-stone-600 dark:text-stone-400">{t("sizing.needMeasurements")}</p>
        </div>
      )}

      {/* Loading state */}
      {sizingLoading && hasSizingMeasurements && (
        <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-stone-500 dark:text-stone-400">{t("sizing.loading")}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {sizingError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 text-sm">
          {sizingError}
        </div>
      )}

      {/* Sizing Results */}
      {sizingData && !sizingLoading && (
        <div className="space-y-6">
          {/* Body Type Card */}
          <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                <BodyTypeIcon bodyType={sizingData.body_type} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">{t("sizing.bodyType")}</p>
                <p className="text-lg font-semibold text-stone-900 dark:text-white">{sizingData.body_type}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">{sizingData.body_type_description}</p>
              </div>
            </div>
          </div>

          {/* Brand Cards by Category */}
          {Object.entries(grouped).map(([category, recs]) => (
            <div key={category}>
              <h3 className="text-sm uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium mb-3">
                {t(`sizing.${CATEGORY_LABELS[category] || "basics"}`)} — {recs.length} {t("sizing.brands")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recs.map((rec) => {
                  const isExpanded = expandedBrands.has(rec.brand);
                  return (
                    <div
                      key={rec.brand}
                      className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden hover:shadow-md dark:hover:shadow-stone-900/50 transition-shadow"
                    >
                      <button
                        onClick={() => onToggleBrand(rec.brand)}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-stone-900 dark:text-white">{rec.brand}</span>
                          <ConfidenceBadge confidence={rec.confidence} t={t} />
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">{rec.recommended_size}</span>
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            {t("sizing.fitScore")}: {rec.fit_score}
                          </span>
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-stone-100 dark:border-stone-800">
                          <p className="text-xs text-stone-500 dark:text-stone-400 italic mt-3 mb-3">{rec.sizing_notes}</p>
                          <div className="space-y-2.5">
                            <FitSlider
                              label={t("sizing.chest")}
                              position={rec.fit_details.chest.position}
                              inRange={rec.fit_details.chest.in_range}
                              sizeRange={rec.fit_details.chest.size_range}
                              userValue={rec.fit_details.chest.user_value}
                            />
                            <FitSlider
                              label={t("sizing.waist")}
                              position={rec.fit_details.waist.position}
                              inRange={rec.fit_details.waist.in_range}
                              sizeRange={rec.fit_details.waist.size_range}
                              userValue={rec.fit_details.waist.user_value}
                            />
                            <FitSlider
                              label={t("sizing.hip")}
                              position={rec.fit_details.hip.position}
                              inRange={rec.fit_details.hip.in_range}
                              sizeRange={rec.fit_details.hip.size_range}
                              userValue={rec.fit_details.hip.user_value}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
