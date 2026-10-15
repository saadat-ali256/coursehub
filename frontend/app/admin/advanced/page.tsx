/* AUTO-FORMATTED FOR READABILITY */
/* Page: renders the UI for this route. */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Analytics = {
  users: number;
  activeSubscriptions: number;
  completedLessons: number;
  certificates: number;
  quizAttempts: number;
  passedQuizzes: number;
  assignments: number;
  communityMessages: number;
};

type AnalyticsResponse = Partial<Analytics> & {
  success?: boolean;
  message?: string;
};

export default function AdvancedAdmin() {
  const [analytics, setAnalytics] = useState<Partial<Analytics> | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      const response = await fetch("/api/admin/advanced");
      const data = (await response.json()) as AnalyticsResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load admin analytics.");
      }
      if (active) setAnalytics(data);
    }

    void loadAnalytics().catch((error: unknown) => {
      if (active) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load admin analytics.",
        );
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="admin-workspace min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-bold text-indigo-600">
          ← Admin
        </Link>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/coupons"
            className="rounded-xl bg-white px-4 py-2 font-bold shadow-sm"
          >
            Coupons
          </Link>
          <Link
            href="/admin"
            className="rounded-xl bg-white px-4 py-2 font-bold shadow-sm"
          >
            Course CMS
          </Link>
        </div>
        <h1 className="mt-7 text-4xl font-black">Advanced Control Center</h1>
        <p className="mt-2 text-slate-500">
          Learning, assessments, subscriptions, engagement and operational
          analytics.
        </p>
        {loadError && (
          <p className="mt-4 rounded-xl bg-rose-50 p-4 text-rose-800" role="alert">
            {loadError}
          </p>
        )}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Users", analytics?.users],
            ["Active subscribers", analytics?.activeSubscriptions],
            ["Completed lessons", analytics?.completedLessons],
            ["Certificates", analytics?.certificates],
          ].map(([a, b]) => (
            <div key={String(a)} className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="text-sm text-slate-500">{a}</div>
              <div className="mt-2 text-4xl font-black">{b ?? "—"}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Engagement</h2>
            <div className="mt-5 space-y-4">
              {[
                ["Quiz attempts", analytics?.quizAttempts],
                ["Passed quizzes", analytics?.passedQuizzes],
                ["Assignments", analytics?.assignments],
                ["Community messages", analytics?.communityMessages],
              ].map(([a, b]) => (
                <div
                  key={String(a)}
                  className="flex justify-between rounded-2xl bg-slate-50 p-4"
                >
                  <span>{a}</span>
                  <b>{b ?? 0}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
