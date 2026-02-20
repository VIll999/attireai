"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale, Locale } from "@/context/LocaleContext";

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

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale, localeLabels } = useLocale();

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white dark:from-stone-950 dark:to-stone-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-wide bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                AttireAI
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5">
                {(Object.keys(localeLabels) as Locale[]).map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                      locale === loc
                        ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
                        : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                    }`}
                  >
                    {localeLabels[loc]}
                  </button>
                ))}
              </div>
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
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
                <div className="w-20 h-10 bg-stone-200 dark:bg-stone-800 rounded-lg animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700"
                  >
                    {t("nav.dashboard")}
                  </Link>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center border-2 border-amber-200 dark:border-amber-700">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
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
                    className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white font-medium"
                  >
                    {t("nav.logIn")}
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700"
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
          <h1 className="text-6xl sm:text-7xl font-bold text-stone-900 dark:text-white mb-6 tracking-tight leading-[1.1]">
            {t("landing.heroTitle1")}
            <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
              {t("landing.heroTitle2")}
            </span>
          </h1>
          <p className="text-xl text-stone-600 dark:text-stone-300 max-w-2xl mx-auto mb-10">
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth?mode=signup"
              className="px-8 py-4 bg-amber-600 text-white rounded-xl font-semibold text-lg hover:bg-amber-700 shadow-lg shadow-amber-500/25 dark:shadow-amber-500/15"
            >
              {t("landing.startFree")}
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-4 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-lg hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700"
            >
              {t("landing.howItWorks")}
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-white dark:bg-stone-900/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center tracking-tight text-stone-900 dark:text-white mb-12">
            {t("landing.howItWorks")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <RulerIcon className="w-10 h-10 text-amber-600 dark:text-amber-400" />, title: t("landing.bodyMeasurements"), description: t("landing.bodyMeasurementsDesc") },
              { icon: <SwatchIcon className="w-10 h-10 text-amber-600 dark:text-amber-400" />, title: t("landing.colorAnalysis"), description: t("landing.colorAnalysisDesc") },
              { icon: <SparklesIcon className="w-10 h-10 text-amber-600 dark:text-amber-400" />, title: t("landing.aiRecommendations"), description: t("landing.aiRecommendationsDesc") },
            ].map((item, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl bg-stone-50 dark:bg-stone-800/50 text-center hover:shadow-lg dark:hover:shadow-stone-900/50 border border-transparent dark:border-stone-700/50"
              >
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-stone-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-stone-600 dark:text-stone-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center tracking-tight text-stone-900 dark:text-white mb-12">
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
                className="p-6 bg-white dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700/50 flex items-start gap-4 hover:shadow-md dark:hover:shadow-stone-900/50"
              >
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900 dark:text-white">{feature.title}</h3>
                  <p className="text-stone-600 dark:text-stone-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-stone-900 to-stone-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-amber-400 mb-4">
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-stone-300 mb-8 text-lg">
            {t("landing.ctaSubtitle")}
          </p>
          <Link
            href="/auth?mode=signup"
            className="inline-block px-8 py-4 bg-amber-600 text-white rounded-xl font-semibold text-lg hover:bg-amber-700 shadow-lg shadow-black/10"
          >
            {t("landing.getStartedFree")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-stone-900 dark:bg-stone-950 text-stone-400">
        <div className="max-w-7xl mx-auto text-center">
          <p>{t("landing.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
