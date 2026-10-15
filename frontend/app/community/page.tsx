
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MessageText from "@/components/community/MessageText";
import CourseHubLogo from "@/components/CourseHubLogo";

const QUICK_EMOJIS = ["😀", "😂", "😍", "🥰", "😊", "🙏", "🔥", "🎉", "❤️", "👍"];
const MESSAGE_REACTIONS = ["❤️", "😂", "👍"];

type ChatUser = {
  _id?: string;
  id?: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
  lastSeenAt?: string;
  role?: string;
  adminPermissions?: string[];
};

type ChatGroup = {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  avatarUrl?: string;
  audience?: "everyone" | "subscribers";
};

type ChatMessage = {
  _id: string;
  userId: ChatUser;
  text: string;
  createdAt: string;
  attachmentUrl?: string;
  replyTo?: ChatMessage;
  reactions?: Record<string, string[]>;
};

type Meeting = {
  meetingUrl: string;
};

function Avatar({
  user,
  size = "h-10 w-10",
}: {
  user: ChatUser | null;
  size?: string;
}) {
  return user?.avatarUrl ? (
    <Image
      src={user.avatarUrl}
      alt={user?.name || "User"}
      width={40}
      height={40}
      unoptimized
      className={`${size} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <div
      className={`${size} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-black text-white`}
    >
      {user?.name?.[0]?.toUpperCase() || "U"}
    </div>
  );
}

function GroupAvatar({
  group,
  active = false,
}: {
  group: ChatGroup | null;
  active?: boolean;
}) {
  return (
    <div
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-xl ${
        active
          ? "bg-white/15 text-white"
          : "bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600"
      }`}
    >
      {group?.avatarUrl ? (
        <Image
          src={group.avatarUrl}
          alt={`${group.name} group`}
          width={48}
          height={48}
          unoptimized
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        group?.icon || "👥"
      )}
    </div>
  );
}

