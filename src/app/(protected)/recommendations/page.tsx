"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import {
  getMeasurements,
  getColorProfiles,
  getStylePreferences,
  getAIRecommendations,
  MeasurementResponse,
  StylePreferencesData,
  AIRecommendationItem,
  AIRecommendationResponse,
} from "@/lib/api";

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

interface ColorProfileData {
  skin_tone: string | null;
  hair_color: string | null;
  recommended_palette: any;
}

export default function RecommendationsPage() {
  const { user, dbUser } = useAuth();
  useLocale();
  const searchParams = useSearchParams();

  // Profile data
  const [profiles, setProfiles] = useState<MeasurementResponse[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<MeasurementResponse | null>(null);
  const [colorProfile, setColorProfile] = useState<ColorProfileData | null>(null);
  const [stylePrefs, setStylePrefs] = useState<StylePreferencesData | null>(null);
  const [profilesLoading, setProfilesLoading] = useState(true);

  // AI results
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AIRecommendationResponse | null>(null);

  const measurementIdFromUrl = searchParams.get("measurement_id");

  // Fetch all measurement profiles on mount
  useEffect(() => {
    if (!user) return;
    getMeasurements(user.uid)
      .then((data) => {
        setProfiles(data);
        // Auto-select: URL param > primary > first
        const targetId =
          measurementIdFromUrl ||
          data.find((m) => m.is_primary)?.id ||
          data[0]?.id ||
          null;
        setSelectedProfileId(targetId);
      })
      .catch((err) => console.error("Failed to fetch profiles:", err))
      .finally(() => setProfilesLoading(false));
  }, [user, measurementIdFromUrl]);

  // Fetch color profile + style preferences when profile is selected
  useEffect(() => {
    if (!user || !selectedProfileId) return;

    const profile = profiles.find((p) => p.id === selectedProfileId) || null;
    setSelectedProfile(profile);

    // Fetch color profile for this measurement
    getColorProfiles(user.uid, selectedProfileId)
      .then((data) => {
        if (data.length > 0) {
          setColorProfile({
            skin_tone: data[0].skin_tone,
            hair_color: data[0].hair_color,
            recommended_palette: data[0].recommended_palette,
          });
        } else {
          setColorProfile(null);
        }
      })
      .catch(() => setColorProfile(null));

    // Fetch style preferences
    getStylePreferences(user.uid)
      .then((data) => setStylePrefs(data))
      .catch(() => setStylePrefs(null));
  }, [user, selectedProfileId, profiles]);

  const grouped = useMemo(() => {
    if (!result?.items?.length) return null;
    return groupItems(result.items);
  }, [result]);

  const onGetRecommendations = async () => {
    if (!user || !selectedProfileId) return;

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await getAIRecommendations(user.uid, {
        measurement_profile_id: selectedProfileId,
        occasion: stylePrefs?.occasion || undefined,
        weather: stylePrefs?.weather || undefined,
        styles: stylePrefs?.preferred_styles || [],
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

  const formatLabel = (val: string | null | undefined) =>
    val ? val.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <AppNav activePage="recommendations" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            Outfit Recommendations
          </h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            Generate a complete outfit based on your profile and preferences.
          </p>
        </div>

        {profilesLoading || !dbUser ? (
          <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-stone-700 dark:text-stone-300 font-medium">Loading profile data...</p>
            </div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 mb-6">
            <p className="text-stone-700 dark:text-stone-300 font-medium">
              No measurement profiles found. Please{" "}
              <a href="/measurements" className="text-amber-600 hover:underline font-semibold">
                create a profile
              </a>{" "}
              first.
            </p>
          </div>
        ) : (
          <>
            {/* Profile Selector */}
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 mb-6">
              <label className="block text-sm font-semibold text-stone-900 dark:text-white mb-2">
                Measurement Profile
              </label>
              <select
                value={selectedProfileId || ""}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full md:w-auto rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-stone-900 dark:text-white"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.is_primary ? " (Primary)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Profile Summary */}
            {selectedProfile && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Measurements */}
                <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5">
                  <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
                    Measurements
                  </h3>
                  <div className="space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
                    {selectedProfile.height != null && <p>Height: {selectedProfile.height} cm</p>}
                    {selectedProfile.weight != null && <p>Weight: {selectedProfile.weight} kg</p>}
                    {selectedProfile.chest != null && <p>Chest: {selectedProfile.chest} cm</p>}
                    {selectedProfile.waist != null && <p>Waist: {selectedProfile.waist} cm</p>}
                    {selectedProfile.hip != null && <p>Hip: {selectedProfile.hip} cm</p>}
                    {selectedProfile.inseam != null && <p>Inseam: {selectedProfile.inseam} cm</p>}
                    {selectedProfile.shoulder_width != null && <p>Shoulder: {selectedProfile.shoulder_width} cm</p>}
                    {selectedProfile.arm_length != null && <p>Arm: {selectedProfile.arm_length} cm</p>}
                  </div>
                </div>

                {/* Color Profile */}
                <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5">
                  <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
                    Color Profile
                  </h3>
                  {colorProfile ? (
                    <div className="space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
                      <p>Skin Tone: {colorProfile.skin_tone || "—"}</p>
                      <p>Hair Color: {colorProfile.hair_color || "—"}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400">No color analysis yet</p>
                  )}
                </div>

                {/* Style Preferences */}
                <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5">
                  <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
                    Style Preferences
                  </h3>
                  {stylePrefs ? (
                    <div className="space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
                      <p>Occasion: {formatLabel(stylePrefs.occasion)}</p>
                      <p>Weather: {formatLabel(stylePrefs.weather)}</p>
                      <p>Dress Code: {formatLabel(stylePrefs.dress_code)}</p>
                      <p>Budget: {formatLabel(stylePrefs.price_range)}</p>
                      {stylePrefs.preferred_styles.length > 0 && (
                        <p>Styles: {stylePrefs.preferred_styles.join(", ")}</p>
                      )}
                      {stylePrefs.preferred_brands.length > 0 && (
                        <p>Brands: {stylePrefs.preferred_brands.join(", ")}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400">No preferences saved yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 mb-6">
              <button
                onClick={onGetRecommendations}
                disabled={isLoading || !selectedProfileId}
                className="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold px-6 py-2.5"
              >
                {isLoading ? "Generating..." : "Get Recommendations"}
              </button>

              {error && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              {result?.recommendation_id && (
                <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                  Recommendation ID: {result.recommendation_id}
                </p>
              )}
            </div>
          </>
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
