"use client";

import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import {
  cancelSubscription,
  createCheckoutSession,
  getSubscriptionStatus,
  reactivateSubscription,
  type SubscriptionStatus,
} from "@/lib/api";

const FEATURES = [
  { name: "Outfit recommendations per day", free: "5", vip: "Unlimited" },
  { name: "AI virtual try-on", free: "1 free try", vip: "Unlimited" },
  { name: "Save try-on images", free: "—", vip: "Yes" },
  { name: "Side-by-side try-on comparison", free: "—", vip: "Yes" },
  { name: "Sale notifications for saved items", free: "Yes", vip: "Yes" },
  { name: "Wardrobe-based suggestions", free: "Yes", vip: "Yes" },
  { name: "Price comparison across retailers", free: "Yes", vip: "Yes" },
];

export default function VipPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const refresh = async () => {
    if (!user) return;
    try {
      const s = await getSubscriptionStatus(user.uid);
      setStatus(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    refresh();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "1") setInfo("Payment successful! Your VIP access will activate shortly.");
      if (params.get("canceled") === "1") setInfo("Checkout canceled.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubscribe = async () => {
    if (!user) return;
    setError("");
    setActionLoading(true);
    try {
      const origin = window.location.origin;
      const { checkout_url } = await createCheckoutSession(
        user.uid,
        `${origin}/vip?success=1`,
        `${origin}/vip?canceled=1`,
      );
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    if (!confirm("Cancel your VIP subscription? You'll keep access until the end of the current billing period.")) return;
    setActionLoading(true);
    try {
      const updated = await cancelSubscription(user.uid);
      setStatus(updated);
      setInfo("Subscription will cancel at the end of the current period.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const updated = await reactivateSubscription(user.uid);
      setStatus(updated);
      setInfo("Subscription reactivated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reactivate failed");
    } finally {
      setActionLoading(false);
    }
  };

  const isVip = status?.tier === "VIP";
  const periodEnd = status?.current_period_end
    ? new Date(status.current_period_end).toLocaleDateString()
    : null;

  return (
    <div className="min-h-screen bg-[#f8fafb] dark:bg-stone-950">
      <AppNav activePage="vip" />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-stone-900 dark:text-stone-100 mb-3">AttireAI VIP</h1>
          <p className="text-stone-600 dark:text-stone-400">
            Unlock unlimited recommendations and AI virtual try-on.
          </p>
        </div>

        {info && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
            {info}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Current status */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm text-stone-500 dark:text-stone-400">Current plan</div>
              <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
                {loading ? "Loading..." : isVip ? "VIP" : "Free"}
              </div>
              {status && (
                <div className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                  {isVip && periodEnd && (
                    <>
                      {status.cancel_at_period_end ? "Cancels" : "Renews"} on {periodEnd}
                    </>
                  )}
                  {!isVip && status.vip_trial_used && (
                    <>You&apos;ve used your free VIP trial. Subscribe for unlimited access.</>
                  )}
                  {!isVip && !status.vip_trial_used && (
                    <>You have 1 free trial of VIP features remaining.</>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {!isVip && (
                <button
                  onClick={handleSubscribe}
                  disabled={actionLoading || loading}
                  className="px-6 py-3 bg-brand hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "..." : `Subscribe — $${status?.monthly_price_usd?.toFixed(2) ?? "9.99"}/mo`}
                </button>
              )}
              {isVip && status?.cancel_at_period_end && (
                <button
                  onClick={handleReactivate}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-brand hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Reactivate
                </button>
              )}
              {isVip && !status?.cancel_at_period_end && (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-6 py-3 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  Cancel subscription
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feature comparison */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
          <div className="grid grid-cols-3 bg-stone-50 dark:bg-stone-800 px-6 py-4 font-semibold text-stone-900 dark:text-stone-100">
            <div>Feature</div>
            <div className="text-center">Free</div>
            <div className="text-center">VIP</div>
          </div>
          {FEATURES.map((f) => (
            <div
              key={f.name}
              className="grid grid-cols-3 px-6 py-4 border-t border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300"
            >
              <div>{f.name}</div>
              <div className="text-center">{f.free}</div>
              <div className="text-center font-medium text-brand dark:text-brand-400">{f.vip}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
