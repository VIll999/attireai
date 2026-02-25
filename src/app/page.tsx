"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale } from "@/context/LocaleContext";

export default function LandingPage() {
  const { user, dbUser, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useLocale();

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">

      {/* Background Glow Effects */}
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-radial -z-20 pointer-events-none"></div>
      <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-gradient-blob rounded-full -z-10 pointer-events-none"></div>
      <div className="absolute top-[40%] -left-[10%] w-[600px] h-[600px] bg-gradient-blob opacity-50 rounded-full -z-10 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(11,85,99,0.05) 0%, rgba(255,255,255,0) 100%)" }}></div>

      {/* Navigation */}
      <header className="w-full px-6 lg:px-12 py-6 relative z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <div className="w-8 h-8 rounded-lg bg-brand dark:bg-brand flex items-center justify-center text-white shadow-glow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="font-cabinet font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">AttireAI</span>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-8 font-medium">
            <a href="#how-it-works" className="text-gray-600 dark:text-gray-400 transition-colors hover:text-brand dark:hover:text-brand">
              {t("nav.howItWorks")}
            </a>
            <a href="#features" className="text-gray-600 dark:text-gray-400 transition-colors hover:text-brand dark:hover:text-brand">
              {t("nav.features")}
            </a>
            <a href="#pricing" className="text-gray-600 dark:text-gray-400 transition-colors hover:text-brand dark:hover:text-brand">
              {t("nav.pricing")}
            </a>
            <a href="#stories" className="text-gray-600 dark:text-gray-400 transition-colors hover:text-brand dark:hover:text-brand">
              {t("nav.successStories")}
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-lg p-1">
              <button
                onClick={() => setLocale("en")}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${
                  locale === "en"
                    ? "bg-brand text-white shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLocale("zh")}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${
                  locale === "zh"
                    ? "bg-brand text-white shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                中
              </button>
              <button
                onClick={() => setLocale("es")}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${
                  locale === "es"
                    ? "bg-brand text-white shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                ES
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Auth Buttons */}
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 animate-pulse" />
            ) : user ? (
              <div className="relative group">
                {/* User Avatar */}
                <button className="w-10 h-10 rounded-full bg-brand/10 dark:bg-brand/20 border-2 border-brand/20 flex items-center justify-center overflow-hidden hover:border-brand transition-all">
                  {(dbUser?.profile_picture_url || user.photoURL) ? (
                    <img
                      src={dbUser?.profile_picture_url || user.photoURL || ""}
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-brand dark:text-brand-400 font-bold text-sm">
                      {user.email?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu - Fixed hover issue by removing gap and adding pt */}
                <div className="absolute right-0 top-full pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-white dark:bg-stone-900 rounded-xl shadow-lg border border-stone-200 dark:border-stone-800 py-2">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {t("nav.dashboard")}
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t("nav.settings")}
                    </Link>
                    <div className="border-t border-stone-200 dark:border-stone-800 my-1"></div>
                    <button
                      onClick={signOut}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t("nav.signOut")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 transition-colors hover:text-gray-900 dark:hover:text-white"
                  style={{ fontSize: '15px' }}
                >
                  {t("nav.logIn")}
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-2.5 rounded-full font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  style={{ fontSize: '15px' }}
                >
                  {t("nav.signUp")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Column: Content */}
          <div className="lg:col-span-6 flex flex-col items-start">
            {/* Eyebrow */}
            <div className="glass-panel inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-accent"></span>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase">{t("landing.eyebrow")}</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-[4rem] leading-[1.1] font-cabinet font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
              {t("landing.heroTitle1")} <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-accent">
                {t("landing.heroTitle2")}
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg lg:text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-lg">
              {t("landing.heroSubtitle")}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href="/measurements"
                className="w-full sm:w-auto bg-brand text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-brand-600 transition-all shadow-glow hover:shadow-[0_12px_40px_rgba(11,85,99,0.4)] transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                {t("landing.startMeasurement")}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto glass-panel px-8 py-4 rounded-full font-bold text-lg text-gray-800 dark:text-gray-200 hover:border-brand hover:text-brand transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t("landing.seeHowItWorks")}
              </a>
            </div>

            {/* Social Proof */}
            <div className="mt-12 flex items-center gap-5">
              <div className="flex -space-x-3">
                <img className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-900 object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="User 1" />
                <img className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-900 object-cover" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="User 2" />
                <img className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-900 object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="User 3" />
                <img className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-900 object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="User 4" />
                <div className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400">
                  5k+
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex text-accent text-sm gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t("landing.socialProof")}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Mockup */}
          <div className="lg:col-span-6 relative flex justify-center lg:justify-end mt-12 lg:mt-0">
            {/* Main App Card Mockup */}
            <div className="relative w-full max-w-[520px] rounded-[2.5rem] glass-panel p-4 shadow-glass border-white/80 dark:border-gray-700/80">

              {/* Mock Header */}
              <div className="flex justify-between items-center px-4 py-2 mb-4">
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full text-xs font-bold text-gray-600 dark:text-gray-400">Women</span>
                  <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-bold">Autumn Collection</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 hover:text-accent transition-colors cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>

              {/* Image Container */}
              <div className="relative w-full h-[500px] rounded-[2rem] overflow-hidden bg-gray-200 dark:bg-gray-700">
                <img
                  src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Fashion Model"
                  className="w-full h-full object-cover object-center"
                />

                {/* Scanning Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/20 to-transparent h-1/3 animate-scan"></div>
              </div>

              {/* Floating UI Element 1: Dimensions */}
              <div className="absolute top-24 -left-6 lg:-left-12 glass-panel p-4 rounded-2xl shadow-xl flex items-center gap-4 animate-float">
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 21V3m0 18l3-3m-3-3l3-3m-3-3l3-3M21 3H3m18 0v18m0-18l-3 3m3 3l-3 3m3 3l-3 3" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t("landing.measuredBadge")}</p>
                  <p className="font-cabinet font-bold text-gray-900 dark:text-white">{t("landing.perfectSize")}</p>
                </div>
              </div>

              {/* Floating UI Element 2: Color Analysis */}
              <div className="absolute top-64 -right-4 lg:-right-8 glass-panel p-4 rounded-2xl shadow-xl animate-float-reverse">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2 uppercase tracking-wider">{t("landing.paletteMatch")}</p>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#E58C6B] border border-white dark:border-gray-900 shadow-sm"></div>
                  <div className="w-6 h-6 rounded-full bg-[#4A5D4E] border border-white dark:border-gray-900 shadow-sm"></div>
                  <div className="w-6 h-6 rounded-full bg-[#D4C3B3] border border-white dark:border-gray-900 shadow-sm"></div>
                  <div className="w-6 h-6 rounded-full bg-brand border border-white dark:border-gray-900 shadow-sm flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Floating UI Element 3: Fit Score */}
              <div className="absolute -bottom-6 right-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-4 rounded-2xl shadow-2xl flex items-center gap-3 transform rotate-[-2deg] transition-transform hover:rotate-0">
                <div className="relative flex-shrink-0">
                  <svg className="w-10 h-10 transform -rotate-90">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="3"
                      strokeDasharray="100"
                      strokeDashoffset="5"
                      className="text-accent"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-accent">98%</span>
                </div>
                <div>
                  <p className="text-sm font-bold">{t("landing.fitScore")}</p>
                  <p className="text-xs opacity-60">{t("landing.basedOnProfile")}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Features Highlight Strip */}
      <section className="relative z-10 w-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border-t border-white/60 dark:border-gray-800/60 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-12">

            {/* Feature 1 */}
            <Link href="/measurements" className="flex items-start gap-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-brand/10 group-hover:bg-brand/20 transition-colors flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </div>
              <div>
                <h3 className="font-cabinet font-bold text-gray-900 dark:text-white mb-1 group-hover:text-brand transition-colors">{t("landing.liveMeasurement")}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing.liveMeasurementDesc")}</p>
              </div>
            </Link>

            {/* Feature 2 */}
            <Link href="/color-analysis" className="flex items-start gap-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-brand/10 group-hover:bg-brand/20 transition-colors flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25C9.996 3 10.5 3.504 10.5 4.125v14.625a3.75 3.75 0 01-3.75 3.75zm9.15-9.15l4.95-4.95a2.25 2.25 0 000-3.182l-2.122-2.122a2.25 2.25 0 00-3.182 0l-4.95 4.95" />
                  <circle cx="6.75" cy="17.25" r=".75" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="font-cabinet font-bold text-gray-900 dark:text-white mb-1 group-hover:text-brand transition-colors">{t("landing.colorAnalysisFeature")}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing.colorAnalysisFeatureDesc")}</p>
              </div>
            </Link>

            {/* Feature 3 */}
            <a href="#virtual-tryon" className="flex items-start gap-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-brand/10 group-hover:bg-brand/20 transition-colors flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <h3 className="font-cabinet font-bold text-gray-900 dark:text-white mb-1 group-hover:text-brand transition-colors">{t("landing.virtualTryOnFeature")}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing.virtualTryOnFeatureDesc")}</p>
              </div>
            </a>

            {/* Feature 4 */}
            <a href="#occasion-styling" className="flex items-start gap-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-brand/10 group-hover:bg-brand/20 transition-colors flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                </svg>
              </div>
              <div>
                <h3 className="font-cabinet font-bold text-gray-900 dark:text-white mb-1 group-hover:text-brand transition-colors">{t("landing.occasionStyling")}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing.occasionStylingDesc")}</p>
              </div>
            </a>

          </div>
        </div>
      </section>

    </div>
  );
}
