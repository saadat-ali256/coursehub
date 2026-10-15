"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

type Notification = {
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  read: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  message?: string;
  notifications?: Notification[];
};

async function readApiResponse(
  response: Response,
): Promise<NotificationsResponse> {
  const body = await response.text();
  let data: NotificationsResponse;

  try {
    data = body ? (JSON.parse(body) as NotificationsResponse) : {};
  } catch {
    const detail = body.trim().slice(0, 200);
    throw new Error(
      response.ok
        ? `Notifications API returned an invalid response (HTTP ${response.status}).`
        : `Notifications API is unavailable (HTTP ${response.status})${detail ? `: ${detail}` : "."}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Could not load notifications (HTTP ${response.status}).`,
    );
  }

  return data;
}

function safeInternalPath(link?: string) {
  if (!link || !link.startsWith("/") || link.startsWith("//")) return null;
  if (/localhost|127\.0\.0\.1/i.test(link)) return null;
  return link;
}

function displayText(value: string) {
  return value.replace(
    /\b(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?[^\s]*/gi,
    "local development link",
  );
}

export default function NotificationCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations
            .filter((registration) =>
              [
                registration.active,
                registration.waiting,
                registration.installing,
              ].some((worker) => {
                if (!worker) return false;
                return new URL(worker.scriptURL).pathname
                  .toLowerCase()
                  .endsWith("/onesignalsdkworker.js");
              }),
            )
            .map(async (registration) => {
              const subscription =
                await registration.pushManager.getSubscription();
              if (subscription) await subscription.unsubscribe();
              await registration.unregister();
            }),
        ),
      )
      .catch((error: unknown) => {
        console.warn("Could not remove an old push service worker.", error);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    async function load() {
      const token = await getToken();
      if (!token) throw new Error("Could not get the current session token.");
      const response = await fetch("/api/notifications", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (active) {
        setNotifications(data.notifications || []);
        setLoadError("");
      }
    }
    function reportLoadError(error: unknown) {
      if (!active) return;
      const message =
        error instanceof Error ? error.message : "Could not load notifications.";
      setLoadError(message);
      console.error("Could not load notifications.", error);
    }
    function refreshOnFocus() {
      void load().catch(reportLoadError);
    }
    load().catch(reportLoadError);
    const interval = window.setInterval(() => {
      load().catch(reportLoadError);
    }, 30_000);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [getToken, isLoaded, isSignedIn]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  async function markRead(id: string) {
    const token = await getToken();
    if (!token) throw new Error("Could not get the current session token.");
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    await readApiResponse(response);
    setNotifications((current) =>
      current.map((item) => (item._id === id ? { ...item, read: true } : item)),
    );
  }

  async function markAllRead() {
    const token = await getToken();
    if (!token) throw new Error("Could not get the current session token.");
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ all: true }),
    });
    await readApiResponse(response);
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
  }

  async function openNotification(item: Notification) {
    try {
      if (!item.read) await markRead(item._id);
    } catch (error) {
      console.error("Could not mark notification as read.", error);
    }
    setOpen(false);
    const path = safeInternalPath(item.link);
    if (path) router.push(path);
  }

  if (!isLoaded || !isSignedIn || pathname === "/community/feed") return null;

  return (
    <div className="fixed bottom-16 right-3 z-[85] sm:bottom-20 sm:right-5">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-lg text-slate-800 shadow-xl ring-2 ring-white transition hover:scale-105 sm:h-12 sm:w-12 sm:text-xl"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section
          aria-label="Notifications"
          className="absolute bottom-12 right-0 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-14"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-black">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  markAllRead().catch((error) =>
                    console.error("Could not mark notifications as read.", error),
                  )
                }
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Mark all read
              </button>
            )}
          </div>
          {loadError && (
            <p className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
              {loadError}. Make sure the CourseHub API server is running.
            </p>
          )}
          <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {notifications.length ? (
              notifications.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => void openNotification(item)}
                  className={`block w-full border-b px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 ${
                    item.read ? "bg-white" : "bg-indigo-50/70"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    {!item.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-slate-900">
                        {displayText(item.title)}
                      </span>
                      <span className="mt-1 block whitespace-pre-wrap break-words text-sm text-slate-600">
                        {displayText(item.message)}
                      </span>
                      <time className="mt-2 block text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </time>
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                {loadError
                  ? "Notifications could not be loaded."
                    : "No new course or blog uploads yet."}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
