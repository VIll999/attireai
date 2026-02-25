"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ColorProfile {
  id: string;
  user_id: string;
  measurement_id: string;
  measurement_name: string | null;
  skin_tone: string | null;
  skin_tone_hex: string | null;
  hair_color: string | null;
  hair_color_hex: string | null;
  recommended_palette: {
    season?: string;
    poeticName?: string;
    seasonName?: string;
    emoji?: string;
    undertone?: string;
    contrast?: string;
    description?: string;
    neutrals?: Array<{ name: string; hex: string }>;
    powerTones?: Array<{ name: string; hex: string }>;
    accents?: Array<{ name: string; hex: string }>;
    avoid?: Array<{ name: string; hex: string }>;
  } | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function ColorResultsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const measurementId = searchParams.get("measurement_id");

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ColorProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<ColorProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiRain, setShowEmojiRain] = useState(false);
  const emojiRainRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    fetchColorProfile();
  }, [user, measurementId]);

  const fetchColorProfile = async () => {
    if (!user) return;

    try {
      // Build URL based on whether measurementId is provided
      const url = measurementId
        ? `/api/color-profiles?measurement_id=${measurementId}`
        : `/api/color-profiles`;

      const response = await fetch(url, {
        headers: {
          "X-Firebase-UID": user.uid,
        },
      });

      if (response.ok) {
        const profiles = await response.json();

        if (profiles && profiles.length > 0) {
          setAllProfiles(profiles);

          // If measurement_id is provided, show that profile directly
          if (measurementId) {
            console.log('Color profile loaded:', profiles[0]);
            console.log('Photo URL:', profiles[0].photo_url);
            setProfile(profiles[0]);
            // Trigger emoji rain animation
            setShowEmojiRain(true);
            // Hide after all emojis have fallen (7s generation + 3s fall time = 10s total)
            emojiRainRef.current = setTimeout(() => {
              setShowEmojiRain(false);
            }, 10000); // 10 seconds - let all emojis finish falling
          }
          // If no measurement_id, user will select from dropdown
        } else {
          setError("No color profiles found. Please complete your color analysis first.");
        }
      } else {
        setError("Failed to load color profile");
      }
    } catch (err) {
      console.error("Error fetching color profile:", err);
      setError("Failed to load color profile");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile selection
  const handleProfileSelection = (profileId: string) => {
    const selectedProfile = allProfiles.find(p => p.id === profileId);
    if (selectedProfile) {
      setSelectedProfileId(profileId);
      setProfile(selectedProfile);

      // Update URL with measurement_id without reloading page
      if (selectedProfile.measurement_id) {
        const newUrl = `/color-results?measurement_id=${selectedProfile.measurement_id}`;
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
      }

      setShowEmojiRain(true);
      emojiRainRef.current = setTimeout(() => {
        setShowEmojiRain(false);
      }, 10000);
    }
  };

  // Cleanup emoji rain timeout on unmount
  useEffect(() => {
    return () => {
      if (emojiRainRef.current) {
        clearTimeout(emojiRainRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-stone-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand dark:border-brand-400"></div>
      </div>
    );
  }

  // If no measurement_id provided and we have profiles, show selector
  if (!measurementId && allProfiles.length > 0 && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-stone-950 px-6">
        <div className="glass-panel rounded-[2.5rem] p-12 text-center max-w-2xl w-full">
          <h1 className="text-4xl font-cabinet font-extrabold text-gray-900 dark:text-white mb-4">
            Select Your Color Profile
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Choose which color analysis result you'd like to view
          </p>

          <div className="space-y-4">
            {allProfiles.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProfileSelection(p.id)}
                className="w-full glass-panel p-6 rounded-2xl hover:shadow-xl transition-all hover:scale-[1.02] border border-stone-200 dark:border-stone-700 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                      {p.measurement_name || "Unnamed Profile"}
                    </h3>
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                      {p.skin_tone && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border-2 border-white dark:border-stone-700 shadow-md" style={{ backgroundColor: p.skin_tone_hex || '#E8B999' }}></div>
                          <span>{p.skin_tone} skin</span>
                        </div>
                      )}
                      {p.hair_color && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border-2 border-white dark:border-stone-700 shadow-md" style={{ backgroundColor: p.hair_color_hex || '#1A1A1A' }}></div>
                          <span>{p.hair_color} hair</span>
                        </div>
                      )}
                    </div>
                    {p.recommended_palette?.seasonName && (
                      <div className="mt-2 text-sm font-bold text-brand dark:text-brand-400">
                        {p.recommended_palette.emoji} {p.recommended_palette.seasonName}
                      </div>
                    )}
                  </div>
                  <svg className="w-6 h-6 text-brand dark:text-brand-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-brand dark:hover:text-brand-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-stone-950">
        <div className="glass-panel rounded-[2.5rem] p-12 text-center max-w-2xl">
          <h1 className="text-4xl font-cabinet font-extrabold text-gray-900 dark:text-white mb-4">
            Error Loading Results
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">{error}</p>
          <Link
            href="/dashboard"
            className="px-12 py-4 rounded-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 font-bold text-lg hover:bg-brand-600 dark:hover:bg-brand-500 transition-all shadow-glow inline-flex items-center gap-3"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const palette = profile.recommended_palette || {};
  const season = palette.season || "Autumn";
  const poeticName = palette.poeticName || "";
  const seasonName = palette.seasonName || season;
  const emoji = palette.emoji || "";
  const undertone = palette.undertone || "Warm";
  const contrast = palette.contrast || "Medium";
  const description = palette.description || "Your coloring is warm, rich, and saturated.";
  const neutrals = palette.neutrals || [];
  const powerTones = palette.powerTones || [];
  const accents = palette.accents || [];
  const avoid = palette.avoid || [];

  return (
    <div className="min-h-screen relative flex flex-col bg-[#FAFAFC] dark:bg-stone-950">
      {/* Emoji Rain Animation */}
      {showEmojiRain && emoji && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-emoji-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 7}s`,
                animationDuration: `${2.5 + Math.random()}s`,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>
      )}

      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-brand/5 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[100px] animate-float" style={{ animationDelay: "-2s" }}></div>
      </div>

      {/* Navigation */}
      <header className="w-full px-6 lg:px-12 py-6 relative z-50 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <div className="w-8 h-8 rounded-lg bg-brand dark:bg-brand-400 flex items-center justify-center text-white dark:text-gray-900 shadow-glow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="font-cabinet font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">AttireAI</span>
          </Link>

          {/* Profile Selector - Show if user has multiple profiles */}
          {allProfiles.length > 1 && (
            <div className="relative">
              <select
                value={profile?.id || ''}
                onChange={(e) => handleProfileSelection(e.target.value)}
                className="appearance-none bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2 pr-10 font-medium text-sm text-gray-900 dark:text-white hover:border-brand dark:hover:border-brand-400 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.measurement_name || 'Unnamed Profile'} {p.recommended_palette?.seasonName ? `- ${p.recommended_palette.seasonName}` : ''}
                  </option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Progress Stepper */}
        <div className="w-full max-w-3xl mx-auto mb-16">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 rounded-full"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[62.5%] h-1 bg-brand dark:bg-brand-400 -z-10 rounded-full transition-all duration-1000"></div>

            {/* Step 1 (Completed) */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-brand dark:text-brand-400 uppercase tracking-widest">Capture</span>
            </div>

            {/* Step 2 (Active) */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white dark:bg-stone-900 border-4 border-brand dark:border-brand-400 text-brand dark:text-brand-400 flex items-center justify-center shadow-glow relative">
                <span className="absolute inset-0 rounded-full border border-brand dark:border-brand-400 animate-ping opacity-20"></span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Analysis</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Try-on</span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Shop</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Visual Summary */}
          <div className="lg:col-span-4 flex flex-col gap-8 animate-scale-in">
            <div className="glass-panel rounded-[2.5rem] p-6 shadow-glass relative overflow-hidden" style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.9)" }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand/5 text-brand flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-cabinet font-extrabold text-xl text-gray-900">Analysis Profile</h2>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Detected Attributes</p>
                </div>
              </div>

              {/* Portrait Visualization */}
              <div className="relative w-full aspect-[3/4] rounded-[2rem] overflow-hidden mb-6 shadow-lg bg-gradient-to-br from-gray-100 to-gray-50">
                {(() => {
                  console.log('Rendering photo, photo_url:', profile.photo_url);
                  return null;
                })()}
                {profile.photo_url ? (
                  <>
                    <img src={profile.photo_url} alt="Color Analysis" className="w-full h-full object-cover" />

                    {/* Detection Pinpoints with refined style */}
                    {profile.hair_color && (
                      <div className="absolute top-[20%] left-[50%] -translate-x-1/2 z-20">
                        <div className="relative flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full border-2 border-gray-800 shadow-lg"></div>
                          <div className="absolute left-5 whitespace-nowrap bg-gray-900/95 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-xl">
                            HAIR: {profile.hair_color.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                          </div>
                        </div>
                      </div>
                    )}

                    {profile.skin_tone && (
                      <div className="absolute top-[55%] left-[50%] -translate-x-1/2 z-20">
                        <div className="relative flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full border-2 border-gray-800 shadow-lg"></div>
                          <div className="absolute left-5 whitespace-nowrap bg-gray-900/95 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-xl">
                            SKIN: {profile.skin_tone.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 bg-brand/10 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">No photo uploaded</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Attributes List - Styled like Image #2 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-left">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Undertone</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-gray-900 dark:text-white">{undertone}</p>
                    <span className={`w-2.5 h-2.5 rounded-full ${undertone === 'Warm' ? 'bg-amber-500' : undertone === 'Cool' ? 'bg-blue-400' : 'bg-purple-400'}`}></span>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Contrast</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{contrast}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 border-brand/5 flex flex-col gap-4" style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.9)" }}>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <h4 className="font-cabinet font-bold text-gray-900">Why this palette?</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your results are based on the <strong>12-Season Color Theory</strong>. Because you have {undertone.toLowerCase()} skin undertones and {contrast.toLowerCase()} contrast between your hair and skin, you fall into the {season} category.
              </p>
            </div>
          </div>

          {/* Right Column: Detailed Analysis */}
          <div className="lg:col-span-8 flex flex-col gap-10 animate-fade-in-up">
            {/* Result Header */}
            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full w-fit">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-[11px] font-black uppercase tracking-widest">Analysis Complete</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-cabinet font-extrabold text-gray-900 dark:text-white leading-tight">
                {poeticName && seasonName ? (
                  <>
                    You are a <span className="text-brand">{poeticName}</span> <span className="text-gray-400">--</span> <span className="text-brand">{seasonName}</span>
                  </>
                ) : (
                  <>
                    You are a <span className="text-brand">{season}</span>
                  </>
                )}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                {palette.description || `Your coloring is ${undertone.toLowerCase()}, rich, and saturated. You look your absolute best in colors that complement your natural tones.`}
              </p>
            </div>

            {/* Palette Grid */}
            <section className="flex flex-col gap-10">
              {/* Category 1: Foundation Neutrals */}
              {neutrals.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-cabinet font-bold text-xl text-gray-900 dark:text-white tracking-tight">Foundation Neutrals</h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Professional & Timeless</span>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {neutrals.map((color, idx) => (
                      <div key={idx} className="group relative">
                        <div
                          className="aspect-square rounded-2xl shadow-sm hover:scale-105 transition-all cursor-pointer border border-white/20"
                          style={{ backgroundColor: color.hex }}
                        ></div>
                        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 text-[10px] font-bold text-gray-500 whitespace-nowrap transition-opacity">
                          {color.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 2: Power Tones */}
              {powerTones.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-cabinet font-bold text-xl text-gray-900 dark:text-white tracking-tight">Your Power Tones</h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Radiant & Commanding</span>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {powerTones.map((color, idx) => (
                      <div key={idx} className="group relative">
                        <div
                          className="aspect-square rounded-2xl shadow-sm hover:scale-105 transition-all cursor-pointer border border-white/20"
                          style={{ backgroundColor: color.hex }}
                        ></div>
                        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 text-[10px] font-bold text-gray-500 whitespace-nowrap transition-opacity">
                          {color.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: Accent Pops */}
              {accents.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-cabinet font-bold text-xl text-gray-900 dark:text-white tracking-tight">Accent Accents</h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Playful & Bold</span>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {accents.map((color, idx) => (
                      <div key={idx} className="group relative">
                        <div
                          className="aspect-square rounded-2xl shadow-sm hover:scale-105 transition-all cursor-pointer border border-white/20"
                          style={{ backgroundColor: color.hex }}
                        ></div>
                        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 text-[10px] font-bold text-gray-500 whitespace-nowrap transition-opacity">
                          {color.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Avoid Section */}
            {avoid.length > 0 && (
              <div className="p-8 rounded-[2.5rem] bg-rose-50/50 border border-rose-100/50">
                <div className="flex items-center gap-4 mb-4">
                  <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <h3 className="font-cabinet font-bold text-xl text-gray-900">Colors to Avoid</h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">These colors may wash you out or clash with your natural tones.</p>
                <div className="flex gap-4 flex-wrap">
                  {avoid.map((color, idx) => (
                    <div key={idx} className="w-12 h-12 rounded-xl border border-white relative overflow-hidden" style={{ backgroundColor: color.hex }}>
                      <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-rose-500/60 rotate-45"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-12 border-t border-gray-100 dark:border-gray-800">
              <Link
                href={`/color-analysis?measurement_id=${measurementId}`}
                className="w-full sm:w-auto px-10 py-4 rounded-full font-bold text-gray-500 hover:text-brand hover:bg-brand/5 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Recapture Colors
              </Link>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link
                  href={`/style-preferences?measurement_id=${measurementId}`}
                  className="px-12 py-4 rounded-full bg-brand text-white font-bold text-lg hover:bg-brand-600 transition-all shadow-glow hover:translate-y-[-2px] active:translate-y-0 flex items-center justify-center gap-3"
                >
                  Continue to Outfit Recommendations
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Decorative Text Overlay */}
      <div className="fixed bottom-10 left-10 pointer-events-none opacity-[0.03] select-none hidden lg:block">
        <h2 className="text-[120px] font-black font-cabinet leading-none">PALETTE</h2>
      </div>
    </div>
  );
}
