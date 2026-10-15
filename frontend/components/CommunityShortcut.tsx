"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function CommunityShortcut() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [loggedIn, setLoggedIn] = useState(false);
  const [unread, setUnread] = useState(0);
  const [canChat, setCanChat] = useState(false);
  const [groupUnread, setGroupUnread] = useState(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let active = true;
    let refreshInterval: number | undefined;
    let presenceInterval: number | undefined;
    const stopPolling = () => {
      if (refreshInterval !== undefined) {
        window.clearInterval(refreshInterval);
        refreshInterval = undefined;
      }
      if (presenceInterval !== undefined) {
        window.clearInterval(presenceInterval);
        presenceInterval = undefined;
      }
    };
    const refresh = async () => {
      const userResponse = await fetch("/api/auth/me");
      if (!userResponse.ok) {
        if (active) {
          stopPolling();
          setLoggedIn(false);
          setCanChat(false);
          setUnread(0);
          setGroupUnread(0);
        }
        return false;
      }
      const userData = await userResponse.json();
      if (!active) return false;
      if (!userData.success || !userData.user) {
        stopPolling();
        setLoggedIn(false);
        setCanChat(false);
        setUnread(0);
        setGroupUnread(0);
        return false;
      }
      setLoggedIn(true);
      if (refreshInterval === undefined) {
        refreshInterval = window.setInterval(() => {
          refresh().catch((error) =>
            console.error("Could not refresh community shortcut.", error),
          );
        }, 30000);
      }
      if (presenceInterval === undefined) {
        presenceInterval = window.setInterval(heartbeat, 5 * 60 * 1000);
      }
      let authorized = !!userData.user?.communityAccess;
      if (!authorized) {
        const groupsResponse = await fetch("/api/community/groups");
        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          authorized = (groupsData.groups || []).length > 0;
        }
      }
      setCanChat(authorized);
      const unreadResponse = await fetch("/api/community/unread");
      if (!unreadResponse.ok) return;
      const unreadData = await unreadResponse.json();
      if (active) {
        setUnread(Number(unreadData.count) || 0);
        setGroupUnread(Number(unreadData.groupMessageCount) || 0);
      }
      return true;
    };
    const heartbeat = () =>
      fetch("/api/community/presence", { method: "POST" })
        .then((response) => {
          if (response.status === 401) {
            stopPolling();
            if (active) {
              setLoggedIn(false);
              setCanChat(false);
              setUnread(0);
              setGroupUnread(0);
            }
          }
        })
        .catch((error) =>
          console.error("Could not update community presence.", error),
        );
    refresh()
      .then((authenticated) => {
        if (active && authenticated) heartbeat();
      })
      .catch((error) =>
        console.error("Could not refresh community shortcut.", error),
      );
    const onFocus = () => {
      if (refreshInterval === undefined) {
        refresh().catch((error) =>
          console.error("Could not refresh community shortcut.", error),
        );
      } else {
        heartbeat();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      stopPolling();
      window.removeEventListener("focus", onFocus);
    };
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn || !loggedIn || pathname.startsWith("/community"))
    return null;

  const unreadLabel =
    unread > 0
      ? `${unread} unread message${unread === 1 ? "" : "s"}`
      : "No unread messages";

  return (
    <Link
      href={groupUnread > 0 ? "/community" : unread > 0 ? "/community/messages" : canChat ? "/community" : "/community/feed"}
      aria-label={`Open ${groupUnread > 0 ? "community chats" : unread > 0 ? "messages" : canChat ? "community chats" : "community feed"}. ${unreadLabel}.`}
      title={`${groupUnread > 0 ? "Community chats" : unread > 0 ? "Messages" : canChat ? "Community chats" : "Community feed"} · ${unreadLabel}`}
      className="fixed bottom-3 right-3 z-40 grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-lg text-white shadow-xl ring-2 ring-white transition hover:scale-105 sm:bottom-5 sm:right-5 sm:h-12 sm:w-12 sm:text-xl"
    >
      💡
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black shadow-sm ring-2 ring-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
