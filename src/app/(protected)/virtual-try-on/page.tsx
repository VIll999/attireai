"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import { listTryOns, deleteTryOn, type TryOnResponse } from "@/lib/api";

function formatDate(s: string): string {
  return new Date(s).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TryOnGalleryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<TryOnResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<TryOnResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState("");

  // Compare mode (Story #2 AC3)
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedIds([]);
    setShowCompare(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const list = await listTryOns(user.uid);
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm("Delete this try-on? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteTryOn(user.uid, id);
      setItems((prev) => prev.filter((t) => t.id !== id));
      if (active?.id === id) setActive(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleShare = async (url: string) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url, title: "My AttireAI Try-On" });
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareToast("Link copied!");
      setTimeout(() => setShareToast(""), 2000);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const completed = items.filter((t) => t.status === "COMPLETED" && t.result_image_url);
  const failed = items.filter((t) => t.status === "FAILED");

  return (
    <div className="min-h-screen bg-[#f8fafb] dark:bg-stone-950">
      <AppNav />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">My Try-Ons</h1>
            <p className="text-stone-600 dark:text-stone-400 mt-1">
              Your virtual try-on gallery — view, share, or delete past results.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {compareMode ? (
              <>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {selectedIds.length}/2 selected
                </span>
                <button
                  onClick={() => setShowCompare(true)}
                  disabled={selectedIds.length !== 2}
                  className="text-sm px-4 py-2 rounded-lg bg-brand hover:bg-brand-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Compare selected
                </button>
                <button
                  onClick={exitCompareMode}
                  className="text-sm px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {completed.length >= 2 && (
                  <button
                    onClick={() => setCompareMode(true)}
                    className="text-sm px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 font-medium"
                  >
                    🆚 Compare
                  </button>
                )}
                <Link
                  href="/saved-outfits"
                  className="text-sm px-4 py-2 rounded-lg bg-brand hover:bg-brand-600 text-white font-medium"
                >
                  + New Try-On
                </Link>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-stone-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
              No try-ons yet
            </h2>
            <p className="text-stone-500 dark:text-stone-400 mb-4">
              Pick a saved outfit and try it on virtually.
            </p>
            <Link
              href="/saved-outfits"
              className="inline-block px-5 py-2.5 bg-brand hover:bg-brand-600 text-white rounded-lg font-medium"
            >
              Browse Saved Outfits
            </Link>
          </div>
        ) : (
          <>
            {compareMode && (
              <div className="mb-4 p-3 rounded-lg bg-brand/5 dark:bg-brand/10 border border-brand/20 text-sm text-stone-700 dark:text-stone-300">
                Pick <strong>2</strong> try-ons to compare side by side.
              </div>
            )}

            {completed.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {completed.map((t) => {
                  const selected = selectedIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => (compareMode ? toggleSelect(t.id) : setActive(t))}
                      className={
                        "group relative bg-white dark:bg-stone-900 rounded-xl overflow-hidden border transition text-left " +
                        (selected
                          ? "border-brand ring-2 ring-brand"
                          : "border-stone-200 dark:border-stone-800 hover:shadow-lg")
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.result_image_url!}
                        alt="Try-on"
                        className="w-full aspect-[3/4] object-cover"
                      />
                      <div className="p-3">
                        <div className="text-xs text-stone-500 dark:text-stone-400">
                          {formatDate(t.created_at)}
                        </div>
                      </div>
                      {compareMode ? (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white dark:bg-stone-900 border-2 border-brand flex items-center justify-center text-brand text-xs font-bold shadow">
                          {selected ? (selectedIds.indexOf(t.id) + 1) : ""}
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <span className="text-white font-medium text-sm">View</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {failed.length > 0 && (
              <details className="mb-8">
                <summary className="text-sm text-stone-500 cursor-pointer mb-2">
                  {failed.length} failed try-on{failed.length === 1 ? "" : "s"}
                </summary>
                <div className="space-y-2">
                  {failed.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    >
                      <span className="text-sm text-red-800 dark:text-red-200">
                        Failed at {formatDate(t.created_at)}
                      </span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="text-xs text-red-700 dark:text-red-300 hover:underline disabled:opacity-50"
                      >
                        {deletingId === t.id ? "..." : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {/* Detail modal */}
        {active && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setActive(null)}
          >
            <div
              className="bg-white dark:bg-stone-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100">Try-On Result</h3>
                  <p className="text-xs text-stone-500">{formatDate(active.created_at)}</p>
                </div>
                <button
                  onClick={() => setActive(null)}
                  className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 p-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-stone-500 mb-2">Before</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={active.user_photo_url}
                    alt="Original"
                    className="w-full rounded-lg"
                  />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-brand mb-2">After</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={active.result_image_url!}
                    alt="Try-on"
                    className="w-full rounded-lg"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 p-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  onClick={() => handleShare(active.result_image_url!)}
                  className="px-4 py-2 bg-brand hover:bg-brand-600 text-white rounded-lg text-sm font-medium"
                >
                  Share
                </button>
                <a
                  href={active.result_image_url!}
                  download
                  className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Download
                </a>
                <a
                  href={active.result_image_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Full size
                </a>
                <Link
                  href={`/virtual-try-on/${active.outfit_id}`}
                  className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Try this outfit again
                </Link>
                <button
                  onClick={() => handleDelete(active.id)}
                  disabled={deletingId === active.id}
                  className="ml-auto px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {deletingId === active.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compare modal — Story #2 AC3 */}
        {showCompare && selectedIds.length === 2 && (() => {
          const a = completed.find((t) => t.id === selectedIds[0]);
          const b = completed.find((t) => t.id === selectedIds[1]);
          if (!a || !b) return null;
          return (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setShowCompare(false)}
            >
              <div
                className="bg-white dark:bg-stone-900 rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 sticky top-0 bg-white dark:bg-stone-900">
                  <h3 className="font-bold text-stone-900 dark:text-stone-100">Side-by-side</h3>
                  <button
                    onClick={() => setShowCompare(false)}
                    className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 text-2xl leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4 p-4">
                  {[a, b].map((t, i) => (
                    <div key={t.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wide text-brand font-bold">
                          Option {i + 1}
                        </span>
                        <span className="text-xs text-stone-500">{formatDate(t.created_at)}</span>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.result_image_url!}
                        alt={`Try-on ${i + 1}`}
                        className="w-full rounded-lg"
                      />
                      <div className="flex gap-2">
                        <a
                          href={t.result_image_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
                        >
                          Full size
                        </a>
                        <button
                          onClick={() => handleShare(t.result_image_url!)}
                          className="flex-1 px-3 py-1.5 bg-brand hover:bg-brand-600 text-white rounded-lg text-xs font-medium"
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowCompare(false);
                      setSelectedIds([]);
                    }}
                    className="px-4 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    Pick different
                  </button>
                  <button
                    onClick={exitCompareMode}
                    className="px-4 py-2 text-sm bg-brand hover:bg-brand-600 text-white rounded-lg font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {shareToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg shadow-lg text-sm">
            {shareToast}
          </div>
        )}
      </main>
    </div>
  );
}
