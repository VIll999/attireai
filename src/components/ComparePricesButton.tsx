"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  comparePricesForItem,
  type PriceComparisonResponse,
  type PriceComparisonResult,
} from "@/lib/api";

interface Props {
  itemId: string;
  itemName: string;
  className?: string;
  variant?: "primary" | "secondary";
}

function StockBadge({ status }: { status: string | null }) {
  const s = status || "UNKNOWN";
  const cls =
    s === "IN_STOCK"
      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
      : s === "OUT_OF_STOCK"
        ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
        : s === "LOW_STOCK"
          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
          : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400";
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{s}</span>;
}

function ResultRow({ r, currentPrice }: { r: PriceComparisonResult; currentPrice: number | null }) {
  const cheaper =
    typeof r.price === "number" && typeof currentPrice === "number" && r.price < currentPrice;
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 border border-stone-100 dark:border-stone-800 rounded-lg hover:border-brand transition"
    >
      <div className="flex items-center gap-3">
        {r.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.image_url} alt={r.retailer} className="w-12 h-12 rounded object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-xl flex-shrink-0">
            🛍️
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">{r.retailer}</span>
            <StockBadge status={r.stock_status} />
            {cheaper && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                CHEAPER
              </span>
            )}
          </div>
          {r.notes && (
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">{r.notes}</div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          {typeof r.price === "number" ? (
            <div className="font-bold text-stone-900 dark:text-stone-100">
              ${r.price.toFixed(2)}
              {r.currency && r.currency !== "USD" && (
                <span className="text-xs text-stone-500 ml-1">{r.currency}</span>
              )}
            </div>
          ) : (
            <div className="text-xs text-stone-400">Price unavailable</div>
          )}
          <div className="text-[11px] text-brand mt-0.5">View →</div>
        </div>
      </div>
    </a>
  );
}

export default function ComparePricesButton({
  itemId,
  itemName,
  className = "",
  variant = "secondary",
}: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PriceComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !user || data) return;
    setLoading(true);
    setError("");
    comparePricesForItem(user.uid, itemId)
      .then(setData)
      .catch((err) => setError(err?.message || "Failed to compare"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, itemId]);

  const buttonClass =
    variant === "primary"
      ? "px-3 py-1.5 bg-brand hover:bg-brand-600 text-white rounded-lg text-xs font-semibold"
      : "px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800";

  return (
    <>
      <button onClick={() => setOpen(true)} className={`${buttonClass} ${className}`}>
        🔍 Compare Prices
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b border-stone-200 dark:border-stone-800 sticky top-0 bg-white dark:bg-stone-900">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-stone-900 dark:text-stone-100 truncate">Price comparison</h3>
                <p className="text-xs text-stone-500 truncate">{itemName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <div className="text-sm text-stone-500">Searching retailers...</div>
                </div>
              ) : error ? (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
                  {error}
                </div>
              ) : !data || data.results.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-5xl mb-3">🤷</div>
                  <p className="text-sm text-stone-600 dark:text-stone-300 font-medium">
                    No additional listings found.
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    The current listing may be the only one available.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                    {data.results.length} retailer{data.results.length === 1 ? "" : "s"} found
                    {typeof data.current_price === "number" && (
                      <>
                        {" · current price "}
                        <span className="font-semibold">${data.current_price.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    {data.results.map((r, idx) => (
                      <ResultRow key={`${r.retailer}-${idx}`} r={r} currentPrice={data.current_price} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
