"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import {
  getMeasurements,
  getColorProfiles,
  getStylePreferences,
  getAIRecommendations,
  getOutfitRecommendations,
  rateRecommendation,
  deleteRating,
  getAlternativeItems,
  AlternativeItemsRequest,
  MeasurementResponse,
  StylePreferencesData,
  AIRecommendationItem,
  AIRecommendationResponse,
  OutfitRecommendationResponse,
  saveOutfit,
  deleteSavedOutfit,
  getSavedOutfits,
  SavedOutfitWithDetailsResponse,
  getMyUsage,
  UsageStatus,
  getWardrobe,
  WardrobeItem,
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
  if (filled) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398.306-.774 1.086-1.227 1.918-1.227h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
    </svg>
  );
}

function ThumbDown({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M15.73 5.25h1.035A7.465 7.465 0 0118 9.375a7.465 7.465 0 01-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 01-.75.75 2.25 2.25 0 01-2.25-2.25c0-1.152.26-2.243.723-3.218C7.74 15.724 7.366 15 6.748 15H3.622c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 011.5 12c0-2.848.992-5.464 2.649-7.521.388-.482.987-.729 1.605-.729H9.77a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23zM21.669 13.773c.536-1.362.831-2.845.831-4.398 0-1.22-.182-2.398-.52-3.507-.26-.85-1.084-1.368-1.973-1.368H19.1c-.445 0-.72.498-.523.898.591 1.2.924 2.55.924 3.977a8.959 8.959 0 01-1.302 4.666c-.245.403.028.959.5.959h1.053c.832 0 1.612-.453 1.918-1.227z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 00.303-.54m.023-8.25H16.48a4.5 4.5 0 01-1.423-.23l-3.114-1.04a4.5 4.5 0 00-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 002.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.5a2.25 2.25 0 002.25 2.25.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 00.303-.54" />
    </svg>
  );
}

/* ── main component ── */

