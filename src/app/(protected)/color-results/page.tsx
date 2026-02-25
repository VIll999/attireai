"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ColorResultsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Simulate loading (data should already be ready from animation)
    setTimeout(() => setIsLoading(false), 300);
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-stone-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand dark:border-brand-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col bg-[#FAFAFC] dark:bg-stone-950">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-brand/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Navigation */}
      <header className="w-full px-6 lg:px-12 py-6 relative z-50 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <div className="w-8 h-8 rounded-lg bg-brand dark:bg-brand-400 flex items-center justify-center text-white dark:text-gray-900 shadow-glow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="font-cabinet font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">AttireAI</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 lg:py-12">
        {/* Progress Stepper */}
        <div className="w-full max-w-3xl mx-auto mb-16">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 rounded-full"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[62.5%] h-1 bg-brand dark:bg-brand-400 -z-10 rounded-full"></div>

            {/* Step 1 (Completed) */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-brand dark:text-brand-400 uppercase tracking-widest">Capture</span>
            </div>

            {/* Step 2 (Active) */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white dark:bg-stone-900 border-4 border-brand dark:border-brand-400 text-brand dark:text-brand-400 flex items-center justify-center shadow-glow relative">
                <span className="absolute inset-0 rounded-full border border-brand dark:border-brand-400 animate-ping opacity-30"></span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Analysis</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Try-on</span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Shop</span>
            </div>
          </div>
        </div>

        {/* Coming Soon Message */}
        <div className="flex flex-col items-center justify-center py-20">
          <div className="glass-panel rounded-[2.5rem] p-12 text-center max-w-2xl" style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.9)" }}>
            <svg className="w-20 h-20 text-brand dark:text-brand-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <h1 className="text-4xl font-cabinet font-extrabold text-gray-900 dark:text-white mb-4">
              Color Analysis Results
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Your color profile has been saved successfully! The results page is coming soon.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/color-analysis"
                className="px-8 py-4 rounded-full border-2 border-brand/20 dark:border-brand/30 text-brand dark:text-brand-400 font-bold hover:bg-brand/5 dark:hover:bg-brand/10 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Recapture Colors
              </Link>
              <Link
                href="/dashboard"
                className="px-12 py-4 rounded-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 font-bold text-lg hover:bg-brand-600 dark:hover:bg-brand-500 transition-all shadow-glow hover:translate-y-[-2px] active:translate-y-0 flex items-center gap-3"
              >
                Go to Dashboard
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
