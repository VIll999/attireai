"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { auth, deleteUser } from "@/lib/firebase";
import { deleteUserFromBackend } from "@/lib/api";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    setIsDeleting(true);
    try {
      // Delete from backend first
      await deleteUserFromBackend(auth.currentUser.uid);
      // Then delete from Firebase
      await deleteUser(auth.currentUser);
      router.push("/auth");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/requires-recent-login") {
        alert("Please sign out and sign in again before deleting your account.");
      } else {
        alert(error.message || "Failed to delete account");
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // This check is handled by layout, but TypeScript needs it
  if (!user) return null;

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
                <Link href="/outfits" className="text-slate-600 hover:text-slate-900">
                  Outfits
                </Link>
                <Link href="/measurements" className="text-slate-600 hover:text-slate-900">
                  Measurements
                </Link>
                <Link href="/saved" className="text-slate-600 hover:text-slate-900">
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
                  href: "/measurements",
                  color: "bg-blue-50 text-blue-600",
                },
                {
                  icon: "🎨",
                  title: "Color Analysis",
                  description: "Find your best colors",
                  href: "/colors",
                  color: "bg-purple-50 text-purple-600",
                },
                {
                  icon: "👔",
                  title: "Style Quiz",
                  description: "Discover your style",
                  href: "/style",
                  color: "bg-amber-50 text-amber-600",
                },
                {
                  icon: "👗",
                  title: "Get Outfit",
                  description: "AI recommendations",
                  href: "/outfits/new",
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
              href="/measurements"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Danger Zone - Delete Account (for testing) */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-slate-600 text-sm mb-4">
            Delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Account?</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