export default function RecommendationsPage() {
  const { user, dbUser } = useAuth();
  useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();

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

  // Alternative items state
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{outfitIdx: number; itemIdx: number; item: AIRecommendationItem} | null>(null);
  const [alternatives, setAlternatives] = useState<AIRecommendationItem[]>([]);

  // Saved outfits state
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfitWithDetailsResponse[]>([]);
  const [savingOutfits, setSavingOutfits] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string>("");

  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [pinnedItem, setPinnedItem] = useState<WardrobeItem | null>(null);

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

  // Fetch saved outfits when user changes
  useEffect(() => {
    if (!user) return;
    getSavedOutfits(user.uid)
      .then((data) => setSavedOutfits(data))
      .catch(() => setSavedOutfits([]));
  }, [user]);

  // Fetch daily usage status
  const refreshUsage = () => {
    if (!user) return;
    getMyUsage(user.uid)
      .then((u) => {
        setUsage(u);
        if (!u.is_vip && u.daily_remaining !== null && u.daily_remaining <= 0) {
          setLimitReached(true);
        }
      })
      .catch(() => {});
  };
  useEffect(() => {
    refreshUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const outfitGroups = useMemo(() => {
    if (!result?.items?.length) return null;
    return groupByOutfit(result.items);
  }, [result]);

  const pinnedItemId = searchParams.get("pin") || undefined;

  useEffect(() => {
    if (!user || !pinnedItemId) {
      setPinnedItem(null);
      return;
    }
    getWardrobe(user.uid)
      .then((w) => {
        const found = w.items.find((it) => it.id === pinnedItemId) || null;
        setPinnedItem(found);
      })
      .catch(() => setPinnedItem(null));
  }, [user, pinnedItemId]);

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
        pinned_item_id: pinnedItemId,
      });
      setResult(data);
      refreshUsage();

      // Refresh past recommendations to include the new one
      getOutfitRecommendations(user.uid, selectedProfileId)
        .then((recs) => setPastRecs(recs))
        .catch(() => {});
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Failed to get recommendations.";
      if (msg === "DAILY_LIMIT_REACHED") {
        setLimitReached(true);
        refreshUsage();
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (recId: string, rating: "LIKE" | "DISLIKE") => {
    if (!user) return;
    // Toggle: if already rated with same value, remove rating
    const rec = pastRecs.find((r) => r.id === recId);
    const isToggle = rec?.user_rating === rating;
    const newRating = isToggle ? "NONE" : rating;

    // Optimistic update
    setPastRecs((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, user_rating: newRating } : r))
    );

    try {
      if (isToggle) {
        // Delete rating
        await deleteRating(user.uid, recId);
      } else {
        // Create/update rating
        await rateRecommendation(user.uid, recId, rating);
      }
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
    const isToggle = current === rating;
    const newRating = isToggle ? "NONE" : rating;

    setFreshRatings((prev) => ({ ...prev, [recId]: newRating }));
    // Also update past recs optimistically (since the rec is in pastRecs too)
    setPastRecs((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, user_rating: newRating } : r))
    );

    try {
      if (isToggle) {
        // Delete rating
        await deleteRating(user.uid, recId);
      } else {
        // Create/update rating
        await rateRecommendation(user.uid, recId, rating);
      }
    } catch {
      setFreshRatings((prev) => ({ ...prev, [recId]: current || "NONE" }));
      setPastRecs((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, user_rating: current ?? null } : r))
      );
    }
  };

  const handleShowAlternatives = async (outfitIdx: number, itemIdx: number, item: AIRecommendationItem) => {
    if (!user || !item.category) return;

    setSelectedItem({outfitIdx, itemIdx, item});
    setShowAlternatives(true);
    setAlternativesLoading(true);
    setAlternatives([]);

    try {
      const reqData: AlternativeItemsRequest = {
        measurement_profile_id: selectedProfileId || undefined,
        category: item.category,
        occasion: stylePrefs?.occasion || undefined,
        weather: stylePrefs?.weather || undefined,
        dress_code: stylePrefs?.dress_code || undefined,
        budget: budgetFromPriceRange(stylePrefs?.price_range),
        currency: "USD",
        styles: stylePrefs?.preferred_styles || [],
        original_item_name: item.name,
        original_item_brand: item.brand || undefined,
        num_alternatives: 5,
      };

      const response = await getAlternativeItems(user.uid, reqData);
      setAlternatives(response.items);
    } catch (err: any) {
      console.error("Failed to get alternatives:", err);
      setAlternatives([]);
    } finally {
      setAlternativesLoading(false);
    }
  };

  const handleSelectAlternative = (alternative: AIRecommendationItem) => {
    if (!selectedItem || !result) return;

    // Update the outfit with the selected alternative
    setResult((prev) => {
      if (!prev) return prev;

      const newItems = [...prev.items];
      const targetItemIndex = newItems.findIndex(
        (it) => it.outfit_index === selectedItem.outfitIdx && it.category === selectedItem.item.category
      );

      if (targetItemIndex >= 0) {
        newItems[targetItemIndex] = {
          ...alternative,
          outfit_index: selectedItem.outfitIdx,
          reasoning: selectedItem.item.reasoning,
        };
      }

      return { ...prev, items: newItems };
    });

    // Close the modal
    setShowAlternatives(false);
    setSelectedItem(null);
    setAlternatives([]);
  };

  // Check if an outfit is saved
  const isOutfitSaved = (recommendationId: string): boolean => {
    return savedOutfits.some((saved) => saved.recommendation_id === recommendationId);
  };

  // Get saved outfit entry for a recommendation
  const getSavedOutfitEntry = (recommendationId: string): SavedOutfitWithDetailsResponse | undefined => {
    return savedOutfits.find((saved) => saved.recommendation_id === recommendationId);
  };

  // Handle save outfit
  const handleSaveOutfit = async (recommendationId: string) => {
    if (!user || !recommendationId) return;

    setSavingOutfits((prev) => new Set(prev).add(recommendationId));
    setSaveError("");

    try {
      await saveOutfit(user.uid, {
        recommendation_id: recommendationId,
        collection_name: "Favorites",
      });

      // Refresh saved outfits list
      const updated = await getSavedOutfits(user.uid);
      setSavedOutfits(updated);
    } catch (err: any) {
      console.error("Failed to save outfit:", err);
      setSaveError(err?.message || "Failed to save outfit");
      setTimeout(() => setSaveError(""), 5000);
    } finally {
      setSavingOutfits((prev) => {
        const newSet = new Set(prev);
        newSet.delete(recommendationId);
        return newSet;
      });
    }
  };

  // Handle unsave outfit
  const handleUnsaveOutfit = async (recommendationId: string) => {
    if (!user || !recommendationId) return;

    const savedEntry = getSavedOutfitEntry(recommendationId);
    if (!savedEntry) return;

    setSavingOutfits((prev) => new Set(prev).add(recommendationId));
    setSaveError("");

    try {
      await deleteSavedOutfit(user.uid, savedEntry.id);

      // Refresh saved outfits list
      const updated = await getSavedOutfits(user.uid);
      setSavedOutfits(updated);
    } catch (err: any) {
      console.error("Failed to unsave outfit:", err);
      setSaveError(err?.message || "Failed to unsave outfit");
      setTimeout(() => setSaveError(""), 5000);
    } finally {
      setSavingOutfits((prev) => {
        const newSet = new Set(prev);
        newSet.delete(recommendationId);
        return newSet;
      });
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

      <AppNav />

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

            {/* Pinned wardrobe item banner (Story #6) */}
            {pinnedItem && (
              <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-brand/5 dark:bg-brand/10 border border-brand/20 flex items-center gap-3">
                {pinnedItem.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pinnedItem.image_url}
                    alt={pinnedItem.name}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-2xl flex-shrink-0">
                    🧺
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-brand uppercase tracking-wide">
                    Building around your wardrobe item
                  </div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {pinnedItem.name}
                  </div>
                  <div className="text-xs text-stone-500 truncate">
                    {pinnedItem.brand || "—"} · {pinnedItem.category || "OTHER"}
                  </div>
                </div>
                <button
                  onClick={() => router.push("/recommendations")}
                  className="text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:underline flex-shrink-0"
                >
                  Clear pin
                </button>
              </div>
            )}

            {/* Usage / Limit banner */}
            {usage && !usage.is_vip && (
              <div className="max-w-2xl mx-auto mb-6">
                {limitReached ? (
                  <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                    <div className="text-2xl">✨</div>
                    <div className="flex-1">
                      <div className="font-semibold text-amber-900 dark:text-amber-200">Daily limit reached</div>
                      <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                        You&apos;ve used all {usage.daily_limit} free recommendations today. Upgrade to VIP for unlimited access, or come back tomorrow.
                      </p>
                      <Link
                        href="/vip"
                        className="inline-block mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
                      >
                        Upgrade to VIP
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-sm text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>
                      <span className="font-medium">{usage.daily_remaining}</span> of {usage.daily_limit} free recommendations left today
                    </span>
                    <Link href="/vip" className="text-brand hover:underline font-medium">
                      Go VIP →
                    </Link>
                  </div>
                )}
              </div>
            )}
            {usage?.is_vip && (
              <div className="max-w-2xl mx-auto mb-6">
                <div className="p-3 rounded-lg bg-gradient-to-r from-brand/10 to-amber-100/50 dark:from-brand/20 dark:to-amber-900/20 border border-brand/20 text-sm text-stone-700 dark:text-stone-200 flex items-center gap-2">
                  <span>✨</span>
                  <span className="font-medium">VIP — unlimited recommendations</span>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-center mb-20">
              <button
                onClick={onGetRecommendations}
                disabled={isLoading || !selectedProfileId || limitReached}
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
                disabled={isLoading || limitReached}
                className="group relative bg-brand/10 hover:bg-brand dark:bg-brand/20 dark:hover:bg-brand text-brand hover:text-white dark:text-brand-400 dark:hover:text-white px-6 py-3 rounded-full font-bold text-sm transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{limitReached ? "Daily limit reached" : "Request New Recommendations"}</span>
              </button>
            </div>

            {[...outfitGroups.entries()].map(([outfitIdx, items]) => {
              const reasoning = items[0]?.reasoning;
              const recId = result?.recommendation_ids?.[outfitIdx];
              const freshRating = recId ? freshRatings[recId] : undefined;
              const outfitTotalPrice = items.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price : 0), 0);
              return (
                <div key={outfitIdx} className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                  {/* Outfit header */}
                  <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-1">
                        <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                          Outfit {outfitIdx + 1}
                        </h3>
                        {outfitTotalPrice > 0 && (
                          <span className="text-lg font-bold text-brand dark:text-brand-400">
                            ${outfitTotalPrice.toFixed(0)}
                          </span>
                        )}
                      </div>
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
                        <button
                          onClick={() => {
                            if (isOutfitSaved(recId)) {
                              handleUnsaveOutfit(recId);
                            } else {
                              handleSaveOutfit(recId);
                            }
                          }}
                          disabled={savingOutfits.has(recId)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isOutfitSaved(recId)
                              ? "text-amber-600 bg-amber-50 dark:bg-amber-900/30"
                              : "text-stone-400 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={isOutfitSaved(recId) ? "Unsave outfit" : "Save outfit to favorites"}
                        >
                          {savingOutfits.has(recId) ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill={isOutfitSaved(recId) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isOutfitSaved(recId) ? 0 : 1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                            </svg>
                          )}
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
                              {it.stock_status && it.stock_status !== "UNKNOWN" && (
                                <div className="mt-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                    it.stock_status === "IN_STOCK"
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                      : it.stock_status === "LOW_STOCK"
                                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                  }`}>
                                    {it.stock_status === "IN_STOCK" ? "✓ In Stock" : it.stock_status === "LOW_STOCK" ? "⚠ Low Stock" : "✕ Out of Stock"}
                                  </span>
                                </div>
                              )}
                              {it.recommended_color && (
                                <p className="text-xs text-stone-500 mt-1">Color: {it.recommended_color}</p>
                              )}
                              {/* Show Alternatives Button */}
                              <button
                                onClick={() => handleShowAlternatives(outfitIdx, idx, it)}
                                className="mt-3 w-full py-2 px-3 bg-brand/10 hover:bg-brand/20 dark:bg-brand/20 dark:hover:bg-brand/30 text-brand dark:text-brand-400 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Show Alternatives
                              </button>
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isOutfitSaved(rec.id)) {
                                handleUnsaveOutfit(rec.id);
                              } else {
                                handleSaveOutfit(rec.id);
                              }
                            }}
                            disabled={savingOutfits.has(rec.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isOutfitSaved(rec.id)
                                ? "text-amber-600 bg-amber-50 dark:bg-amber-900/30"
                                : "text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isOutfitSaved(rec.id) ? "Unsave outfit" : "Save outfit to favorites"}
                          >
                            {savingOutfits.has(rec.id) ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill={isOutfitSaved(rec.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isOutfitSaved(rec.id) ? 0 : 1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                              </svg>
                            )}
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
                            {rec.items.map((item) => {
                              const itemUrl = pickBestUrl(item);
                              return (
                                <div key={item.id} className="flex items-center gap-2 text-xs group">
                                  <span className="text-lg">{CATEGORY_ICONS[(item.category || "").toUpperCase()] || "👔"}</span>
                                  <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{item.name}</span>
                                  <div className="flex items-center gap-2">
                                    {item.recommended_size && (
                                      <span className="text-xs bg-stone-200 dark:bg-stone-700 px-2 py-0.5 rounded text-stone-600 dark:text-stone-300">
                                        {item.recommended_size}
                                      </span>
                                    )}
                                    {typeof item.price === "number" && (
                                      <span className="font-semibold text-brand dark:text-brand-400">${item.price.toFixed(0)}</span>
                                    )}
                                    {itemUrl && (
                                      <a
                                        href={itemUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-brand dark:text-brand-400 hover:underline font-semibold"
                                      >
                                        View
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
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

        {/* Alternatives Modal */}
        {showAlternatives && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAlternatives(false)}>
            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-stone-200 dark:border-stone-800" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-stone-900 dark:text-white">
                    Alternative {selectedItem?.item.category} Items
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                    Replacing: {selectedItem?.item.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowAlternatives(false)}
                  className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                {alternativesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                    <p className="ml-3 text-stone-600 dark:text-stone-400">Finding alternatives...</p>
                  </div>
                ) : alternatives.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-stone-600 dark:text-stone-400">No alternative items found. Try different preferences.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {alternatives.map((alt, idx) => {
                      const altUrl = pickBestUrl(alt);
                      const catUpper = (alt.category || "").toUpperCase();
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden hover:shadow-lg hover:border-brand dark:hover:border-brand transition-all cursor-pointer group"
                          onClick={() => handleSelectAlternative(alt)}
                        >
                          <div className="w-full h-48 bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
                            {alt.image_url ? (
                              <img
                                src={alt.image_url}
                                alt={alt.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }}
                              />
                            ) : null}
                            <span className={`text-5xl ${alt.image_url ? "hidden" : ""}`}>{CATEGORY_ICONS[catUpper] || "👔"}</span>
                          </div>
                          <div className="p-4 bg-white dark:bg-stone-900">
                            <p className="text-xs font-medium text-brand dark:text-brand-400 uppercase tracking-wider">
                              {alt.category || "Item"}
                            </p>
                            <p className="font-semibold text-sm text-stone-900 dark:text-white mt-1 line-clamp-2">{alt.name}</p>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{alt.brand || "Brand N/A"}</p>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                {typeof alt.price === "number" && (
                                  <span className="text-base font-bold text-stone-900 dark:text-white">${alt.price.toFixed(0)}</span>
                                )}
                                {alt.recommended_size && (
                                  <span className="text-xs bg-stone-200 dark:bg-stone-700 px-2 py-0.5 rounded text-stone-600 dark:text-stone-300">
                                    {alt.recommended_size}
                                  </span>
                                )}
                              </div>
                              {altUrl && (
                                <a
                                  href={altUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-brand dark:text-brand-400 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View
                                </a>
                              )}
                            </div>
                            {alt.recommended_color && (
                              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">Color: {alt.recommended_color}</p>
                            )}
                            <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                              <button className="w-full py-2 bg-brand hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-colors">
                                Select This Item
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Save Error Toast */}
      {saveError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">{saveError}</span>
        </div>
      )}
    </div>
  );
}
