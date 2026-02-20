"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { auth, deleteUser } from "@/lib/firebase";
import { deleteUserFromBackend } from "@/lib/api";
import AppNav from "@/components/AppNav";

/* ── SVG Icon Components ── */
function RulerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="4" width="20" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4v4M10 4v6M14 4v4M18 4v6" />
    </svg>
  );
}

function SwatchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="11" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="11" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

export default function DashboardPage() {
  const { user, dbUser, signOut } = useAuth();
  const router = useRouter();
  const { t } = useLocale();
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
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <AppNav activePage="dashboard" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            {t("dashboard.welcomeBack")}{dbUser?.name ? `, ${dbUser.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            {t("dashboard.readyOutfit")}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Completion Card */}
          <div className="lg:col-span-1 bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 hover:shadow-md dark:hover:shadow-stone-900/50 transition-shadow">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-white mb-4">{t("dashboard.yourProfile")}</h2>
            <div className="space-y-3">
              {[
                { label: t("dashboard.measurements"), completed: false },
                { label: t("dashboard.colorAnalysis"), completed: false },
                { label: t("dashboard.stylePreferences"), completed: false },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-stone-400">{item.label}</span>
                  {item.completed ? (
                    <span className="text-green-600 text-sm font-medium">{t("dashboard.completed")}</span>
                  ) : (
                    <span className="text-orange-500 text-sm font-medium">{t("dashboard.pending")}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-600 dark:text-stone-400">{t("dashboard.profileCompletion")}</span>
                <span className="text-sm font-medium text-stone-900 dark:text-white">0%</span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-2">
                <div className="bg-amber-600 h-2 rounded-full" style={{ width: "0%" }} />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 hover:shadow-md dark:hover:shadow-stone-900/50 transition-shadow">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-white mb-4">{t("dashboard.quickActions")}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <RulerIcon className="w-6 h-6" />,
                  title: t("dashboard.addMeasurements"),
                  description: t("dashboard.addMeasurementsDesc"),
                  href: "/measurements",
                  color: "bg-blue-50 dark:bg-blue-500/10 text-blue-600",
                },
                {
                  icon: <SwatchIcon className="w-6 h-6" />,
                  title: t("dashboard.colorAnalysisAction"),
                  description: t("dashboard.colorAnalysisDesc"),
                  href: "/colors",
                  color: "bg-purple-50 dark:bg-purple-500/10 text-purple-600",
                },
                {
                  icon: <SlidersIcon className="w-6 h-6" />,
                  title: t("dashboard.styleQuiz"),
                  description: t("dashboard.styleQuizDesc"),
                  href: "/style",
                  color: "bg-amber-50 dark:bg-amber-500/10 text-amber-600",
                },
                {
                  icon: <ShoppingBagIcon className="w-6 h-6" />,
                  title: t("dashboard.getOutfit"),
                  description: t("dashboard.getOutfitDesc"),
                  href: "/outfits/new",
                  color: "bg-green-50 dark:bg-green-500/10 text-green-600",
                },
              ].map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className="flex items-start gap-4 p-4 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-sm transition-all"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${action.color}`}>
                    {action.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900 dark:text-white">{action.title}</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-400">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 hover:shadow-md dark:hover:shadow-stone-900/50 transition-shadow">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white mb-4">{t("dashboard.recentOutfits")}</h2>
          <div className="text-center py-12 text-stone-500 dark:text-stone-400">
            <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBagIcon className="w-8 h-8 text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-lg font-medium text-stone-700 dark:text-stone-300">{t("dashboard.noOutfitsYet")}</p>
            <p className="text-stone-500 dark:text-stone-400 mb-4">{t("dashboard.completeProfile")}</p>
            <Link
              href="/measurements"
              className="inline-block px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>

        {/* Danger Zone - Delete Account (for testing) */}
        <div className="mt-6 bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-red-200 dark:border-red-700 p-6 hover:shadow-md dark:hover:shadow-stone-900/50 transition-shadow">
          <h2 className="text-lg font-semibold text-red-600 mb-2">{t("dashboard.dangerZone")}</h2>
          <p className="text-stone-600 dark:text-stone-400 text-sm mb-4">
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
          <div className="bg-white dark:bg-stone-900 dark:border dark:border-stone-800 rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">{t("dashboard.deleteConfirmTitle")}</h3>
            <p className="text-stone-600 dark:text-stone-400 mb-6">
              {t("dashboard.deleteConfirmDesc")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
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
