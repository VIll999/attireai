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
  skin_tone_hex: string | null;
  hair_color: string | null;
  hair_color_hex: string | null;
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
            skin_tone_hex: data[0].skin_tone_hex,
            hair_color: data[0].hair_color,
            hair_color_hex: data[0].hair_color_hex,
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
    <div className="min-h-screen relative overflow-x-hidden flex flex-col bg-[#FAFAFC] dark:bg-stone-950">
      {/* Background Glow Effects */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none -z-20 opacity-100 dark:opacity-30" style={{
        background: "radial-gradient(circle at top right, rgba(11, 85, 99, 0.1) 0%, rgba(255, 255, 255, 0) 60%)"
      }}></div>
      <div className="absolute top-[10%] -left-[10%] w-[800px] h-[800px] rounded-full -z-10 pointer-events-none opacity-100 dark:opacity-20" style={{
        background: "linear-gradient(135deg, rgba(11, 85, 99, 0.1) 0%, rgba(212, 175, 55, 0.08) 100%)",
        filter: "blur(100px)"
      }}></div>
      <div className="absolute bottom-[20%] right-[5%] w-[600px] h-[600px] opacity-60 dark:opacity-10 rounded-full -z-10 pointer-events-none" style={{
        background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(11,85,99,0.04) 100%)",
        filter: "blur(100px)"
      }}></div>

      <AppNav activePage="recommendations" />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl lg:text-5xl font-cabinet font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
              Outfit Recommendations
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl">
              Curated wardrobe suggestions based on your unique measurements and color profile.
            </p>
          </div>

          {/* Measurement Profile Dropdown */}
          {!profilesLoading && profiles.length > 0 && (
            <div className="relative min-w-[280px]">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Measurement Profile</label>
              <div className="relative">
                <select
                  value={selectedProfileId || ""}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="flex items-center justify-between w-full bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-xl px-4 py-3.5 shadow-sm hover:border-brand transition-colors appearance-none cursor-pointer font-bold text-gray-900 dark:text-white"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.is_primary ? " (Primary)" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {profilesLoading || !dbUser ? (
          <div className="rounded-3xl shadow-soft p-8 mb-6 dark:!bg-stone-900/80 dark:!border-stone-800" style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.9)"
          }}>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">Loading profile data...</p>
            </div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="rounded-3xl shadow-soft p-8 mb-6 dark:!bg-stone-900/80 dark:!border-stone-800" style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.9)"
          }}>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              No measurement profiles found. Please{" "}
              <a href="/measurements" className="text-brand hover:underline font-bold">
                create a profile
              </a>{" "}
              first.
            </p>
          </div>
        ) : (
          <>
            {/* Profile Summary */}
            {selectedProfile && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Card 1: Measurements */}
                <div className="rounded-[2rem] p-8 shadow-soft relative overflow-hidden group hover:shadow-glow transition-all duration-300 dark:!bg-stone-900/80 dark:!border-stone-800" style={{
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.9)"
                }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 dark:bg-brand/10 rounded-bl-[100px] -z-10 group-hover:bg-brand/10 dark:group-hover:bg-brand/20 transition-colors"></div>
                  <div className="w-14 h-14 rounded-2xl bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-400 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </div>
                  <h2 className="font-cabinet font-bold text-2xl text-gray-900 dark:text-white mb-6">Measurements</h2>
                  <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                    {selectedProfile.height != null && (
                      <div><span className="text-gray-500 dark:text-gray-400 block mb-1">Height</span><span className="font-bold text-gray-900 dark:text-white text-base">{selectedProfile.height} cm</span></div>
                    )}
                    {selectedProfile.weight != null && (
                      <div><span className="text-gray-500 dark:text-gray-400 block mb-1">Weight</span><span className="font-bold text-gray-900 dark:text-white text-base">{selectedProfile.weight} kg</span></div>
                    )}
                    {selectedProfile.chest != null && (
                      <div><span className="text-gray-500 dark:text-gray-400 block mb-1">Chest</span><span className="font-bold text-gray-900 dark:text-white text-base">{selectedProfile.chest} cm</span></div>
                    )}
                    {selectedProfile.waist != null && (
                      <div><span className="text-gray-500 dark:text-gray-400 block mb-1">Waist</span><span className="font-bold text-gray-900 dark:text-white text-base">{selectedProfile.waist} cm</span></div>
                    )}
                    {selectedProfile.hip != null && (
                      <div><span className="text-gray-500 dark:text-gray-400 block mb-1">Hip</span><span className="font-bold text-gray-900 dark:text-white text-base">{selectedProfile.hip} cm</span></div>
                    )}
                    {selectedProfile.inseam != null && (
                      <div><span className="text-gray-500 dark:text-gray-400 block mb-1">Inseam</span><span className="font-bold text-gray-900 dark:text-white text-base">{selectedProfile.inseam} cm</span></div>
                    )}
                    {selectedProfile.shoulder_width != null && (
                      <div><span className="text-gray-500 dark:text-gray-400 block mb-1">Shoulder</span><span className="font-bold text-gray-900 dark:text-white text-base">{selectedProfile.shoulder_width} cm</span></div>
                    )}
                    {selectedProfile.arm_length != null && (
                      <div><span className="text-gray-500 dark:text-gray-400 block mb-1">Arm</span><span className="font-bold text-gray-900 dark:text-white text-base">{selectedProfile.arm_length} cm</span></div>
                    )}
                  </div>
                </div>

                {/* Card 2: Color Profile */}
                <div className="rounded-[2rem] p-8 shadow-soft relative overflow-hidden group hover:shadow-glow transition-all duration-300 dark:!bg-stone-900/80 dark:!border-stone-800" style={{
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.9)"
                }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 dark:bg-accent/20 rounded-bl-[100px] -z-10 group-hover:bg-accent/20 dark:group-hover:bg-accent/30 transition-colors"></div>
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent-500 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
                    </svg>
                  </div>
                  <h2 className="font-cabinet font-bold text-2xl text-gray-900 dark:text-white mb-6">Color Profile</h2>
                  {colorProfile ? (
                    <div className="space-y-6">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block mb-2 text-sm">Skin Tone</span>
                        <div className="flex items-center gap-4">
                          {colorProfile.skin_tone_hex && (
                            <div
                              className="w-10 h-10 rounded-full border-4 border-white dark:border-stone-700 shadow-sm flex-shrink-0"
                              style={{ backgroundColor: colorProfile.skin_tone_hex }}
                            ></div>
                          )}
                          <span className="font-bold text-gray-900 dark:text-white text-base">{colorProfile.skin_tone || "—"}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block mb-2 text-sm">Hair Color</span>
                        <div className="flex items-center gap-4">
                          {colorProfile.hair_color_hex && (
                            <div
                              className="w-10 h-10 rounded-full border-4 border-white dark:border-stone-700 shadow-sm flex-shrink-0"
                              style={{ backgroundColor: colorProfile.hair_color_hex }}
                            ></div>
                          )}
                          <span className="font-bold text-gray-900 dark:text-white text-base">{colorProfile.hair_color || "—"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No color analysis yet</p>
                  )}
                </div>

                {/* Card 3: Style Preferences */}
                <div className="rounded-[2rem] p-8 shadow-soft relative overflow-hidden group hover:shadow-glow transition-all duration-300 dark:!bg-stone-900/80 dark:!border-stone-800" style={{
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.9)"
                }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 dark:bg-brand/10 rounded-bl-[100px] -z-10 group-hover:bg-brand/10 dark:group-hover:bg-brand/20 transition-colors"></div>
                  <div className="w-14 h-14 rounded-2xl bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-400 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>
                  <h2 className="font-cabinet font-bold text-2xl text-gray-900 dark:text-white mb-6">Style Preferences</h2>
                  {stylePrefs ? (
                    <div className="grid grid-cols-1 gap-5 text-sm">
                      <div className="flex justify-between items-center border-b border-gray-100 dark:border-stone-800 pb-2">
                        <span className="text-gray-500 dark:text-gray-400">Occasion</span>
                        <span className="font-bold text-gray-900 dark:text-white">{formatLabel(stylePrefs.occasion)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 dark:border-stone-800 pb-2">
                        <span className="text-gray-500 dark:text-gray-400">Weather</span>
                        <span className="font-bold text-gray-900 dark:text-white">{formatLabel(stylePrefs.weather)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 dark:border-stone-800 pb-2">
                        <span className="text-gray-500 dark:text-gray-400">Dress Code</span>
                        <span className="font-bold text-gray-900 dark:text-white">{formatLabel(stylePrefs.dress_code)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 dark:border-stone-800 pb-2">
                        <span className="text-gray-500 dark:text-gray-400">Budget</span>
                        <span className="font-bold text-brand dark:text-brand-400">{formatLabel(stylePrefs.price_range)}</span>
                      </div>
                      {stylePrefs.preferred_styles && stylePrefs.preferred_styles.length > 0 && (
                        <div className="pt-1">
                          <span className="text-gray-500 dark:text-gray-400 block mb-3">Preferred Styles</span>
                          <div className="flex flex-wrap gap-2">
                            {stylePrefs.preferred_styles.map((style, idx) => (
                              <span key={idx} className="px-3 py-1.5 bg-white dark:bg-stone-800 rounded-full border border-gray-200 dark:border-stone-700 text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm">{style}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No preferences saved yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-center mb-20">
              <button
                onClick={onGetRecommendations}
                disabled={isLoading || !selectedProfileId}
                className="group relative bg-brand text-white px-10 py-5 rounded-full font-bold text-xl hover:bg-brand-600 transition-all shadow-glow hover:shadow-[0_12px_40px_rgba(11,85,99,0.4)] transform hover:-translate-y-1 flex items-center gap-3 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Outfits...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <span>AI Generate Recommendations</span>
                  </>
                )}
              </button>
              {error && <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-3xl font-cabinet font-extrabold text-gray-900 dark:text-white">Past Recommendations</h2>
            </div>

            {pastLoading ? (
              <div className="flex items-center gap-3 p-6">
                <div className="w-5 h-5 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading history...</p>
              </div>
            ) : pastRecs.length === 0 ? (
              <div className="rounded-3xl shadow-soft p-8 dark:!bg-stone-900/80 dark:!border-stone-800" style={{
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.9)"
              }}>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No past recommendations for this profile yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {pastRecs.slice(0, 6).map((rec) => {
                  const displayItem = rec.items?.find(item => item.image_url) || rec.items?.[0];
                  const totalPrice = rec.items?.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price : 0), 0) || 0;

                  return (
                    <div key={rec.id} className="rounded-[2rem] p-4 flex flex-col group hover:shadow-glow transition-all duration-500 cursor-pointer dark:!bg-stone-900/80 dark:!border-stone-800" style={{
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.6)"
                    }} onClick={() => setExpandedRecId(expandedRecId === rec.id ? null : rec.id)}>
                      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-4 bg-gray-100 dark:bg-stone-800">
                        {displayItem?.image_url ? (
                          <img
                            src={displayItem.image_url}
                            alt={displayItem.name || "Product"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).classList.remove("hidden");
                              }
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center text-6xl ${displayItem?.image_url ? "hidden" : ""}`}>
                          {CATEGORY_ICONS[(displayItem?.category || "").toUpperCase()] || "👔"}
                        </div>

                        {/* Rating buttons overlay */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-lg p-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRate(rec.id, "LIKE"); }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              rec.user_rating === "LIKE"
                                ? "text-green-600 bg-green-50 dark:bg-green-900/30"
                                : "text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400"
                            }`}
                            title="Like"
                          >
                            <ThumbUp filled={rec.user_rating === "LIKE"} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRate(rec.id, "DISLIKE"); }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              rec.user_rating === "DISLIKE"
                                ? "text-red-600 bg-red-50 dark:bg-red-900/30"
                                : "text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                            }`}
                            title="Dislike"
                          >
                            <ThumbDown filled={rec.user_rating === "DISLIKE"} />
                          </button>
                        </div>
                      </div>
                      <div className="px-2 pb-2">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <h3 className="font-cabinet font-bold text-xl text-gray-900 dark:text-white leading-tight">
                            {formatLabel(rec.occasion)} {rec.weather ? `· ${formatLabel(rec.weather)}` : ""}
                          </h3>
                          {totalPrice > 0 && (
                            <span className="font-bold text-brand dark:text-brand-400 text-lg">${totalPrice.toFixed(0)}</span>
                          )}
                        </div>
                        {rec.reasoning && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">{rec.reasoning}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {rec.items?.length || 0} items · {formatDate(rec.created_at)}
                        </p>
                        {expandedRecId === rec.id && rec.items && rec.items.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-stone-700 space-y-2">
                            {rec.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-2 text-xs">
                                <span className="text-lg">{CATEGORY_ICONS[(item.category || "").toUpperCase()] || "👔"}</span>
                                <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{item.name}</span>
                                {typeof item.price === "number" && (
                                  <span className="font-semibold text-brand dark:text-brand-400">${item.price.toFixed(0)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
