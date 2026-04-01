"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import PriceDropBadge from "@/components/PriceDropBadge";
import {
  getSavedOutfit,
  deleteSavedOutfit,
  updateSavedOutfit,
  SavedOutfitWithDetailsResponse,
} from "@/lib/api";

const CATEGORY_ICONS: Record<string, string> = {
  TOP: "👕",
  BOTTOM: "👖",
  SHOES: "👟",
  ACCESSORY: "⌚",
  OUTERWEAR: "🧥",
};

export default function SavedOutfitDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const outfitId = params?.id as string;
  useLocale();

  const [outfit, setOutfit] = useState<SavedOutfitWithDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user || !outfitId) return;

    setLoading(true);
    getSavedOutfit(user.uid, outfitId)
      .then((data) => setOutfit(data))
      .catch((err) => {
        console.error("Failed to fetch outfit:", err);
        setErrorMessage("Failed to load outfit");
      })
      .finally(() => setLoading(false));
  }, [user, outfitId]);

  const handleDelete = async () => {
    if (!user || !outfit) return;
    if (!confirm("Are you sure you want to remove this outfit from your favorites?")) return;

    setActionLoading(true);
    try {
      await deleteSavedOutfit(user.uid, outfit.id);
      router.push("/saved-outfits");
    } catch (err: any) {
      console.error("Failed to delete outfit:", err);
      setErrorMessage(err?.message || "Failed to delete outfit");
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePurchased = async () => {
    if (!user || !outfit) return;

    setActionLoading(true);
    try {
      await updateSavedOutfit(user.uid, outfit.id, {
        is_purchased: !outfit.is_purchased,
      });
      setOutfit({ ...outfit, is_purchased: !outfit.is_purchased });
    } catch (err: any) {
      console.error("Failed to update outfit:", err);
      setErrorMessage(err?.message || "Failed to update outfit");
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    if (!outfit?.recommendation) return;

    const rec = outfit.recommendation;
    const occasion = rec.occasion || "Outfit";
    const itemCount = rec.items?.length || 0;
    const totalPrice =
      rec.items?.reduce((sum, item) => sum + (typeof item.price === "number" ? item.price : 0), 0) || 0;

    const shareText = `Check out this ${occasion} outfit from AttireAI! ${itemCount} items for $${totalPrice.toFixed(0)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `AttireAI - ${occasion}`,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err) {
        console.log("Share cancelled or failed:", err);
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      setErrorMessage("Failed to copy link to clipboard");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-stone-950">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!outfit || !outfit.recommendation) {
    return (
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-stone-950">
        <AppNav />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mb-4">Outfit not found</h1>
          <button
            onClick={() => router.push("/saved-outfits")}
            className="text-brand hover:underline"
          >
            Back to Saved Outfits
          </button>
        </div>
      </div>
    );
  }

  const rec = outfit.recommendation;
  const totalPrice = rec.items?.reduce((sum, item) => sum + (typeof item.price === "number" ? item.price : 0), 0) || 0;
  const originalTotalPrice = rec.total_price || 0;

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col bg-[#FAFAFC] dark:bg-stone-950">
      <div
        className="absolute top-0 right-0 w-full h-full pointer-events-none -z-20 opacity-100 dark:opacity-30"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(11, 85, 99, 0.1) 0%, rgba(255, 255, 255, 0) 60%)",
        }}
      ></div>

      <AppNav />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-brand dark:hover:text-brand-400 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-stone-900 dark:text-white">
                  {rec.occasion || "Outfit"}
                </h1>
                {originalTotalPrice > 0 && totalPrice > 0 && totalPrice < originalTotalPrice && (
                  <PriceDropBadge originalPrice={originalTotalPrice} currentPrice={totalPrice} />
                )}
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Saved {formatDate(outfit.created_at)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {rec.weather && (
                  <span className="text-xs bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full text-stone-600 dark:text-stone-400">
                    {rec.weather}
                  </span>
                )}
                {rec.dress_code && (
                  <span className="text-xs bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full text-stone-600 dark:text-stone-400">
                    {rec.dress_code}
                  </span>
                )}
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full text-amber-700 dark:text-amber-400">
                  {outfit.collection_name}
                </span>
                {outfit.is_purchased && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full text-green-700 dark:text-green-400">
                    ✓ Purchased
                  </span>
                )}
              </div>
            </div>
            {totalPrice > 0 && (
              <div className="text-right">
                <p className="text-sm text-stone-500 dark:text-stone-400">Total</p>
                <p className="text-3xl font-bold text-brand dark:text-brand-400">
                  ${totalPrice.toFixed(0)}
                </p>
              </div>
            )}
          </div>

          {rec.reasoning && (
            <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
              <p className="text-sm text-stone-700 dark:text-stone-300">{rec.reasoning}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleTogglePurchased}
              disabled={actionLoading}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                outfit.is_purchased
                  ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
              }`}
            >
              {outfit.is_purchased ? "✓ Purchased" : "Mark as Purchased"}
            </button>
            <button
              onClick={handleShare}
              className="p-3 rounded-lg text-brand hover:bg-brand/10 dark:hover:bg-brand/20 transition-colors"
              title="Share outfit"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="p-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
              title="Remove from favorites"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Items Grid */}
        <div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-4">
            Items ({rec.items?.length || 0})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rec.items?.map((item, idx) => {
              const categoryUpper = (item.category || "").toUpperCase();
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden"
                >
                  <div className="relative aspect-square bg-stone-100 dark:bg-stone-800">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).classList.remove("hidden");
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={`absolute inset-0 flex items-center justify-center text-6xl ${
                        item.image_url ? "hidden" : ""
                      }`}
                    >
                      {CATEGORY_ICONS[categoryUpper] || "👔"}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                      {item.category || "Item"}
                    </p>
                    <h3 className="font-bold text-stone-900 dark:text-white line-clamp-2 mb-1">
                      {item.name}
                    </h3>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mb-2">
                      {item.brand || "Brand N/A"}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      {typeof item.price === "number" && (
                        <p className="text-lg font-bold text-brand dark:text-brand-400">
                          ${item.price.toFixed(0)}
                        </p>
                      )}
                      {item.recommended_size && (
                        <span className="text-xs bg-stone-200 dark:bg-stone-700 px-2 py-1 rounded text-stone-600 dark:text-stone-300">
                          {item.recommended_size}
                        </span>
                      )}
                    </div>
                    {item.recommended_color && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                        Color: {item.recommended_color}
                      </p>
                    )}
                    {item.stock_status && item.stock_status !== "UNKNOWN" && (
                      <div className="mb-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          item.stock_status === "IN_STOCK"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : item.stock_status === "LOW_STOCK"
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        }`}>
                          {item.stock_status === "IN_STOCK" ? "✓ In Stock" : item.stock_status === "LOW_STOCK" ? "⚠ Low Stock" : "✕ Out of Stock"}
                        </span>
                      </div>
                    )}
                    {item.purchase_url && (
                      <a
                        href={item.purchase_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-2 px-3 bg-brand hover:bg-brand/90 text-white rounded-lg text-sm font-semibold text-center transition-colors"
                      >
                        View Product
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50">
          <svg className="w-5 h-5 text-green-400 dark:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold">Link copied to clipboard!</span>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
