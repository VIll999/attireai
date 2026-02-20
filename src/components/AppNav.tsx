"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale, Locale } from "@/context/LocaleContext";

interface AppNavProps {
  activePage: "dashboard" | "outfits" | "measurements" | "profile";
}

export default function AppNav({ activePage }: AppNavProps) {
  const { user, dbUser, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale, localeLabels } = useLocale();

  const displayName = dbUser?.name || user?.displayName || user?.email?.split("@")[0] || "User";
  const displayEmail = dbUser?.email || user?.email || "";
  const displayPicture = dbUser?.profile_picture_url || user?.photoURL || "";

  const navLinks = [
    { key: "dashboard" as const, href: "/dashboard", label: t("nav.dashboard") },
    { key: "outfits" as const, href: "/outfits", label: t("nav.outfits") },
    { key: "measurements" as const, href: "/measurements", label: t("nav.measurements") },
    { key: "profile" as const, href: "/profile", label: t("nav.profile") },
  ];

  return (
    <nav className="bg-white dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-2xl font-bold tracking-wide bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
              AttireAI
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className={
                    activePage === link.key
                      ? "text-amber-600 font-medium"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center overflow-hidden">
                {displayPicture ? (
                  <img
                    src={displayPicture}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-amber-600 font-semibold">
                    {displayEmail.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="hidden sm:block text-sm text-stone-600 dark:text-stone-400">
                {displayName}
              </span>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800 transition-colors"
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
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5">
              {(Object.keys(localeLabels) as Locale[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    locale === loc
                      ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  {localeLabels[loc]}
                </button>
              ))}
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white font-medium"
            >
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
