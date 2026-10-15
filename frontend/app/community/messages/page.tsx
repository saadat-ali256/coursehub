"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { messagePreviewText } from "@/components/community/MessageText";
import CourseHubLoader from "@/components/CourseHubLoader";
import CourseHubLogo from "@/components/CourseHubLogo";

type Member = {
  _id: string;
  name: string;
  avatarUrl?: string;
};

type Conversation = {
  user: Member;
  message: {
    text: string;
    createdAt: string;
    senderId: Member;
  };
};

function MemberAvatar({ user }: { user: Member }) {
  const [failed, setFailed] = useState(false);
  return user.avatarUrl && !failed ? (
    <Image
      src={user.avatarUrl}
      alt={`${user.name} profile`}
      onError={() => setFailed(true)}
      className="h-12 w-12 rounded-full object-cover"
      width={48}
      height={48}
      unoptimized
    />
  ) : (
    <span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-100 font-black text-indigo-700">
      {user.name?.[0]?.toUpperCase() || "U"}
    </span>
  );
}

export default function PrivateMessages() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace(
        `/login?next=${encodeURIComponent("/community/messages")}`,
      );
      return;
    }

    fetch("/api/community/direct-messages")
      .then(async (response) => {
        const body = await response.text();
        let data: {
          message?: string;
          conversations?: Conversation[];
        };
        try {
          data = body ? JSON.parse(body) : {};
        } catch {
          throw new Error(
            `Messages service returned an invalid response (HTTP ${response.status}).`,
          );
        }
        if (response.status === 403) {
          router.replace(
            `/subscriptions?next=${encodeURIComponent("/community/messages")}`,
          );
          return;
        }
        if (!response.ok)
          throw new Error(
            data.message ||
              `Could not load messages (HTTP ${response.status}).`,
          );
        setConversations(data.conversations || []);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Could not load messages."),
      )
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, router]);

  return (
    <main className="coursehub-page min-h-screen bg-[radial-gradient(circle_at_10%_0%,#e0e7ff,transparent_28%),radial-gradient(circle_at_90%_10%,#cffafe,transparent_24%),#eef2f7] pb-20 text-[#172033] md:pb-8">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="site-navbar-inner mx-auto flex h-16 w-full items-center gap-2 px-3 sm:h-[72px] sm:gap-4 sm:px-5 md:h-20">
          <button
            onClick={() => router.push("/community/feed")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
            aria-label="Back to community feed"
          >
            ←
          </button>
          <button
            onClick={() => router.push("/community/feed")}
            className="navbar-wordmark min-w-0 flex-1 truncate text-left text-lg font-black sm:flex-none sm:text-xl"
          >
            <CourseHubLogo size="sm" />
            <span className="hidden sm:inline"> Community</span>
          </button>
          <nav aria-label="Community navigation" className="ml-auto hidden items-center gap-1 rounded-2xl bg-slate-100 p-1 sm:flex">
            <button onClick={() => router.push("/community")} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white">💬 Chat</button>
            <button onClick={() => router.push("/community/feed")} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white">📰 Feed</button>
            <button onClick={() => router.push("/community/messages")} aria-current="page" className="rounded-xl bg-white px-3 py-2 text-sm font-black text-indigo-700 shadow-sm">✉ Messages</button>
          </nav>
        </div>
      </header>

      <section className="desktop-content-width mx-auto w-full max-w-3xl px-3 py-5 sm:px-5 sm:py-8">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_18px_55px_rgba(30,41,59,0.09)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-indigo-50/70 to-cyan-50/70 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-xl text-white shadow-lg shadow-indigo-200">✉</span>
              <div className="min-w-0">
                <h1 className="text-xl font-black sm:text-2xl">Your messages</h1>
                <p className="mt-1 text-sm text-slate-500">
              Message any CourseHub member privately. Premium membership is required.
                </p>
              </div>
            </div>
          </div>
          {loading ? (
            <CourseHubLoader label="Loading conversations..." className="min-h-52 p-8" />
          ) : error ? (
            <div role="alert" className="m-4 rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700 sm:m-6">{error}</div>
          ) : conversations.length ? (
            <div className="divide-y divide-slate-100 p-2 sm:p-3">
              {conversations.map((conversation) => (
                <button
                  key={conversation.user._id}
                  onClick={() =>
                    router.push(`/community/messages/${encodeURIComponent(conversation.user._id)}`)
                  }
                  aria-label={`Open conversation with ${conversation.user.name}`}
                  className="group flex w-full min-w-0 items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-indigo-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:gap-4 sm:p-4"
                >
                  <span className="relative shrink-0">
                    <MemberAvatar user={conversation.user} />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center justify-between gap-2">
                      <b className="block truncate text-sm font-black text-slate-900 sm:text-base">{conversation.user.name}</b>
                      <time className="shrink-0 text-[10px] text-slate-400 sm:text-xs">
                        {new Date(conversation.message.createdAt).toLocaleDateString()}
                      </time>
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500 sm:text-sm">
                      {messagePreviewText(conversation.message.text)}
                    </span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600">›</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center px-6 py-10 text-center sm:py-14">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-indigo-50 text-3xl text-indigo-600">✉</div>
                <b className="mt-4 block text-lg font-black">No private messages yet</b>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Private conversations with your CourseHub contacts will appear here.
                </p>
              <button
                onClick={() => router.push("/community/feed")}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
              >
                Browse the feed
              </button>
              <button
                onClick={() => router.push("/support")}
                className="ml-2 mt-5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                Contact support
              </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <nav aria-label="Mobile community navigation" className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-3 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
        <button onClick={() => router.push("/community")} className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-slate-500"><span className="text-lg">💬</span>Chat</button>
        <button onClick={() => router.push("/community/feed")} className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-slate-500"><span className="text-lg">📰</span>Feed</button>
        <button onClick={() => router.push("/community/messages")} aria-current="page" className="flex flex-col items-center justify-center gap-0.5 border-t-2 border-indigo-600 text-[11px] font-black text-indigo-700"><span className="text-lg">✉</span>Messages</button>
      </nav>
    </main>
  );
}
