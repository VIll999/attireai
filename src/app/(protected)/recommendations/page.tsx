"use client";

import { useMemo, useState } from "react";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { getAIRecommendations, AIRecommendationItem, AIRecommendationResponse } from "@/lib/api";

const OCCASIONS = [
  { value: "casual", label: "Casual" },
  { value: "work", label: "Work" },
  { value: "date", label: "Date" },
  { value: "formal", label: "Formal" },
  { value: "sport", label: "Sport" },
] as const;

const STYLE_TAGS = [
  "minimal",
  "streetwear",
  "classic",
  "smart-casual",
  "athleisure",
  "vintage",
  "preppy",
] as const;

function normalizeCategory(raw?: string | null) {
  const v = (raw || "").toLowerCase();

  if (
    v.includes("top") ||
    v.includes("shirt") ||
    v.includes("hoodie") ||
    v.includes("sweater") ||
    v.includes("outer") ||
    v.includes("jacket") ||
    v.includes("coat")
  )
    return "Top";

  if (v.includes("bottom") || v.includes("pants") || v.includes("jeans") || v.includes("skirt") || v.includes("short"))
    return "Bottom";

  if (v.includes("shoe") || v.includes("sneaker") || v.includes("boot") || v.includes("loafer"))
    return "Shoes";

  if (v.includes("access") || v.includes("bag") || v.includes("watch") || v.includes("belt") || v.includes("hat"))
    return "Accessories";

  if (["top", "tops", "upper"].includes(v)) return "Top";
  if (["bottom", "bottoms", "lower"].includes(v)) return "Bottom";
  if (["shoes", "shoe", "footwear"].includes(v)) return "Shoes";
  if (["accessories", "accessory"].includes(v)) return "Accessories";

  return "Other";
}

function groupItems(items: AIRecommendationItem[]) {
  const buckets: Record<string, AIRecommendationItem[]> = {
    Top: [],
    Bottom: [],
    Shoes: [],
    Accessories: [],
    Other: [],
  };

  for (const it of items) {
    buckets[normalizeCategory(it.category)].push(it);
  }
  return buckets;
}

function pickBestUrl(it: AIRecommendationItem): string | null {
  if (it.purchase_url) return it.purchase_url;
  if (it.source_urls && it.source_urls.length > 0) return it.source_urls[0];
  return null;
}

