"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import CourseHubLogo from "@/components/CourseHubLogo";

type VerifiedCertificate = {
  certificateId: string;
  issuedAt: string;
  studentName?: string;
  subjectName?: string;
  score?: number;
  percentage?: number;
  status?: "valid" | "revoked";
  verified?: boolean;
  courseId?: { name?: string } | string;
};

type VerificationResponse = {
  authentic?: boolean;
  valid?: boolean;
  message?: string;
  certificate?: VerifiedCertificate;
};

export default function CertificateVerification({
  initialId,
}: {
  initialId: string;
}) {
  const [certificateId, setCertificateId] = useState(initialId);
  const [certificate, setCertificate] = useState<VerifiedCertificate | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "valid" | "revoked" | "not-found" | "error"
  >(initialId ? "loading" : "idle");
  const [error, setError] = useState("");
  const requestNumber = useRef(0);

  async function loadCertificate(id: string, currentRequest: number) {
    const normalizedId = id.trim();
    try {
      const response = await fetch(
        `/api/certificates?id=${encodeURIComponent(normalizedId)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as VerificationResponse;
      if (currentRequest !== requestNumber.current) return;

      if (response.status === 404) {
        setStatus("not-found");
        return;
      }
      if (!response.ok || !data.certificate) {
        throw new Error(data.message || "Could not verify this certificate right now.");
      }

      setCertificate(data.certificate);
      setStatus(data.valid ? "valid" : "revoked");
    } catch (cause) {
      if (currentRequest !== requestNumber.current) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not verify this certificate right now.",
      );
      setStatus("error");
    }
  }

  function verify(id: string) {
    const normalizedId = id.trim();
    const currentRequest = ++requestNumber.current;
    setCertificate(null);
    setError("");
    if (!normalizedId) {
      setStatus("idle");
      return;
    }

    setStatus("loading");
    void loadCertificate(normalizedId, currentRequest);
  }

  useEffect(() => {
    if (!initialId) return;
    const currentRequest = ++requestNumber.current;
    void loadCertificate(initialId, currentRequest);
  }, [initialId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedId = certificateId.trim();
    const query = normalizedId ? `?id=${encodeURIComponent(normalizedId)}` : "";
    window.history.replaceState(null, "", `/verify-certificate${query}`);
    void verify(normalizedId);
  }

  const courseName =
    certificate && typeof certificate.courseId === "object"
      ? certificate.courseId.name
      : undefined;

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
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Go back"
                title="Go back"
                onClick={() => window.history.back()}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M19 12H5m0 0 7 7m-7-7 7-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <Link
                href="/certificates"
                className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 sm:px-4"
              >
                My certificates
              </Link>
            </div>
          </div>
        </nav>

        <section className="relative isolate overflow-hidden rounded-none bg-gradient-to-br from-indigo-700 via-indigo-700 to-indigo-900 px-6 py-8 text-white shadow-[0_24px_60px_rgba(67,56,202,.22)] sm:px-9 sm:py-10 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div aria-hidden="true" className="absolute -right-16 -top-28 -z-10 h-80 w-80 rounded-full border border-white/10 bg-indigo-400/25 blur-[1px]" />
          <div aria-hidden="true" className="absolute -bottom-36 right-1/4 -z-10 h-72 w-72 rounded-full bg-[#e8c77b]/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c77b]/30 bg-[#e8c77b]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#f0d994] sm:text-xs">
              <span aria-hidden="true">✦</span> CourseHub certification
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Verify a certificate
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
              Enter a certificate ID to check that CourseHub issued it and confirm its current validity.
            </p>
          </div>
          <div className="relative mt-7 flex items-center gap-4 rounded-2xl border border-white/15 bg-white/[.09] p-4 backdrop-blur-sm sm:max-w-xs sm:px-5 lg:mt-0">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e8c77b]/15 text-[#f0d994]">
              <svg aria-hidden="true" viewBox="0 0 48 48" className="h-7 w-7" fill="none">
                <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="3" />
                <path d="m15 24 6 6 12-13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-black text-white">Official record</p>
              <p className="mt-1 text-xs font-semibold text-indigo-100">Fast, secure certificate check</p>
            </div>
          </div>
        </section>

        <section className="container mt-7 max-w-4xl">
          <div className="rounded-3xl border border-white bg-white/95 p-5 shadow-[0_18px_50px_rgba(29,35,66,.08)] sm:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="certificate-id">
                Certificate ID
              </label>
              <input
                id="certificate-id"
                value={certificateId}
                onChange={(event) => setCertificateId(event.target.value)}
                placeholder="e.g. CH-2026-0876AACD3B"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              >
                {status === "loading" ? "Checking…" : "Verify certificate"}
              </button>
            </form>

            {status === "loading" && (
              <p role="status" className="mt-6 text-sm text-slate-500">
                Checking the CourseHub certificate register…
              </p>
            )}

            {status === "valid" && certificate && (
              <div role="status" className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-lg font-black text-white">✓</span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-800">
                      Authentic · Valid
                    </p>
                    <h2 className="mt-1 text-xl font-black text-emerald-950">
                      This certificate is genuine and active.
                    </h2>
                    <CertificateDetails certificate={certificate} courseName={courseName} />
                  </div>
                </div>
              </div>
            )}

            {status === "revoked" && certificate && (
              <div role="alert" className="mt-7 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[.18em] text-amber-800">
                  Authentic · Revoked
                </p>
                <h2 className="mt-1 text-xl font-black text-amber-950">
                  This certificate was issued by CourseHub, but is no longer valid.
                </h2>
                <CertificateDetails certificate={certificate} courseName={courseName} />
              </div>
            )}

            {status === "not-found" && (
              <div role="alert" className="mt-7 rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[.18em] text-rose-800">
                  Not verified
                </p>
                <h2 className="mt-1 text-xl font-black text-rose-950">
                  No CourseHub certificate matches this ID.
                </h2>
                <p className="mt-2 text-sm leading-6 text-rose-900">
                  Check the ID for typing mistakes. This certificate could not be
                  confirmed as an original CourseHub award.
                </p>
              </div>
            )}

            {status === "error" && (
              <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {error}
              </p>
            )}
          </div>
        </section>
        <p className="container mt-5 pb-6 text-center text-xs leading-5 text-slate-500">
          Verification checks the certificate ID against CourseHub’s official
          records. A valid result confirms the ID and current certificate status.
        </p>
      </div>
    </main>
  );
}

function CertificateDetails({
  certificate,
  courseName,
}: {
  certificate: VerifiedCertificate;
  courseName?: string;
}) {
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-current/10 pt-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">Certificate ID</dt>
        <dd className="mt-1 break-all font-mono font-bold">{certificate.certificateId}</dd>
      </div>
      {certificate.studentName && (
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">Awarded to</dt>
          <dd className="mt-1 font-semibold">{certificate.studentName}</dd>
        </div>
      )}
      {courseName && (
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">Course</dt>
          <dd className="mt-1 font-semibold">{courseName}</dd>
        </div>
      )}
      {certificate.subjectName && (
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">Subject</dt>
          <dd className="mt-1 font-semibold">{certificate.subjectName}</dd>
        </div>
      )}
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">Issued</dt>
        <dd className="mt-1 font-semibold">
          {new Date(certificate.issuedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </dd>
      </div>
    </dl>
  );
}
