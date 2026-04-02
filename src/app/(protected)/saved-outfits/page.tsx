"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import {
  getSavedOutfits,
  deleteSavedOutfit,
  updateSavedOutfit,
  getCollections,
  SavedOutfitWithDetailsResponse,
} from "@/lib/api";

const CATEGORY_ICONS: Record<string, string> = {
  TOP: "👕",
  BOTTOM: "👖",
  SHOES: "👟",
  ACCESSORY: "⌚",
  OUTERWEAR: "🧥",
};

export default function SavedOutfitsPage() {
  const { user } = useAuth();
  const router = useRouter();
  useLocale();

  const [savedOutfits, setSavedOutfits] = useState<SavedOutfitWithDetailsResponse[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [showShareToast, setShowShareToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [brandFilters, setBrandFilters] = useState<string[]>([]);
  const [styleFilters, setStyleFilters] = useState<string[]>([]);
  const [weatherFilter, setWeatherFilter] = useState<string>("");
  const [occasionFilter, setOccasionFilter] = useState<string>("");
  const [dressCodeFilter, setDressCodeFilter] = useState<string>("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [newBrand, setNewBrand] = useState("");
  const [showBrandInput, setShowBrandInput] = useState(false);

  // Available options
  const AVAILABLE_STYLES = [
    "Minimalist",
    "Streetwear",
    "Classic",
    "Bohemian",
    "Preppy",
    "Athleisure",
    "Vintage",
    "Elegant",
    "Casual",
  ];

  const AVAILABLE_WEATHER = ["Spring", "Summer", "Fall", "Winter", "All Season"];

  const AVAILABLE_OCCASIONS = [
    "Formal Dinner",
    "Casual Outing",
    "Business Meeting",
    "Date Night",
    "Wedding Guest",
    "Job Interview",
    "Everyday Casual",
  ];

  const AVAILABLE_DRESS_CODES = [
    "Black Tie",
    "Formal",
    "Business",
    "Smart Casual",
    "Casual",
  ];

  // Helper to build filter query
  const buildFilters = () => {
    const filters: {
      collectionName?: string;
      brand?: string;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      weather?: string;
    } = {};

    if (selectedCollection) filters.collectionName = selectedCollection;
    if (brandFilters.length > 0) filters.brand = brandFilters.join(",");
    if (styleFilters.length > 0) filters.category = styleFilters.join(",");
    if (weatherFilter) filters.weather = weatherFilter;
    if (priceRange[0] > 0) filters.minPrice = priceRange[0];
    if (priceRange[1] < 1000) filters.maxPrice = priceRange[1];

    return Object.keys(filters).length > 0 ? filters : undefined;
  };

  // Fetch saved outfits and collections
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    Promise.all([
      getSavedOutfits(user.uid, buildFilters()),
      getCollections(user.uid),
    ])
      .then(([outfits, cols]) => {
        setSavedOutfits(outfits);
        setCollections(cols);
      })
      .catch((err) => {
        console.error("Failed to fetch saved outfits:", err);
        setSavedOutfits([]);
        setCollections([]);
      })
      .finally(() => setLoading(false));
  }, [user, selectedCollection, brandFilters, styleFilters, weatherFilter, occasionFilter, dressCodeFilter, priceRange]);

  const handleDelete = async (savedOutfitId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to remove this outfit from your favorites?")) return;

    setActionLoading((prev) => ({ ...prev, [savedOutfitId]: true }));
    setErrorMessage("");

    try {
      await deleteSavedOutfit(user.uid, savedOutfitId);
      // Refresh list
      const updated = await getSavedOutfits(user.uid, buildFilters());
      setSavedOutfits(updated);
    } catch (err: any) {
      console.error("Failed to delete outfit:", err);
      setErrorMessage(err?.message || "Failed to delete outfit");
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setActionLoading((prev) => ({ ...prev, [savedOutfitId]: false }));
    }
  };

  const handleTogglePurchased = async (savedOutfitId: string, currentStatus: boolean) => {
    if (!user) return;

    setActionLoading((prev) => ({ ...prev, [savedOutfitId]: true }));
    setErrorMessage("");

    try {
      await updateSavedOutfit(user.uid, savedOutfitId, {
        is_purchased: !currentStatus,
      });
      // Refresh list
      const updated = await getSavedOutfits(user.uid, buildFilters());
      setSavedOutfits(updated);
    } catch (err: any) {
      console.error("Failed to update outfit:", err);
      setErrorMessage(err?.message || "Failed to update outfit");
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setActionLoading((prev) => ({ ...prev, [savedOutfitId]: false }));
    }
  };

  const handleChangeCollection = async (savedOutfitId: string, newCollection: string) => {
    if (!user) return;

    setActionLoading((prev) => ({ ...prev, [savedOutfitId]: true }));
    setErrorMessage("");

    try {
      await updateSavedOutfit(user.uid, savedOutfitId, {
        collection_name: newCollection,
      });
      // Refresh list
      const updated = await getSavedOutfits(user.uid, buildFilters());
      setSavedOutfits(updated);
      const updatedCollections = await getCollections(user.uid);
      setCollections(updatedCollections);
    } catch (err: any) {
      console.error("Failed to update collection:", err);
      setErrorMessage(err?.message || "Failed to update collection");
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setActionLoading((prev) => ({ ...prev, [savedOutfitId]: false }));
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleShare = async (saved: SavedOutfitWithDetailsResponse) => {
    if (!saved.recommendation) return;

    // Generate shareable text
    const rec = saved.recommendation;
    const occasion = rec.occasion || "Outfit";
    const itemCount = rec.items?.length || 0;
    const totalPrice =
      rec.items?.reduce(
        (sum, item) => sum + (typeof item.price === "number" ? item.price : 0),
        0
      ) || 0;

    const shareText = `Check out this ${occasion} outfit from AttireAI! ${itemCount} items for $${totalPrice.toFixed(0)}`;

    // Try native share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AttireAI - ${occasion}`,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        console.log("Share cancelled or failed:", err);
      }
    }

    // Fall back to copying link to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      setErrorMessage("Failed to copy link to clipboard");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col bg-[#FAFAFC] dark:bg-stone-950">
      {/* Background Effects */}
      <div
        className="absolute top-0 right-0 w-full h-full pointer-events-none -z-20 opacity-100 dark:opacity-30"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(11, 85, 99, 0.1) 0%, rgba(255, 255, 255, 0) 60%)",
        }}
      ></div>

      <AppNav />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-cabinet font-extrabold text-gray-900 dark:text-white mb-2">
            Saved Outfits
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your favorite outfit recommendations
          </p>
        </div>

        {/* Collection Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCollection(null)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              selectedCollection === null
                ? "bg-brand text-white"
                : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            All ({savedOutfits.length})
          </button>
          {collections.map((collection) => (
            <button
              key={collection}
              onClick={() => setSelectedCollection(collection)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                selectedCollection === collection
                  ? "bg-brand text-white"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
              }`}
            >
              {collection}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-semibold">Filters</span>
            {(brandFilters.length > 0 || styleFilters.length > 0 || weatherFilter || occasionFilter || dressCodeFilter || priceRange[0] > 0 || priceRange[1] < 1000) && (
              <span className="ml-1 px-2 py-0.5 bg-brand text-white text-xs rounded-full">Active</span>
            )}
          </button>

          {showFilters && (
            <div className="mt-4 p-6 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 space-y-8">
              {/* Target Occasion */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500 flex items-center gap-2">
                    <span>📅</span> Target Occasion
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-stone-500">ONE CHOICE</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_OCCASIONS.map((occasion) => {
                    const isSelected = occasionFilter === occasion;
                    return (
                      <button
                        key={occasion}
                        onClick={() => setOccasionFilter(isSelected ? "" : occasion)}
                        className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                          isSelected
                            ? "bg-brand text-white shadow-md"
                            : "bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-700"
                        }`}
                      >
                        {occasion}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weather & Dress Code - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Weather */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500 flex items-center gap-2">
                    <span>☁️</span> Weather
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_WEATHER.map((weather) => {
                      const isSelected = weatherFilter === weather;
                      return (
                        <button
                          key={weather}
                          onClick={() => setWeatherFilter(isSelected ? "" : weather)}
                          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                            isSelected
                              ? "bg-brand text-white shadow-md"
                              : "bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-700"
                          }`}
                        >
                          {weather}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dress Code */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500 flex items-center gap-2">
                    <span>🛍️</span> Dress Code
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_DRESS_CODES.map((code) => {
                      const isSelected = dressCodeFilter === code;
                      return (
                        <button
                          key={code}
                          onClick={() => setDressCodeFilter(isSelected ? "" : code)}
                          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                            isSelected
                              ? "bg-brand text-white shadow-md"
                              : "bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-700"
                          }`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Preferred Styles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500 flex items-center gap-2">
                    <span>💛</span> Preferred Styles
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-stone-500">SELECT MULTIPLE</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_STYLES.map((style) => {
                    const isSelected = styleFilters.includes(style);
                    return (
                      <button
                        key={style}
                        onClick={() => {
                          if (isSelected) {
                            setStyleFilters((prev) => prev.filter((s) => s !== style));
                          } else {
                            setStyleFilters((prev) => [...prev, style]);
                          }
                        }}
                        className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                          isSelected
                            ? "bg-[#D4AF37] text-white shadow-md"
                            : "bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-700"
                        }`}
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range & Brands */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Price Range */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500">
                      Price Range
                    </h3>
                    <span className="text-sm font-bold text-brand dark:text-brand-400">
                      ${priceRange[0]} - ${priceRange[1]}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-stone-400 mb-2 block">Min: ${priceRange[0]}</label>
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        step={10}
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="w-full accent-brand"
                        style={{
                          WebkitAppearance: "none",
                          height: "4px",
                          background: "#e2e8f0",
                          borderRadius: "2px",
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-stone-400 mb-2 block">Max: ${priceRange[1]}</label>
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        step={10}
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full accent-brand"
                        style={{
                          WebkitAppearance: "none",
                          height: "4px",
                          background: "#e2e8f0",
                          borderRadius: "2px",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Brands */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500">
                    Brands
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {brandFilters.map((brand) => (
                      <span
                        key={brand}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-stone-800 rounded-full text-xs font-bold text-gray-600 dark:text-stone-300 border border-gray-100 dark:border-stone-700"
                      >
                        {brand}
                        <button
                          onClick={() => setBrandFilters((prev) => prev.filter((b) => b !== brand))}
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newBrand.trim()) {
                              setBrandFilters((prev) => [...prev, newBrand.trim()]);
                              setNewBrand("");
                              setShowBrandInput(false);
                            }
                          }}
                          placeholder="Brand name"
                          className="px-3 py-1.5 text-xs border border-brand/30 dark:border-brand/50 rounded-full outline-none focus:border-brand bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300"
                        />
                        <button
                          onClick={() => {
                            if (newBrand.trim()) {
                              setBrandFilters((prev) => [...prev, newBrand.trim()]);
                              setNewBrand("");
                              setShowBrandInput(false);
                            }
                          }}
                          className="text-xs font-bold text-brand dark:text-brand-400 hover:underline"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setShowBrandInput(false)}
                          className="text-xs text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowBrandInput(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-900 rounded-full text-xs font-bold text-brand dark:text-brand-400 border border-brand/20 dark:border-brand/30 hover:bg-brand/5 dark:hover:bg-brand/10"
                      >
                        + Add Brand
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Clear All Filters */}
              <div className="pt-6 border-t border-stone-200 dark:border-stone-800 flex justify-end">
                <button
                  onClick={() => {
                    setBrandFilters([]);
                    setStyleFilters([]);
                    setWeatherFilter("");
                    setOccasionFilter("");
                    setDressCodeFilter("");
                    setPriceRange([0, 1000]);
                  }}
                  className="px-6 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 font-semibold transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedOutfits.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-stone-300 dark:text-stone-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
              />
            </svg>
            <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
              No saved outfits yet
            </h3>
            <p className="text-stone-600 dark:text-stone-400 mb-6">
              Start saving your favorite outfit recommendations to view them here
            </p>
            <button
              onClick={() => router.push("/recommendations")}
              className="bg-brand hover:bg-brand/90 text-white px-6 py-3 rounded-full font-semibold transition-colors"
            >
              Browse Recommendations
            </button>
          </div>
        ) : (
          /* Saved Outfits Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedOutfits.map((saved) => {
              const rec = saved.recommendation;
              if (!rec) return null;

              const displayItem = rec.items?.find((item) => item.image_url) || rec.items?.[0];
              const currentTotalPrice = saved.current_total_price ||
                rec.items?.reduce(
                  (sum, item) => sum + (typeof item.price === "number" ? item.price : 0),
                  0
                ) || 0;
              const originalTotalPrice = saved.original_total_price || 0;
              const priceDropped = saved.price_dropped || false;

              return (
                <div
                  key={saved.id}
                  className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden"
                >
                  <Link href={`/saved-outfits/${saved.id}`} className="block">
                    {/* Image */}
                    <div className="relative aspect-[3/4] bg-stone-100 dark:bg-stone-800 group cursor-pointer">
                      {displayItem?.image_url ? (
                        <img
                          src={displayItem.image_url}
                          alt={displayItem.name || "Outfit"}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).classList.remove(
                                "hidden"
                              );
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`absolute inset-0 flex items-center justify-center text-6xl ${
                          displayItem?.image_url ? "hidden" : ""
                        }`}
                      >
                        {CATEGORY_ICONS[(displayItem?.category || "").toUpperCase()] || "👔"}
                      </div>

                      {/* Price Drop Badge */}
                      {priceDropped && !saved.is_purchased && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                          Price Drop!
                        </div>
                      )}

                      {/* Purchased Badge */}
                      {saved.is_purchased && (
                        <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          Purchased
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-1 group-hover:text-brand transition-colors">
                            {rec.occasion || "Outfit"}
                          </h3>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            Saved {formatDate(saved.created_at)}
                          </p>
                        </div>
                        {priceDropped && originalTotalPrice && currentTotalPrice ? (
                          <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-through">
                              ${originalTotalPrice.toFixed(0)}
                            </div>
                            <div className="text-lg font-bold text-red-500 dark:text-red-400">
                              ${currentTotalPrice.toFixed(0)}
                            </div>
                          </div>
                        ) : currentTotalPrice > 0 ? (
                          <div className="text-lg font-bold text-brand">
                            ${currentTotalPrice.toFixed(0)}
                          </div>
                        ) : null}
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {rec.weather && (
                          <span className="text-xs bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded text-stone-600 dark:text-stone-400">
                            {rec.weather}
                          </span>
                        )}
                        {rec.dress_code && (
                          <span className="text-xs bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded text-stone-600 dark:text-stone-400">
                            {rec.dress_code}
                          </span>
                        )}
                      </div>

                      {/* Item Count */}
                      <p className="text-xs text-stone-500 dark:text-stone-400 text-center">
                        {rec.items?.length || 0} items • Click to view details
                      </p>
                    </div>
                  </Link>

                  {/* Interactive Controls (Outside Link) */}
                  <div className="px-4 pb-4">
                    {/* Collection Selector */}
                    <div className="mb-3">
                      <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                        Collection
                      </label>
                      <select
                        value={saved.collection_name}
                        onChange={(e) => handleChangeCollection(saved.id, e.target.value)}
                        disabled={actionLoading[saved.id]}
                        className="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-white disabled:opacity-50"
                      >
                        <option value="Favorites">Favorites</option>
                        {collections
                          .filter((c) => c !== saved.collection_name)
                          .map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        <option value="__new__">+ New Collection</option>
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePurchased(saved.id, saved.is_purchased)}
                        disabled={actionLoading[saved.id]}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                          saved.is_purchased
                            ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                        }`}
                      >
                        {saved.is_purchased ? "✓ Purchased" : "Mark as Purchased"}
                      </button>
                      <button
                        onClick={() => handleShare(saved)}
                        className="p-2 rounded-lg text-brand hover:bg-brand/10 dark:hover:bg-brand/20 transition-colors"
                        title="Share outfit"
                      >
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
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(saved.id)}
                        disabled={actionLoading[saved.id]}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                        title="Remove from favorites"
                      >
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Share Toast Notification */}
      {showShareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-fade-in">
          <svg
            className="w-5 h-5 text-green-400 dark:text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="font-semibold">Link copied to clipboard!</span>
        </div>
      )}

      {/* Error Toast Notification */}
      {errorMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
