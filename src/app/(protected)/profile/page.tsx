"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile, getCurrentUser, uploadProfilePicture } from "@/lib/api";

interface BackendUser {
  id: string;
  name: string;
  email: string;
  profile_picture_url: string | null;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch user data from backend
  useEffect(() => {
    const fetchUser = async () => {
      if (!user) return;

      try {
        const data = await getCurrentUser(user.uid);
        setBackendUser(data);
        setName(data.name);
        setProfilePictureUrl(data.profile_picture_url || "");
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setError("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      let newProfilePictureUrl = profilePictureUrl;

      // Upload new profile picture if selected
      if (selectedFile) {
        setIsUploading(true);
        try {
          const uploadResult = await uploadProfilePicture(user.uid, selectedFile);
          newProfilePictureUrl = uploadResult.url;
        } catch (uploadErr) {
          console.error("Failed to upload profile picture:", uploadErr);
          setError("Failed to upload profile picture. Please try again.");
          setIsSaving(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const updatedUser = await updateUserProfile(user.uid, {
        name: name.trim(),
        profile_picture_url: newProfilePictureUrl || undefined,
      });
      setBackendUser(updatedUser);
      setProfilePictureUrl(newProfilePictureUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (backendUser) {
      setName(backendUser.name);
      setProfilePictureUrl(backendUser.profile_picture_url || "");
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
    setError("");
  };

  if (!user) return null;

  const displayName = backendUser?.name || user.displayName || user.email?.split("@")[0] || "User";
  const displayEmail = backendUser?.email || user.email || "";
  const displayPicture = backendUser?.profile_picture_url || user.photoURL || "";

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
                <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                  Dashboard
                </Link>
                <Link href="/outfits" className="text-slate-600 hover:text-slate-900">
                  Outfits
                </Link>
                <Link href="/measurements" className="text-slate-600 hover:text-slate-900">
                  Measurements
                </Link>
                <Link href="/profile" className="text-indigo-600 font-medium">
                  Profile
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden">
                  {displayPicture ? (
                    <img
                      src={displayPicture}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-indigo-600 font-semibold">
                      {displayEmail.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-sm text-slate-600">
                  {displayName}
                </span>
              </Link>
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-600 mt-1">
            Manage your account information
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                  {displayPicture ? (
                    <img
                      src={displayPicture}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-indigo-600">
                      {displayEmail.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">{displayName}</h2>
                  <p className="text-indigo-100">{displayEmail}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                    {backendUser?.subscription_tier || "FREE"} Plan
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="p-6">
              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                      placeholder="Your name"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900">
                      {displayName}
                    </p>
                  )}
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900">
                    {displayEmail}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>

                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Profile Picture
                  </label>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="w-20 h-20 rounded-full object-cover"
                            />
                          ) : displayPicture ? (
                            <img
                              src={displayPicture}
                              alt="Profile"
                              className="w-20 h-20 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold text-slate-400">
                              {displayEmail.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Choose Photo
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                          {selectedFile && (
                            <p className="mt-2 text-sm text-green-600">
                              Selected: {selectedFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Accepted formats: JPEG, PNG, GIF, WebP. Max size: 5MB.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                        {displayPicture ? (
                          <img
                            src={displayPicture}
                            alt="Profile"
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-slate-400">
                            {displayEmail.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-600">
                        {displayPicture ? "Picture set" : "No picture set"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Member Since */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Member Since
                  </label>
                  <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900">
                    {backendUser?.created_at
                      ? new Date(backendUser.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Unknown"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="px-6 py-2.5 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !name.trim()}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? "Uploading..." : isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
