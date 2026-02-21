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
    <div className="min-h-screen bg-background">
      {/* Focused Header */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Link>
              <div>
                <h1 className="font-cabinet text-xl font-bold text-stone-900 dark:text-white">{t("measurements.title")}</h1>
                <p className="font-satoshi text-sm text-stone-600 dark:text-stone-400">{t("measurements.subtitle")}</p>
              </div>
            </div>
            {/* Unit Toggle */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800/50 rounded-lg p-1">
              <button
                onClick={() => handleUnitToggle("CM")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  unit === "CM" ? "bg-brand text-white shadow-sm" : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                {t("measurements.cmKg")}
              </button>
              <button
                onClick={() => handleUnitToggle("IN")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  unit === "IN" ? "bg-brand text-white shadow-sm" : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                {t("measurements.inLbs")}
              </button>
            </div>
          </div>

          {/* Progress Stepper */}
          {isEditing && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">1</div>
                <span className="text-sm font-medium text-stone-900 dark:text-white">Basic Info</span>
              </div>
              <div className="w-12 h-0.5 bg-stone-300 dark:bg-stone-700" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-sm font-medium text-stone-900 dark:text-white">Core Profile</span>
              </div>
              <div className="w-12 h-0.5 bg-stone-300 dark:bg-stone-700" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">3</div>
                <span className="text-sm font-medium text-stone-900 dark:text-white">Detailed Sizing</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {successMessage && (
          <div className="mb-6 p-4 glass-panel rounded-xl border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm font-medium">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 glass-panel rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form Content */}
          <div className="lg:col-span-2 space-y-6">

            {isLoading ? (
              <div className="glass-panel rounded-2xl shadow-soft p-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-stone-500 dark:text-stone-400">Loading measurements...</p>
                </div>
              </div>
            ) : isEditing ? (
              /* Edit / Create Form with Grouped Fields */
              <>
                {/* Group 1: Basic Info */}
                <div className="glass-panel rounded-2xl shadow-soft p-6 border border-stone-200/50 dark:border-stone-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-cabinet text-lg font-bold text-stone-900 dark:text-white">Basic Info</h2>
                      <p className="text-sm text-stone-600 dark:text-stone-400">Profile name and primary measurements</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Profile Name */}
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                        {t("measurements.profileName")}
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all dark:bg-stone-800/50 dark:text-white font-satoshi"
                        placeholder={t("measurements.profileNamePlaceholder")}
                      />
                    </div>

                    {/* Height and Weight */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {["height", "weight"].map((fieldKey) => {
                        const field = MEASUREMENT_FIELDS.find(f => f.key === fieldKey)!;
                        const range = getDisplayRange(field.key, unit);
                        return (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
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
                              className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all dark:bg-stone-800/50 dark:text-white font-satoshi"
                              placeholder={`${range.min} – ${range.max}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Group 2: Core Profile */}
                <div className="glass-panel rounded-2xl shadow-soft p-6 border border-stone-200/50 dark:border-stone-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-cabinet text-lg font-bold text-stone-900 dark:text-white">Core Profile</h2>
                      <p className="text-sm text-stone-600 dark:text-stone-400">Essential measurements for sizing</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {["chest", "waist", "hip"].map((fieldKey) => {
                      const field = MEASUREMENT_FIELDS.find(f => f.key === fieldKey)!;
                      const range = getDisplayRange(field.key, unit);
                      return (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
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
                            className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all dark:bg-stone-800/50 dark:text-white font-satoshi"
                            placeholder={`${range.min} – ${range.max}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Group 3: Detailed Sizing */}
                <div className="glass-panel rounded-2xl shadow-soft p-6 border border-stone-200/50 dark:border-stone-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-300/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-brand-700 dark:text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-cabinet text-lg font-bold text-stone-900 dark:text-white">Detailed Sizing</h2>
                      <p className="text-sm text-stone-600 dark:text-stone-400">Additional measurements for perfect fit</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {["inseam", "shoulder_width", "arm_length"].map((fieldKey) => {
                      const field = MEASUREMENT_FIELDS.find(f => f.key === fieldKey)!;
                      const range = getDisplayRange(field.key, unit);
                      return (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
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
                            className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all dark:bg-stone-800/50 dark:text-white font-satoshi"
                            placeholder={`${range.min} – ${range.max}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Toggle and Action Buttons */}
                <div className="glass-panel rounded-2xl shadow-soft p-6 border border-stone-200/50 dark:border-stone-700/50">
                  {/* Primary Toggle (only show when editing existing or when there are other profiles) */}
                  {(editingId || measurements.length > 0) && (
                    <label className="flex items-center gap-3 cursor-pointer group mb-6">
                      <input
                        type="checkbox"
                        checked={form.is_primary}
                        onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                        className="w-5 h-5 text-brand border-stone-300 dark:border-stone-600 rounded-md focus:ring-brand focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-stone-900 dark:text-white group-hover:text-brand transition-colors">
                          {t("measurements.setAsPrimary")}
                        </span>
                        {form.is_primary && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            {t("measurements.usedForRecommendations")}
                          </p>
                        )}
                      </div>
                    </label>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !form.name.trim()}
                      className="flex-1 px-6 py-3 bg-brand text-white rounded-xl font-medium hover:bg-brand-600 transition-all shadow-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {isSaving ? t("measurements.saving") : t("measurements.saveMeasurements")}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-6 py-3 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-xl font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                    >
                      {t("measurements.cancel")}
                    </button>
                  </div>
                </div>
              </>
            ) : measurements.length === 0 ? (
              /* Empty State */
              <div className="glass-panel rounded-2xl shadow-soft p-12 text-center">
                <div className="w-20 h-20 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-cabinet text-xl font-bold text-stone-900 dark:text-white mb-2">{t("measurements.noMeasurements")}</h3>
                <p className="text-stone-600 dark:text-stone-400 mb-8 max-w-md mx-auto">
                  {t("measurements.noMeasurementsDesc")}
                </p>
                <button
                  onClick={handleNew}
                  className="px-8 py-3 bg-brand text-white rounded-xl font-medium hover:bg-brand-600 transition-all shadow-glow inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t("measurements.addMeasurements")}
                </button>
              </div>
            ) : (
              /* Measurement Profiles List */
              <div className="space-y-4">
                {measurements.map((m) => (
                  <div key={m.id} className="glass-panel rounded-2xl shadow-soft border border-stone-200/50 dark:border-stone-700/50 overflow-hidden hover:shadow-glow transition-all">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <h3 className="font-cabinet text-lg font-bold text-stone-900 dark:text-white">{m.name}</h3>
                          {m.is_primary && (
                            <span className="px-3 py-1 bg-accent/10 text-accent-600 dark:text-accent uppercase tracking-wider text-xs font-bold rounded-full">
                              {t("measurements.primary")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(m)}
                            className="px-4 py-2 text-sm text-brand hover:bg-brand/10 rounded-lg font-medium transition-colors"
                          >
                            {t("measurements.edit")}
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg font-medium transition-colors"
                          >
                            {t("measurements.delete")}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {MEASUREMENT_FIELDS.map((field) => {
                          const val = m[field.key];
                          const display = convertForDisplay(val, field.key, unit);
                          return (
                            <div key={field.key} className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 border border-stone-200/50 dark:border-stone-700/50">
                              <p className="text-xs text-stone-500 dark:text-stone-400 mb-1 font-medium">{fieldLabels[field.key]}</p>
                              <p className="text-sm font-bold text-stone-900 dark:text-white">
                                {display ? `${display} ${unit === "CM" ? field.cmUnit : field.inUnit}` : "—"}
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
                  className="w-full py-4 border-2 border-dashed border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 rounded-2xl hover:border-brand hover:text-brand hover:bg-brand/5 font-medium transition-all inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
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
          </div>

          {/* Right Column: 3D Camera Scan Mock Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* 3D Scan Panel */}
              <div className="glass-panel rounded-2xl shadow-soft p-6 border border-stone-200/50 dark:border-stone-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-cabinet text-lg font-bold text-stone-900 dark:text-white">3D Body Scan</h3>
                  <div className="px-3 py-1 bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider rounded-full">
                    Coming Soon
                  </div>
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
                  Advanced camera technology for precise measurements
                </p>

                {/* 3D Scan Visualization Mock */}
                <div className="relative aspect-[3/4] rounded-xl bg-gradient-to-br from-brand/5 to-accent/5 border-2 border-dashed border-brand/30 dark:border-brand/20 overflow-hidden">
                  {/* Scanning Grid Effect */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="grid grid-cols-8 h-full">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="border-r border-brand/30" />
                      ))}
                    </div>
                    <div className="absolute inset-0 grid grid-rows-12">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="border-b border-brand/30" />
                      ))}
                    </div>
                  </div>

                  {/* Body Silhouette */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-32 h-auto opacity-30" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Head */}
                      <ellipse cx="50" cy="20" rx="12" ry="15" stroke="currentColor" strokeWidth="2" className="text-brand" />
                      {/* Shoulders */}
                      <path d="M 38 35 Q 30 40 28 55" stroke="currentColor" strokeWidth="2" className="text-brand" />
                      <path d="M 62 35 Q 70 40 72 55" stroke="currentColor" strokeWidth="2" className="text-brand" />
                      {/* Torso */}
                      <path d="M 28 55 L 30 100 Q 32 120 35 140" stroke="currentColor" strokeWidth="2" className="text-brand" />
                      <path d="M 72 55 L 70 100 Q 68 120 65 140" stroke="currentColor" strokeWidth="2" className="text-brand" />
                      {/* Waist */}
                      <path d="M 35 100 Q 50 98 65 100" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" className="text-accent" />
                      {/* Hips */}
                      <path d="M 35 140 Q 50 145 65 140" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" className="text-accent" />
                      {/* Legs */}
                      <path d="M 35 140 L 40 200" stroke="currentColor" strokeWidth="2" className="text-brand" />
                      <path d="M 65 140 L 60 200" stroke="currentColor" strokeWidth="2" className="text-brand" />
                      {/* Arms */}
                      <path d="M 28 55 L 15 90 L 20 120" stroke="currentColor" strokeWidth="2" className="text-brand" />
                      <path d="M 72 55 L 85 90 L 80 120" stroke="currentColor" strokeWidth="2" className="text-brand" />
                    </svg>
                  </div>

                  {/* Scanning Line Animation */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent animate-scan" />

                  {/* Measurement Points */}
                  <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-2 h-2 bg-brand rounded-full shadow-glow animate-pulse" />
                  <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rounded-full shadow-glow animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-2 h-2 bg-brand rounded-full shadow-glow animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <div className="absolute top-[75%] left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rounded-full shadow-glow animate-pulse" style={{ animationDelay: '0.6s' }} />
                </div>

                {/* Features List */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-brand" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900 dark:text-white">Instant Capture</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">Get accurate measurements in seconds</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-brand" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900 dark:text-white">AI-Powered</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">Machine learning for precision</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-brand" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900 dark:text-white">Privacy First</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">Your data stays secure</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tip Card */}
              <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl p-5 border border-accent/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-accent-600 dark:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-stone-900 dark:text-white text-sm mb-1">Pro Tip</p>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      For now, enter your measurements manually for the most accurate size recommendations across brands.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
    <div className="mt-12">
      {/* Section Header */}
      <div className="glass-panel rounded-2xl shadow-soft p-6 border border-stone-200/50 dark:border-stone-700/50 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-cabinet text-2xl font-bold text-stone-900 dark:text-white">{t("sizing.title")}</h2>
            <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">{t("sizing.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Gender Toggle */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800/50 rounded-lg p-1">
              <button
                onClick={() => onGenderChange("male")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  sizingGender === "male" ? "bg-brand text-white shadow-sm" : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                {t("sizing.male")}
              </button>
              <button
                onClick={() => onGenderChange("female")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  sizingGender === "female" ? "bg-brand text-white shadow-sm" : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
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
                className="px-4 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-brand outline-none font-satoshi"
              >
                {measurements.map(m => (
                  <option key={m.id} value={m.id}>{m.name}{m.is_primary ? " *" : ""}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Missing measurements message */}
      {!hasSizingMeasurements && (
        <div className="glass-panel rounded-2xl shadow-soft p-10 text-center">
          <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-stone-600 dark:text-stone-400 font-medium">{t("sizing.needMeasurements")}</p>
        </div>
      )}

      {/* Loading state */}
      {sizingLoading && hasSizingMeasurements && (
        <div className="glass-panel rounded-2xl shadow-soft p-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">{t("sizing.loading")}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {sizingError && (
        <div className="mb-6 p-4 glass-panel rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
          {sizingError}
        </div>
      )}

      {/* Sizing Results */}
      {sizingData && !sizingLoading && (
        <div className="space-y-6">
          {/* Body Type Card */}
          <div className="glass-panel rounded-2xl shadow-soft p-6 border border-stone-200/50 dark:border-stone-700/50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center shrink-0">
                <BodyTypeIcon bodyType={sizingData.body_type} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 font-bold">{t("sizing.bodyType")}</p>
                <p className="font-cabinet text-xl font-bold text-stone-900 dark:text-white mt-1">{sizingData.body_type}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5">{sizingData.body_type_description}</p>
              </div>
            </div>
          </div>

          {/* Brand Cards by Category */}
          {Object.entries(grouped).map(([category, recs]) => (
            <div key={category}>
              <h3 className="text-sm uppercase tracking-wider text-stone-500 dark:text-stone-400 font-bold mb-4 flex items-center gap-2">
                <span>{t(`sizing.${CATEGORY_LABELS[category] || "basics"}`)}</span>
                <span className="text-xs px-2 py-0.5 bg-stone-200 dark:bg-stone-800 rounded-full">{recs.length}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recs.map((rec) => {
                  const isExpanded = expandedBrands.has(rec.brand);
                  return (
                    <div
                      key={rec.brand}
                      className="glass-panel rounded-2xl shadow-soft border border-stone-200/50 dark:border-stone-700/50 overflow-hidden hover:shadow-glow transition-all"
                    >
                      <button
                        onClick={() => onToggleBrand(rec.brand)}
                        className="w-full p-5 text-left"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-cabinet font-bold text-stone-900 dark:text-white">{rec.brand}</span>
                          <ConfidenceBadge confidence={rec.confidence} t={t} />
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-4xl font-bold text-brand dark:text-brand-400">{rec.recommended_size}</span>
                          <div className="text-right">
                            <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                              {t("sizing.fitScore")}
                            </div>
                            <div className="text-lg font-bold text-accent">{rec.fit_score}</div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-3 border-t border-stone-200/50 dark:border-stone-700/50 bg-stone-50/50 dark:bg-stone-800/30">
                          <p className="text-xs text-stone-600 dark:text-stone-400 italic mb-4 font-satoshi">{rec.sizing_notes}</p>
                          <div className="space-y-3">
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
