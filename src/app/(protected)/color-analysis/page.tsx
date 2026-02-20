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

    } catch (err: any) {
      setError(err.message || "Failed to save color profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <AppNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Color Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Upload a photo or manually select your skin tone
        </p>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
            {successMessage}
          </div>
        )}

        <div className="space-y-8">
          {/* Photo Upload/Camera Section */}
          <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Take or Upload Photo for Analysis
            </h2>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
              {isCameraActive ? (
                /* Camera View */
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={takePhoto}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Take Photo
                    </button>
                    <button
                      onClick={closeCamera}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
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
                  <button
                    onClick={() => {
                      setUploadedPhoto(null);
                      setPhotoPreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="block mx-auto text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Remove photo
                  </button>
                </div>
              ) : (
                /* Initial State - Camera or Upload Options */
                <div className="space-y-6 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    {/* Open Camera Button */}
                    <button
                      onClick={openCamera}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Open Camera
                    </button>

                    {/* Upload File Button */}
                    <label className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium cursor-pointer flex items-center justify-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      Upload File
                      <input
                        id="file-upload"
                        ref={fileInputRef}
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Take a photo with your camera or upload an existing image
                  </p>
                </div>
              )}
            </div>

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} className="hidden" />
          </section>

          {/* Manual Skin Tone Selection */}
          <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Or Select Your Skin Tone Manually
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.name}
                  onClick={() => handleSkinToneSelect(tone.name, tone.hex)}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                    selectedSkinTone === tone.name
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div
                    className="w-16 h-16 rounded-full mb-2 shadow-md"
                    style={{ backgroundColor: tone.hex }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {tone.name}
                  </span>
                  {selectedSkinTone === tone.name && (
                    <svg
                      className="w-5 h-5 text-blue-500 mt-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || (!selectedSkinTone && !uploadedPhoto)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : "Save Color Profile"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
