"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale } from "@/context/LocaleContext";

interface AppNavProps {
  activePage?: "dashboard" | "tutorial" | "style-quiz" | "help" | "saved-outfits" | "profile" | "preferences" | "vip";
}

export default function AppNav({ activePage }: AppNavProps) {
  const { user, dbUser, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = dbUser?.name || user?.displayName || user?.email?.split("@")[0] || "User";
  const displayEmail = dbUser?.email || user?.email || "";
  const displayPicture = dbUser?.profile_picture_url || user?.photoURL || "";

  const navLinks = [
    { key: "dashboard" as const, href: "/dashboard", label: t("nav.dashboard") },
    { key: "tutorial" as const, href: "/tutorial", label: "Tutorial" },
    { key: "style-quiz" as const, href: "/style-quiz", label: "Style Quiz" },
    { key: "saved-outfits" as const, href: "/saved-outfits", label: "Saved Outfits" },
    { key: "vip" as const, href: "/vip", label: "VIP" },
    { key: "help" as const, href: "/help", label: "Help & FAQ" },
    { key: "profile" as const, href: "/profile", label: t("nav.profile") },
    { key: "preferences" as const, href: "/preferences", label: t("nav.preferences") },
  ];

  const themeToggleIcon = theme === "dark" ? (
    <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );

  const profileAvatar = (
    <div className="w-8 h-8 bg-brand/10 dark:bg-brand/20 rounded-full flex items-center justify-center overflow-hidden border border-brand/20 flex-shrink-0">
      {displayPicture ? (
        <img src={displayPicture} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <span className="text-brand dark:text-brand-400 font-bold text-sm">
          {displayEmail.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  const langOptions: { value: "en" | "zh" | "es"; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "zh", label: "中" },
    { value: "es", label: "ES" },
  ];

  return (
    <nav className="bg-white dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
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

          {/* Desktop Navigation Links — hidden below lg (1024px) */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 font-medium text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={
                  activePage === link.key
                    ? "text-brand dark:text-brand-400 font-semibold whitespace-nowrap"
                    : "text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand-400 transition-colors whitespace-nowrap"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions — hidden below lg (1024px) */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-lg p-0.5">
              {langOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLocale(value)}
                  className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md transition-all ${
                    locale === value
                      ? "bg-brand text-white shadow-sm"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors" aria-label="Toggle theme">
              {themeToggleIcon}
            </button>

            {/* Profile Link */}
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {profileAvatar}
              <span className="hidden xl:block text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {displayName}
              </span>
            </Link>

            {/* Sign Out */}
            <button
              onClick={signOut}
              className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap"
            >
              {t("nav.signOut")}
            </button>
          </div>

          {/* Mobile/Tablet: Theme Toggle + Hamburger — visible below lg (1024px) */}
          <div className="flex lg:hidden items-center gap-1">
            <button onClick={toggleTheme} className="p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors" aria-label="Toggle theme">
              {themeToggleIcon}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile/Tablet Dropdown — visible below lg (1024px) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
          <div className="px-4 py-3 space-y-1">

            {/* Nav Links */}
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activePage === link.key
                    ? "bg-brand/10 text-brand dark:text-brand-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-stone-200 dark:border-stone-800 !mt-3 !mb-1" />

            {/* User Info */}
            <div className="flex items-center gap-3 px-3 py-2">
              {profileAvatar}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayEmail}</p>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-xs text-stone-500 dark:text-stone-400">{t("nav.language")}</span>
              <div className="flex items-center gap-1 bg-white dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-lg p-1">
                {langOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setLocale(value)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${
                      locale === value
                        ? "bg-brand text-white shadow-sm"
                        : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign Out */}
            <button
              onClick={() => { signOut(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              {t("nav.signOut")}
            </button>

          </div>
        </div>
      )}
    </nav>
  );
}