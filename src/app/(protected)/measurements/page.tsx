"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale, Locale } from "@/context/LocaleContext";
import {
  getMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  MeasurementResponse,
} from "@/lib/api";

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

export default function MeasurementsPage() {
  const { user, dbUser, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale, localeLabels } = useLocale();
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [unit, setUnit] = useState<Unit>("CM");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const displayName = dbUser?.name || user?.displayName || user?.email?.split("@")[0] || "User";
  const displayEmail = dbUser?.email || user?.email || "";
  const displayPicture = dbUser?.profile_picture_url || user?.photoURL || "";

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
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AttireAI
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">{t("nav.dashboard")}</Link>
                <Link href="/outfits" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">{t("nav.outfits")}</Link>
                <Link href="/measurements" className="text-indigo-600 font-medium">{t("nav.measurements")}</Link>
                <Link href="/profile" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">{t("nav.profile")}</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center overflow-hidden">
                  {displayPicture ? (
                    <img src={displayPicture} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-indigo-600 font-semibold">{displayEmail.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="hidden sm:block text-sm text-slate-600 dark:text-slate-400">{displayName}</span>
              </Link>
              <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors" aria-label="Toggle theme">
                {theme === "dark" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                {(Object.keys(localeLabels) as Locale[]).map((loc) => (
                  <button key={loc} onClick={() => setLocale(loc)} className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${locale === loc ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}>
                    {localeLabels[loc]}
                  </button>
                ))}
              </div>
              <button onClick={signOut} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium">
                {t("nav.signOut")}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t("measurements.title")}</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">{t("measurements.subtitle")}</p>
          </div>
          {/* Unit Toggle */}
          <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
            <button
              onClick={() => handleUnitToggle("CM")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                unit === "CM" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("measurements.cmKg")}
            </button>
            <button
              onClick={() => handleUnitToggle("IN")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                unit === "IN" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
          <div className="bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : isEditing ? (
          /* Edit / Create Form */
          <div className="bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
              {editingId ? t("measurements.editMeasurements") : t("measurements.newProfile")}
            </h2>

            <div className="space-y-5">
              {/* Profile Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("measurements.profileName")}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors dark:bg-slate-800/50 dark:text-white"
                  placeholder={t("measurements.profileNamePlaceholder")}
                />
              </div>

              {/* Measurement Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MEASUREMENT_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {fieldLabels[field.key]}
                      <span className="text-slate-400 ml-1">
                        ({unit === "CM" ? field.cmUnit : field.inUnit})
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form[field.key]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors dark:bg-slate-800/50 dark:text-white"
                      placeholder={`Enter ${fieldLabels[field.key].toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Toggle (only show when editing existing or when there are other profiles) */}
            {(editingId || measurements.length > 0) && (
              <label className="flex items-center gap-3 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("measurements.setAsPrimary")}
                </span>
                {form.is_primary && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t("measurements.usedForRecommendations")}
                  </span>
                )}
              </label>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleSave}
                disabled={isSaving || !form.name.trim()}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t("measurements.saving") : t("measurements.saveMeasurements")}
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t("measurements.cancel")}
              </button>
            </div>
          </div>
        ) : measurements.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t("measurements.noMeasurements")}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t("measurements.noMeasurementsDesc")}
            </p>
            <button
              onClick={handleNew}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {t("measurements.addMeasurements")}
            </button>
          </div>
        ) : (
          /* Measurement Profiles List */
          <div className="space-y-4">
            {measurements.map((m) => (
              <div key={m.id} className="bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{m.name}</h3>
                      {m.is_primary && (
                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-medium rounded-full">
                          {t("measurements.primary")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg font-medium transition-colors"
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
                        <div key={field.key} className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{fieldLabels[field.key]}</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
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
              className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-500 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
            >
              {t("measurements.addAnotherProfile")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
