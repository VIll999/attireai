"use client";

import { useState } from "react";
import AppNav from "@/components/AppNav";
import { useLocale } from "@/context/LocaleContext";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How do I create my first outfit recommendation?",
    answer: "Start by creating a measurement profile under 'Measurements', then set your style preferences. Once done, go to 'Recommendations' and click 'AI Generate Recommendations' to get personalized outfit suggestions."
  },
  {
    category: "Getting Started",
    question: "Do I need to take measurements manually?",
    answer: "No! You can either enter measurements manually or use our camera-based measurement tool for quick and accurate results."
  },
  {
    category: "Measurements",
    question: "How accurate is the camera measurement?",
    answer: "Our camera-based measurement uses advanced AI to estimate your body measurements. For best results, stand in good lighting wearing fitted clothing, and follow the on-screen alignment guides."
  },
  {
    category: "Measurements",
    question: "Can I have multiple measurement profiles?",
    answer: "Yes! You can create multiple measurement profiles (e.g., for different body goals or for family members). Set one as 'Primary' to use it by default."
  },
  {
    category: "Color Analysis",
    question: "What is color analysis?",
    answer: "Color analysis determines your skin tone and hair color to recommend clothing colors that complement your natural coloring. This helps you choose outfits that make you look your best."
  },
  {
    category: "Color Analysis",
    question: "How do I get my color analysis?",
    answer: "Go to 'Color Analysis' and upload a photo of yourself in natural lighting without makeup. Our AI will analyze your skin tone and hair color to provide personalized color recommendations."
  },
  {
    category: "Recommendations",
    question: "How are outfit recommendations generated?",
    answer: "Our AI combines your measurements, style preferences, color profile, and occasion needs to search for real products that match your criteria. Each recommendation includes items you can purchase directly."
  },
  {
    category: "Recommendations",
    question: "Can I swap items in a recommended outfit?",
    answer: "Yes! Click 'Show Alternatives' on any item to see similar options. You can replace items to customize the outfit to your taste."
  },
  {
    category: "Recommendations",
    question: "What does the size recommendation mean?",
    answer: "Based on your measurements, we recommend a size for each item. This is our best estimate, but always check the brand's size chart before purchasing."
  },
  {
    category: "Saved Outfits",
    question: "How do I save an outfit?",
    answer: "Click the bookmark icon on any outfit recommendation to save it to your favorites. You can organize saved outfits into collections."
  },
  {
    category: "Saved Outfits",
    question: "Can I filter my saved outfits?",
    answer: "Yes! Use filters like occasion, weather, style, price range, and brands to quickly find saved outfits that match your needs."
  },
  {
    category: "Account",
    question: "How do I change my profile information?",
    answer: "Go to 'Profile' and click 'Edit Profile' to update your name and profile picture."
  },
  {
    category: "Account",
    question: "How do I delete my account?",
    answer: "Go to 'Profile' and scroll to the bottom. Click 'Delete Account' and confirm. All your data will be permanently removed."
  },
  {
    category: "Account",
    question: "What's the difference between FREE and VIP?",
    answer: "FREE users get basic AI recommendations and color analysis. VIP members get enhanced AI analysis with professional color seasons, priority support, and advanced features."
  },
  {
    category: "Troubleshooting",
    question: "Why aren't I getting recommendations?",
    answer: "Make sure you have: 1) Created a measurement profile, 2) Set your style preferences, and 3) Selected an occasion. If the issue persists, try refreshing the page."
  },
  {
    category: "Troubleshooting",
    question: "The photos aren't loading. What should I do?",
    answer: "This might be due to network issues or browser cache. Try refreshing the page, clearing your browser cache, or using a different browser."
  },
  {
    category: "Troubleshooting",
    question: "How do I contact support?",
    answer: "For technical issues or questions, email us at support@attireai.com. We typically respond within 24 hours."
  }
];

const CATEGORIES = [
  "All",
  "Getting Started",
  "Measurements",
  "Color Analysis",
  "Recommendations",
  "Saved Outfits",
  "Account",
  "Troubleshooting"
];

export default function HelpPage() {
  const { t } = useLocale();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredFAQ = FAQ_DATA.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-stone-950">
      <AppNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-cabinet font-extrabold text-stone-900 dark:text-white mb-4">
            Help & FAQ
          </h1>
          <p className="text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
            Find answers to common questions about AttireAI
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
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-colors text-stone-900 dark:text-white"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
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
                {category}
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
                No results found. Try a different search or category.
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
          <h2 className="text-2xl font-bold mb-2">Still need help?</h2>
          <p className="mb-6 opacity-90">
            Our support team is here to assist you
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
            Contact Support
          </a>
        </div>
      </main>
    </div>
  );
}
