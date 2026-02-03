"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AttireAI
              </span>
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="w-20 h-10 bg-slate-200 rounded-lg animate-pulse" />
              ) : user ? (
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Your Personal
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {" "}AI Stylist
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Get personalized outfit recommendations based on your body measurements,
            coloring, and style preferences. Shop with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth?mode=signup"
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Start Free
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-4 bg-white text-slate-700 rounded-xl font-semibold text-lg hover:bg-slate-50 transition-colors border border-slate-200"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "📏",
                title: "Body Measurements",
                description: "Use your camera or manually input your measurements for accurate sizing recommendations.",
              },
              {
                icon: "🎨",
                title: "Color Analysis",
                description: "We analyze your skin tone and hair color to find colors that complement you.",
              },
              {
                icon: "👗",
                title: "AI Recommendations",
                description: "Get complete outfit suggestions tailored to your occasion, style, and budget.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl bg-slate-50 text-center hover:shadow-lg transition-shadow"
              >
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Why AttireAI?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "Accurate Sizing", desc: "No more returns due to fit issues" },
              { title: "Style Matching", desc: "Outfits that match your personality" },
              { title: "Direct Purchase Links", desc: "Buy items directly from retailers" },
              { title: "Virtual Try-On", desc: "See outfits on yourself (VIP)" },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl border border-slate-200 flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                  <p className="text-slate-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Style?
          </h2>
          <p className="text-indigo-100 mb-8 text-lg">
            Join thousands of users who shop smarter with AI-powered recommendations.
          </p>
          <Link
            href="/auth?mode=signup"
            className="inline-block px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold text-lg hover:bg-indigo-50 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto text-center">
          <p>&copy; 2026 AttireAI. CS 407 Senior Project - Team 11.</p>
        </div>
      </footer>
    </div>
  );
}
