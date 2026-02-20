"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import AppNav from "@/components/AppNav";

// Skin tone options with hex colors
const SKIN_TONES = [
  { name: "Fair", hex: "#F5D7C4" },
  { name: "Light", hex: "#E8B895" },
  { name: "Medium", hex: "#C68642" },
  { name: "Tan", hex: "#A67C52" },
  { name: "Olive", hex: "#8D5524" },
  { name: "Deep", hex: "#5C4033" },
];

export default function ColorAnalysisPage() {
  const { user } = useAuth();
  const { t } = useLocale();

  const [selectedSkinTone, setSelectedSkinTone] = useState<string | null>(null);
  const [selectedSkinToneHex, setSelectedSkinToneHex] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedPhoto(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open camera
  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Failed to access camera. Please check permissions.");
      console.error("Camera error:", err);
    }
  };

  // Close camera
  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Take photo from camera
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
            setUploadedPhoto(file);
            setPhotoPreview(canvas.toDataURL("image/jpeg"));
            closeCamera();
          }
        }, "image/jpeg");
      }
    }
  };

  // Handle skin tone selection
  const handleSkinToneSelect = (tone: string, hex: string) => {
    setSelectedSkinTone(tone);
    setSelectedSkinToneHex(hex);
  };

  // Handle form submission
  const handleSave = async () => {
    if (!selectedSkinTone && !uploadedPhoto) {
      setError("Please select a skin tone or upload a photo.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      // TODO: Upload photo to S3 if exists
      let photoUrl = null;
      if (uploadedPhoto) {
        // Upload logic will go here
        console.log("Photo upload not implemented yet");
      }

      // Get Firebase token
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Save color profile to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/color-profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Firebase-UID": user?.uid || "",
        },
        body: JSON.stringify({
          skin_tone: selectedSkinTone,
          skin_tone_hex: selectedSkinToneHex,
          photo_url: photoUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to save color profile");
      }

      setSuccessMessage("Color profile saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (err: any) {
      setError(err.message || "Failed to save color profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <AppNav activePage="colors" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            Color Analysis
          </h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            Take a photo or select your skin tone to get personalized color recommendations
          </p>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 text-sm">
            {successMessage}
          </div>
        )}

        <div className="space-y-6">
          {/* Photo Upload/Camera Section */}
          <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="p-6 border-b border-stone-200 dark:border-stone-800">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
                Take or Upload Photo
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                Capture a photo with your camera or upload an existing image
              </p>
            </div>

            <div className="p-6">
              {isCameraActive ? (
                /* Camera View */
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-md mx-auto rounded-lg bg-stone-900"
                  />
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={takePhoto}
                      className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                    >
                      Take Photo
                    </button>
                    <button
                      onClick={closeCamera}
                      className="px-6 py-2.5 border border-stone-300 dark:border-stone-600 rounded-lg font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-stone-900 dark:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : photoPreview ? (
                /* Photo Preview */
                <div className="space-y-4">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-w-xs mx-auto rounded-lg"
                  />
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setUploadedPhoto(null);
                        setPhotoPreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              ) : (
                /* Initial State */
                <div className="text-center py-8">
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <button
                      onClick={openCamera}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Open Camera
                    </button>

                    <label className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-stone-300 dark:border-stone-600 rounded-lg font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer text-stone-900 dark:text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Upload File
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Hidden canvas for photo capture */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          {/* Manual Skin Tone Selection */}
          <div className="bg-white dark:bg-stone-900/50 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
            <div className="p-6 border-b border-stone-200 dark:border-stone-800">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
                Or Select Your Skin Tone Manually
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                Choose the shade that best matches your skin tone
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {SKIN_TONES.map((tone) => (
                  <button
                    key={tone.name}
                    onClick={() => handleSkinToneSelect(tone.name, tone.hex)}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                      selectedSkinTone === tone.name
                        ? "border-amber-600 bg-amber-50 dark:bg-amber-900/20"
                        : "border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600"
                    }`}
                  >
                    <div
                      className="w-16 h-16 rounded-full mb-2 shadow-sm border border-stone-200 dark:border-stone-700"
                      style={{ backgroundColor: tone.hex }}
                    />
                    <span className="text-sm font-medium text-stone-900 dark:text-white">
                      {tone.name}
                    </span>
                    {selectedSkinTone === tone.name && (
                      <svg className="w-5 h-5 text-amber-600 mt-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || (!selectedSkinTone && !uploadedPhoto)}
              className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Color Profile"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
