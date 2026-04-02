"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { saveStylePreferences, PriceRange } from "@/lib/api";

// Quiz questions with weighted scoring for each style
const QUIZ_QUESTIONS = [
  { id: 1, options: 4, scores: true },
  { id: 2, options: 4, scores: true },
  { id: 3, options: 4, scores: true },
  { id: 4, options: 4, scores: true },
  { id: 5, options: 4, scores: true },
  { id: 6, options: 3, scores: false },  // Budget question
];

// Scoring system for each question
const SCORING_MATRIX = {
  1: [
    { minimalist: 3, classic: 2, elegant: 1 },
    { streetwear: 3, bohemian: 2, casual: 1 },
    { bohemian: 3, vintage: 2, casual: 2 },
    { preppy: 3, elegant: 2, classic: 1 },
  ],
  2: [
    { minimalist: 3, casual: 2 },
    { athleisure: 3, streetwear: 2, casual: 1 },
    { bohemian: 3, casual: 1 },
    { preppy: 3, classic: 2, elegant: 1 },
  ],
  3: [
    { minimalist: 3, athleisure: 1 },
    { elegant: 3, streetwear: 2 },
    { bohemian: 3, vintage: 2 },
    { classic: 3, preppy: 2, elegant: 1 },
  ],
  4: [
    { elegant: 3, classic: 2 },
    { streetwear: 3, vintage: 1 },
    { casual: 3, preppy: 2, bohemian: 1 },
    { bohemian: 3, vintage: 2 },
  ],
  5: [
    { classic: 3, minimalist: 2 },
    { streetwear: 3, elegant: 1 },
    { preppy: 2, casual: 2, athleisure: 1 },
    { vintage: 3, bohemian: 2 },
  ],
};

const STYLE_INFO = {
  minimalist: { emoji: "◻", color: "#888", name: "Minimalist" },
  streetwear: { emoji: "◈", color: "#1C1C1C", name: "Streetwear" },
  classic: { emoji: "◇", color: "#7A6247", name: "Classic" },
  bohemian: { emoji: "✿", color: "#9B7B4F", name: "Bohemian" },
  preppy: { emoji: "◉", color: "#3B6EA5", name: "Preppy" },
  athleisure: { emoji: "⚡", color: "#2A7A8C", name: "Athleisure" },
  vintage: { emoji: "◎", color: "#A07850", name: "Vintage" },
  elegant: { emoji: "✦", color: "#7B5EA7", name: "Elegant" },
  casual: { emoji: "○", color: "#4A9060", name: "Casual" },
};

