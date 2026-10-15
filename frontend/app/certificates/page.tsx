"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CourseHubLogo from "@/components/CourseHubLogo";

type CertificateRow = {
  _id: string;
  certificateId: string;
  issuedAt: string;
  courseId?: { name?: string } | string | null;
};

function AwardIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <circle cx="24" cy="19" r="13" fill="currentColor" opacity=".16" />
      <circle cx="24" cy="19" r="10" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="m24 12 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L24 12Z"
        fill="currentColor"
      />
      <path
        d="m17 29-1.5 12 8.5-4.5 8.5 4.5L31 29"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Certificates() {
  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [dashboardHref, setDashboardHref] = useState("/dashboard");

  useEffect(() => {
    let active = true;

    async function loadCertificates() {
      setLoading(true);
      setError("");
      try {
        const [response, userResponse] = await Promise.all([
          fetch("/api/certificates", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" }),
        ]);
        const [data, userData] = await Promise.all([
          response.json() as Promise<{
          certificates?: CertificateRow[];
          message?: string;
          }>,
          userResponse.json() as Promise<{
            user?: { role?: string };
            message?: string;
          }>,
        ]);
        if (!response.ok)
          throw new Error(data.message || "Could not load your certificates.");
        if (!userResponse.ok || !userData.user)
          throw new Error(userData.message || "Could not load your account.");
        if (active) {
          setRows(data.certificates || []);
          setDashboardHref(
            userData.user.role === "admin" ? "/admin" : "/dashboard",
          );
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load your certificates.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCertificates();
    return () => {
      active = false;
    };
  }, [reloadCount]);

  return (
    <main className="coursehub-page min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_rgba(79,70,229,0.10),_transparent_38%),linear-gradient(180deg,#f7f8fc_0%,#f1f3f9_100%)] px-0 py-0 text-slate-900">
      <div className="w-full">
        <nav className="glass sticky top-0 z-50">
          <div className="container site-navbar-inner flex min-h-12 items-center justify-between gap-3 py-0">
            <Link
              href="/"
              aria-label="CourseHub home"
              className="navbar-wordmark shrink-0 text-2xl font-black tracking-tight"
            >
              <CourseHubLogo size="sm" subtitle="CERTIFICATION CENTER" />
            </Link>
            <Link
              href={dashboardHref}
              className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 sm:px-4"
            >
              Back to dashboard
            </Link>
          </div>
        </nav>

        <section className="relative isolate overflow-hidden rounded-none bg-gradient-to-br from-indigo-700 via-indigo-700 to-indigo-900 px-6 py-8 text-white shadow-[0_24px_60px_rgba(67,56,202,.22)] sm:px-9 sm:py-10 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10 bg-indigo-300/10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-40 right-1/3 -z-10 h-72 w-72 rounded-full bg-[#e8c77b]/10 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c77b]/30 bg-[#e8c77b]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#f0d994] sm:text-xs">
              <AwardIcon className="h-4 w-4" />
              Your learning achievements
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              My certificates
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
              Every certificate is proof of the skills you have earned. View,
              share, or verify your CourseHub achievements anytime.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href="/dashboard/exams"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#e8c77b] px-4 py-2.5 text-sm font-black text-[#272b4a] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#f0d994]"
              >
                Explore final exams
                <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link
                href="/verify-certificate"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
              >
                Verify a certificate
              </Link>
            </div>
          </div>
          <div className="relative mt-7 flex items-center gap-4 rounded-2xl border border-white/15 bg-white/[.08] p-4 backdrop-blur-sm sm:max-w-xs sm:px-5 lg:mt-0 lg:min-w-56">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e8c77b]/15 text-[#f0d994]">
              <AwardIcon className="h-7 w-7" />
            </span>
            <div>
              <p className="text-2xl font-black leading-none text-white">
                {loading ? "—" : rows.length}
              </p>
              <p className="mt-1.5 text-xs font-semibold text-indigo-100">
                {rows.length === 1 ? "Certificate earned" : "Certificates earned"}
              </p>
            </div>
          </div>
        </section>

        <section className="container mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-600">
                Your accomplishments
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#202949] sm:text-2xl">
                Award collection
              </h2>
            </div>
            {!loading && rows.length > 0 && (
              <p className="text-sm font-semibold text-slate-500">
                {rows.length} {rows.length === 1 ? "award" : "awards"}
              </p>
            )}
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <p className="font-bold text-rose-800">{error}</p>
              <button
                type="button"
                onClick={() => setReloadCount((count) => count + 1)}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div
              role="status"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <span className="sr-only">Loading certificates…</span>
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[1.75rem] border border-white bg-white/80 p-5 shadow-sm"
                >
                  <div className="h-32 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100" />
                  <div className="mt-5 h-4 w-3/4 rounded bg-slate-100" />
                  <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : rows.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((certificate) => {
                const courseName =
                  typeof certificate.courseId === "object" &&
                  certificate.courseId
                    ? certificate.courseId.name || "Course completion"
                    : "Course completion";

                return (
                  <Link
                    key={certificate._id}
                    href={`/certificates/${encodeURIComponent(certificate.certificateId)}`}
                    className="group rounded-[1.75rem] border border-white bg-white/90 p-4 shadow-[0_12px_32px_rgba(29,35,66,.06)] transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_20px_45px_rgba(29,35,66,.12)] focus-visible:outline-indigo-600 sm:p-5"
                  >
                    <div className="relative isolate flex min-h-36 items-center justify-center overflow-hidden rounded-2xl border border-[#d8c99f]/60 bg-[radial-gradient(ellipse_at_top_right,_rgba(232,199,123,0.27),_transparent_42%),linear-gradient(135deg,#f9f7ef_0%,#ffffff_48%,#f0eef8_100%)]">
                      <div
                        aria-hidden="true"
                        className="absolute inset-2 rounded-xl border border-[#b99852]/45"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-3 rounded-lg border border-[#d9cda9]/70"
                      />
                      <span className="absolute left-5 top-5 text-[8px] font-black uppercase tracking-[.2em] text-[#a08243]">
                        CourseHub
                      </span>
                      <span className="absolute right-5 top-4 text-[#b99852]">
                        <AwardIcon className="h-5 w-5" />
                      </span>
                      <div className="px-8 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-[.25em] text-[#a08243]">
                          Certificate of completion
                        </p>
                        <p className="mt-2 line-clamp-2 font-serif text-lg font-bold leading-tight text-[#30385f] sm:text-xl">
                          {courseName}
                        </p>
                        <span className="mx-auto mt-3 block h-px w-12 bg-[#b99852]" />
                      </div>
                    </div>
                    <div className="px-1 pb-1 pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="line-clamp-1 text-base font-black text-[#202949]">
                            {courseName}
                          </h3>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Awarded{" "}
                            {new Date(certificate.issuedAt).toLocaleDateString(
                              undefined,
                              { year: "numeric", month: "short", day: "numeric" },
                            )}
                          </p>
                        </div>
                        <span className="mt-0.5 shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                          Earned
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <span className="min-w-0 truncate font-mono text-[10px] font-bold tracking-wide text-slate-500">
                          {certificate.certificateId}
                        </span>
                        <span className="shrink-0 text-xs font-black text-indigo-700 transition group-hover:translate-x-0.5">
                          View award <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-white bg-white/85 px-6 py-10 text-center shadow-sm sm:px-10 sm:py-14">
              <div
                aria-hidden="true"
                className="absolute -right-12 -top-20 -z-10 h-56 w-56 rounded-full bg-indigo-100/70 blur-3xl"
              />
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#e7d9b5] bg-[#fbf7e9] text-[#a08243] shadow-sm">
                <AwardIcon className="h-9 w-9" />
              </span>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-indigo-600">
                Your next milestone awaits
              </p>
              <h3 className="mt-2 text-xl font-black text-[#202949] sm:text-2xl">
                Your first certificate is within reach
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Complete a course and pass its final exam to earn a verified
                CourseHub certificate. Your achievements will appear here.
              </p>
              <Link
                href="/dashboard/exams"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-900/10 transition hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                Browse final exams
                <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            </div>
          )}
        </section>

        <footer className="container mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-slate-200/80 py-5 text-center text-xs text-slate-500">
          <span>Every award is verifiable with its unique certificate ID.</span>
          <Link
            href="/verify-certificate"
            className="font-bold text-indigo-700 hover:text-indigo-900"
          >
            Verify a certificate
          </Link>
        </footer>
      </div>
    </main>
  );
}
