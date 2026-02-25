"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  saveStylePreferences,
  getStylePreferences,
  PriceRange,
} from "@/lib/api";

const OCCASIONS = [
  { value: "formal-dinner", label: "Formal Dinner" },
  { value: "casual-outing", label: "Casual Outing" },
  { value: "business-meeting", label: "Business Meeting" },
  { value: "date-night", label: "Date Night" },
  { value: "wedding-guest", label: "Wedding Guest" },
  { value: "job-interview", label: "Job Interview" },
  { value: "everyday-casual", label: "Everyday Casual" },
];

const WEATHER_OPTIONS = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
  { value: "all", label: "All Season" },
];

const DRESS_CODE_OPTIONS = [
  { value: "black-tie", label: "Black Tie" },
  { value: "business-formal", label: "Formal" },
  { value: "business-casual", label: "Business" },
  { value: "smart-casual", label: "Smart Casual" },
  { value: "casual", label: "Casual" },
];

const STYLES = [
  { value: "minimalist", label: "Minimalist" },
  { value: "streetwear", label: "Streetwear" },
  { value: "classic", label: "Classic" },
  { value: "bohemian", label: "Bohemian" },
  { value: "preppy", label: "Preppy" },
  { value: "athleisure", label: "Athleisure" },
  { value: "vintage", label: "Vintage" },
  { value: "elegant", label: "Elegant" },
  { value: "casual", label: "Casual" },
];

const BUDGET_OPTIONS: { value: PriceRange; label: string }[] = [
  { value: "BUDGET", label: "Budget" },
  { value: "MID_RANGE", label: "Mid Range" },
  { value: "LUXURY", label: "Luxury" },
];

