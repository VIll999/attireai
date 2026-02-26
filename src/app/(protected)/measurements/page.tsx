"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLocale } from "@/context/LocaleContext";
import Notification from "@/components/Notification";
import {
  getMeasurements,
  createMeasurement,
  updateMeasurement,
  getCurrentUser,
  getSizeRecommendations,
  MeasurementResponse,
  SizingResponse,
  SizingRecommendation,
} from "@/lib/api";
import {
  toCm, toInches, toKg, toLbs,
  convertForDisplay, convertForStorage,
  getDisplayRange, isValueInRange, clampValue,
  type Unit, type FieldKey,
} from "@/lib/measurementUtils";

// Field definitions for the form UI
const MEASUREMENT_FIELDS = [
  { key: "height", cmUnit: "cm", inUnit: "in", group: "basic" },
  { key: "weight", cmUnit: "kg", inUnit: "lbs", group: "basic" },
  { key: "chest", cmUnit: "cm", inUnit: "in", group: "core" },
  { key: "waist", cmUnit: "cm", inUnit: "in", group: "core" },
  { key: "hip", cmUnit: "cm", inUnit: "in", group: "core" },
  { key: "shoulder_width", cmUnit: "cm", inUnit: "in", group: "detailed" },
  { key: "arm_length", cmUnit: "cm", inUnit: "in", group: "detailed" },
  { key: "inseam", cmUnit: "cm", inUnit: "in", group: "detailed" },
] as const;

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
  is_primary: true,
};


