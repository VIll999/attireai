"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale, Locale } from "@/context/LocaleContext";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale, localeLabels } = useLocale();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AttireAI
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                {(Object.keys(localeLabels) as Locale[]).map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                      locale === loc
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {localeLabels[loc]}
                  </button>
                ))}
              </div>
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              {loading ? (
                <div className="w-20 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                  >
                    {t("nav.dashboard")}
                  </Link>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center border-2 border-indigo-200 dark:border-indigo-700">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                  >
                    {t("nav.logIn")}
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                  >
                    {t("nav.getStarted")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            {t("landing.heroTitle1")}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {t("landing.heroTitle2")}
            </span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10">
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth?mode=signup"
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 dark:shadow-indigo-500/15"
            >
              {t("landing.startFree")}
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            >
              {t("landing.howItWorks")}
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
            {t("landing.howItWorks")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "📏", title: t("landing.bodyMeasurements"), description: t("landing.bodyMeasurementsDesc") },
              { icon: "🎨", title: t("landing.colorAnalysis"), description: t("landing.colorAnalysisDesc") },
              { icon: "👗", title: t("landing.aiRecommendations"), description: t("landing.aiRecommendationsDesc") },
            ].map((item, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-center hover:shadow-lg dark:hover:shadow-slate-900/50 border border-transparent dark:border-slate-700/50"
              >
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
            {t("landing.whyAttireAI")}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: t("landing.accurateSizing"), desc: t("landing.accurateSizingDesc") },
              { title: t("landing.styleMatching"), desc: t("landing.styleMatchingDesc") },
              { title: t("landing.directPurchase"), desc: t("landing.directPurchaseDesc") },
              { title: t("landing.virtualTryOn"), desc: t("landing.virtualTryOnDesc") },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 flex items-start gap-4 hover:shadow-md dark:hover:shadow-slate-900/50"
              >
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-indigo-100 mb-8 text-lg">
            {t("landing.ctaSubtitle")}
          </p>
          <Link
            href="/auth?mode=signup"
            className="inline-block px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold text-lg hover:bg-indigo-50 shadow-lg shadow-black/10"
          >
            {t("landing.getStartedFree")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-900 dark:bg-slate-950 text-slate-400">
        <div className="max-w-7xl mx-auto text-center">
          <p>{t("landing.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
