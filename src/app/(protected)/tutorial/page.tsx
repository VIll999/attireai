"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";

const TUTORIAL_STEPS = [
  {
    id: 1,
    title: "Welcome to AttireAI",
    emoji: "👋",
    description: "Your personal AI-powered fashion stylist that helps you discover your perfect style and get personalized outfit recommendations.",
    features: [
      "AI-driven outfit recommendations",
      "Personalized style analysis",
      "Save and track your favorite looks",
      "Budget-friendly options"
    ],
    action: null
  },
  {
    id: 2,
    title: "Discover Your Style",
    emoji: "✨",
    description: "Take our style quiz to understand your fashion preferences. We'll analyze your answers to recommend styles that match your personality.",
    features: [
      "6 quick questions",
      "Instant style profile",
      "Personalized recommendations",
      "Update anytime"
    ],
    action: {
      label: "Take Style Quiz",
      path: "/style-quiz",
      color: "brand"
    }
  },
  {
    id: 3,
    title: "Set Your Preferences",
    emoji: "⚙️",
    description: "Fine-tune your style preferences, budget range, and favorite brands to get the most accurate recommendations.",
    features: [
      "Choose preferred styles",
      "Set budget range",
      "Add favorite brands",
      "Avoid unwanted styles"
    ],
    action: {
      label: "Set Preferences",
      path: "/preferences",
      color: "brand"
    }
  },
  {
    id: 4,
    title: "Create Measurements",
    emoji: "📏",
    description: "Add your measurements to get accurate size recommendations for every item we suggest.",
    features: [
      "Multiple profiles",
      "Size recommendations",
      "Better fitting clothes",
      "Update anytime"
    ],
    action: {
      label: "Add Measurements",
      path: "/measurements",
      color: "brand"
    }
  },
  {
    id: 5,
    title: "Complete Color Analysis",
    emoji: "🎨",
    description: "Discover which colors complement your skin tone and hair color for the most flattering looks.",
    features: [
      "Professional color theory",
      "Seasonal color system",
      "Personalized palette",
      "Color-matched outfits"
    ],
    action: {
      label: "Analyze Colors",
      path: "/color-analysis",
      color: "brand"
    }
  },
  {
    id: 6,
    title: "Get Recommendations",
    emoji: "🎯",
    description: "Now you're ready! Get AI-powered outfit recommendations tailored to your style, budget, and measurements.",
    features: [
      "Complete outfit sets",
      "Real products from stores",
      "Price tracking",
      "Save favorites"
    ],
    action: {
      label: "Get Recommendations",
      path: "/recommendations",
      color: "green"
    }
  }
];

export default function Tutorial() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = (path: string) => {
    router.push(path);
  };

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex flex-col">
      <AppNav activePage="tutorial" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-gray-500 dark:text-stone-400">
              Step {currentStep + 1} of {TUTORIAL_STEPS.length}
            </span>
            <span className="text-sm font-bold text-[#0B5563] dark:text-[#4AABB8]">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[#0B5563] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-stone-900 border-2 border-gray-200 dark:border-stone-800 rounded-3xl p-12 mb-8 min-h-[500px] flex flex-col">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-7xl mb-6">{step.emoji}</div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
              {step.title}
            </h1>
            <p className="text-lg text-gray-600 dark:text-stone-400 max-w-2xl mx-auto">
              {step.description}
            </p>
          </div>

          {/* Features */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {step.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-xl"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0B5563] text-white flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-stone-300">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Action Button */}
          {step.action && (
            <button
              onClick={() => handleAction(step.action!.path)}
              className={`w-full py-4 rounded-xl font-bold transition-all ${
                step.action.color === "green"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-[#0B5563] text-white hover:bg-[#09444F]"
              }`}
            >
              {step.action.label} →
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-6 py-3 border-2 border-gray-200 dark:border-stone-700 text-gray-700 dark:text-stone-300 rounded-xl font-bold hover:border-[#0B5563] hover:text-[#0B5563] dark:hover:border-[#4AABB8] dark:hover:text-[#4AABB8] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-700"
          >
            ← Previous
          </button>

          {/* Step Indicators */}
          <div className="flex gap-2">
            {TUTORIAL_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-[#0B5563] w-8"
                    : index < currentStep
                    ? "bg-[#0B5563]/50"
                    : "bg-gray-300 dark:bg-stone-700"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentStep === TUTORIAL_STEPS.length - 1}
            className="px-6 py-3 bg-[#0B5563] text-white rounded-xl font-bold hover:bg-[#09444F] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>

        {/* Skip Tutorial */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm font-bold text-gray-500 dark:text-stone-400 hover:text-[#0B5563] dark:hover:text-[#4AABB8] transition-colors"
          >
            Skip Tutorial
          </button>
        </div>
      </main>
    </div>
  );
}
