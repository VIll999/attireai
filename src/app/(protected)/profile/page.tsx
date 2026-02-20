"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { updateUserProfile, uploadProfilePicture } from "@/lib/api";
import AppNav from "@/components/AppNav";

export default function ProfilePage() {
  const { user, dbUser, updateDbUser } = useAuth();
  const { t } = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  // Initialize form fields from dbUser
  useEffect(() => {
    if (dbUser) {
      setName(dbUser.name);
      setProfilePictureUrl(dbUser.profile_picture_url || "");
    }
  }, [dbUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError(t("profile.invalidFileType"));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError(t("profile.fileTooLarge"));
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
          setError(t("profile.failedUpload"));
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
      // Update context so all pages see the new data
      updateDbUser(updatedUser);
      setProfilePictureUrl(newProfilePictureUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsEditing(false);
      setSuccessMessage(t("profile.profileUpdated"));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(t("profile.failedUpdate"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (dbUser) {
      setName(dbUser.name);
      setProfilePictureUrl(dbUser.profile_picture_url || "");
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
    setError("");
  };

  if (!user) return null;

  const displayName = dbUser?.name || user.displayName || user.email?.split("@")[0] || "User";
  const displayEmail = dbUser?.email || user.email || "";
  const displayPicture = dbUser?.profile_picture_url || user.photoURL || "";

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <AppNav activePage="profile" />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">{t("profile.title")}</h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            {t("profile.subtitle")}
          </p>
        </div>

        {!dbUser ? (
          <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-8">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-stone-900 to-stone-800 px-6 py-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                  {displayPicture ? (
                    <img
                      src={displayPicture}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-amber-600">
                      {displayEmail.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">{displayName}</h2>
                  <p className="text-stone-300">{displayEmail}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-amber-600/20 text-amber-400 rounded-full uppercase tracking-wider text-xs font-medium">
                    {dbUser?.subscription_tier || "FREE"} {t("profile.plan")}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="p-6">
              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 text-sm">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                    {t("profile.name")}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors dark:bg-stone-800/50 dark:text-white"
                      placeholder={t("profile.namePlaceholder")}
                    />
                  ) : (
                    <p className="px-4 py-3 bg-stone-50 dark:bg-stone-800/30 rounded-lg text-stone-900 dark:text-white">
                      {displayName}
                    </p>
                  )}
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                    {t("profile.emailLabel")}
                  </label>
                  <p className="px-4 py-3 bg-stone-50 dark:bg-stone-800/30 rounded-lg text-stone-900 dark:text-white">
                    {displayEmail}
                  </p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {t("profile.emailCannotChange")}
                  </p>
                </div>

                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                    {t("profile.profilePicture")}
                  </label>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800/50 rounded-full flex items-center justify-center overflow-hidden">
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
                            <span className="text-2xl font-bold text-stone-400">
                              {displayEmail.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg text-stone-700 dark:text-stone-300 font-medium transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {t("profile.chooseFile")}
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
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {t("profile.maxFileSize")}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800/50 rounded-full flex items-center justify-center overflow-hidden">
                        {displayPicture ? (
                          <img
                            src={displayPicture}
                            alt="Profile"
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-stone-400">
                            {displayEmail.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-stone-600 dark:text-stone-400">
                        {displayPicture ? "Picture set" : "No picture set"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Member Since */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                    {t("profile.memberSince")}
                  </label>
                  <p className="px-4 py-3 bg-stone-50 dark:bg-stone-800/30 rounded-lg text-stone-900 dark:text-white">
                    {dbUser?.created_at
                      ? new Date(dbUser.created_at).toLocaleDateString("en-US", {
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
                      className="px-6 py-2.5 border border-stone-300 dark:border-stone-600 rounded-lg font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-stone-900 dark:text-white"
                    >
                      {t("profile.cancel")}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !name.trim()}
                      className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? "Uploading..." : isSaving ? t("profile.saving") : t("profile.save")}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                  >
                    {t("profile.editProfile")}
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
