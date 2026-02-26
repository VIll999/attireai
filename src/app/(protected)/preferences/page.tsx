"use client";

import { useState, useEffect } from "react";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import { getStylePreferences, saveStylePreferences, PriceRange } from "@/lib/api";
import { useLocale } from "@/context/LocaleContext";

const STYLES = [
  { value: "minimalist", defaultChecked: true },
  { value: "streetwear", defaultChecked: false },
  { value: "classic", defaultChecked: true },
  { value: "bohemian", defaultChecked: false },
  { value: "preppy", defaultChecked: false },
  { value: "athleisure", defaultChecked: false },
  { value: "vintage", defaultChecked: false },
  { value: "elegant", defaultChecked: true },
  { value: "casual", defaultChecked: false },
];

const STYLE_CARDS: { value: string; emoji: string; bg: string; accent: string }[] = [
  { value: "minimalist", emoji: "◻", bg: "#F7F7F5", accent: "#888" },
  { value: "streetwear", emoji: "◈", bg: "#1C1C1C", accent: "#fff" },
  { value: "classic", emoji: "◇", bg: "#F2EDE6", accent: "#7A6247" },
  { value: "bohemian", emoji: "✿", bg: "#EEE8DC", accent: "#9B7B4F" },
  { value: "preppy", emoji: "◉", bg: "#E8EEF5", accent: "#3B6EA5" },
  { value: "athleisure", emoji: "⚡", bg: "#EAF2F5", accent: "#2A7A8C" },
  { value: "vintage", emoji: "◎", bg: "#F5EFE6", accent: "#A07850" },
  { value: "elegant", emoji: "✦", bg: "#F4F0F8", accent: "#7B5EA7" },
  { value: "casual", emoji: "○", bg: "#EFF5F0", accent: "#4A9060" },
];

const INITIAL_BRANDS = ["Zara", "COS", "Ralph Lauren"];
const INITIAL_EXCLUSIONS = ["Bohemian", "Streetwear"];