export default function StylePreferencesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const measurementId = searchParams.get("measurement_id");

  // Occasion context
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<string | null>(null);
  const [selectedDressCode, setSelectedDressCode] = useState<string | null>(null);

  // Style preferences
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [budget, setBudget] = useState<PriceRange>("MID_RANGE");
  const [brands, setBrands] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [showBrandInput, setShowBrandInput] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing style preferences on mount
  useEffect(() => {
    if (!user) return;
    getStylePreferences(user.uid)
      .then((data) => {
        if (data) {
          if (data.occasion) setSelectedOccasion(data.occasion);
          if (data.weather) setSelectedWeather(data.weather);
          if (data.dress_code) setSelectedDressCode(data.dress_code);
          setSelectedStyles(data.preferred_styles);
          setBudget(data.price_range);
          setBrands(data.preferred_brands);
        }
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const toggleStyle = (value: string) => {
    setSelectedStyles((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const addBrand = () => {
    const trimmed = newBrand.trim();
    if (trimmed && !brands.includes(trimmed)) {
      setBrands((prev) => [...prev, trimmed]);
    }
    setNewBrand("");
    setShowBrandInput(false);
  };

  const removeBrand = (brand: string) => {
    setBrands((prev) => prev.filter((b) => b !== brand));
  };

  const isFormComplete =
    selectedOccasion && selectedWeather && selectedDressCode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete || !user) return;

    setIsSubmitting(true);
    try {
      // Save all preferences (occasion context + style preferences) in one call
      await saveStylePreferences(user.uid, {
        occasion: selectedOccasion,
        weather: selectedWeather,
        dress_code: selectedDressCode,
        preferred_styles: selectedStyles,
        avoided_styles: [],
        price_range: budget,
        preferred_brands: brands,
        excluded_brands: [],
      });

      // Redirect to recommendations with just the measurement_id
      router.push(
        measurementId
          ? `/recommendations?measurement_id=${measurementId}`
          : `/recommendations`
      );
    } catch (error) {
      console.error("Failed to save style preferences:", error);
      alert("Failed to save your preferences. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Pill button helper
  const pillClass = (active: boolean) =>
    `px-5 py-3 rounded-2xl border font-bold text-sm transition-all ${
      active
        ? "bg-brand border-brand text-white shadow-[0_8px_20px_-4px_rgba(11,85,99,0.25)] transform -translate-y-0.5"
        : "bg-white border-gray-100 text-gray-600 shadow-sm hover:border-brand/40"
    }`;

  return (
    <div className="min-h-screen bg-[#FAFAFC] relative flex flex-col">
      {/* Background Effects */}
      <div
        className="absolute top-0 left-0 w-[600px] h-[600px] -z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(11, 85, 99, 0.08) 0%, transparent 100%)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[600px] h-[600px] -z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, transparent 100%)",
          filter: "blur(100px)",
        }}
      />
      <div className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-[float_5s_ease-in-out_infinite]" />

      {/* Header */}
      <header className="w-full px-6 lg:px-12 py-6 relative z-50 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <div className="w-8 h-8 rounded-lg bg-brand dark:bg-brand-400 flex items-center justify-center text-white dark:text-gray-900 shadow-glow">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
            </div>
            <span className="font-cabinet font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">
              AttireAI
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 lg:py-12">
        {/* Progress Stepper */}
        <div className="w-full max-w-3xl mx-auto mb-16">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 rounded-full" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[62.5%] h-1 bg-brand dark:bg-brand-400 -z-10 rounded-full" />

            {/* Step 1 - Body Size (Completed) */}
            <Link
              href="/measurements"
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-[10px] font-black text-brand dark:text-brand-400 uppercase tracking-widest">
                Body Size
              </span>
            </Link>

            {/* Step 2 - Color Capture (Completed) */}
            <Link
              href={`/color-analysis${measurementId ? `?measurement_id=${measurementId}` : ""}`}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-[10px] font-black text-brand dark:text-brand-400 uppercase tracking-widest">
                Color Capture
              </span>
            </Link>

            {/* Step 3 - Analysis (Active) */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white dark:bg-stone-900 border-4 border-brand dark:border-brand-400 text-brand dark:text-brand-400 flex items-center justify-center shadow-glow relative">
                <span className="absolute inset-0 rounded-full border border-brand dark:border-brand-400 animate-ping opacity-30" />
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
                Analysis
              </span>
            </div>

            {/* Step 4 - Try-on (Inactive) */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                Try-on
              </span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="w-full max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black text-brand tracking-tighter font-cabinet mb-6">
            Refine Your <span className="text-accent">Style</span>
          </h1>
          <p className="text-gray-500 text-lg md:text-xl font-satoshi leading-relaxed max-w-lg mx-auto">
            Tailor the AI recommendations by selecting your specific fashion
            goals and preferences.
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          /* Form Panel */
          <div className="w-full max-w-3xl mx-auto bg-white/85 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-14 relative z-10 border border-white/60 shadow-[0_25px_60px_rgba(11,85,99,0.04)]">
            <form onSubmit={handleSubmit} className="space-y-14">
              {/* 1. Occasion Selection */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-3 text-sm font-bold text-brand uppercase tracking-widest font-satoshi">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Target Occasion</span>
                  </label>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    One Choice
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {OCCASIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setSelectedOccasion(o.value)}
                      className={pillClass(selectedOccasion === o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2 & 3. Weather + Dress Code grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-14">
                {/* Weather */}
                <div className="space-y-8">
                  <label className="flex items-center space-x-3 text-sm font-bold text-brand uppercase tracking-widest font-satoshi">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                      />
                    </svg>
                    <span>Weather</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {WEATHER_OPTIONS.map((w) => (
                      <button
                        key={w.value}
                        type="button"
                        onClick={() => setSelectedWeather(w.value)}
                        className={pillClass(selectedWeather === w.value)}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dress Code */}
                <div className="space-y-8">
                  <label className="flex items-center space-x-3 text-sm font-bold text-brand uppercase tracking-widest font-satoshi">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    <span>Dress Code</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {DRESS_CODE_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setSelectedDressCode(c.value)}
                        className={pillClass(selectedDressCode === c.value)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Preferred Styles */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-3 text-sm font-bold text-brand uppercase tracking-widest font-satoshi">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span>Preferred Styles</span>
                  </label>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Select Multiple
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {STYLES.map((s) => {
                    const active = selectedStyles.includes(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleStyle(s.value)}
                        className={`px-5 py-3 rounded-2xl border font-bold text-sm transition-all ${
                          active
                            ? "bg-accent border-accent text-white shadow-[0_8px_20px_-4px_rgba(212,175,55,0.25)] transform -translate-y-0.5"
                            : "bg-white border-gray-100 text-gray-600 shadow-sm hover:border-accent/40"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Budget + 6. Brands grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-14">
                {/* Budget */}
                <div className="space-y-8">
                  <label className="flex items-center space-x-3 text-sm font-bold text-brand uppercase tracking-widest font-satoshi">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Budget</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {BUDGET_OPTIONS.map((b) => (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => setBudget(b.value)}
                        className={pillClass(budget === b.value)}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Brands */}
                <div className="space-y-8">
                  <label className="flex items-center space-x-3 text-sm font-bold text-brand uppercase tracking-widest font-satoshi">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    <span>Preferred Brands</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {brands.map((brand) => (
                      <span
                        key={brand}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-xs font-bold text-gray-600 border border-gray-100"
                      >
                        {brand}
                        <button
                          type="button"
                          onClick={() => removeBrand(brand)}
                          className="hover:text-red-500 transition-colors"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    {showBrandInput ? (
                      <div className="flex gap-2 items-center">
                        <input
                          autoFocus
                          value={newBrand}
                          onChange={(e) => setNewBrand(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBrand())}
                          placeholder="Brand name"
                          className="px-3 py-1.5 text-xs border border-brand/30 rounded-full outline-none focus:border-brand"
                        />
                        <button
                          type="button"
                          onClick={addBrand}
                          className="text-xs font-bold text-brand hover:underline"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBrandInput(false);
                            setNewBrand("");
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowBrandInput(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-bold text-brand border border-brand/20 hover:bg-brand/5"
                      >
                        + Add Brand
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-8">
                <button
                  type="submit"
                  disabled={!isFormComplete || isSubmitting}
                  className="w-full py-6 rounded-2xl bg-brand text-white font-black text-xl flex items-center justify-center space-x-4 transition-all active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed group relative overflow-hidden shadow-[0_10px_25px_-5px_rgba(11,85,99,0.3)]"
                >
                  <span className="relative z-10 font-cabinet tracking-tight">
                    {isSubmitting ? "Saving..." : "Save & Get Recommendations"}
                  </span>
                  {!isSubmitting && (
                    <svg
                      className="w-6 h-6 text-accent group-hover:translate-x-1 transition-transform relative z-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  )}
                  {isSubmitting && (
                    <svg
                      className="w-6 h-6 text-accent animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </button>
                <p className="text-center text-sm text-brand/60 mt-8 font-medium flex items-center justify-center space-x-2">
                  {isFormComplete ? (
                    <>
                      <svg
                        className="w-5 h-5 text-emerald-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-emerald-600 font-bold">
                        Ready to save your preferences and get recommendations.
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        Pick an occasion, weather, and dress code to continue.
                      </span>
                    </>
                  )}
                </p>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
