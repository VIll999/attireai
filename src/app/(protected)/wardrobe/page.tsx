"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import { getWardrobe, type WardrobeItem, type WardrobeResponse } from "@/lib/api";

const CATEGORY_ICONS: Record<string, string> = {
  TOP: "👕",
  BOTTOM: "👖",
  SHOES: "👟",
  ACCESSORY: "⌚",
  OUTERWEAR: "🧥",
  OTHER: "🧺",
};

const CATEGORY_ORDER = ["TOP", "BOTTOM", "OUTERWEAR", "SHOES", "ACCESSORY", "OTHER"];

export default function WardrobePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<WardrobeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getWardrobe(user.uid)
      .then(setData)
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [user]);

  const handleBuildAround = (item: WardrobeItem) => {
    router.push(`/recommendations?pin=${item.id}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafb] dark:bg-stone-950">
      <AppNav />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">My Wardrobe</h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            Items from outfits you&apos;ve marked as purchased.
            {data && data.total > 0 && (
              <span className="ml-2 font-medium">
                {data.total} owned item{data.total === 1 ? "" : "s"}.
              </span>
            )}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-stone-500">Loading...</div>
        ) : !data || data.total === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-10 text-center">
            <div className="text-6xl mb-4">🧺</div>
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
              Your wardrobe is empty
            </h2>
            <p className="text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
              Mark a saved outfit as <span className="font-semibold">Purchased</span> and its items
              will show up here. Then you can build new outfits around what you already own.
            </p>
            <Link
              href="/saved-outfits"
              className="inline-block px-5 py-2.5 bg-brand hover:bg-brand-600 text-white rounded-lg font-medium"
            >
              Browse Saved Outfits
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {CATEGORY_ORDER.filter((c) => data.by_category[c]?.length).map((cat) => {
              const items = data.by_category[cat];
              return (
                <section key={cat}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span className="text-xl">{CATEGORY_ICONS[cat] || "🧺"}</span>
                      <span>{cat}</span>
                      <span className="text-sm font-normal text-stone-500">
                        ({items.length})
                      </span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="group bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col"
                      >
                        <div className="relative aspect-square bg-stone-100 dark:bg-stone-800">
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.nextElementSibling) {
                                  (e.currentTarget.nextElementSibling as HTMLElement).classList.remove(
                                    "hidden",
                                  );
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className={`absolute inset-0 flex items-center justify-center text-5xl ${item.image_url ? "hidden" : ""}`}
                          >
                            {CATEGORY_ICONS[item.category || "OTHER"] || "👔"}
                          </div>
                        </div>
                        <div className="p-3 flex-1 flex flex-col">
                          <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 line-clamp-2">
                            {item.name}
                          </h3>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            {item.brand || "—"}
                          </p>
                          {typeof item.price === "number" && (
                            <p className="text-sm font-bold text-brand dark:text-brand-400 mt-1">
                              ${item.price.toFixed(0)}
                            </p>
                          )}
                          <div className="mt-3 flex flex-col gap-2">
                            <button
                              onClick={() => handleBuildAround(item)}
                              className="w-full px-3 py-1.5 bg-brand hover:bg-brand-600 text-white rounded-lg text-xs font-semibold"
                            >
                              ✨ Build around this
                            </button>
                            <Link
                              href={`/saved-outfits/${item.saved_outfit_id}`}
                              className="w-full text-center px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                            >
                              View source outfit
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