export default function StylePreferences() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    STYLES.filter((s) => s.defaultChecked).map((s) => s.value)
  );
  const [budget, setBudget] = useState<PriceRange>("MID_RANGE");
  const [brands, setBrands] = useState<string[]>(INITIAL_BRANDS);
  const [exclusions, setExclusions] = useState<string[]>(INITIAL_EXCLUSIONS);
  const [newBrand, setNewBrand] = useState("");
  const [showBrandInput, setShowBrandInput] = useState(false);
  const [newExclusion, setNewExclusion] = useState("");
  const [showExclusionInput, setShowExclusionInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getStylePreferences(user.uid).then((data) => {
      if (data) {
        setSelectedStyles(data.preferred_styles);
        setExclusions(data.avoided_styles);
        setBrands(data.preferred_brands);
        if (data.price_range === "BUDGET") setBudget("BUDGET");
        else if (data.price_range === "LUXURY") setBudget("LUXURY");
        else setBudget("MID_RANGE");
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, [user]);

  const toggleStyle = (value: string) => {
    setSelectedStyles((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const removeBrand = (brand: string) => {
    setBrands((prev) => prev.filter((b) => b !== brand));
  };

  const addBrand = () => {
    if (newBrand.trim()) {
      setBrands((prev) => [...prev, newBrand.trim()]);
      setNewBrand("");
      setShowBrandInput(false);
    }
  };

  const removeExclusion = (exclusion: string) => {
    setExclusions((prev) => prev.filter((e) => e !== exclusion));
  };

  const addExclusion = () => {
    if (newExclusion.trim()) {
      setExclusions((prev) => [...prev, newExclusion.trim()]);
      setNewExclusion("");
      setShowExclusionInput(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveMessage("");
    try {
      await saveStylePreferences(user.uid, {
        preferred_styles: selectedStyles,
        avoided_styles: exclusions,
        price_range: budget,
        preferred_brands: brands,
        excluded_brands: [],
      });
      setSaveMessage(t("common.saved"));
    } catch {
      setSaveMessage(t("common.failedSave"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex flex-col">
      <AppNav activePage="preferences" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-8 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-[#0B5563] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              {/* Left: Style List */}
              <div className="lg:col-span-4">
                <div className="space-y-1 mb-8">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500 mb-6">
                    {t("preferences.selectStyles")}
                  </h2>
                  <div className="border dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-stone-800">
                    {STYLES.map((style) => {
                      const isChecked = selectedStyles.includes(style.value);
                      return (
                        <label
                          key={style.value}
                          className={`flex items-center justify-between p-5 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-stone-800/50 ${
                            isChecked ? "bg-[#F0F7F8] dark:bg-[#0B5563]/20 border-l-4 border-[#0B5563]" : ""
                          }`}
                        >
                          <span className="font-bold text-gray-700 dark:text-stone-300">{t(`styles.${style.value}`)}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStyle(style.value)}
                            className="w-5 h-5 rounded border-gray-300 accent-[#0B5563]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="hidden lg:block">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-[#0B5563] text-white py-4 rounded-xl font-bold hover:bg-[#09444F] transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? t("common.saving") : t("preferences.updatePreferences")}
                  </button>
                  {saveMessage && (
                    <p className={`text-center text-sm mt-2 font-medium ${saveMessage === t("common.saved") ? "text-green-600" : "text-red-500"}`}>
                      {saveMessage}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Style Cards & Settings */}
              <div className="lg:col-span-8 space-y-12">
                {/* Style Cards - All 9 styles */}
                <section>
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500 mb-6">
                    {t("preferences.aestheticPreview")}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {STYLE_CARDS.map((card) => {
                      const isSelected = selectedStyles.includes(card.value);
                      const isLight = card.bg !== "#1C1C1C";
                      return (
                        <button
                          key={card.value}
                          onClick={() => toggleStyle(card.value)}
                          className={`relative rounded-2xl p-5 text-left transition-all duration-200 group border-2 ${
                            isSelected
                              ? "border-[#0B5563] shadow-md scale-[1.02]"
                              : "border-transparent hover:border-gray-200 dark:hover:border-stone-600 hover:shadow-sm"
                          }`}
                          style={{ backgroundColor: card.bg }}
                        >
                          {/* Selected checkmark */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#0B5563] flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}

                          {/* Emoji / icon */}
                          <span
                            className="text-2xl mb-3 block"
                            style={{ color: card.accent }}
                          >
                            {card.emoji}
                          </span>

                          {/* Style name */}
                          <h3
                            className="font-black text-sm uppercase tracking-wider mb-1.5"
                            style={{ color: isLight ? "#1a1a1a" : "#ffffff" }}
                          >
                            {t(`styles.${card.value}`)}
                          </h3>

                          {/* Description */}
                          <p
                            className="text-xs leading-relaxed"
                            style={{ color: isLight ? "#666" : "rgba(255,255,255,0.6)" }}
                          >
                            {t(`styles.${card.value}_desc`)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
                  {/* Budget Slider */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500">
                        {t("preferences.budgetAlignment")}
                      </h2>
                      <span className="text-sm font-bold text-[#0B5563] dark:text-[#4AABB8]">
                        {budget === "BUDGET" ? t("preferences.budget") : budget === "LUXURY" ? t("preferences.luxury") : t("preferences.midRange")}
                      </span>
                    </div>
                    <div className="px-2">
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={1}
                        value={budget === "BUDGET" ? 0 : budget === "LUXURY" ? 2 : 1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val === 0) setBudget("BUDGET");
                          else if (val === 2) setBudget("LUXURY");
                          else setBudget("MID_RANGE");
                        }}
                        className="w-full accent-[#0B5563]"
                        style={{
                          WebkitAppearance: "none",
                          height: "4px",
                          background: "#e2e8f0",
                          borderRadius: "2px",
                          outline: "none",
                        }}
                      />
                      <div className="flex justify-between mt-3">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-stone-500">{t("preferences.sliderBudget")}</span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-stone-500">{t("preferences.sliderMidRange")}</span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-stone-500">{t("preferences.sliderLuxury")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Brand Affinities */}
                  <div className="space-y-6">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500">
                      {t("preferences.brandAffinities")}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {brands.map((brand) => (
                        <span
                          key={brand}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-stone-800 rounded-full text-xs font-bold text-gray-600 dark:text-stone-300 border border-gray-100 dark:border-stone-700"
                        >
                          {brand}
                          <button
                            onClick={() => removeBrand(brand)}
                            className="hover:text-red-500 transition-colors"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      {showBrandInput ? (
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            value={newBrand}
                            onChange={(e) => setNewBrand(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addBrand()}
                            placeholder={t("preferences.brandPlaceholder")}
                            className="px-3 py-1.5 text-xs border border-[#0B5563]/30 dark:border-[#0B5563]/50 rounded-full outline-none focus:border-[#0B5563] bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300"
                          />
                          <button onClick={addBrand} className="text-xs font-bold text-[#0B5563] dark:text-[#4AABB8] hover:underline">
                            {t("common.add")}
                          </button>
                          <button onClick={() => setShowBrandInput(false)} className="text-xs text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-300">
                            {t("common.cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowBrandInput(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-900 rounded-full text-xs font-bold text-[#0B5563] dark:text-[#4AABB8] border border-[#0B5563]/20 dark:border-[#0B5563]/30 hover:bg-[#0B5563]/5 dark:hover:bg-[#0B5563]/10"
                        >
                          {t("preferences.addBrand")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Exclusions */}
                <section className="pt-8">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500 mb-6">
                    {t("preferences.stylesToAvoid")}
                  </h2>
                  <div className="flex flex-col gap-3 max-w-md">
                    {exclusions.map((exclusion) => (
                      <div
                        key={exclusion}
                        className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-stone-800/50 rounded-xl border border-gray-100 dark:border-stone-700"
                      >
                        <span className="text-sm font-medium text-gray-600 dark:text-stone-300">{exclusion}</span>
                        <button
                          onClick={() => removeExclusion(exclusion)}
                          className="text-gray-300 dark:text-stone-600 hover:text-red-500 transition-colors"
                        >
                          ⊗
                        </button>
                      </div>
                    ))}
                    {showExclusionInput ? (
                      <div className="flex gap-2 mt-1">
                        <input
                          autoFocus
                          value={newExclusion}
                          onChange={(e) => setNewExclusion(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addExclusion()}
                          placeholder={t("preferences.exclusionPlaceholder")}
                          className="flex-1 px-3 py-2 text-sm border border-[#0B5563]/30 dark:border-[#0B5563]/50 rounded-xl outline-none focus:border-[#0B5563] bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300"
                        />
                        <button onClick={addExclusion} className="text-sm font-bold text-[#0B5563] dark:text-[#4AABB8] hover:underline">
                          {t("common.add")}
                        </button>
                        <button onClick={() => setShowExclusionInput(false)} className="text-sm text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-300">
                          {t("common.cancel")}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowExclusionInput(true)}
                        className="text-xs font-bold text-[#0B5563] dark:text-[#4AABB8] hover:underline text-left mt-2 flex items-center gap-2"
                      >
                        {t("preferences.addExclusion")}
                      </button>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="lg:hidden mt-12 pt-8 border-t border-gray-100 dark:border-stone-800">
              {saveMessage ? (
                <p className={`text-center text-sm mb-3 font-medium ${saveMessage === t("common.saved") ? "text-green-600" : "text-red-500"}`}>
                  {saveMessage}
                </p>
              ) : (
                <div />
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-[#0B5563] text-white py-4 rounded-xl font-bold hover:bg-[#09444F] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? t("common.saving") : t("preferences.updatePreferences")}
              </button>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-50 dark:border-stone-800 dark:bg-stone-950">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <span className="font-black text-xl tracking-tighter text-gray-900 dark:text-white">
            ATTIRE<span className="text-[#0B5563]">AI</span>
          </span>
          <div className="flex gap-8">
            {["Terms", "Privacy", "Help"].map((item) => (
              <a key={item} href="#" className="text-xs font-bold text-gray-400 dark:text-stone-500 hover:text-[#0B5563] dark:hover:text-[#4AABB8]">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}