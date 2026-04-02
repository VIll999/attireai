"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLearningStats, LearningStatsResponse } from "@/lib/api";

interface LearningIndicatorProps {
  showStats?: boolean;
  className?: string;
}

export default function LearningIndicator({
  showStats = true,
  className = "",
}: LearningIndicatorProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<LearningStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    getLearningStats(user.uid)
      .then((data) => setStats(data))
      .catch((err) => {
        console.error("Failed to load learning stats:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user]);

  if (isLoading) {
    return (
      <div className={`glass-panel p-4 rounded-2xl border border-stone-200/50 dark:border-stone-700/50 ${className}`}>
        <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  const progress = Math.min((stats.total_ratings / stats.min_ratings_needed) * 100, 100);
  const remainingRatings = Math.max(stats.min_ratings_needed - stats.total_ratings, 0);

  return (
    <div className={`glass-panel p-6 rounded-2xl border border-stone-200/50 dark:border-stone-700/50 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
          </div>
          {stats.learning_active && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white font-cabinet">
            AI Learning
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.learning_active ? "Active" : "Building your profile"}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {!stats.learning_active && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Learning Progress
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {stats.total_ratings} / {stats.min_ratings_needed}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Rate {remainingRatings} more {remainingRatings === 1 ? "outfit" : "outfits"} to activate personalized learning
          </p>
        </div>
      )}

      {/* Stats */}
      {showStats && stats.learning_active && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-green-600 dark:text-green-400"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Likes</span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.likes}</p>
          </div>

          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-red-600 dark:text-red-400"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs font-medium text-red-700 dark:text-red-300">Dislikes</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.dislikes}</p>
          </div>
        </div>
      )}

      {/* Active Learning Message */}
      {stats.learning_active && (
        <div className="mt-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
          <p className="text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Recommendations are now personalized based on your ratings</span>
          </p>
        </div>
      )}
    </div>
  );
}
