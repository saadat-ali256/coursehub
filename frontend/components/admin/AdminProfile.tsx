"use client";

import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { createPortal } from "react-dom";
import Image from "next/image";

export type AdminProfileUser = {
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
};

export default function AdminProfile({
  user,
  onUpdated,
}: {
  user: AdminProfileUser;
  onUpdated: (user: AdminProfileUser) => void;
}) {
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/community/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, avatarUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update profile.");
      const updated = { ...user, name, bio, avatarUrl };
      onUpdated(updated);
      setNotice("Profile updated successfully.");
      setError(false);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not update profile.");
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    setBusy(true);
    setNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Image upload failed.");
      setAvatarUrl(data.url);
      setNotice("Image uploaded. Save profile to keep the change.");
      setError(false);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Image upload failed.");
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (!clerkUser) throw new Error("Your Clerk session is not available. Please sign in again.");
      await clerkUser.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      });
      setError(false);
      setNotice("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      window.setTimeout(() => {
        void signOut({ redirectUrl: "/login" });
      }, 1400);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not change password.");
      setError(true);
      setBusy(false);
    }
  }

  const initials = (name || "A").trim().charAt(0).toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setName(user.name || "");
          setBio(user.bio || "");
          setAvatarUrl(user.avatarUrl || "");
          setNotice("");
          setError(false);
          setOpen(true);
        }}
        aria-label="Open admin profile"
        className="relative grid h-10 w-10 shrink-0 place-items-center overflow-visible rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white ring-2 ring-white transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="h-full w-full rounded-full object-cover"
          />
        ) : initials}
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close admin profile"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-profile-title"
            className="relative z-10 my-0 max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-3xl bg-white p-4 shadow-2xl sm:my-auto sm:max-h-[92dvh] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Admin account</p>
                <h2 id="admin-profile-title" className="mt-1 text-2xl font-black text-slate-900">Profile settings</h2>
                <p className="mt-1 text-sm text-slate-500">Update your profile or change your password.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-lg text-slate-600" aria-label="Close">×</button>
            </div>

            {notice && <p role={error ? "alert" : "status"} className={`mt-4 rounded-xl px-4 py-3 text-sm ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{notice}</p>}

            <form onSubmit={saveProfile} className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-100 text-xl font-black text-indigo-700">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Admin profile preview"
                      width={64}
                      height={64}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {busy ? "Please wait..." : "Change photo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(event) => uploadAvatar(event.target.files?.[0])} />
                </label>
                <span className="text-xs text-slate-500">JPG, PNG, or WebP</span>
              </div>
              <label className="block text-sm font-semibold text-slate-700">Name<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" /></label>
              <label className="block text-sm font-semibold text-slate-700">Email<input readOnly value={user.email} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal text-slate-500" /></label>
              <label className="block text-sm font-semibold text-slate-700">Bio<textarea maxLength={500} rows={2} value={bio} onChange={(event) => setBio(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" /></label>
              <button type="submit" disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">Save profile</button>
            </form>

            <form onSubmit={changePassword} className="mt-7 border-t border-slate-100 pt-6">
              <h3 className="text-lg font-bold text-slate-900">Change password</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" /></label>
                <label className="text-sm font-semibold text-slate-700">New password<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" /></label>
              </div>
              <button type="submit" disabled={busy} className="mt-4 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Update password</button>
            </form>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
