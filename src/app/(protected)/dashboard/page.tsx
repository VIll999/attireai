"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale, Locale } from "@/context/LocaleContext";
import { auth, deleteUser } from "@/lib/firebase";
import { deleteUserFromBackend } from "@/lib/api";

export default function DashboardPage() {
  const { user, dbUser, signOut } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale, localeLabels } = useLocale();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    setIsDeleting(true);
    try {
      // Delete from backend first
      await deleteUserFromBackend(auth.currentUser.uid);
      // Then delete from Firebase
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

  // This check is handled by layout, but TypeScript needs it
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AttireAI
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-indigo-600 font-medium">
                  {t("nav.dashboard")}
                </Link>
                <Link href="/outfits" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  {t("nav.outfits")}
                </Link>
                <Link href="/measurements" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  {t("nav.measurements")}
                </Link>
                <Link href="/profile" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  {t("nav.profile")}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center overflow-hidden">
                  {dbUser?.profile_picture_url || user.photoURL ? (
                    <img
                      src={dbUser?.profile_picture_url || user.photoURL || ""}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-indigo-600 font-semibold">
                      {(dbUser?.email || user.email)?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-sm text-slate-600 dark:text-slate-400">
                  {dbUser?.name || user.displayName || user.email}
                </span>
              </Link>
              <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors" aria-label="Toggle theme">
                {theme === "dark" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                {(Object.keys(localeLabels) as Locale[]).map((loc) => (
                  <button key={loc} onClick={() => setLocale(loc)} className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${locale === loc ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}>
                    {localeLabels[loc]}
                  </button>
                ))}
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
              >
                {t("nav.signOut")}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t("dashboard.welcomeBack")}{dbUser?.name ? `, ${dbUser.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t("dashboard.readyOutfit")}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Completion Card */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t("dashboard.yourProfile")}</h2>
            <div className="space-y-3">
              {[
                { label: t("dashboard.measurements"), completed: false },
                { label: t("dashboard.colorAnalysis"), completed: false },
                { label: t("dashboard.stylePreferences"), completed: false },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                  {item.completed ? (
                    <span className="text-green-600 text-sm font-medium">{t("dashboard.completed")}</span>
                  ) : (
                    <span className="text-amber-600 text-sm font-medium">{t("dashboard.pending")}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">{t("dashboard.profileCompletion")}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">0%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: "0%" }} />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t("dashboard.quickActions")}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: "📏",
                  title: t("dashboard.addMeasurements"),
                  description: t("dashboard.addMeasurementsDesc"),
                  href: "/measurements",
                  color: "bg-blue-50 dark:bg-blue-500/10 text-blue-600",
                },
                {
                  icon: "🎨",
                  title: t("dashboard.colorAnalysisAction"),
                  description: t("dashboard.colorAnalysisDesc"),
                  href: "/colors",
                  color: "bg-purple-50 dark:bg-purple-500/10 text-purple-600",
                },
                {
                  icon: "👔",
                  title: t("dashboard.styleQuiz"),
                  description: t("dashboard.styleQuizDesc"),
                  href: "/style",
                  color: "bg-amber-50 dark:bg-amber-500/10 text-amber-600",
                },
                {
                  icon: "👗",
                  title: t("dashboard.getOutfit"),
                  description: t("dashboard.getOutfitDesc"),
                  href: "/outfits/new",
                  color: "bg-green-50 dark:bg-green-500/10 text-green-600",
                },
              ].map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${action.color}`}>
                    {action.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{action.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t("dashboard.recentOutfits")}</h2>
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <div className="text-5xl mb-4">👗</div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">{t("dashboard.noOutfitsYet")}</p>
            <p className="text-slate-500 dark:text-slate-400 mb-4">{t("dashboard.completeProfile")}</p>
            <Link
              href="/measurements"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>

        {/* Danger Zone - Delete Account (for testing) */}
        <div className="mt-6 bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-red-200 dark:border-red-700 p-6 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
          <h2 className="text-lg font-semibold text-red-600 mb-2">{t("dashboard.dangerZone")}</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            {t("dashboard.deleteAccountDesc")}
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            {t("dashboard.deleteAccount")}
          </button>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t("dashboard.deleteConfirmTitle")}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t("dashboard.deleteConfirmDesc")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
