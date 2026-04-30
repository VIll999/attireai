"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type NotificationItem,
} from "@/lib/api";

const POLL_INTERVAL_MS = 30_000;

function timeAgo(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = async () => {
    if (!user) return;
    try {
      const c = await getUnreadNotificationCount(user.uid);
      setUnread(c);
    } catch {
      /* noop */
    }
  };

  const refreshList = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await listNotifications(user.uid);
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (open) refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleClickItem = async (n: NotificationItem) => {
    if (!user) return;
    if (!n.read_at) {
      try {
        await markNotificationRead(user.uid, n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
        setUnread((c) => Math.max(0, c - 1));
      } catch {
        /* noop */
      }
    }
    setOpen(false);
    if (n.link) {
      const itemId = (n.metadata as Record<string, unknown> | null)?.item_id as string | undefined;
      router.push(itemId ? `${n.link}?highlight=${itemId}` : n.link);
    }
  };

  const handleMarkAll = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.uid);
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || now })));
      setUnread(0);
    } catch {
      /* noop */
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteNotification(user.uid, id);
      const removed = items.find((x) => x.id === id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (removed && !removed.read_at) setUnread((c) => Math.max(0, c - 1));
    } catch {
      /* noop */
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-stone-600 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[480px] overflow-y-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b border-stone-100 dark:border-stone-800 sticky top-0 bg-white dark:bg-stone-900">
            <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-brand hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>
          {loading ? (
            <div className="p-6 text-center text-sm text-stone-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-stone-500">No notifications yet.</div>
          ) : (
            <ul>
              {items.map((n) => {
                const meta = (n.metadata || {}) as Record<string, unknown>;
                const drop = meta.drop_percent as number | undefined;
                return (
                  <li
                    key={n.id}
                    className={
                      "group border-b border-stone-100 dark:border-stone-800 last:border-b-0 px-3 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition cursor-pointer " +
                      (!n.read_at ? "bg-brand/5 dark:bg-brand/10" : "")
                    }
                    onClick={() => handleClickItem(n)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 text-lg">
                        {n.type === "SALE" ? "🏷️" : "🔔"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
                            {n.title}
                          </span>
                          {!n.read_at && (
                            <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-stone-400">{timeAgo(n.created_at)}</span>
                          {typeof drop === "number" && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                              -{drop}%
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm leading-none flex-shrink-0"
                        aria-label="Dismiss"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
