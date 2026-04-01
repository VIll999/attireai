"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  action?: {
    label: string;
    path: string;
  };
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "Welcome to AttireAI!",
    description: "Get personalized outfit recommendations powered by AI. Let's get you started in 4 simple steps.",
    icon: "👋",
  },
  {
    title: "Take the Style Quiz",
    description: "Answer 6 quick questions to discover your unique fashion style. We'll analyze your preferences and recommend styles that match your personality.",
    icon: "✨",
    action: {
      label: "Start Style Quiz",
      path: "/style-quiz"
    }
  },
  {
    title: "Create Your Measurement Profile",
    description: "Add your body measurements using our camera tool or manual input. This helps us recommend the perfect sizes for you.",
    icon: "📏",
    action: {
      label: "Go to Measurements",
      path: "/measurements"
    }
  },
  {
    title: "Complete Color Analysis",
    description: "Upload a photo to discover your best colors. We'll analyze your skin tone and hair color to suggest flattering outfit colors.",
    icon: "🎨",
    action: {
      label: "Start Color Analysis",
      path: "/color-analysis"
    }
  },
  {
    title: "You're All Set!",
    description: "Now you can generate AI-powered outfit recommendations tailored just for you. Let's find your perfect look!",
    icon: "🎉",
    action: {
      label: "Get Recommendations",
      path: "/recommendations"
    }
  }
];

export default function OnboardingTutorial() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem("attireai_onboarding_completed");

    if (!hasCompletedOnboarding) {
      // Small delay before showing to avoid flash
      setTimeout(() => setIsOpen(true), 500);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("attireai_onboarding_completed", "true");
    setIsOpen(false);
  };

  const handleComplete = () => {
    localStorage.setItem("attireai_onboarding_completed", "true");
    setIsOpen(false);
  };

  const handleAction = (path: string) => {
    localStorage.setItem("attireai_onboarding_completed", "true");
    setIsOpen(false);
    router.push(path);
  };

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-stone-200 dark:border-stone-800 animate-scale-in">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-brand to-brand-600 p-8 text-white">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <div className="text-6xl mb-4">{step.icon}</div>
            <h2 className="text-3xl font-bold mb-2">{step.title}</h2>
            <p className="text-white/90 text-lg">{step.description}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-stone-100 dark:bg-stone-800 h-2">
          <div
            className="h-full bg-gradient-to-r from-brand to-brand-600 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "w-8 bg-brand"
                    : index < currentStep
                    ? "w-2 bg-brand/50"
                    : "w-2 bg-stone-300 dark:bg-stone-700"
                }`}
              />
            ))}
          </div>

          {/* Action Button */}
          {step.action && (
            <div className="mb-6">
              <button
                onClick={() => handleAction(step.action!.path)}
                className="w-full py-4 px-6 bg-gradient-to-r from-brand to-brand-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {step.action.label}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={isFirstStep}
              className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:text-brand dark:hover:text-brand-400 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="text-sm text-stone-500 dark:text-stone-400 font-medium">
              {currentStep + 1} / {ONBOARDING_STEPS.length}
            </div>

            {isLastStep ? (
              <button
                onClick={handleComplete}
                className="px-6 py-2 bg-brand text-white rounded-lg font-semibold hover:bg-brand-600 transition-colors"
              >
                Get Started
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-brand text-white rounded-lg font-semibold hover:bg-brand-600 transition-colors flex items-center gap-2"
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Skip Button */}
          {!isLastStep && (
            <div className="text-center mt-6">
              <button
                onClick={handleSkip}
                className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              >
                Skip tutorial
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