export default function MeasurementsPage() {
  const { user } = useAuth();
  const { refreshMeasurements: refreshProfileMeasurements } = useProfile();
  const { t } = useLocale();
  const router = useRouter();
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [userTier, setUserTier] = useState<"FREE" | "VIP">("FREE");
  const [showNewProfileInput, setShowNewProfileInput] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");

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

  // Keep a ref to the current unit so fetchMeasurements doesn't re-run on unit change
  const unitRef = useRef(unit);
  unitRef.current = unit;

  const loadProfileDataWithUnit = useCallback((profile: MeasurementResponse, u: Unit) => {
    setForm({
      name: profile.name,
      height: convertForDisplay(profile.height, "height", u),
      weight: convertForDisplay(profile.weight, "weight", u),
      chest: convertForDisplay(profile.chest, "chest", u),
      waist: convertForDisplay(profile.waist, "waist", u),
      hip: convertForDisplay(profile.hip, "hip", u),
      inseam: convertForDisplay(profile.inseam, "inseam", u),
      shoulder_width: convertForDisplay(profile.shoulder_width, "shoulder_width", u),
      arm_length: convertForDisplay(profile.arm_length, "arm_length", u),
      is_primary: profile.is_primary,
    });
  }, []);

  const fetchMeasurements = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch user data and measurements in parallel
      const [userData, data] = await Promise.all([
        getCurrentUser(user.uid),
        getMeasurements(user.uid)
      ]);

      setUserTier(userData.subscription_tier as "FREE" | "VIP");
      setMeasurements(data);

      // Auto-populate form if user has saved measurements
      if (data.length > 0 && !editingId) {
        const primary = data.find(m => m.is_primary) || data[0];
        setEditingId(primary.id);
        loadProfileDataWithUnit(primary, unitRef.current);
      }
    } catch (err) {
      console.error("Failed to fetch measurements:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, editingId, loadProfileDataWithUnit]);

  const loadProfileData = (profile: MeasurementResponse) => {
    loadProfileDataWithUnit(profile, unit);
  };

  const handleProfileChange = (profileId: string) => {
    const selected = measurements.find(m => m.id === profileId);
    if (selected) {
      setEditingId(profileId);
      loadProfileData(selected);
    }
  };

  const handleCreateNewProfile = async () => {
    if (!newProfileName.trim()) {
      setError("Please enter a profile name");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const newProfile = await createMeasurement(user!.uid, {
        name: newProfileName.trim(),
        is_primary: false,
      });

      await fetchMeasurements();
      refreshProfileMeasurements();
      setEditingId(newProfile.id);
      loadProfileData(newProfile);
      setShowNewProfileInput(false);
      setNewProfileName("");
      setSuccessMessage("New profile created successfully!");
    } catch (err: any) {
      console.error("Failed to create profile:", err);
      if (err.message?.includes("Free users")) {
        setError("Free users can only store up to 3 profiles. Upgrade to VIP for unlimited profiles.");
      } else {
        setError("Failed to create new profile");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const canCreateNewProfile = userTier === "VIP" || measurements.length < 3;

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
      setSizingError(error.message || "Failed to load size recommendations");
      setSizingData(null);
    } finally {
      setSizingLoading(false);
    }
  }, [user]);

  // Auto-fetch sizing when measurements load
  useEffect(() => {
    if (measurements.length === 0) return;
    const profileId = sizingProfileId || measurements.find(m => m.is_primary)?.id || measurements[0]?.id;
    if (!profileId) return;
    if (sizingProfileId !== profileId) setSizingProfileId(profileId);
    const profile = measurements.find(m => m.id === profileId);
    if (profile && profile.chest && profile.waist && profile.hip) {
      fetchSizing(profileId, sizingGender);
    } else {
      setSizingData(null);
    }
  }, [measurements, sizingProfileId, sizingGender, fetchSizing]);

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

  const handleSave = async () => {
    // Clear previous errors
    setError("");
    setFieldErrors({});

    if (!user || !form.name.trim()) {
      setError(t("measurements.profileNameRequired"));
      return;
    }

    if (form.name.trim().length > 50) {
      setError(t("measurements.nameTooLong"));
      return;
    }

    // Define required fields
    const requiredFields: FieldKey[] = ["height", "weight", "chest", "waist", "hip"];
    const newFieldErrors: Record<string, string> = {};
    let hasErrors = false;

    // Check if required fields are filled
    for (const fieldKey of requiredFields) {
      if (!form[fieldKey] || form[fieldKey].trim() === "") {
        newFieldErrors[fieldKey] = `${fieldLabels[fieldKey]} is required`;
        hasErrors = true;
      }
    }

    // If there are missing required fields, show errors and don't proceed
    if (hasErrors) {
      setFieldErrors(newFieldErrors);
      setError("Please fill in all required fields");
      return;
    }

    // Check all fields are within valid ranges before saving
    for (const field of MEASUREMENT_FIELDS) {
      if (form[field.key] !== "" && !isValueInRange(form[field.key], field.key, unit)) {
        const range = getDisplayRange(field.key, unit);
        const unitLabel = unit === "CM" ? field.cmUnit : field.inUnit;
        newFieldErrors[field.key] = `Must be between ${range.min}${unitLabel} and ${range.max}${unitLabel}`;
        hasErrors = true;
      }
    }

    // If there are range validation errors, show them and don't proceed
    if (hasErrors) {
      setFieldErrors(newFieldErrors);
      setError("Please correct the highlighted fields");
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

      let savedMeasurementId = editingId;
      if (editingId) {
        await updateMeasurement(user.uid, editingId, { ...payload, is_primary: form.is_primary });
      } else {
        const created = await createMeasurement(user.uid, { ...payload, is_primary: form.is_primary });
        savedMeasurementId = created.id;
      }

      // Keep profile context in sync
      refreshProfileMeasurements();

      // Redirect to color analysis page with measurement_id parameter
      router.push(`/color-analysis?measurement_id=${savedMeasurementId}`);
    } catch (err) {
      console.error("Failed to save measurements:", err);
      setError(t("measurements.failedSave"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnitToggle = (newUnit: Unit) => {
    if (newUnit === unit) return;

    const converted = { ...form };
    for (const field of MEASUREMENT_FIELDS) {
      const val = form[field.key];
      if (val === "") continue;
      const num = parseFloat(val);
      if (isNaN(num)) continue;

      if (field.key === "weight") {
        converted[field.key] = newUnit === "IN" ? toLbs(num).toFixed(1) : toKg(num).toFixed(1);
      } else {
        converted[field.key] = newUnit === "IN" ? toInches(num).toFixed(1) : toCm(num).toFixed(1);
      }
    }
    setForm(converted);
    setUnit(newUnit);
    localStorage.setItem("preferredUnit", newUnit);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#FAFAFC] dark:bg-stone-950">
      {/* Background Glow Effects */}
      <div className="absolute top-0 right-0 w-full h-full -z-20 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(11, 85, 99, 0.15) 0%, rgba(255, 255, 255, 0) 60%)" }}></div>
      <div className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] rounded-full -z-10 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(11, 85, 99, 0.2) 0%, rgba(212, 175, 55, 0.15) 100%)", filter: "blur(80px)" }}></div>
      <div className="absolute bottom-[10%] -right-[5%] w-[500px] h-[500px] opacity-60 rounded-full -z-10 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(11, 85, 99, 0.15) 100%)", filter: "blur(80px)" }}></div>

      {/* Application Top Bar (Focused Mode) */}
      <header className="w-full px-6 lg:px-12 py-5 relative z-50 bg-white/40 dark:bg-stone-900/40 backdrop-blur-md border-b border-white/60 dark:border-stone-800/60">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center">
          {/* Back / Logo Area */}
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="w-10 h-10 rounded-full bg-white dark:bg-stone-800 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:shadow-md transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
            <div className="hidden sm:flex items-center gap-2 opacity-50">
              <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center text-white">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="font-cabinet font-bold text-lg text-gray-900 dark:text-white">AttireAI</span>
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="flex items-center justify-between relative w-full max-w-3xl mx-auto gap-4 sm:gap-8 lg:gap-12">
            <div className="absolute left-12 right-12 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-700 -z-10 rounded-full"></div>

            {/* Step 1: Body Size - Active */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-stone-900 border-4 border-brand dark:border-brand-400 text-brand dark:text-brand-400 flex items-center justify-center shadow-glow relative bg-white dark:bg-stone-900">
                <span className="absolute inset-0 rounded-full border border-brand dark:border-brand-400 animate-ping opacity-30"></span>
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-brand dark:text-brand-400 uppercase tracking-widest hidden sm:block">Body Size</span>
            </div>

            {/* Step 2: Color Capture - Pending */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest hidden sm:block">Color</span>
            </div>

            {/* Step 3: Analysis - Pending */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest hidden sm:block">Analysis</span>
            </div>

            {/* Step 4: Try-On - Pending */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest hidden sm:block">Try-On</span>
            </div>
          </div>

          {/* Help/Support */}
          <button className="text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors flex items-center gap-2 text-sm font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">Help</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 lg:py-10">
        {/* Messages */}
        {successMessage && (
          <div className="mb-6">
            <Notification
              type="success"
              variant="inline"
              message={successMessage}
              onClose={() => setSuccessMessage("")}
              dismissible
              autoClose={3000}
            />
          </div>
        )}

        {error && (
          <div className="mb-6">
            <Notification
              type="error"
              variant="inline"
              message={error}
              onClose={() => setError("")}
              dismissible
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Panel: Manual Form */}
          <div className="lg:col-span-7 flex flex-col w-full">
            <div className="glass-panel p-6 sm:p-10 rounded-[2rem] shadow-sm w-full border border-stone-200/50 dark:border-stone-700/50">
              {/* Header & Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-3xl font-cabinet font-extrabold text-gray-900 dark:text-white mb-2">{t("measurements.title")}</h1>
                  <p className="text-gray-600 dark:text-gray-400">{t("measurements.subtitle")}</p>
                </div>
                <div className="flex items-center bg-gray-200/50 dark:bg-stone-800/50 p-1.5 rounded-lg border border-gray-200/60 dark:border-stone-700/60 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleUnitToggle("CM")}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                      unit === "CM" ? "bg-white dark:bg-stone-700 shadow-sm text-brand dark:text-brand-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {t("measurements.cmKg")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitToggle("IN")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      unit === "IN" ? "bg-white dark:bg-stone-700 shadow-sm text-brand dark:text-brand-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {t("measurements.inLbs")}
                  </button>
                </div>
              </div>

              {/* Measurement Form */}
              {isLoading ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="w-12 h-12 border-4 border-brand dark:border-brand-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-stone-500 dark:text-stone-400">{t("common.loading")}</p>
                </div>
              ) : (
                <form className="space-y-10" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  {/* Group: Basic */}
                  <div>
                    <div className="flex items-center gap-3 mb-5 border-b border-gray-200 dark:border-gray-700 pb-3">
                      <div className="w-8 h-8 rounded-full bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-400 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="font-cabinet font-bold text-xl text-gray-900 dark:text-white">Basic</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Profile Name Selector / Input */}
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t("measurements.profileName")} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          {measurements.length > 1 ? (
                            /* Show dropdown if multiple profiles exist */
                            <select
                              value={editingId || ""}
                              onChange={(e) => handleProfileChange(e.target.value)}
                              className="flex-1 bg-white/90 dark:bg-stone-800/50 border border-gray-200 dark:border-stone-700 text-gray-900 dark:text-white rounded-xl px-4 pr-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-brand-400 transition-shadow shadow-sm appearance-none bg-[length:1.5rem] bg-[right_0.75rem_center] bg-no-repeat"
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
                              }}
                            >
                              {measurements.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} {m.is_primary && "(Primary)"}
                                </option>
                              ))}
                            </select>
                          ) : (
                            /* Show input if single or no profile */
                            <input
                              type="text"
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                              maxLength={50}
                              className="flex-1 bg-white/90 dark:bg-stone-800/50 border border-gray-200 dark:border-stone-700 text-gray-900 dark:text-white rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-brand-400 transition-shadow shadow-sm"
                              placeholder={t("measurements.profileNamePlaceholder")}
                              required
                            />
                          )}

                          {/* Add New Profile Button */}
                          <button
                            type="button"
                            onClick={() => setShowNewProfileInput(true)}
                            disabled={!canCreateNewProfile}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${
                              canCreateNewProfile
                                ? "bg-brand dark:bg-brand-400 text-white dark:text-gray-900 hover:bg-brand-600 dark:hover:bg-brand-500 hover:scale-110 active:scale-95"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            }`}
                            title={canCreateNewProfile ? "Create new profile" : "Free users can only store up to 3 profiles"}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Height & Weight */}
                      {MEASUREMENT_FIELDS.filter(f => f.group === "basic").map((field) => {
                        const inRange = isValueInRange(form[field.key], field.key, unit);
                        const range = getDisplayRange(field.key, unit);
                        const rangeError = form[field.key] !== "" && !inRange;
                        const fieldError = fieldErrors[field.key];
                        const showError = rangeError || !!fieldError;
                        const isRequired = ["height", "weight", "chest", "waist", "hip"].includes(field.key);
                        return (
                          <div key={field.key}>
                            <label className={`block text-sm font-medium mb-1.5 ${showError ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                              {fieldLabels[field.key]} {isRequired && <span className="text-red-500">*</span>}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min={getDisplayRange(field.key, unit).min}
                                max={getDisplayRange(field.key, unit).max}
                                value={form[field.key]}
                                onChange={(e) => {
                                  setForm({ ...form, [field.key]: e.target.value });
                                  // Clear field error when user starts typing
                                  if (fieldErrors[field.key]) {
                                    setFieldErrors(prev => {
                                      const next = { ...prev };
                                      delete next[field.key];
                                      return next;
                                    });
                                  }
                                }}
                                onBlur={() => setForm((prev) => ({ ...prev, [field.key]: clampValue(prev[field.key], field.key, unit) }))}
                                className={`w-full border rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 transition-shadow shadow-sm ${
                                  showError
                                    ? "bg-red-50/50 dark:bg-red-900/10 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100 focus:ring-red-500"
                                    : "bg-white/90 dark:bg-stone-800/50 border-gray-200 dark:border-stone-700 text-gray-900 dark:text-white focus:ring-brand dark:focus:ring-brand-400"
                                }`}
                                placeholder={`e.g. ${Math.round((range.min + range.max) / 2)}`}
                              />
                              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium ${showError ? "text-red-400 dark:text-red-500" : "text-gray-400 dark:text-gray-500"}`}>
                                {unit === "CM" ? field.cmUnit : field.inUnit}
                              </span>
                            </div>
                            {showError && (
                              <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1.5 font-medium">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {fieldError || `${fieldLabels[field.key]} must be between ${range.min}${unit === "CM" ? field.cmUnit : field.inUnit} and ${range.max}${unit === "CM" ? field.cmUnit : field.inUnit}`}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group: Core Profile */}
                  <div>
                    <div className="flex items-center gap-3 mb-5 border-b border-gray-200 dark:border-gray-700 pb-3">
                      <div className="w-8 h-8 rounded-full bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-400 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="font-cabinet font-bold text-xl text-gray-900 dark:text-white">Core Profile</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {MEASUREMENT_FIELDS.filter(f => f.group === "core").map((field) => {
                        const inRange = isValueInRange(form[field.key], field.key, unit);
                        const range = getDisplayRange(field.key, unit);
                        const rangeError = form[field.key] !== "" && !inRange;
                        const fieldError = fieldErrors[field.key];
                        const showError = rangeError || !!fieldError;
                        const isRequired = ["height", "weight", "chest", "waist", "hip"].includes(field.key);
                        return (
                          <div key={field.key}>
                            <label className={`block text-sm font-medium mb-1.5 ${showError ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                              {fieldLabels[field.key]} {isRequired && <span className="text-red-500">*</span>}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min={getDisplayRange(field.key, unit).min}
                                max={getDisplayRange(field.key, unit).max}
                                value={form[field.key]}
                                onChange={(e) => {
                                  setForm({ ...form, [field.key]: e.target.value });
                                  // Clear field error when user starts typing
                                  if (fieldErrors[field.key]) {
                                    setFieldErrors(prev => {
                                      const next = { ...prev };
                                      delete next[field.key];
                                      return next;
                                    });
                                  }
                                }}
                                onBlur={() => setForm((prev) => ({ ...prev, [field.key]: clampValue(prev[field.key], field.key, unit) }))}
                                className={`w-full border rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 transition-shadow shadow-sm ${
                                  showError
                                    ? "bg-red-50/50 dark:bg-red-900/10 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100 focus:ring-red-500"
                                    : "bg-white/90 dark:bg-stone-800/50 border-gray-200 dark:border-stone-700 text-gray-900 dark:text-white focus:ring-brand dark:focus:ring-brand-400"
                                }`}
                                placeholder={`${Math.round((range.min + range.max) / 2)}`}
                              />
                              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium ${showError ? "text-red-400 dark:text-red-500" : "text-gray-400 dark:text-gray-500"}`}>
                                {unit === "CM" ? field.cmUnit : field.inUnit}
                              </span>
                            </div>
                            {showError && (
                              <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1.5 font-medium">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {fieldError || `${fieldLabels[field.key]} must be between ${range.min}${unit === "CM" ? field.cmUnit : field.inUnit} and ${range.max}${unit === "CM" ? field.cmUnit : field.inUnit}`}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group: Detailed Sizing */}
                  <div>
                    <div className="flex items-center gap-3 mb-5 border-b border-gray-200 dark:border-gray-700 pb-3">
                      <div className="w-8 h-8 rounded-full bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-400 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      <h3 className="font-cabinet font-bold text-xl text-gray-900 dark:text-white">Detailed Sizing</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {MEASUREMENT_FIELDS.filter(f => f.group === "detailed").map((field) => {
                        const inRange = isValueInRange(form[field.key], field.key, unit);
                        const range = getDisplayRange(field.key, unit);
                        const rangeError = form[field.key] !== "" && !inRange;
                        const fieldError = fieldErrors[field.key];
                        const showError = rangeError || !!fieldError;
                        return (
                          <div key={field.key}>
                            <label className={`block text-sm font-medium mb-1.5 ${showError ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                              {fieldLabels[field.key]}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min={getDisplayRange(field.key, unit).min}
                                max={getDisplayRange(field.key, unit).max}
                                value={form[field.key]}
                                onChange={(e) => {
                                  setForm({ ...form, [field.key]: e.target.value });
                                  // Clear field error when user starts typing
                                  if (fieldErrors[field.key]) {
                                    setFieldErrors(prev => {
                                      const next = { ...prev };
                                      delete next[field.key];
                                      return next;
                                    });
                                  }
                                }}
                                onBlur={() => setForm((prev) => ({ ...prev, [field.key]: clampValue(prev[field.key], field.key, unit) }))}
                                className={`w-full border rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 transition-shadow shadow-sm ${
                                  showError
                                    ? "bg-red-50/50 dark:bg-red-900/10 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100 focus:ring-red-500"
                                    : "bg-white/90 dark:bg-stone-800/50 border-gray-200 dark:border-stone-700 text-gray-900 dark:text-white focus:ring-brand dark:focus:ring-brand-400"
                                }`}
                                placeholder={`${Math.round((range.min + range.max) / 2)}`}
                              />
                              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium ${showError ? "text-red-400 dark:text-red-500" : "text-gray-400 dark:text-gray-500"}`}>
                                {unit === "CM" ? field.cmUnit : field.inUnit}
                              </span>
                            </div>
                            {showError && (
                              <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1.5 font-medium">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {fieldError || `${fieldLabels[field.key]} must be between ${range.min}${unit === "CM" ? field.cmUnit : field.inUnit} and ${range.max}${unit === "CM" ? field.cmUnit : field.inUnit}`}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Primary Toggle */}
                  <div className="flex items-center justify-between px-1 py-3 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t("measurements.primary")} Profile</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Used as default for sizing and recommendations</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_primary: !form.is_primary })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form.is_primary ? "bg-brand dark:bg-brand-400" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_primary ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSaving || !form.name.trim()}
                      className="w-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 px-6 py-4 rounded-xl font-bold text-lg hover:bg-brand-600 dark:hover:bg-brand-500 transition-all shadow-glow flex items-center justify-center gap-3 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10">{isSaving ? t("measurements.saving") : t("measurements.saveMeasurements")}</span>
                      <svg className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Panel: Camera Scan Option */}
          <div className="lg:col-span-5 flex flex-col h-[450px] lg:h-[calc(100vh-160px)] lg:sticky lg:top-8">
            <div className="bg-gray-900 dark:bg-gray-950 rounded-[2rem] overflow-hidden shadow-2xl relative flex-1 border-4 border-gray-800 dark:border-gray-900 flex flex-col group">
              {/* Image Background */}
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1611042553365-9b101441c135?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Camera Feed Background"
                  className="w-full h-full object-cover opacity-30 filter grayscale-[40%] group-hover:opacity-40 transition-opacity duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
                {/* Grid Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
                    backgroundSize: "30px 30px"
                  }}
                ></div>
              </div>

              {/* Top HUD */}
              <div className="relative z-10 p-6 flex justify-between items-start">
                <div className="w-10 h-10 rounded-full bg-brand/30 border border-brand/50 flex items-center justify-center text-brand-200">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div className="bg-black/50 backdrop-blur-md rounded-lg p-2 border border-white/10 font-mono text-[10px] text-brand-200 text-right">
                  <div>AI DETECT: <span className="text-white">STANDBY</span></div>
                </div>
              </div>

              {/* Center Content */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 mb-6 rounded-full border-2 border-dashed border-accent/60 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                  <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-cabinet font-bold text-white mb-3">AI Body Scanner</h3>
                <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                  Don't want to measure manually? Use our 3D camera scan for millimeter-accurate sizing in under 30 seconds.
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="relative z-10 p-8">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <span className="relative bg-gray-900 dark:bg-gray-950 px-4 text-xs text-gray-500 font-bold tracking-widest uppercase">Alternative</span>
                </div>

                <button
                  type="button"
                  className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Start Camera Scan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Size Recommendations Section */}
        {measurements.length > 0 && (
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

      {/* New Profile Creation Modal */}
      {showNewProfileInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeInUp_0.3s_ease-out_forwards]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowNewProfileInput(false);
              setNewProfileName("");
            }}
          ></div>

          {/* Modal */}
          <div className="relative glass-panel rounded-[2.5rem] p-8 shadow-2xl max-w-md w-full border-white/90 dark:border-stone-700/50 animate-[fadeInUp_0.4s_ease-out_forwards]">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-cabinet font-extrabold text-2xl text-gray-900 dark:text-white">
                  Create New Profile
                </h3>
                <button
                  onClick={() => {
                    setShowNewProfileInput(false);
                    setNewProfileName("");
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Input */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Profile Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newProfileName.trim()) {
                      handleCreateNewProfile();
                    }
                  }}
                  className="w-full bg-white/90 dark:bg-stone-800/50 border border-gray-200 dark:border-stone-700 text-gray-900 dark:text-white rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-brand-400 transition-shadow shadow-sm"
                  placeholder="e.g., Formal Wear, Casual, Winter"
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userTier === "FREE"
                    ? `Free users can store up to 3 profiles. You have ${3 - measurements.length} slot(s) remaining.`
                    : "VIP users have unlimited profiles."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowNewProfileInput(false);
                    setNewProfileName("");
                  }}
                  className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-100 dark:hover:bg-stone-800 rounded-2xl transition-all"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewProfile}
                  disabled={isSaving || !newProfileName.trim()}
                  className="flex-1 px-6 py-3 bg-brand dark:bg-brand-400 text-white dark:text-gray-900 rounded-2xl font-bold text-sm hover:bg-brand-600 dark:hover:bg-brand-500 transition-all shadow-glow active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Creating..." : "Create Profile"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
      <span className="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0">{label}</span>
      <div className="flex-1 relative">
        <div className="h-2 bg-gray-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div className="h-full bg-gray-300 dark:bg-stone-600 rounded-full" style={{ width: "100%" }} />
        </div>
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-stone-900 shadow-sm ${
            inRange ? "bg-green-500" : "bg-orange-500"
          }`}
          style={{ left: `${Math.max(0, Math.min(100, position * 100))}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right shrink-0">
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
    <svg className="w-8 h-8 text-brand dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
    <div className="mt-10 col-span-full">
      <div className="glass-panel p-6 sm:p-10 rounded-[2rem] shadow-sm w-full border border-stone-200/50 dark:border-stone-700/50">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-cabinet font-extrabold text-gray-900 dark:text-white">{t("sizing.title")}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t("sizing.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Gender Toggle */}
            <div className="flex items-center bg-gray-200/50 dark:bg-stone-800/50 p-1.5 rounded-lg border border-gray-200/60 dark:border-stone-700/60">
              <button
                onClick={() => onGenderChange("male")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  sizingGender === "male" ? "bg-white dark:bg-stone-700 shadow-sm text-brand dark:text-brand-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {t("sizing.male")}
              </button>
              <button
                onClick={() => onGenderChange("female")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  sizingGender === "female" ? "bg-white dark:bg-stone-700 shadow-sm text-brand dark:text-brand-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                className="px-3 py-2 text-sm border border-gray-200 dark:border-stone-700 rounded-lg bg-white/90 dark:bg-stone-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand-400 outline-none"
              >
                {measurements.map(m => (
                  <option key={m.id} value={m.id}>{m.name}{m.is_primary ? " (Primary)" : ""}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Missing measurements message */}
        {!hasSizingMeasurements && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-brand/10 dark:bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-brand dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{t("sizing.needMeasurements")}</p>
          </div>
        )}

        {/* Loading state */}
        {sizingLoading && hasSizingMeasurements && (
          <div className="p-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-brand dark:border-brand-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("sizing.loading") || "Loading recommendations..."}</p>
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
          <div className="space-y-8">
            {/* Body Type Card */}
            <div className="flex items-center gap-4 p-5 bg-white/60 dark:bg-stone-800/30 rounded-2xl border border-stone-200/50 dark:border-stone-700/50">
              <div className="w-14 h-14 bg-brand/10 dark:bg-brand/20 rounded-xl flex items-center justify-center shrink-0">
                <BodyTypeIcon bodyType={sizingData.body_type} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">{t("sizing.bodyType")}</p>
                <p className="text-lg font-cabinet font-bold text-gray-900 dark:text-white">{sizingData.body_type}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{sizingData.body_type_description}</p>
              </div>
            </div>

            {/* Brand Cards by Category */}
            {Object.entries(grouped).map(([category, recs]) => (
              <div key={category}>
                <h3 className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mb-3">
                  {t(`sizing.${CATEGORY_LABELS[category] || "basics"}`)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recs.map((rec) => {
                    const isExpanded = expandedBrands.has(rec.brand);
                    return (
                      <div
                        key={rec.brand}
                        className="bg-white/80 dark:bg-stone-800/40 rounded-xl border border-stone-200/50 dark:border-stone-700/50 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <button
                          onClick={() => onToggleBrand(rec.brand)}
                          className="w-full p-4 text-left"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-cabinet font-bold text-gray-900 dark:text-white">{rec.brand}</span>
                            <ConfidenceBadge confidence={rec.confidence} t={t} />
                          </div>
                          <div className="flex items-end justify-between">
                            <span className="text-3xl font-extrabold text-brand dark:text-brand-400">{rec.recommended_size}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {t("sizing.fitScore")}: {rec.fit_score}
                            </span>
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0 border-t border-stone-100 dark:border-stone-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-3 mb-3">{rec.sizing_notes}</p>
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
    </div>
  );
}
