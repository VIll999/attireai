"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { auth, deleteUser } from "@/lib/firebase";
import { deleteUserFromBackend, getMeasurements, getColorProfiles, getOutfitRecommendations } from "@/lib/api";
import AppNav from "@/components/AppNav";

export default function DashboardPage() {
  const { user, dbUser, signOut } = useAuth();
  const router = useRouter();
  const { t } = useLocale();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [hasMeasurements, setHasMeasurements] = useState(false);
  const [hasColorAnalysis, setHasColorAnalysis] = useState(false);
  const [hasStylePreferences, setHasStylePreferences] = useState(false);
  const [primaryMeasurementId, setPrimaryMeasurementId] = useState<string | null>(null);

  // Calculate profile completion: 3 parts, each worth 33%
  const calculateProfileCompletion = useCallback(() => {
    let completion = 0;
    if (hasMeasurements) completion += 33;
    if (hasColorAnalysis) completion += 33;
    if (hasStylePreferences) completion += 34; // 34 to make total 100%
    setProfileCompletion(completion);
  }, [hasMeasurements, hasColorAnalysis, hasStylePreferences]);

  // Fetch user profile data
  const fetchProfileData = useCallback(async () => {
    if (!user) return;

    try {
      // Check measurements
      const measurements = await getMeasurements(user.uid);
      setHasMeasurements(measurements.length > 0);

      // Get primary measurement ID (first measurement or the one marked as primary)
      if (measurements.length > 0) {
        const primaryMeasurement = measurements.find(m => m.is_primary) || measurements[0];
        setPrimaryMeasurementId(primaryMeasurement.id);
      }

      // Check color analysis
      const colorProfiles = await getColorProfiles(user.uid);
      setHasColorAnalysis(colorProfiles.length > 0);

      // Check style preferences (outfit recommendations)
      const outfitRecommendations = await getOutfitRecommendations(user.uid);
      setHasStylePreferences(outfitRecommendations.length > 0);
    } catch (err) {
      console.error("Failed to fetch profile data:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  useEffect(() => {
    calculateProfileCompletion();
  }, [calculateProfileCompletion]);

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    setIsDeleting(true);
    try {
      await deleteUserFromBackend(auth.currentUser.uid);
      await deleteUser(auth.currentUser);
      router.push("/auth");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/requires-recent-login") {
        alert(t("dashboard.requiresRecentLogin"));
      } else {
        alert(error.message || t("dashboard.failedDelete"));
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const firstName = dbUser?.name ? dbUser.name.split(" ")[0] : "Guest";
  const vipStatus = dbUser?.subscription_tier && dbUser.subscription_tier !== "FREE" ? "Active" : "Inactive";

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafb] dark:bg-stone-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand dark:border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f8fafb] dark:bg-stone-950">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-full h-full -z-20 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(11, 85, 99, 0.1) 0%, transparent 40%), radial-gradient(circle at bottom left, rgba(212, 175, 55, 0.05) 0%, transparent 40%)" }}></div>

      <AppNav activePage="dashboard" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <p className="text-sm font-bold tracking-widest text-brand dark:text-brand-400 uppercase">Your Private Atelier</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight font-cabinet">
              {t("dashboard.welcomeBack")}, <span className="text-accent italic" style={{ fontFamily: "'Playfair Display', serif" }}>{firstName}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl">{t("dashboard.readyOutfit")}</p>
          </div>
          <div className="glass-panel px-6 py-4 rounded-3xl flex items-center gap-6 border border-stone-200/50 dark:border-stone-700/50">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Profile Status</p>
              <p className="text-lg font-bold text-brand dark:text-brand-400">{profileCompletion}% Complete</p>
            </div>
            <div className="relative w-16 h-16">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-200 dark:text-gray-700" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray="175.9"
                  strokeDashoffset={175.9 * (1 - profileCompletion / 100)}
                  className="text-brand dark:text-brand-400 transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Guidance & Actions */}
          <div className="lg:col-span-4 space-y-8">
            {/* Next Steps */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-cabinet">Next Steps</h3>
                <span className="text-xs font-bold px-2 py-1 bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-400 rounded-md">Recommended</span>
              </div>

              {/* Onboarding Card 1: Measurements */}
              {hasMeasurements ? (
                <div className="block group">
                  <div className="glass-panel p-6 rounded-[2.5rem] border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600 dark:text-green-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white font-cabinet">{t("dashboard.measurements")}</h4>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">{t("dashboard.completed")}</p>
                        <Link href="/measurements" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand dark:text-brand-400 hover:underline">
                          <span>Edit Measurements</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link href="/measurements" className="block group">
                  <div className="glass-panel p-6 rounded-[2.5rem] transition-all hover:translate-y-[-4px] hover:shadow-xl border border-stone-200/50 dark:border-stone-700/50">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand dark:bg-brand-400 flex items-center justify-center text-white dark:text-gray-900 shadow-lg shadow-brand/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-brand dark:group-hover:text-brand-400 transition-colors font-cabinet">{t("dashboard.addMeasurements")}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("dashboard.addMeasurementsDesc")}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-brand dark:text-brand-400">
                          <span>Start Capture</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Onboarding Card 2: Color Analysis */}
              {hasColorAnalysis ? (
                <div className="block group">
                  <div className="glass-panel p-6 rounded-[2.5rem] border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600 dark:text-green-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white font-cabinet">{t("dashboard.colorAnalysis")}</h4>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">{t("dashboard.completed")}</p>
                        <Link href="/color-results" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand dark:text-brand-400 hover:underline">
                          <span>View Results</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : hasMeasurements ? (
                <Link href={primaryMeasurementId ? `/color-analysis?measurement_id=${primaryMeasurementId}` : "/color-analysis"} className="block group">
                  <div className="glass-panel p-6 rounded-[2.5rem] transition-all hover:translate-y-[-4px] hover:shadow-xl border border-stone-200/50 dark:border-stone-700/50">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand dark:bg-brand-400 flex items-center justify-center text-white dark:text-gray-900 shadow-lg shadow-brand/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-brand dark:group-hover:text-brand-400 transition-colors font-cabinet">{t("dashboard.colorAnalysisAction")}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("dashboard.colorAnalysisDesc")}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-brand dark:text-brand-400">
                          <span>Start Analysis</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="block group opacity-60 cursor-not-allowed">
                  <div className="glass-panel p-6 rounded-[2.5rem] border-dashed border-2 border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-stone-900/40">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-400 dark:text-gray-600 font-cabinet">{t("dashboard.colorAnalysisAction")}</h4>
                        <p className="text-sm text-gray-400 dark:text-gray-600 mt-1 italic">Available after measurement.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onboarding Card 3: Style Quiz */}
              {hasStylePreferences ? (
                <div className="block group">
                  <div className="glass-panel p-6 rounded-[2.5rem] border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600 dark:text-green-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white font-cabinet">{t("dashboard.stylePreferences")}</h4>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">{t("dashboard.completed")}</p>
                        <Link href="/style" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand dark:text-brand-400 hover:underline">
                          <span>Edit Preferences</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : hasColorAnalysis ? (
                <Link href="/style" className="block group">
                  <div className="glass-panel p-6 rounded-[2.5rem] transition-all hover:translate-y-[-4px] hover:shadow-xl border border-stone-200/50 dark:border-stone-700/50">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand dark:bg-brand-400 flex items-center justify-center text-white dark:text-gray-900 shadow-lg shadow-brand/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-brand dark:group-hover:text-brand-400 transition-colors font-cabinet">{t("dashboard.styleQuiz")}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("dashboard.styleQuizDesc")}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-brand dark:text-brand-400">
                          <span>Take Quiz</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="block group opacity-60 cursor-not-allowed">
                  <div className="glass-panel p-6 rounded-[2.5rem] border-dashed border-2 border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-stone-900/40">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-400 dark:text-gray-600 font-cabinet">{t("dashboard.styleQuiz")}</h4>
                        <p className="text-sm text-gray-400 dark:text-gray-600 mt-1 italic">Final step in onboarding.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Your Stats */}
            <div className="p-8 rounded-[2.5rem] bg-brand dark:bg-brand-400 text-white dark:text-gray-900 relative overflow-hidden border border-brand-600 dark:border-brand-500 shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-6 font-cabinet relative z-10">Your Stats</h3>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="space-y-1">
                  <p className="text-white/70 dark:text-gray-900/70 text-xs font-bold uppercase tracking-wider">Saved Outfits</p>
                  <p className="text-2xl font-bold font-cabinet">0</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white/70 dark:text-gray-900/70 text-xs font-bold uppercase tracking-wider">Orders</p>
                  <p className="text-2xl font-bold font-cabinet">0</p>
                </div>
                <div className="space-y-1 mt-4">
                  <p className="text-white/70 dark:text-gray-900/70 text-xs font-bold uppercase tracking-wider">Fit Accuracy</p>
                  <p className="text-2xl font-bold font-cabinet text-accent">0%</p>
                </div>
                <div className="space-y-1 mt-4">
                  <p className="text-white/70 dark:text-gray-900/70 text-xs font-bold uppercase tracking-wider">VIP Status</p>
                  <p className="text-2xl font-bold font-cabinet">{vipStatus}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Activity Feed & Recommendations */}
          <div className="lg:col-span-8 space-y-10">
            {/* Recent Outfits */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-cabinet">{t("dashboard.recentOutfits")}</h3>
                <Link href="/outfits" className="text-sm font-bold text-brand dark:text-brand-400 hover:underline">View All</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Empty State */}
                <div className="md:col-span-2 glass-panel rounded-[2rem] p-12 text-center border border-stone-200/50 dark:border-stone-700/50">
                  <div className="w-20 h-20 bg-brand/10 dark:bg-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-brand dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                  <h3 className="font-cabinet text-xl font-bold text-gray-900 dark:text-white mb-2">{t("dashboard.noOutfitsYet")}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    {t("dashboard.completeProfile")}
                  </p>
                  <Link
                    href="/measurements"
                    className="inline-block px-8 py-3 bg-brand dark:bg-brand-400 text-white dark:text-gray-900 rounded-full font-bold hover:bg-brand-600 dark:hover:bg-brand-500 transition-all shadow-glow"
                  >
                    {t("nav.getStarted")}
                  </Link>
                </div>
              </div>
            </section>

            {/* Order History */}
            <section>
              <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white font-cabinet">Order History</h3>
              <div className="glass-panel rounded-[2rem] overflow-hidden border border-stone-200/50 dark:border-stone-700/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-brand/5 dark:bg-brand/10">
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-brand dark:text-brand-400">Order ID</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-brand dark:text-brand-400">Date</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-brand dark:text-brand-400">Status</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-brand dark:text-brand-400 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-gray-500 dark:text-gray-400">
                          No orders yet. Start by creating your first outfit!
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Personalized Recommendations Prompt */}
            <section className="relative rounded-[2.5rem] bg-gray-900 dark:bg-gray-950 p-10 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-white font-cabinet">Ready for your next masterpiece?</h3>
                  <p className="text-white/60">Based on your fit profile, we've curated a new collection of essentials.</p>
                  <Link
                    href="/outfits/new"
                    className="inline-block px-8 py-4 bg-accent text-white rounded-full font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                  >
                    Explore Curated Items
                  </Link>
                </div>
                <div className="w-48 h-48 rounded-[2rem] glass-panel flex items-center justify-center border-white/20">
                  <svg className="w-24 h-24 text-accent animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Danger Zone - Delete Account (hidden by default, can be shown for testing) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-12 glass-panel rounded-[2rem] border border-red-200 dark:border-red-800 p-6">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2 font-cabinet">{t("dashboard.dangerZone")}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              {t("dashboard.deleteAccountDesc")}
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              {t("dashboard.deleteAccount")}
            </button>
          </div>
        )}
      </main>

      {/* Decorative Footer Gradient */}
      <div className="mt-20 h-2 bg-gradient-to-r from-brand via-accent to-brand opacity-20"></div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl shadow-xl p-6 max-w-md w-full border border-stone-200 dark:border-stone-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-cabinet">{t("dashboard.deleteConfirmTitle")}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t("dashboard.deleteConfirmDesc")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t("dashboard.cancel")}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? t("dashboard.deleting") : t("dashboard.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
