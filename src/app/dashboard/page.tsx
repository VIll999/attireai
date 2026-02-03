"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AttireAI
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-indigo-600 font-medium">
                  Dashboard
                </Link>
                <Link href="/dashboard/outfits" className="text-slate-600 hover:text-slate-900">
                  Outfits
                </Link>
                <Link href="/dashboard/measurements" className="text-slate-600 hover:text-slate-900">
                  Measurements
                </Link>
                <Link href="/dashboard/saved" className="text-slate-600 hover:text-slate-900">
                  Saved
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <span className="text-indigo-600 font-semibold">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-sm text-slate-600">
                  {user.displayName || user.email}
                </span>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back{user.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-slate-600 mt-1">
            Ready to find your perfect outfit?
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Completion Card */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Profile</h2>
            <div className="space-y-3">
              {[
                { label: "Measurements", completed: false },
                { label: "Color Analysis", completed: false },
                { label: "Style Preferences", completed: false },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-600">{item.label}</span>
                  {item.completed ? (
                    <span className="text-green-600 text-sm font-medium">Completed</span>
                  ) : (
                    <span className="text-amber-600 text-sm font-medium">Pending</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Profile Completion</span>
                <span className="text-sm font-medium text-slate-900">0%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: "0%" }} />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: "📏",
                  title: "Add Measurements",
                  description: "Use camera or manual input",
                  href: "/dashboard/measurements",
                  color: "bg-blue-50 text-blue-600",
                },
                {
                  icon: "🎨",
                  title: "Color Analysis",
                  description: "Find your best colors",
                  href: "/dashboard/colors",
                  color: "bg-purple-50 text-purple-600",
                },
                {
                  icon: "👔",
                  title: "Style Quiz",
                  description: "Discover your style",
                  href: "/dashboard/style",
                  color: "bg-amber-50 text-amber-600",
                },
                {
                  icon: "👗",
                  title: "Get Outfit",
                  description: "AI recommendations",
                  href: "/dashboard/outfits/new",
                  color: "bg-green-50 text-green-600",
                },
              ].map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${action.color}`}>
                    {action.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{action.title}</h3>
                    <p className="text-sm text-slate-600">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Outfits</h2>
          <div className="text-center py-12 text-slate-500">
            <div className="text-5xl mb-4">👗</div>
            <p className="text-lg font-medium text-slate-700">No outfits yet</p>
            <p className="text-slate-500 mb-4">Complete your profile to get personalized recommendations</p>
            <Link
              href="/dashboard/measurements"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
