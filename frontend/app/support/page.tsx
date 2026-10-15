"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CourseHubLoader from "@/components/CourseHubLoader";
import CourseHubLogo from "@/components/CourseHubLogo";

type SupportAdmin = {
  id: string;
  name: string;
  email: string;
};

export default function SupportPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<SupportAdmin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [communityAccess, setCommunityAccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/support").then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load support contacts.");
        return data.admins as SupportAdmin[];
      }),
      fetch("/api/auth/me").then((response) => response.json()),
    ])
      .then(([supportAdmins, me]) => {
        if (!active) return;
        setAdmins(supportAdmins || []);
        setSelectedAdmin(supportAdmins?.[0]?.id || "");
        setEmail(me.user?.email || "");
        setSignedIn(!!me.user);
        setCommunityAccess(me.user?.communityAccess === true);
      })
      .catch((error) => {
        if (active)
          setLoadError(error instanceof Error ? error.message : "Could not load support contacts.");
      });
    return () => {
      active = false;
    };
  }, []);

  const admin = admins.find((item) => item.id === selectedAdmin);
  const replySuffix = email.trim() ? `\n\nReply email: ${email.trim()}` : "";

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!signedIn) {
      setStatus("Sign in to send an in-site support message.");
      return;
    }
    if (!admin || !message.trim() || busy) return;
    if (message.trim().length + replySuffix.length > 2000) {
      setStatus("Shorten your message so it fits with your reply email.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/community/direct-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: admin.id,
          text: `${message.trim()}${replySuffix}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not send your message.");
      setMessage("");
      router.push(`/community/messages/${encodeURIComponent(admin.id)}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  }

  const emailHref = admin
    ? `mailto:${admin.email}?subject=${encodeURIComponent("CourseHub support request")}&body=${encodeURIComponent(`${message.trim()}${email ? `\n\nReply to: ${email}` : ""}`)}`
    : undefined;

  return (
    <main className="coursehub-page min-h-screen bg-[radial-gradient(circle_at_10%_0%,#e0e7ff,transparent_28%),radial-gradient(circle_at_90%_10%,#cffafe,transparent_24%),#eef2f7] px-3 pb-10 text-[#172033] sm:px-5">
      <header className="sticky top-0 z-20 -mx-3 border-b border-slate-200/80 bg-white/90 px-3 shadow-sm backdrop-blur-xl sm:-mx-5 sm:px-5 md:px-0">
        <div className="site-navbar-inner mx-auto flex h-16 w-full max-w-6xl items-center gap-3">
          <Link href="/" className="navbar-wordmark min-w-0 truncate text-xl font-black">
            <CourseHubLogo size="sm" />
          </Link>
          <nav className="ml-auto flex shrink-0 items-center gap-2 text-sm font-bold">
            <Link href="/community/feed" className="rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100">
              Community
            </Link>
            <Link href="/dashboard" className="rounded-xl bg-slate-900 px-3 py-2 text-white">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl py-8 sm:py-12">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-lg shadow-indigo-200">
            ?
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">CourseHub Support</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Need help with your account, courses, or subscription? Send an in-site message or email our admin team.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <form onSubmit={sendMessage} className="rounded-3xl border border-white bg-white p-5 shadow-[0_18px_55px_rgba(30,41,59,0.09)] sm:p-7">
            <h2 className="text-lg font-black">Message support</h2>
            <p className="mt-1 text-sm text-slate-500">Send a private message to an admin.</p>
            {loadError ? (
              <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{loadError}</p>
            ) : (
              <>
                {admins.length === 0 && (
                  <p role="status" className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    No active admin contacts are available right now.
                  </p>
                )}
                {admins.length > 1 && (
                  <label className="mt-5 block text-sm font-bold">
                    Admin
                    <select
                      value={selectedAdmin}
                      onChange={(event) => setSelectedAdmin(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal"
                    >
                      {admins.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                )}
                <label className="mt-5 block text-sm font-bold">
                  Your email
                  <input
                    type="email"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
                  />
                </label>
                <label className="mt-4 block text-sm font-bold">
                  Message
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={Math.max(1, 2000 - replySuffix.length)}
                    rows={5}
                    required
                    placeholder="How can we help?"
                    className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                {!signedIn && (
                  <p className="mt-3 text-xs text-slate-500">
                    Sign in to send an in-site message. You can email support without signing in.
                  </p>
                )}
                {signedIn && communityAccess ? (
                  <button
                    type="submit"
                    disabled={busy || !message.trim() || !admin}
                    className="mt-4 w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? "Sending…" : "Send private message"}
                  </button>
                ) : signedIn ? (
                  <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    An active premium subscription is required to send an in-site message. You can still contact support by email.
                    <Link href="/subscriptions" className="ml-1 font-bold underline">View plans</Link>
                  </p>
                ) : (
                  <Link
                    href="/login"
                    className="mt-4 block w-full rounded-xl bg-indigo-600 px-5 py-3 text-center font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
                  >
                    Sign in to message
                  </Link>
                )}
                {status && <p role="status" className="mt-3 text-sm font-semibold text-indigo-700">{status}</p>}
              </>
            )}
          </form>

          <section className="rounded-3xl border border-white bg-white p-5 shadow-[0_18px_55px_rgba(30,41,59,0.09)] sm:p-7">
            <h2 className="text-lg font-black">Email support</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Open your email app with the admin address and your message ready to send.
            </p>
            {admin ? (
              <>
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Support email</div>
                  <a href={`mailto:${admin.email}`} className="mt-1 block break-all font-bold text-indigo-700 hover:underline">
                    {admin.email}
                  </a>
                </div>
                <a
                  href={emailHref}
                  aria-disabled={!message.trim()}
                  onClick={(event) => {
                    if (!message.trim()) {
                      event.preventDefault();
                      setStatus("Write a message first, then choose Email support.");
                    }
                  }}
                  className={`mt-5 block rounded-xl px-5 py-3 text-center font-bold transition ${message.trim() ? "bg-slate-900 text-white hover:bg-slate-800" : "cursor-not-allowed bg-slate-200 text-slate-500"}`}
                >
                  Email support
                </a>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Email is sent from your own email application; CourseHub does not send email in the background.
                </p>
              </>
            ) : !loadError && admins.length === 0 ? (
              <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                No active admin contacts are available right now.
              </p>
            ) : !loadError ? (
              <CourseHubLoader label="Loading support contact..." className="mt-5 rounded-xl bg-slate-50 p-4" />
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
