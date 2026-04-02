"use client";

import { useState, useMemo } from "react";
import AppNav from "@/components/AppNav";
import { useLocale } from "@/context/LocaleContext";
import { FAQ_DATA_EN, FAQ_DATA_ZH, FAQ_DATA_ES } from "./faqData";

export default function HelpPage() {
  const { t, locale } = useLocale();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Select FAQ data based on current locale
  const FAQ_DATA = useMemo(() => {
    switch (locale) {
      case "zh":
        return FAQ_DATA_ZH;
      case "es":
        return FAQ_DATA_ES;
      default:
        return FAQ_DATA_EN;
    }
  }, [locale]);

  // Get unique categories from current FAQ data
  const CATEGORIES = useMemo(() => {
    const categories = ["All", ...Array.from(new Set(FAQ_DATA.map(item => item.category)))];
    return categories;
  }, [FAQ_DATA]);

  const filteredFAQ = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch =
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [FAQ_DATA, selectedCategory, searchQuery]);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-stone-950">
      <AppNav activePage="help" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-cabinet font-extrabold text-stone-900 dark:text-white mb-4">
            {t("faq.title")}
          </h1>
          <p className="text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
            {t("faq.subtitle")}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={t("faq.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-colors text-stone-900 dark:text-white"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 mb-3 uppercase tracking-wider">
            {t("faq.categories")}
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-brand text-white shadow-md"
                    : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-brand"
                }`}
              >
                {category === "All" ? t("faq.allCategories") : category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFAQ.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-stone-300 dark:text-stone-700 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-stone-500 dark:text-stone-400">
                {locale === "zh" ? "未找到结果。请尝试不同的搜索或类别。" :
                 locale === "es" ? "No se encontraron resultados. Prueba con una búsqueda o categoría diferente." :
                 "No results found. Try a different search or category."}
              </p>
            </div>
          ) : (
            filteredFAQ.map((item, index) => (
              <div
                key={index}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden hover:border-brand transition-colors"
              >
                <button
                  onClick={() => toggleExpand(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex-1">
                    <span className="inline-block text-xs font-semibold text-brand dark:text-brand-400 uppercase tracking-wider mb-1">
                      {item.category}
                    </span>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                      {item.question}
                    </h3>
                  </div>
                  <svg
                    className={`w-5 h-5 text-stone-400 transition-transform flex-shrink-0 ml-4 ${
                      expandedIndex === index ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {expandedIndex === index && (
                  <div className="px-6 pb-4 border-t border-stone-100 dark:border-stone-800 pt-4">
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-gradient-to-r from-brand to-brand-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">
            {locale === "zh" ? "仍需要帮助？" :
             locale === "es" ? "¿Aún necesitas ayuda?" :
             "Still need help?"}
          </h2>
          <p className="mb-6 opacity-90">
            {locale === "zh" ? "我们的支持团队随时为您提供帮助" :
             locale === "es" ? "Nuestro equipo de soporte está aquí para ayudarte" :
             "Our support team is here to assist you"}
          </p>
          <a
            href="mailto:support@attireai.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand rounded-lg font-semibold hover:bg-stone-100 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {locale === "zh" ? "联系支持" :
             locale === "es" ? "Contactar Soporte" :
             "Contact Support"}
          </a>
        </div>
      </main>
    </div>
  );
}
