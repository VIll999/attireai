"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import {
  generateTryOn,
  uploadTryOnPhoto,
  type TryOnResponse,
} from "@/lib/api";

export default function VirtualTryOnPage() {
  const params = useParams();
  const router = useRouter();
  const outfitId = String(params?.outfitId ?? "");
  const { user } = useAuth();

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<TryOnResponse | null>(null);
  const [error, setError] = useState("");
  const [vipRequired, setVipRequired] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleUpload = async () => {
    if (!user || !photoFile) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadTryOnPhoto(user.uid, photoFile);
      setPhotoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user || !photoUrl) return;
    setGenerating(true);
    setError("");
    setVipRequired(false);
    try {
      const r = await generateTryOn(user.uid, outfitId, photoUrl);
      setResult(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      if (msg === "VIP_REQUIRED" || msg.includes("402")) {
        setVipRequired(true);
      } else {
        setError(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError("");
    setVipRequired(false);
  };

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  return (
    <div className="min-h-screen bg-[#f8fafb] dark:bg-stone-950">
      <AppNav />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Virtual Try-On</h1>
            <p className="text-stone-600 dark:text-stone-400 mt-1">
              Upload a full-body photo and we&apos;ll generate a preview of this outfit on you.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm text-stone-600 dark:text-stone-400 hover:underline"
          >
            ← Back
          </button>
        </div>

        {vipRequired && (
          <div className="mb-6 p-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✨</div>
              <div className="flex-1">
                <div className="font-semibold text-amber-900 dark:text-amber-200">VIP feature</div>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  You&apos;ve used your free try-on. Subscribe to VIP for unlimited virtual try-ons.
                </p>
                <Link
                  href="/vip"
                  className="inline-block mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
                >
                  Upgrade to VIP
                </Link>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Photo step */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
            <h2 className="font-semibold text-stone-900 dark:text-stone-100 mb-4">1. Your photo</h2>
            {photoUrl ? (
              <div>
                <img src={photoUrl} alt="Uploaded" className="w-full rounded-lg mb-3" />
                <button
                  onClick={() => {
                    setPhotoUrl(null);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setResult(null);
                  }}
                  className="text-sm text-stone-600 dark:text-stone-400 hover:underline"
                >
                  Use a different photo
                </button>
              </div>
            ) : photoPreview ? (
              <div>
                <img src={photoPreview} alt="Preview" className="w-full rounded-lg mb-3" />
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full px-4 py-2 bg-brand hover:bg-brand-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Use this photo"}
                </button>
              </div>
            ) : (
              <label className="block border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-8 text-center cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition">
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <div className="text-4xl mb-2">📸</div>
                <div className="font-medium text-stone-900 dark:text-stone-100">Upload a full-body photo</div>
                <div className="text-sm text-stone-500 mt-1">JPG, PNG, or WebP. Max 8 MB.</div>
                <div className="text-xs text-stone-500 mt-2">Stand in good light, plain background works best.</div>
              </label>
            )}
          </div>

          {/* Generate / Result step */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
            <h2 className="font-semibold text-stone-900 dark:text-stone-100 mb-4">2. Try it on</h2>
            {!photoUrl && (
              <p className="text-sm text-stone-500">Upload a photo to begin.</p>
            )}
            {photoUrl && !result && !generating && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full px-4 py-3 bg-brand hover:bg-brand-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                Generate try-on
              </button>
            )}
            {generating && (
              <div className="text-center py-10">
                <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <div className="text-sm text-stone-600 dark:text-stone-400">
                  Generating... this can take 20-40 seconds.
                </div>
              </div>
            )}
            {result?.result_image_url && (
              <div>
                <img src={result.result_image_url} alt="Try-on result" className="w-full rounded-lg mb-3" />
                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    Try another
                  </button>
                  <a
                    href={result.result_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-brand hover:bg-brand-600 text-white rounded-lg text-sm text-center"
                  >
                    View full size
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
