"use client";

import { useState, useEffect } from "react";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import { getStylePreferences, saveStylePreferences, PriceRange } from "@/lib/api";

const STYLES = [
  { value: "minimalist", label: "Minimalist", defaultChecked: true },
  { value: "streetwear", label: "Streetwear", defaultChecked: false },
  { value: "classic", label: "Classic", defaultChecked: true },
  { value: "bohemian", label: "Bohemian", defaultChecked: false },
  { value: "preppy", label: "Preppy", defaultChecked: false },
  { value: "athleisure", label: "Athleisure", defaultChecked: false },
  { value: "vintage", label: "Vintage", defaultChecked: false },
  { value: "elegant", label: "Elegant", defaultChecked: true },
  { value: "casual", label: "Casual", defaultChecked: false },
];

const PREVIEW_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400",
    label: "Minimalist",
  },
  {
    src: "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&q=80&w=400",
    label: "Elegant",
  },
  {
    src: "https://images.unsplash.com/photo-1539109132304-3510467ef0d9?auto=format&fit=crop&q=80&w=400",
    label: "Classic",
  },
];

const INITIAL_BRANDS = ["Zara", "COS", "Ralph Lauren"];
const INITIAL_EXCLUSIONS = ["Bohemian", "Streetwear"];

export default function StylePreferences() {
  const { user } = useAuth();
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
        setSaveMessage("Saved!");
    } catch {
        setSaveMessage("Failed to save, please try again.");
    } finally {
        setIsSaving(false);
    }
    };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AppNav activePage="style" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-8 py-12">    
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-[#0B5563] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Left: Style List */}
            <div className="lg:col-span-4">
              <div className="space-y-1 mb-8">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">
                  Select Preferred Styles
                </h2>
                <div className="border rounded-2xl overflow-hidden divide-y divide-gray-100">
                  {STYLES.map((style) => {
                    const isChecked = selectedStyles.includes(style.value);
                    return (
                      <label
                        key={style.value}
                        className={`flex items-center justify-between p-5 cursor-pointer transition-all hover:bg-gray-50 ${
                          isChecked ? "bg-[#F0F7F8] border-l-4 border-[#0B5563]" : ""
                        }`}
                      >
                        <span className="font-bold text-gray-700">{style.label}</span>
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

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-[#0B5563] text-white py-4 rounded-xl font-bold hover:bg-[#09444F] transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? "Saving..." : "Update Preferences →"}
              </button>
              {saveMessage && (
              <p className={`text-center text-sm mt-2 font-medium ${saveMessage === "Saved!" ? "text-green-600" : "text-red-500"}`}>
                  {saveMessage}
              </p>
              )}
            </div>

            {/* Right: Preview & Settings */}
            <div className="lg:col-span-8 space-y-12">
              {/* Preview */}
              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">
                  Aesthetic Preview
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {PREVIEW_IMAGES.map((img) => (
                    <div
                      key={img.label}
                      className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 group relative"
                    >
                      <img
                        src={img.src}
                        alt={`${img.label} Preview`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                        <span className="text-white text-sm font-bold">{img.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
                {/* Budget Slider */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                      Budget Alignment
                    </h2>
                    <span className="text-sm font-bold text-[#0B5563]">
                      {budget === "BUDGET" ? "Budget" : budget === "LUXURY" ? "Luxury" : "Mid Range"}
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
                      <span className="text-[10px] font-bold text-gray-400">BUDGET</span>
                      <span className="text-[10px] font-bold text-gray-400">MID RANGE</span>
                      <span className="text-[10px] font-bold text-gray-400">LUXURY</span>
                    </div>
                  </div>
                </div>

                {/* Brand Affinities */}
                <div className="space-y-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                    Brand Affinities
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {brands.map((brand) => (
                      <span
                        key={brand}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-xs font-bold text-gray-600 border border-gray-100"
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
                          placeholder="Brand name"
                          className="px-3 py-1.5 text-xs border border-[#0B5563]/30 rounded-full outline-none focus:border-[#0B5563]"
                        />
                        <button onClick={addBrand} className="text-xs font-bold text-[#0B5563] hover:underline">
                          Add
                        </button>
                        <button onClick={() => setShowBrandInput(false)} className="text-xs text-gray-400 hover:text-gray-600">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowBrandInput(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-bold text-[#0B5563] border border-[#0B5563]/20 hover:bg-[#0B5563]/5"
                      >
                        + Add Brand
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Exclusions */}
              <section className="pt-8">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">
                  Styles to Avoid
                </h2>
                <div className="flex flex-col gap-3 max-w-md">
                  {exclusions.map((exclusion) => (
                    <div
                      key={exclusion}
                      className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100"
                    >
                      <span className="text-sm font-medium text-gray-600">{exclusion}</span>
                      <button
                        onClick={() => removeExclusion(exclusion)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
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
                        placeholder="Style to avoid"
                        className="flex-1 px-3 py-2 text-sm border border-[#0B5563]/30 rounded-xl outline-none focus:border-[#0B5563]"
                      />
                      <button onClick={addExclusion} className="text-sm font-bold text-[#0B5563] hover:underline">
                        Add
                      </button>
                      <button onClick={() => setShowExclusionInput(false)} className="text-sm text-gray-400 hover:text-gray-600">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowExclusionInput(true)}
                      className="text-xs font-bold text-[#0B5563] hover:underline text-left mt-2 flex items-center gap-2"
                    >
                      ⊕ Add another exclusion
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-50">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <span className="font-black text-xl tracking-tighter text-gray-900">
            ATTIRE<span className="text-[#0B5563]">AI</span>
          </span>
          <div className="flex gap-8">
            {["Terms", "Privacy", "Help"].map((item) => (
              <a key={item} href="#" className="text-xs font-bold text-gray-400 hover:text-[#0B5563]">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}