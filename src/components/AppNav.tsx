"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale } from "@/context/LocaleContext";

interface AppNavProps {
  activePage: "dashboard" | "outfits" | "measurements" | "colors" | "profile";
}

export default function AppNav({ activePage }: AppNavProps) {
  const { user, dbUser, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useLocale();

  const displayName = dbUser?.name || user?.displayName || user?.email?.split("@")[0] || "User";
  const displayEmail = dbUser?.email || user?.email || "";
  const displayPicture = dbUser?.profile_picture_url || user?.photoURL || "";

  const navLinks = [
    { key: "dashboard" as const, href: "/dashboard", label: t("nav.dashboard") },
    { key: "measurements" as const, href: "/measurements", label: t("nav.measurements") },
    { key: "colors" as const, href: "/color-analysis", label: t("nav.colors") },
    { key: "outfits" as const, href: "/outfits", label: t("nav.outfits") },
    { key: "profile" as const, href: "/profile", label: t("nav.profile") },
  ];

  return (
    <nav className="bg-white dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-glow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="font-cabinet font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">AttireAI</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={
                  activePage === link.key
                    ? "text-brand dark:text-brand-400 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand-400 transition-colors"
                }
              >
                {link.label}
              </Link>
            ))}
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

            {/* Profile Link */}
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-brand/10 dark:bg-brand/20 rounded-full flex items-center justify-center overflow-hidden border border-brand/20">
                {displayPicture ? (
                  <img
                    src={displayPicture}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-brand dark:text-brand-400 font-bold text-sm">
                    {displayEmail.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300">
                {displayName}
              </span>
            </Link>

            {/* Sign Out */}
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
