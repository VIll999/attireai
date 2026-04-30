"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminStats,
  listAdminProducts,
  updateAdminProduct,
  deleteAdminProduct,
  type AdminStats,
  type AdminProduct,
  type AdminProductPatch,
} from "@/lib/api";

const CATEGORIES = ["TOP", "BOTTOM", "SHOES", "ACCESSORY", "OUTERWEAR"] as const;
const STOCK_OPTIONS = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "UNKNOWN"] as const;
const PER_PAGE = 20;

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "brand" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "brand"
      ? "border-brand/30 bg-brand/5"
      : tone === "good"
        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
        : tone === "warn"
          ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
          : tone === "bad"
            ? "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20"
            : "border-stone-200 bg-white dark:bg-stone-900 dark:border-stone-800";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold text-stone-900 dark:text-stone-100 mt-1">{value}</div>
      {hint && <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{hint}</div>}
    </div>
  );
}

export default function AdminPage() {
  const { user, dbUser } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [statsLoading, setStatsLoading] = useState(true);

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [editDraft, setEditDraft] = useState<AdminProductPatch>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const isAdmin = !!dbUser?.is_admin;

  const refreshStats = async () => {
    if (!user || !isAdmin) return;
    setStatsLoading(true);
    setStatsError("");
    try {
      const s = await getAdminStats(user.uid);
      setStats(s);
    } catch (err: any) {
      setStatsError(err?.message || "Failed to load stats");
    } finally {
      setStatsLoading(false);
    }
  };

  const refreshProducts = async () => {
    if (!user || !isAdmin) return;
    setProductsLoading(true);
    setProductsError("");
    try {
      const data = await listAdminProducts(user.uid, {
        q: search || undefined,
        category: categoryFilter || undefined,
        page,
        per_page: PER_PAGE,
      });
      setProducts(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setProductsError(err?.message || "Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  useEffect(() => {
    refreshProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, page, search, categoryFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total]);

  const startEdit = (p: AdminProduct) => {
    setEditing(p);
    setEditDraft({
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price ?? undefined,
      stock_status: p.stock_status ?? undefined,
      purchase_url: p.purchase_url,
    });
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!user || !editing) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const updated = await updateAdminProduct(user.uid, editing.id, editDraft);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditing(null);
    } catch (err: any) {
      setEditError(err?.message || "Save failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (p: AdminProduct) => {
    if (!user) return;
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await deleteAdminProduct(user.uid, p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  };

  if (!user) return null;

  // Access control: non-admin users get a clear 403
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f8fafb] dark:bg-stone-950">
        <AppNav />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">Admin only</h1>
          <p className="text-stone-600 dark:text-stone-400 mb-6">
            You don&apos;t have permission to view this page.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-5 py-2.5 bg-brand hover:bg-brand-600 text-white rounded-lg font-medium"
          >
            Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] dark:bg-stone-950">
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Admin Dashboard</h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            Platform statistics and product catalog management.
          </p>
        </div>

        {/* Stats */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">Platform stats</h2>
          {statsError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
              {statsError}
            </div>
          )}
          {statsLoading ? (
            <div className="text-sm text-stone-500">Loading stats...</div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard label="Total users" value={stats.total_users} hint={`+${stats.new_users_7d} in 7d`} tone="brand" />
              <StatCard label="VIP users" value={stats.users_vip} hint={`${stats.users_free} free`} tone="good" />
              <StatCard label="Recommendations" value={stats.total_recommendations} hint={`${stats.recommendations_7d} in 7d`} />
              <StatCard label="Saved outfits" value={stats.total_saved_outfits} />
              <StatCard
                label="Try-ons"
                value={stats.total_try_ons}
                hint={`${stats.try_ons_completed} ok / ${stats.try_ons_failed} failed`}
                tone={stats.try_ons_failed > 0 ? "warn" : "neutral"}
              />
              <StatCard label="Notifications" value={stats.total_notifications} hint={`${stats.unread_notifications} unread`} />
              <StatCard label="Active subs" value={stats.subs_active} tone="good" />
              <StatCard label="Trialing" value={stats.subs_trialing} />
              <StatCard label="Cancelled subs" value={stats.subs_cancelled} tone={stats.subs_cancelled > 0 ? "bad" : "neutral"} />
            </div>
          ) : null}
        </section>

        {/* Product catalog */}
        <section>
          <div className="flex items-end justify-between flex-wrap gap-3 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Product catalog</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {total.toLocaleString()} item{total === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setPage(1);
                  setCategoryFilter(e.target.value);
                }}
                className="px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 text-sm"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setSearch(searchInput.trim());
                  }
                }}
                placeholder="Search name or brand"
                className="px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 text-sm w-56"
              />
              <button
                onClick={() => {
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
                className="px-3 py-2 bg-brand hover:bg-brand-600 text-white rounded-lg text-sm font-medium"
              >
                Search
              </button>
            </div>
          </div>

          {productsError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
              {productsError}
            </div>
          )}

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800">
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {productsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-stone-500">
                        Loading...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-stone-500">
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-stone-100 dark:border-stone-800 last:border-b-0 hover:bg-stone-50 dark:hover:bg-stone-800/30"
                      >
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-medium text-stone-900 dark:text-stone-100 truncate">{p.name}</div>
                          <div className="text-xs text-stone-400 truncate">{p.id}</div>
                        </td>
                        <td className="px-4 py-3 text-stone-700 dark:text-stone-300">{p.brand || "—"}</td>
                        <td className="px-4 py-3">
                          {p.category ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                              {p.category}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.price != null ? (
                            <span className="font-medium">${p.price.toFixed(2)}</span>
                          ) : (
                            "—"
                          )}
                          {p.previous_price != null && p.price != null && p.previous_price > p.price && (
                            <span className="ml-2 text-xs text-stone-400 line-through">${p.previous_price.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "text-xs font-medium px-2 py-0.5 rounded-full " +
                              (p.stock_status === "IN_STOCK"
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                : p.stock_status === "OUT_OF_STOCK"
                                  ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                                  : p.stock_status === "LOW_STOCK"
                                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400")
                            }
                          >
                            {p.stock_status || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => startEdit(p)}
                            className="text-xs font-medium text-brand hover:underline mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="text-xs font-medium text-rose-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 dark:border-stone-800 text-sm">
                <span className="text-stone-500 dark:text-stone-400">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={page <= 1 || productsLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded border border-stone-300 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= totalPages || productsLoading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded border border-stone-300 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Edit modal */}
        {editing && (
          <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => !savingEdit && setEditing(null)}
          >
            <div
              className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 mb-1">Edit product</h3>
              <p className="text-xs text-stone-500 mb-4">{editing.id}</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">Name</label>
                  <input
                    value={editDraft.name ?? ""}
                    onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">Brand</label>
                    <input
                      value={editDraft.brand ?? ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, brand: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">Category</label>
                    <select
                      value={editDraft.category ?? ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, category: e.target.value || undefined }))}
                      className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm"
                    >
                      <option value="">—</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">
                      Price (changing creates a price-drop record)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDraft.price ?? ""}
                      onChange={(e) =>
                        setEditDraft((d) => ({
                          ...d,
                          price: e.target.value === "" ? undefined : Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">Stock</label>
                    <select
                      value={editDraft.stock_status ?? ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, stock_status: e.target.value || undefined }))}
                      className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm"
                    >
                      <option value="">—</option>
                      {STOCK_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">Purchase URL</label>
                  <input
                    value={editDraft.purchase_url ?? ""}
                    onChange={(e) => setEditDraft((d) => ({ ...d, purchase_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm"
                  />
                </div>
              </div>

              {editError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{editError}</p>
              )}

              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setEditing(null)}
                  disabled={savingEdit}
                  className="px-4 py-2 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-4 py-2 bg-brand hover:bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
