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
  getOutfitRecommendations,
  rateOutfitRecommendation,
  MeasurementResponse,
  StylePreferencesData,
  AIRecommendationItem,
  AIRecommendationResponse,
  OutfitRecommendationResponse,
} from "@/lib/api";

/* ── helpers ── */

function groupByOutfit(items: AIRecommendationItem[]): Map<number, AIRecommendationItem[]> {
  const map = new Map<number, AIRecommendationItem[]>();
  for (const it of items) {
    const idx = it.outfit_index ?? 0;
    if (!map.has(idx)) map.set(idx, []);
    map.get(idx)!.push(it);
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}

function pickBestUrl(it: AIRecommendationItem): string | null {
  if (it.purchase_url) return it.purchase_url;
  if (it.source_urls && it.source_urls.length > 0) return it.source_urls[0];
  return null;
}

const CATEGORY_ICONS: Record<string, string> = {
  TOP: "👕", BOTTOM: "👖", SHOES: "👟", ACCESSORY: "⌚", OUTERWEAR: "🧥",
};

function budgetFromPriceRange(range?: string | null): number | undefined {
  if (!range) return undefined;
  const map: Record<string, number> = { BUDGET: 50, MID_RANGE: 150, LUXURY: 500 };
  return map[range];
}

interface ColorProfileData {
  skin_tone: string | null;
  hair_color: string | null;
  recommended_palette: any;
}

/* ── thumbs icons ── */

function ThumbUp({ filled }: { filled: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
    </svg>
  );
}

function ThumbDown({ filled }: { filled: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.31-.269 2.558-.754 3.692-.146.342.076.726.45.726h.908c.889 0 1.713-.518 1.972-1.368a12 12 0 0 0 .521-3.507c0-1.553-.295-3.036-.831-4.398-.306-.774-1.086-1.227-1.918-1.227h-1.053c-.472 0-.745.556-.5.96a8.95 8.95 0 0 1 .303.54" />
    </svg>
  );
}

/* ── main component ── */

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

  // AI results (new generation)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AIRecommendationResponse | null>(null);
  const [freshRatings, setFreshRatings] = useState<Record<string, string>>({});

  // Past recommendations
  const [pastRecs, setPastRecs] = useState<OutfitRecommendationResponse[]>([]);
  const [pastLoading, setPastLoading] = useState(false);
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);

  const measurementIdFromUrl = searchParams.get("measurement_id");

  // Fetch all measurement profiles on mount
  useEffect(() => {
    if (!user) return;
    getMeasurements(user.uid)
      .then((data) => {
        setProfiles(data);
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

  // Fetch color profile + style preferences + past recommendations when profile is selected
  useEffect(() => {
    if (!user || !selectedProfileId) return;

    const profile = profiles.find((p) => p.id === selectedProfileId) || null;
    setSelectedProfile(profile);

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

    getStylePreferences(user.uid)
      .then((data) => setStylePrefs(data))
      .catch(() => setStylePrefs(null));

    // Fetch past recommendations for this profile
    setPastLoading(true);
    getOutfitRecommendations(user.uid, selectedProfileId)
      .then((data) => setPastRecs(data))
      .catch(() => setPastRecs([]))
      .finally(() => setPastLoading(false));
  }, [user, selectedProfileId, profiles]);

  const outfitGroups = useMemo(() => {
    if (!result?.items?.length) return null;
    return groupByOutfit(result.items);
  }, [result]);

  const onGetRecommendations = async () => {
    if (!user || !selectedProfileId) return;

    setIsLoading(true);
    setError("");
    setResult(null);
    setFreshRatings({});

    try {
      const data = await getAIRecommendations(user.uid, {
        measurement_profile_id: selectedProfileId,
        occasion: stylePrefs?.occasion || undefined,
        weather: stylePrefs?.weather || undefined,
        dress_code: stylePrefs?.dress_code || undefined,
        styles: stylePrefs?.preferred_styles || [],
        budget: budgetFromPriceRange(stylePrefs?.price_range),
        currency: "USD",
      });
      setResult(data);

      // Refresh past recommendations to include the new one
      getOutfitRecommendations(user.uid, selectedProfileId)
        .then((recs) => setPastRecs(recs))
        .catch(() => {});
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to get recommendations.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (recId: string, rating: "LIKE" | "DISLIKE") => {
    if (!user) return;
    // Toggle: if already rated with same value, set to NONE
    const rec = pastRecs.find((r) => r.id === recId);
    const newRating = rec?.user_rating === rating ? "NONE" : rating;

    // Optimistic update
    setPastRecs((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, user_rating: newRating } : r))
    );

    try {
      await rateOutfitRecommendation(user.uid, recId, newRating);
    } catch {
      // Revert on failure
      setPastRecs((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, user_rating: rec?.user_rating ?? null } : r))
      );
    }
  };

  const handleRateFresh = async (recId: string, rating: "LIKE" | "DISLIKE") => {
    if (!user) return;
    const current = freshRatings[recId];
    const newRating = current === rating ? "NONE" : rating;

    setFreshRatings((prev) => ({ ...prev, [recId]: newRating }));
    // Also update past recs optimistically (since the rec is in pastRecs too)
    setPastRecs((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, user_rating: newRating } : r))
    );

    try {
      await rateOutfitRecommendation(user.uid, recId, newRating as "LIKE" | "DISLIKE" | "NONE");
    } catch {
      setFreshRatings((prev) => ({ ...prev, [recId]: current || "NONE" }));
      setPastRecs((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, user_rating: current ?? null } : r))
      );
    }
  };

  if (!user) return null;

  const formatLabel = (val: string | null | undefined) =>
    val ? val.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <AppNav activePage="recommendations" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            Outfit Recommendations
          </h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            Generate complete outfit combinations based on your profile and preferences.
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
                <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5">
                  <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Measurements</h3>
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

                <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5">
                  <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Color Profile</h3>
                  {colorProfile ? (
                    <div className="space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
                      <p>Skin Tone: {colorProfile.skin_tone || "—"}</p>
                      <p>Hair Color: {colorProfile.hair_color || "—"}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400">No color analysis yet</p>
                  )}
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5">
                  <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Style Preferences</h3>
                  {stylePrefs ? (
                    <div className="space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
                      <p>Occasion: {formatLabel(stylePrefs.occasion)}</p>
                      <p>Weather: {formatLabel(stylePrefs.weather)}</p>
                      <p>Dress Code: {formatLabel(stylePrefs.dress_code)}</p>
                      <p>Budget: {formatLabel(stylePrefs.price_range)}</p>
                      {stylePrefs.preferred_styles.length > 0 && <p>Styles: {stylePrefs.preferred_styles.join(", ")}</p>}
                      {stylePrefs.preferred_brands.length > 0 && <p>Brands: {stylePrefs.preferred_brands.join(", ")}</p>}
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
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating Outfits...
                  </>
                ) : (
                  "Get Recommendations"
                )}
              </button>
              {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
          </>
        )}

        {/* New AI Results — grouped by outfit */}
        {outfitGroups && (
          <div className="space-y-6 mb-12">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-stone-900 dark:text-white">Your Outfits</h2>
              <button
                onClick={onGetRecommendations}
                disabled={isLoading}
                className="text-sm font-semibold text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50"
              >
                Request New Recommendations
              </button>
            </div>

            {[...outfitGroups.entries()].map(([outfitIdx, items]) => {
              const reasoning = items[0]?.reasoning;
              const recId = result?.recommendation_ids?.[outfitIdx];
              const freshRating = recId ? freshRatings[recId] : undefined;
              return (
                <div key={outfitIdx} className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                  {/* Outfit header */}
                  <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                        Outfit {outfitIdx + 1}
                      </h3>
                      {reasoning && (
                        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">{reasoning}</p>
                      )}
                    </div>
                    {recId && (
                      <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                        <button
                          onClick={() => handleRateFresh(recId, "LIKE")}
                          className={`p-1.5 rounded-lg transition-colors ${
                            freshRating === "LIKE"
                              ? "text-green-600 bg-green-50 dark:bg-green-900/30"
                              : "text-stone-400 hover:text-green-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                          }`}
                          title="Like this outfit"
                        >
                          <ThumbUp filled={freshRating === "LIKE"} />
                        </button>
                        <button
                          onClick={() => handleRateFresh(recId, "DISLIKE")}
                          className={`p-1.5 rounded-lg transition-colors ${
                            freshRating === "DISLIKE"
                              ? "text-red-600 bg-red-50 dark:bg-red-900/30"
                              : "text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                          }`}
                          title="Dislike this outfit"
                        >
                          <ThumbDown filled={freshRating === "DISLIKE"} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Items grid */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {items.map((it, idx) => {
                        const bestUrl = pickBestUrl(it);
                        const catUpper = (it.category || "").toUpperCase();
                        return (
                          <div key={`${outfitIdx}-${idx}`} className="rounded-lg border border-stone-100 dark:border-stone-800 overflow-hidden bg-stone-50 dark:bg-stone-800/30">
                            <div className="w-full h-36 bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
                              {it.image_url ? (
                                <img
                                  src={it.image_url}
                                  alt={it.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }}
                                />
                              ) : null}
                              <span className={`text-3xl ${it.image_url ? "hidden" : ""}`}>{CATEGORY_ICONS[catUpper] || "👔"}</span>
                            </div>
                            <div className="p-3">
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                {it.category || "Item"}
                              </p>
                              <p className="font-semibold text-sm text-stone-900 dark:text-white mt-0.5 line-clamp-2">{it.name}</p>
                              <p className="text-xs text-stone-500 mt-0.5">{it.brand || "Brand N/A"}</p>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2">
                                  {typeof it.price === "number" && (
                                    <span className="text-sm font-semibold text-stone-900 dark:text-white">${it.price.toFixed(0)}</span>
                                  )}
                                  {it.recommended_size && (
                                    <span className="text-xs bg-stone-200 dark:bg-stone-700 px-1.5 py-0.5 rounded text-stone-600 dark:text-stone-300">
                                      {it.recommended_size}
                                    </span>
                                  )}
                                </div>
                                {bestUrl && (
                                  <a href={bestUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline">
                                    View
                                  </a>
                                )}
                              </div>
                              {it.recommended_color && (
                                <p className="text-xs text-stone-500 mt-1">Color: {it.recommended_color}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {result && !result.items?.length && (
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 mb-12">
            <p className="text-stone-700 dark:text-stone-300 font-medium">No outfits returned. Try adjusting your preferences.</p>
          </div>
        )}

        {/* Past Recommendations */}
        {!profilesLoading && profiles.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-4">Past Recommendations</h2>

            {pastLoading ? (
              <div className="flex items-center gap-3 p-6">
                <div className="w-5 h-5 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-stone-500 text-sm">Loading history...</p>
              </div>
            ) : pastRecs.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
                <p className="text-stone-500 text-sm">No past recommendations for this profile yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastRecs.map((rec) => (
                  <div key={rec.id} className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                    {/* Header - always visible */}
                    <div className="flex items-center">
                      <button
                        onClick={() => setExpandedRecId(expandedRecId === rec.id ? null : rec.id)}
                        className="flex-1 px-6 py-4 flex items-center justify-between text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="text-amber-700 dark:text-amber-400 font-bold text-sm">{rec.items?.length || 0}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-stone-900 dark:text-white truncate">
                              {formatLabel(rec.occasion)} · {formatLabel(rec.weather)}
                              {rec.dress_code ? ` · ${formatLabel(rec.dress_code)}` : ""}
                            </p>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                              {formatDate(rec.created_at)} · {rec.items?.length || 0} items
                              {rec.reasoning && <span> · {rec.reasoning}</span>}
                            </p>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-stone-400 transition-transform ${expandedRecId === rec.id ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Rating buttons */}
                      <div className="flex items-center gap-1 pr-4">
                        <button
                          onClick={() => handleRate(rec.id, "LIKE")}
                          className={`p-1.5 rounded-lg transition-colors ${
                            rec.user_rating === "LIKE"
                              ? "text-green-600 bg-green-50 dark:bg-green-900/30"
                              : "text-stone-400 hover:text-green-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                          }`}
                          title="Like"
                        >
                          <ThumbUp filled={rec.user_rating === "LIKE"} />
                        </button>
                        <button
                          onClick={() => handleRate(rec.id, "DISLIKE")}
                          className={`p-1.5 rounded-lg transition-colors ${
                            rec.user_rating === "DISLIKE"
                              ? "text-red-600 bg-red-50 dark:bg-red-900/30"
                              : "text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                          }`}
                          title="Dislike"
                        >
                          <ThumbDown filled={rec.user_rating === "DISLIKE"} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded items */}
                    {expandedRecId === rec.id && rec.items && rec.items.length > 0 && (
                      <div className="border-t border-stone-200 dark:border-stone-800 px-6 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {rec.items.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50">
                              <div className="w-14 h-14 rounded-lg bg-stone-200 dark:bg-stone-700 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }}
                                  />
                                ) : null}
                                <span className={`text-xl ${item.image_url ? "hidden" : ""}`}>{CATEGORY_ICONS[(item.category || "").toUpperCase()] || "👔"}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-stone-900 dark:text-white line-clamp-1">{item.name}</p>
                                <p className="text-xs text-stone-500 mt-0.5">
                                  {item.brand || "Brand N/A"} · {item.category || "N/A"}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {typeof item.price === "number" && (
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">${item.price.toFixed(0)}</span>
                                  )}
                                  {item.recommended_size && (
                                    <span className="text-xs text-stone-500">Size: {item.recommended_size}</span>
                                  )}
                                </div>
                                {item.purchase_url && (
                                  <a href={item.purchase_url} target="_blank" rel="noreferrer" className="text-xs text-amber-600 hover:underline mt-1 inline-block">
                                    View product
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