export default function CommunityChat() {
  const router = useRouter();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selected, setSelected] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [subscriber, setSubscriber] = useState(false);
  const [me, setMe] = useState<ChatUser | null>(null);
  const [unread, setUnread] = useState(0);
  const [unreadByGroup, setUnreadByGroup] = useState<Record<string, number>>({});
  const [mobileSidebar, setMobileSidebar] = useState(true);
  const [sending, setSending] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "groups">("all");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState<string | null>(null);
  const [deleteMessageError, setDeleteMessageError] = useState("");
  const [deletingMessage, setDeletingMessage] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeenMessages = useRef(new Map<string, string>());

  function openMemberProfile(user: ChatUser | null | undefined) {
    const id = user?._id || user?.id;
    if (id) router.push(`/community/profile/${encodeURIComponent(id)}`);
  }

  const loadUnread = useCallback(async () => {
    try {
      const response = await fetch("/api/community/unread");
      const data: {
        count?: number;
        groups?: { groupId: string; count: number }[];
      } = await response.json();
      if (!response.ok) {
        console.error("Could not load unread community messages.");
        return;
      }
      const counts = Object.fromEntries(
        (data.groups || []).map((group) => [
          String(group.groupId),
          Number(group.count) || 0,
        ]),
      );
      setUnreadByGroup(counts);
      setUnread(Number(data.count) || 0);
    } catch (error) {
      console.error("Could not load unread community messages.", error);
    }
  }, []);

  const updateTyping = useCallback(async (typing: boolean) => {
    if (!selected) return;
    try {
      const response = await fetch("/api/community/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selected._id, typing }),
      });
      if (!response.ok) console.error("Could not update typing status.");
    } catch (error) {
      console.error("Could not update typing status.", error);
    }
  }, [selected]);

  function onTextChange(value: string) {
    setText(value);
    if (!selected) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (!value.trim()) {
      updateTyping(false);
      return;
    }
    updateTyping(true);
    typingTimer.current = setTimeout(() => updateTyping(false), 1800);
  }

  function chooseImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Please select an image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      window.alert("Image must be 10 MB or smaller.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    let active = true;
    let presence: ReturnType<typeof setInterval> | undefined;
    async function loadGroups() {
      const response = await fetch("/api/community/groups");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/community/feed");
        return;
      }
      const data = (await response.json()) as {
        success: boolean;
        groups?: ChatGroup[];
        subscriber?: boolean;
      };
      if (!response.ok || !data.success) {
        throw new Error("Could not load community groups.");
      }
      if (!active) return;
      setGroups(data.groups || []);
      setSubscriber(!!data.subscriber);
      setSelected((current) => {
        if (current) {
          return (
            data.groups?.find(
              (group) => String(group._id) === String(current._id),
            ) || current
          );
        }
        return data.groups?.[0] || null;
      });
    }

    async function loadMeeting() {
      const response = await fetch("/api/community/meeting");
      if (!response.ok) throw new Error("Could not load the community meeting.");
      const data = (await response.json()) as { meeting?: Meeting };
      if (active) setMeeting(data.meeting || null);
    }

    async function loadCurrentUser() {
      const response = await fetch("/api/auth/me");
      if (response.status === 401) return;
      if (!response.ok) throw new Error("Could not load the community profile.");
      const data = (await response.json()) as { user?: ChatUser };
      if (!active || !data.user) return;
      setMe(data.user);
      const updatePresence = async () => {
        try {
          const presenceResponse = await fetch("/api/community/presence", {
            method: "POST",
          });
          if (presenceResponse.status === 401 && presence !== undefined) {
            clearInterval(presence);
            presence = undefined;
          }
        } catch (error) {
          console.error("Could not update community presence.", error);
        }
      };
      void updatePresence();
      presence = setInterval(() => void updatePresence(), 30000);
    }

    void loadGroups().catch((error: unknown) => {
      if (active) console.error("Could not load community groups.", error);
    });
    void loadMeeting().catch((error: unknown) => {
      if (active) console.error("Could not load the community meeting.", error);
    });
    void loadCurrentUser().catch((error: unknown) => {
      if (active) console.error("Could not load the community profile.", error);
    });

    return () => {
      active = false;
      if (presence !== undefined) clearInterval(presence);
    };
  }, [router]);

  useEffect(() => {
    if (!selected) return;

    const selectedGroupId = selected._id;
    let active = true;
    async function refreshMessages() {
      try {
        const response = await fetch(
          `/api/community/messages?groupId=${selectedGroupId}`,
        );
        const data = (await response.json()) as { messages?: ChatMessage[] };
        if (!response.ok) throw new Error("Could not load community messages.");
        if (!active) return;
        const nextMessages = data.messages || [];
        setMessages(nextMessages);
        const newestMessage = nextMessages[nextMessages.length - 1];
        const groupId = String(selectedGroupId);
        const newestId = newestMessage ? String(newestMessage._id) : "";
        if (newestId && lastSeenMessages.current.get(groupId) !== newestId) {
          lastSeenMessages.current.set(groupId, newestId);
          const readResponse = await fetch("/api/community/unread", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId }),
          });
          if (!readResponse.ok) {
            console.error("Could not mark community group as read.");
          }
          void loadUnread();
        }
      } catch (error) {
        if (active) console.error("Could not refresh community messages.", error);
      }
    }

    void refreshMessages();
    const t = setInterval(() => void refreshMessages(), 3000);

    return () => {
      active = false;
      clearInterval(t);
    };
  }, [loadUnread, selected]);

  useEffect(() => {
    if (!selected) return;
    const pollTyping = () =>
      fetch(`/api/community/typing?groupId=${selected._id}`)
        .then((response) => response.json())
      .then((data: { users?: string[] }) =>
        setTypingUsers(data.users || []),
      )
      .catch((error) => {
        console.error("Could not load typing status.", error);
        setTypingUsers([]);
      });
    pollTyping();
    const interval = setInterval(pollTyping, 1500);
    return () => {
      clearInterval(interval);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      updateTyping(false);
      setTypingUsers([]);
    };
  }, [selected, updateTyping]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [imagePreview]);

  useEffect(() => {
    const refreshUnread = () => void loadUnread();
    refreshUnread();
    const t = setInterval(refreshUnread, 5000);

    return () => clearInterval(t);
  }, [loadUnread]);

  async function send() {
    const cleanText = text.trim();

    if ((!cleanText && !imageFile) || !selected || sending) return;

    setSending(true);

    try {
      let attachmentUrl = "";
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("kind", "chat");
        formData.append("groupId", String(selected._id));
        const uploadResponse = await fetch("/api/community/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData: { url?: string; message?: string } =
          await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData.url)
          throw new Error(uploadData.message || "Image upload failed");
        attachmentUrl = uploadData.url;
      }

      const r = await fetch("/api/community/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: selected._id,
          text: cleanText,
          attachmentUrl,
          replyTo: replyTo?._id,
        }),
      });

      const d: { message?: ChatMessage | string } = await r.json();
      const sentMessage =
        typeof d.message === "object" ? d.message : undefined;

      if (r.ok && sentMessage) {
        setMessages((current) => [
          ...current,
          sentMessage,
        ]);

        setText("");
        setReplyTo(null);
        setImageFile(null);
        setImagePreview("");
        if (fileInput.current) fileInput.current.value = "";
        if (typingTimer.current) clearTimeout(typingTimer.current);
        updateTyping(false);
        loadUnread();
      } else {
        window.alert(
          typeof d.message === "string"
            ? d.message
            : "Message could not be sent.",
        );
      }
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Message could not be sent.",
      );
    } finally {
      setSending(false);
    }
  }

  async function reactToMessage(messageId: string, emoji: string) {
    try {
      const response = await fetch("/api/community/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      const data: {
        message?: string;
        reactions?: Record<string, string[]>;
      } = await response.json();
      if (!response.ok) {
        window.alert(data.message || "Reaction could not be saved.");
        return;
      }
      setMessages((current) =>
        current.map((message) =>
          String(message._id) === messageId
            ? { ...message, reactions: data.reactions || {} }
            : message,
        ),
      );
    } catch {
      window.alert("Reaction could not be saved.");
    }
  }

  async function deleteMessage() {
    if (!pendingDeleteMessageId || deletingMessage) return;
    setDeletingMessage(true);
    setDeleteMessageError("");

    try {
      const response = await fetch("/api/community/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: pendingDeleteMessageId }),
      });
      const result: { message?: string } = await response.json();
      if (!response.ok) {
        setDeleteMessageError(result.message || "Message could not be deleted.");
        return;
      }

      setMessages((current) =>
        current.filter((message) => message._id !== pendingDeleteMessageId),
      );
      setPendingDeleteMessageId(null);
    } catch {
      setDeleteMessageError("Message could not be deleted. Please try again.");
    } finally {
      setDeletingMessage(false);
    }
  }

  const visibleGroups = useMemo(() => {
    if (filterTab === "unread")
      return groups.filter((group) => unreadByGroup[String(group._id)] > 0);
    if (filterTab === "groups")
      return groups.filter((group) => group.audience === "subscribers");
    return groups;
  }, [filterTab, groups, unreadByGroup]);

  return (
    <main className="coursehub-page min-h-screen bg-white text-slate-900">
      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-[100] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="site-navbar-inner relative mx-auto flex h-[74px] w-full items-center gap-2 px-4 sm:gap-3 sm:px-5 lg:px-8 md:h-20">
          <button
            onClick={() => router.push("/")}
            className="navbar-wordmark shrink-0 text-xl font-black sm:text-2xl"
          >
            <CourseHubLogo size="sm" />
          </button>

          <div className="ml-auto hidden shrink-0 rounded-2xl bg-slate-100 p-1 md:flex lg:absolute lg:left-1/2 lg:ml-0 lg:-translate-x-1/2">
            <button
              aria-current="page"
              className="rounded-xl bg-white px-2 py-2 text-xs font-black text-slate-900 shadow-sm sm:px-4 sm:text-sm"
            >
              <span className="sm:hidden">Chat</span>
              <span className="hidden sm:inline">💬 Chat</span>
            </button>

            <button
              onClick={() => router.push("/community/feed")}
              className="rounded-xl px-2 py-2 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-indigo-700 sm:px-4 sm:text-sm"
            >
              <span className="sm:hidden">Feed</span>
              <span className="hidden sm:inline">📰 Feed</span>
            </button>

            <button
              onClick={() => router.push("/community/messages")}
              aria-label="Open private messages"
              className="rounded-xl px-2 py-2 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-indigo-700 sm:px-3 sm:text-sm"
            >
              <span className="sm:hidden">DMs</span>
              <span className="hidden sm:inline">✉ Messages</span>
            </button>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {meeting && (
              <a
                href={meeting.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join live meeting"
                title="Live Meeting"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-800 transition hover:bg-emerald-100 sm:w-auto sm:gap-2 sm:px-3 sm:text-sm sm:font-bold"
              >
                🎥
                <span className="hidden sm:inline">Live Meeting</span>
              </a>
            )}

            {/* DASHBOARD */}
            <button
              onClick={() => router.push("/dashboard")}
              className="hidden shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 sm:block"
            >
              Dashboard
            </button>
          </div>
        </div>

      </header>

      {/* CHAT APP */}
      <section className="flex h-[calc(100dvh-130px)] w-full overflow-hidden bg-white md:h-[calc(100dvh-74px)]">
        {/* OVERLAY MOBILE */}
        {mobileSidebar && (
          <button
            aria-label="Close sidebar"
            onClick={() =>
              setMobileSidebar(false)
            }
            className="fixed inset-x-0 bottom-14 top-[74px] z-[80] bg-slate-950/40 md:hidden"
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`fixed bottom-14 left-0 top-[74px] z-[90] w-[310px] max-w-[88vw] transform border-r border-slate-200 bg-[#f7f8fa] shadow-2xl transition-transform duration-300 md:static md:bottom-auto md:z-auto md:block md:w-[280px] md:max-w-none md:translate-x-0 md:shadow-none ${
            mobileSidebar
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >
          {/* SIDEBAR HEADER */}
          <div className="border-b border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black">
                  Chats
                </h1>

                <p className="mt-0.5 text-xs font-medium text-slate-400">
                  {subscriber
                    ? "Premium community"
                    : "Open community"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>

                <button
                  onClick={() =>
                    setMobileSidebar(false)
                  }
                  className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 md:hidden"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1">
              {(["all", "unread", "groups"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`flex-1 rounded-lg py-2 text-xs font-black transition ${
                    filterTab === tab
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab === "all" ? "All" : tab === "unread" ? "Unread" : "Groups"}
                  {tab === "unread" && unread > 0 && (
                    <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* GROUP LIST */}
          <div className="h-[calc(100%-139px)] overflow-y-auto p-2">
            {visibleGroups.map((g) => {
              const active =
                String(selected?._id) ===
                String(g._id);
              const groupUnread = unreadByGroup[String(g._id)] || 0;

              return (
                <button
                  key={g._id}
                  onClick={() => {
                    setSelected(g);
                    setReplyTo(null);
                    setMobileSidebar(false);
                  }}
                  className={`group mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                      : "text-slate-700 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <GroupAvatar
                    group={g}
                    active={active}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <b className="block truncate text-sm">
                        {g.name}
                      </b>

                      {g.audience ===
                        "subscribers" && (
                        <span className="text-xs">
                          💎
                        </span>
                      )}
                    </span>

                    <span
                      className={`mt-0.5 block truncate text-xs ${
                        active
                          ? "text-white/70"
                          : "text-slate-400"
                      }`}
                    >
                      {g.description ||
                        "Community group"}
                    </span>
                  </span>

                  {groupUnread > 0 && !active && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-white">
                      {groupUnread > 99 ? "99+" : groupUnread}
                    </span>
                  )}
                </button>
              );
            })}

            {!visibleGroups.length && (
              <div className="p-8 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-2xl">
                  💬
                </div>

                <p className="mt-3 text-sm font-bold text-slate-500">
                  {filterTab === "unread"
                    ? "No unread messages"
                    : filterTab === "groups"
                      ? "No subscriber groups available"
                      : "No chat groups available"}
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* CHAT */}
        <section className="flex min-w-0 flex-1 flex-col bg-[#e8edf3]">
          {/* CHAT HEADER */}
          <div className="flex min-h-[74px] items-center gap-3 border-b border-slate-200 bg-white px-3 shadow-sm sm:px-5">
            <button
              onClick={() =>
                setMobileSidebar(true)
              }
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg md:hidden"
            >
              ☰
            </button>

            <GroupAvatar group={selected} />

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-black sm:text-base">
                {selected?.name ||
                  "Community Chat"}
              </h2>

              <p className="truncate text-xs text-slate-400">
                {typingUsers.length
                  ? `${typingUsers.slice(0, 2).join(", ")}${typingUsers.length > 2 ? " and others" : ""} typing…`
                  : selected?.description ||
                  "Connect, discuss and learn together"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <div className="flex items-center justify-end gap-1.5 text-xs font-black text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Online
                </div>

                <p className="text-[10px] text-slate-400">
                  Community
                </p>
              </div>

              <button
                onClick={() =>
                  router.push(
                    "/community/feed",
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-lg transition hover:bg-slate-200"
                title="Community Feed"
              >
                📰
              </button>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="relative min-h-0 flex-1 overflow-hidden bg-[#e9edf2]">
            {/* WHATSAPP-STYLE PATTERN */}
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#c7cdd5_1px,transparent_1px)] [background-size:22px_22px]" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 grid place-items-center select-none"
            >
              <div className="flex flex-col items-center text-indigo-900 opacity-[0.055]">
                <svg viewBox="0 0 48 48" fill="none" className="h-24 w-24 sm:h-32 sm:w-32">
                  <path d="m4 18 20-10 20 10-20 10L4 18Z" fill="currentColor" />
                  <path d="M12 23v10c6 6 18 6 24 0V23l-12 6-12-6Z" fill="currentColor" opacity=".76" />
                  <path d="M44 19v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="44" cy="34" r="3" fill="currentColor" />
                </svg>
                <span className="-mt-1 text-sm font-black tracking-[.28em] sm:text-base">
                  COURSEHUB
                </span>
              </div>
            </div>

            <div className="absolute inset-0 z-[1] overflow-y-auto overscroll-contain">
              <div className="mx-auto max-w-5xl space-y-2 p-3 sm:p-5">
              {messages.map((m, index) => {
                const own =
                  String(m.userId?._id) ===
                  String(me?.id);

                const previous =
                  messages[index - 1];

                const sameUser =
                  previous &&
                  String(
                    previous.userId?._id,
                  ) ===
                    String(
                      m.userId?._id,
                    );

                return (
                  <div
                    key={m._id}
                    className={`flex items-end gap-2 ${
                      own
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {!own && !sameUser && (
                      <button
                        onClick={() => openMemberProfile(m.userId)}
                        disabled={!m.userId?._id && !m.userId?.id}
                        aria-label={`Open ${m.userId?.name || "user"} profile`}
                        className="mb-1"
                      >
                        <Avatar
                          user={m.userId}
                          size="h-8 w-8"
                        />
                      </button>
                    )}

                    {!own && sameUser && (
                      <div className="w-8 shrink-0" />
                    )}

                    <div
                      className={`group relative max-w-[88%] sm:max-w-[70%] ${
                        own
                          ? "items-end"
                          : "items-start"
                      }`}
                    >
                      {!own && !sameUser && (
                        <button
                          onClick={() => openMemberProfile(m.userId)}
                          disabled={!m.userId?._id && !m.userId?.id}
                          className="mb-1 ml-1 text-[11px] font-black text-indigo-600 hover:underline"
                        >
                          {m.userId?.name ||
                            "User"}
                        </button>
                      )}

                      <div
                        id={`community-message-${m._id}`}
                        className={`relative rounded-2xl px-3.5 py-2.5 shadow-sm ${
                          own
                            ? "rounded-br-md bg-indigo-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                        }`}
                      >
                        {m.replyTo && (
                          <button
                            onClick={() =>
                              document
                                .getElementById(
                                  `community-message-${m.replyTo?._id}`,
                                )
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                })
                            }
                            className={`mb-2 block w-full rounded-lg border-l-2 px-2 py-1 text-left text-xs ${
                              own
                                ? "border-white/70 bg-white/10 text-white/80"
                                : "border-indigo-500 bg-slate-50 text-slate-500"
                            }`}
                          >
                            <span className="block font-bold">
                              {m.replyTo.userId?.name || "Reply"}
                            </span>
                            <span className="block truncate">
                              {m.replyTo.text || "Image"}
                            </span>
                          </button>
                        )}

                        {m.text && (
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">
                            <MessageText text={m.text} />
                          </p>
                        )}

                        {m.attachmentUrl && (
                          <a
                            href={m.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block overflow-hidden rounded-xl"
                          >
                            <Image
                              src={m.attachmentUrl}
                              alt="Shared image"
                              width={512}
                              height={288}
                              unoptimized
                              className="max-h-72 max-w-full rounded-xl object-cover"
                            />
                          </a>
                        )}

                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                            own
                              ? "text-white/60"
                              : "text-slate-400"
                          }`}
                        >
                          {new Date(
                            m.createdAt,
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}

                          {own && (
                            <span className="text-[11px]">
                              ✓✓
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {MESSAGE_REACTIONS.map((emoji) => {
                          const users = Array.isArray(m.reactions?.[emoji])
                            ? m.reactions[emoji]
                            : [];
                          const reacted = users.some(
                            (userId: string) =>
                              String(userId) === String(me?.id),
                          );
                          return (
                            <button
                              key={emoji}
                              onClick={() => reactToMessage(String(m._id), emoji)}
                              aria-label={`React with ${emoji}`}
                              className={`rounded-full border px-2 py-0.5 text-xs ${
                                reacted
                                  ? "border-indigo-300 bg-indigo-50"
                                  : "border-slate-200 bg-white/90"
                              }`}
                            >
                              {emoji}
                              {users.length > 0 && (
                                <span className="ml-1 text-[10px] text-slate-500">
                                  {users.length}
                                </span>
                              )}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setReplyTo(m)}
                          className="rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-500"
                          aria-label="Reply to message"
                        >
                          ↩ Reply
                        </button>
                        {(me?.role === "admin" ||
                          me?.adminPermissions?.includes("manage_community")) && (
                          <button
                            onClick={() => {
                              setDeleteMessageError("");
                              setPendingDeleteMessageId(String(m._id));
                            }}
                            className="rounded-full border border-red-200 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-red-600"
                            aria-label="Delete community message"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500">
                  <span className="flex gap-1">
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
                  </span>
                  {typingUsers.slice(0, 2).join(", ")}
                  {typingUsers.length > 2 ? " and others" : ""} typing
                </div>
              )}

              {!messages.length && (
                <div className="grid min-h-[60vh] place-items-center">
                  <div className="rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-xl backdrop-blur">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-indigo-50 text-3xl">
                      💬
                    </div>

                    <b className="mt-4 block text-base">
                      Start the conversation
                    </b>

                    <span className="mt-1 block text-xs text-slate-400">
                      Say hello to the community.
                    </span>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* COMPOSER */}
          <div className="relative border-t border-slate-200 bg-white p-2.5 sm:p-3">
            {showEmojiPicker && (
              <div className="absolute bottom-full left-3 z-20 mb-2 grid grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onTextChange(`${text}${emoji}`);
                      setShowEmojiPicker(false);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-xl text-xl hover:bg-slate-100"
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {(replyTo || imagePreview) && (
              <div className="mx-auto mb-2 flex max-w-5xl items-center gap-3 rounded-xl bg-slate-50 p-2">
                {replyTo && (
                  <div className="min-w-0 flex-1 border-l-2 border-indigo-500 pl-2 text-xs">
                    <b className="block text-indigo-600">
                      Replying to {replyTo.userId?.name || "message"}
                    </b>
                    <span className="block truncate text-slate-500">
                      {replyTo.text || "Image"}
                    </span>
                  </div>
                )}
                {imagePreview && (
                  <Image
                    src={imagePreview}
                    alt="Image preview"
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}
                <button
                  onClick={() => {
                    setReplyTo(null);
                    setImageFile(null);
                    setImagePreview("");
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-200"
                  aria-label="Remove attachment or reply"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="mx-auto flex max-w-5xl items-center gap-2">
              <button
                onClick={() => fileInput.current?.click()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-lg transition hover:bg-slate-200 sm:h-12 sm:w-12"
                title="Attach image"
                aria-label="Attach image"
              >
                📎
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => chooseImage(event.target.files?.[0])}
              />

              <button
                onClick={() => setShowEmojiPicker((open) => !open)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-lg transition hover:bg-slate-200 sm:h-12 sm:w-12"
                title="Emoji"
                aria-label="Open emoji picker"
              >
                😊
              </button>

              <input
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  selected
                    ? "Type a message..."
                    : "Select a chat first"
                }
                disabled={!selected || sending}
                className="h-11 min-w-0 flex-1 rounded-full border border-transparent bg-slate-100 px-5 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12"
              />

              <button
                onClick={send}
                disabled={
                  (!text.trim() && !imageFile) ||
                  !selected ||
                  sending
                }
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-600 text-lg text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 sm:h-12 sm:w-12"
                title="Send message"
              >
                {sending ? "…" : "➤"}
              </button>
            </div>

            <div className="mx-auto mt-1 hidden max-w-5xl px-16 text-[10px] text-slate-400 sm:block">
              Press Enter to send • Messages refresh automatically
            </div>
          </div>
        </section>
      </section>

      <nav
        aria-label="Community navigation"
        className="fixed inset-x-0 bottom-0 z-[70] grid h-14 grid-cols-3 border-t border-slate-200 bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.06)] md:hidden"
      >
        <button
          onClick={() => router.push("/community")}
          className="border-t-2 border-indigo-600 text-xs font-black text-indigo-700"
        >
          💬 Chat
        </button>
        <button
          onClick={() => router.push("/community/feed")}
          className="text-xs font-bold text-slate-600"
        >
          📰 Feed
        </button>
        <button
          onClick={() => router.push("/community/messages")}
          className="text-xs font-bold text-slate-600"
        >
          ✉ Messages
        </button>
      </nav>

      {/* FLOATING COMMUNITY BUTTON */}
      

      {pendingDeleteMessageId && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingMessage) {
              setPendingDeleteMessageId(null);
              setDeleteMessageError("");
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-message-title"
            aria-describedby="delete-message-description"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !deletingMessage) {
                setPendingDeleteMessageId(null);
                setDeleteMessageError("");
              }
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 id="delete-message-title" className="text-lg font-black text-slate-900">
              Delete community message?
            </h2>
            <p id="delete-message-description" className="mt-2 text-sm text-slate-600">
              This message will be permanently deleted.
            </p>
            {deleteMessageError && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                {deleteMessageError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                disabled={deletingMessage}
                onClick={() => {
                  setPendingDeleteMessageId(null);
                  setDeleteMessageError("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingMessage}
                onClick={deleteMessage}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {deletingMessage ? "Deleting..." : "Delete message"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