export default function RecommendationsPage() {
  const { user, dbUser } = useAuth();
  useLocale();

  const [occasion, setOccasion] = useState<(typeof OCCASIONS)[number]["value"]>("casual");
  const [budget, setBudget] = useState<number>(200);
  const [gender, setGender] = useState<string>("unisex");
  const [selectedStyles, setSelectedStyles] = useState<string[]>(["minimal"]);

  const [location, setLocation] = useState<string>("");
  const [weather, setWeather] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AIRecommendationResponse | null>(null);

  const grouped = useMemo(() => {
    if (!result?.items?.length) return null;
    return groupItems(result.items);
  }, [result]);

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(style)) return prev.filter((s) => s !== style);
      return [...prev, style];
    });
  };

  const onGetRecommendations = async () => {
    if (!user) return;

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await getAIRecommendations(user.uid, {
        occasion,
        gender,
        budget,
        styles: selectedStyles,
        ...(location.trim() && { location: location.trim() }),
        ...(weather.trim() && { weather: weather.trim() }),
      });
      setResult(data);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to get recommendations.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <AppNav activePage="recommendations" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            Outfit Recommendations
          </h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            Select an occasion and generate a complete outfit (top + bottom + shoes + accessories).
          </p>
        </div>

        {!dbUser ? (
          <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-stone-700 dark:text-stone-300 font-medium">Loading profile...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Occasion */}
              <div>
                <label className="block text-sm font-semibold text-stone-900 dark:text-white">
                  Occasion
                </label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value as any)}
                  className="mt-2 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-stone-900 dark:text-white"
                >
                  {OCCASIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-semibold text-stone-900 dark:text-white">
                  Budget (USD)
                </label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value || 0))}
                  className="mt-2 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-stone-900 dark:text-white"
                />
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Used as a soft constraint; if price is unknown, AI will return price = null.
                </p>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold text-stone-900 dark:text-white">
                  Gender (optional)
                </label>
                <input
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  placeholder="unisex / men / women ..."
                  className="mt-2 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-stone-900 dark:text-white"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-stone-900 dark:text-white">
                  Location (optional)
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder='e.g. "Lafayette, IN"'
                  className="mt-2 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-stone-900 dark:text-white"
                />
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  If provided and weather is empty, backend will auto-resolve current weather via web search.
                </p>
              </div>

              {/* Weather */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-stone-900 dark:text-white">
                  Weather (optional override)
                </label>
                <input
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  placeholder='e.g. "10C rainy" / "32F snow" / leave empty'
                  className="mt-2 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-stone-900 dark:text-white"
                />
              </div>

              {/* Styles */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-stone-900 dark:text-white">
                  Styles
                </label>

                <div className="mt-2 flex flex-wrap gap-2">
                  {STYLE_TAGS.map((tag) => {
                    const active = selectedStyles.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleStyle(tag)}
                        className={[
                          "px-3 py-1.5 rounded-full text-sm font-semibold border",
                          active
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-amber-600",
                        ].join(" ")}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action */}
              <div className="md:col-span-2">
                <button
                  onClick={onGetRecommendations}
                  disabled={isLoading}
                  className="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold px-4 py-2"
                >
                  {isLoading ? "Generating..." : "Get Recommendations"}
                </button>

                {error ? (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                ) : null}

                {result?.recommendation_id ? (
                  <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                    Recommendation ID: {result.recommendation_id}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {grouped ? (
          <div className="space-y-8">
            {Object.entries(grouped).map(([bucket, items]) => {
              if (!items.length) return null;

              return (
                <section key={bucket}>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-3">
                    {bucket}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((it, idx) => {
                      const bestUrl = pickBestUrl(it);
                      const reason = it.reasoning || null;
                      const size = it.recommended_size || null;
                      const color = it.recommended_color || null;

                      return (
                        <div
                          key={`${bucket}-${idx}-${it.name}`}
                          className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden"
                        >
                          {/* Image */}
                          <div className="w-full h-44 bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
                            {it.image_url ? (
                              <img
                                src={it.image_url}
                                alt={it.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-xs text-stone-500 dark:text-stone-400">
                                No image
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-stone-900 dark:text-white line-clamp-2">
                                  {it.name}
                                </p>
                                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                                  {it.brand ? it.brand : "Brand N/A"} ·{" "}
                                  {it.category ? it.category : "Category N/A"}
                                </p>
                              </div>

                              {typeof it.price === "number" ? (
                                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                  {it.currency && it.currency !== "USD" ? `${it.currency} ` : "$"}
                                  {it.price.toFixed(0)}
                                </span>
                              ) : null}
                            </div>

                            {(size || color) && (
                              <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
                                {size ? `Size: ${size}` : ""}
                                {size && color ? " · " : ""}
                                {color ? `Color: ${color}` : ""}
                              </p>
                            )}

                            {reason && (
                              <p className="mt-2 text-sm text-stone-700 dark:text-stone-300 line-clamp-3">
                                {reason}
                              </p>
                            )}

                            {/* Links */}
                            <div className="mt-3 flex items-center justify-between">
                              {bestUrl ? (
                                <a
                                  href={bestUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center text-sm font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                                >
                                  View product →
                                </a>
                              ) : (
                                <span className="text-xs text-stone-500 dark:text-stone-400">
                                  No product link
                                </span>
                              )}

                              {it.source_urls && it.source_urls.length > 0 ? (
                                <span className="text-xs text-stone-500 dark:text-stone-400">
                                  Sources: {it.source_urls.length}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : result && !result.items?.length ? (
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
            <p className="text-stone-700 dark:text-stone-300 font-medium">
              No items returned.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}