export default function StyleQuiz() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLocale();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [results, setResults] = useState<{ style: string; score: number }[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<PriceRange>("MID_RANGE");

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    // Check if it's the budget question (question 6)
    if (currentQuestion === 5) {
      const budgets: PriceRange[] = ["BUDGET", "MID_RANGE", "LUXURY"];
      setSelectedBudget(budgets[optionIndex]);
    }

    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults(newAnswers);
    }
  };

  const calculateResults = (finalAnswers: number[]) => {
    const scores: Record<string, number> = {
      minimalist: 0,
      streetwear: 0,
      classic: 0,
      bohemian: 0,
      preppy: 0,
      athleisure: 0,
      vintage: 0,
      elegant: 0,
      casual: 0,
    };

    finalAnswers.forEach((answerIndex, questionIndex) => {
      const questionId = questionIndex + 1;
      if (questionId <= 5) {
        const scoreMap = SCORING_MATRIX[questionId as keyof typeof SCORING_MATRIX][answerIndex];
        Object.entries(scoreMap).forEach(([style, points]) => {
          scores[style] += points;
        });
      }
    });

    const sortedResults = Object.entries(scores)
      .map(([style, score]) => ({ style, score }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    setResults(sortedResults);
    setIsComplete(true);
  };

  const handleSaveResults = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Top 3 styles as preferred
      const topStyles = results.slice(0, 3).map(r => r.style);

      // Bottom 2 styles as avoided (if score is 0 or very low)
      const avoidedStyles = results
        .slice(-2)
        .filter(r => r.score === 0)
        .map(r => r.style);

      await saveStylePreferences(user.uid, {
        preferred_styles: topStyles,
        avoided_styles: avoidedStyles,
        price_range: selectedBudget,
        preferred_brands: [],
        excluded_brands: [],
      });

      router.push("/preferences");
    } catch (error) {
      console.error("Failed to save quiz results:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setIsComplete(false);
    setResults([]);
    setSelectedBudget("MID_RANGE");
  };

  const progress = ((currentQuestion + (isComplete ? 1 : 0)) / QUIZ_QUESTIONS.length) * 100;

  if (isComplete) {
    return (
      <div className="min-h-screen bg-white dark:bg-stone-950 flex flex-col">
        <AppNav activePage="style-quiz" />

        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-3">
              {t("styleQuiz.title")}
            </h1>
            <p className="text-gray-600 dark:text-stone-400">
              {t("styleQuiz.subtitle")}
            </p>
          </div>

          {/* Top 3 Save Note */}
          <div className="mb-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              💡 {t("styleQuiz.saveNote")}
            </p>
          </div>

          <div className="space-y-6 mb-12">
            {results.slice(0, 5).map((result, index) => {
              const styleInfo = STYLE_INFO[result.style as keyof typeof STYLE_INFO];
              const percentage = (result.score / results[0].score) * 100;

              return (
                <div
                  key={result.style}
                  className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{styleInfo.emoji}</span>
                      <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">
                          {index === 0 && "🏆 "}
                          {t(`styles.${result.style}`)}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-stone-400">
                          {t("styleQuiz.scoreLabel")} {result.score} {t("styleQuiz.points")}
                        </p>
                      </div>
                    </div>
                    {index < 3 && (
                      <span className="px-3 py-1 bg-[#0B5563]/10 dark:bg-[#0B5563]/20 text-[#0B5563] dark:text-[#4AABB8] text-xs font-bold rounded-full">
                        TOP {index + 1}
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: styleInfo.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 mb-8">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">
              {t("styleQuiz.budgetPreference")}
            </h3>
            <p className="text-gray-600 dark:text-stone-400">
              {selectedBudget === "BUDGET" && t("styleQuiz.budgetFriendly")}
              {selectedBudget === "MID_RANGE" && t("styleQuiz.midRange")}
              {selectedBudget === "LUXURY" && t("styleQuiz.luxury")}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSaveResults}
              disabled={isSaving}
              className="flex-1 bg-[#0B5563] text-white py-4 rounded-xl font-bold hover:bg-[#09444F] transition-all disabled:opacity-50"
            >
              {isSaving ? t("common.saving") : t("styleQuiz.saveToPreferences")}
            </button>
            <button
              onClick={handleRetake}
              className="px-6 py-4 border-2 border-gray-200 dark:border-stone-700 text-gray-700 dark:text-stone-300 rounded-xl font-bold hover:border-[#0B5563] hover:text-[#0B5563] dark:hover:border-[#4AABB8] dark:hover:text-[#4AABB8] transition-all"
            >
              {t("styleQuiz.retakeQuiz")}
            </button>
          </div>
        </main>
      </div>
    );
  }

  const question = QUIZ_QUESTIONS[currentQuestion];
  const questionKey = `q${currentQuestion + 1}`;

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex flex-col">
      <AppNav activePage="style-quiz" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-gray-500 dark:text-stone-400">
              {t("styleQuiz.questionOf")} {currentQuestion + 1} {t("styleQuiz.of")} {QUIZ_QUESTIONS.length}
            </span>
            <span className="text-sm font-bold text-[#0B5563] dark:text-[#4AABB8]">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[#0B5563] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
            {t(`styleQuiz.${questionKey}`)}
          </h1>
          <p className="text-gray-600 dark:text-stone-400">
            {t("styleQuiz.chooseOption")}
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: question.options }).map((_, index) => {
            const optionKey = `${questionKey}o${index + 1}`;
            const descKey = `${questionKey}o${index + 1}d`;
            const emoji = ["⬜", "🌈", "🍂", "🌸", "◻", "⚡", "✿", "◇", "⌚", "💎", "✨", "◉", "✦", "◈", "○", "⊗", "🚀", "✓", "◎", "💵", "💳"][currentQuestion * 4 + index] || "●";

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className="group relative bg-white dark:bg-stone-900 border-2 border-gray-200 dark:border-stone-800 rounded-2xl p-8 text-left hover:border-[#0B5563] dark:hover:border-[#4AABB8] hover:shadow-xl transition-all duration-200"
              >
                <div className="flex flex-col items-start gap-4">
                  <span className="text-5xl">{emoji}</span>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 group-hover:text-[#0B5563] dark:group-hover:text-[#4AABB8] transition-colors">
                      {t(`styleQuiz.${optionKey}`)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-stone-400">
                      {t(`styleQuiz.${descKey}`)}
                    </p>
                  </div>
                </div>

                {/* Hover Arrow */}
                <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 text-[#0B5563] dark:text-[#4AABB8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Back Button */}
        {currentQuestion > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setCurrentQuestion(currentQuestion - 1);
                setAnswers(answers.slice(0, -1));
              }}
              className="text-sm font-bold text-gray-500 dark:text-stone-400 hover:text-[#0B5563] dark:hover:text-[#4AABB8] transition-colors"
            >
              {t("styleQuiz.backToPrevious")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
