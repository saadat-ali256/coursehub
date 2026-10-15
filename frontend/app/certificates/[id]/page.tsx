"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CourseHubLogo from "@/components/CourseHubLogo";

type Certificate = {
  certificateId: string;
  issuedAt: string;
  userId: { _id: string; name: string } | string | null;
  courseId?: { name?: string; instructor?: string } | string;
  studentName?: string;
  subjectName?: string;
  score?: number;
  percentage?: number;
  status?: "valid" | "revoked";
  verified?: boolean;
};

function CertificateSeal() {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 120" className="h-24 w-24 sm:h-28 sm:w-28">
      <circle cx="60" cy="60" r="55" fill="#e8c77b" />
      <circle cx="60" cy="60" r="48" fill="#f8edcf" stroke="#b8903d" strokeWidth="2" />
      <circle cx="60" cy="60" r="39" fill="none" stroke="#c6a65c" strokeDasharray="2 3" strokeWidth="1.5" />
      <path d="m60 32 7 14 15 2-11 11 3 15-14-7-14 7 3-15-11-11 15-2 7-14Z" fill="#26335f" />
      <path d="m43 82-3 25 20-10 20 10-3-25" fill="#6952a0" stroke="#f8edcf" strokeWidth="3" strokeLinejoin="round" />
      <text x="60" y="91" textAnchor="middle" fill="#26335f" fontSize="7" fontWeight="700" letterSpacing="1">COURSEHUB</text>
    </svg>
  );
}

export default function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [certificateId, setCertificateId] = useState("");
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    params.then(({ id }) => {
      if (!active) return;
      setCertificateId(id);
      fetch(`/api/certificates?id=${encodeURIComponent(id)}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.message || "Could not load certificate.");
          return data.certificate as Certificate;
        })
        .then((data) => {
          if (active) setCertificate(data);
        })
        .catch((cause) => {
          if (active)
            setError(
              cause instanceof Error ? cause.message : "Could not load certificate.",
            );
        });
    }).catch((cause: unknown) => {
      if (active)
        setError(
          cause instanceof Error ? cause.message : "Could not load certificate.",
        );
    });
    return () => {
      active = false;
    };
  }, [params]);

  const studentName =
    certificate?.studentName ||
    (certificate &&
    certificate.userId !== null &&
    typeof certificate.userId === "object"
      ? certificate.userId.name
      : "");
  const studentId =
    certificate?.userId !== null &&
    certificate &&
    typeof certificate.userId === "object"
      ? certificate.userId._id
      : typeof certificate?.userId === "string"
        ? certificate.userId
        : "Unavailable";
  const courseName =
    certificate && typeof certificate.courseId === "object"
      ? certificate.courseId.name
      : "";
  const instructorName =
    certificate && typeof certificate.courseId === "object"
      ? certificate.courseId.instructor
      : "";
  const verificationUrl =
    typeof window === "undefined" || !certificateId
      ? ""
      : `${window.location.origin}/verify-certificate?id=${encodeURIComponent(certificateId)}`;
  const isRevoked =
    certificate?.status === "revoked" || certificate?.verified === false;

  return (
    <main className="certificate-page coursehub-page min-h-screen bg-[#f2f3f8] px-3 py-6 sm:px-6 sm:py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/certificates" className="text-sm font-bold text-[#303a68] hover:text-[#6b55a3]">
            ← My Certificates
          </Link>
          {certificate && !isRevoked && (
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-[#26335f] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/10 transition hover:-translate-y-0.5 hover:bg-[#394879]"
            >
              Download / Print certificate
            </button>
          )}
        </div>

        {error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : !certificate ? (
          <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading certificate…
          </div>
        ) : isRevoked ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-10 text-center">
            <div className="text-xs font-black uppercase tracking-[.28em] text-rose-700">Certificate status</div>
            <h1 className="mt-3 text-3xl font-black text-slate-900">This certificate has been revoked</h1>
            <p className="mt-3 text-sm text-slate-500">Certificate ID: {certificate.certificateId}</p>
          </div>
        ) : (
          <article className="certificate-print-root relative isolate overflow-hidden bg-[#fffefa] text-[#202949] shadow-[0_28px_90px_rgba(29,35,66,.16)]">
            <div className="certificate-frame absolute inset-[10px] border border-[#b99852] sm:inset-[14px]" />
            <div className="certificate-frame-inner absolute inset-[16px] border border-[#e5d8b6] sm:inset-[23px]" />
            <div aria-hidden="true" className="absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full bg-[#eee9f5]" />
            <div aria-hidden="true" className="absolute -bottom-36 -left-28 -z-10 h-80 w-80 rounded-full bg-[#f3ead5]/60" />

            <span aria-hidden="true" className="certificate-corner left-5 top-5 border-l-2 border-t-2 sm:left-8 sm:top-8" />
            <span aria-hidden="true" className="certificate-corner right-5 top-5 border-r-2 border-t-2 sm:right-8 sm:top-8" />
            <span aria-hidden="true" className="certificate-corner bottom-5 left-5 border-b-2 border-l-2 sm:bottom-8 sm:left-8" />
            <span aria-hidden="true" className="certificate-corner bottom-5 right-5 border-b-2 border-r-2 sm:bottom-8 sm:right-8" />

            <div className="relative px-8 py-12 text-center sm:px-16 sm:py-14">
              <div className="flex justify-center">
                <CourseHubLogo subtitle="LEARN · GROW · BUILD YOUR FUTURE" />
              </div>

              <p className="mt-7 text-[10px] font-bold uppercase tracking-[.34em] text-[#9a7a39] sm:mt-9 sm:text-xs">
                Certificate of Achievement
              </p>
              <h1 className="certificate-title mt-2 text-3xl font-semibold leading-tight text-[#202949] sm:text-5xl">
                Certificate of Completion
              </h1>
              <div className="mx-auto mt-4 h-px w-36 bg-gradient-to-r from-transparent via-[#b99852] to-transparent" />
              <p className="mt-4 text-sm italic text-[#68708a] sm:text-base">
                This certificate is proudly presented to
              </p>
              <h2 className="certificate-student mt-2 text-3xl font-bold text-[#55447f] sm:text-5xl">
                {studentName || "CourseHub learner"}
              </h2>
              <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-[#515a74] sm:text-base sm:leading-7">
                This certificate is awarded to <strong className="text-[#26335f]">{studentName || "CourseHub learner"}</strong> for successfully completing{" "}
                <strong className="text-[#26335f]">{courseName || "the course"}</strong>
                {certificate.subjectName
                  ? ` and passing the associated assessment in ${certificate.subjectName}.`
                  : "."}
              </p>

              <div className="mx-auto mt-5 grid max-w-3xl grid-cols-2 gap-x-4 gap-y-3 border-y border-[#e9dfc8] py-4 text-left sm:mt-6 sm:grid-cols-4 sm:gap-5">
                {certificate.subjectName && (
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#9a7a39]">Assessment</p>
                    <p className="mt-1 text-xs font-bold text-[#26335f] sm:text-sm">{certificate.subjectName}</p>
                  </div>
                )}
                {typeof certificate.score === "number" && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#9a7a39]">Final score</p>
                    <p className="mt-1 text-xs font-bold text-[#26335f] sm:text-sm">{certificate.score}/100 · {certificate.percentage ?? certificate.score}%</p>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#9a7a39]">Date awarded</p>
                  <p className="mt-1 text-xs font-bold text-[#26335f] sm:text-sm">{new Date(certificate.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#9a7a39]">Student ID</p>
                  <p className="mt-1 break-all font-mono text-[10px] font-bold text-[#26335f] sm:text-xs">{studentId}</p>
                </div>
              </div>

              <div className="mx-auto mt-5 grid max-w-3xl grid-cols-[1fr_auto] items-end gap-5 sm:mt-6 sm:grid-cols-[1fr_auto_1fr]">
                <div className="text-left">
                  <div className="border-b border-[#b9ad91] pb-2 text-[10px] font-semibold text-[#56607a] sm:text-xs">
                    {instructorName || "CourseHub Academic Office"}
                  </div>
                  <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[.13em] text-[#9a7a39]">Course / Authorized Signatory</p>
                </div>
                <div className="row-span-2 flex flex-col items-center sm:row-span-1">
                  <CertificateSeal />
                </div>
                <div className="col-start-1 text-left sm:col-start-3">
                  <div className="border-b border-[#b9ad91] pb-2 font-mono text-[9px] font-bold text-[#26335f] sm:text-[10px]">
                    {certificate.certificateId}
                  </div>
                  <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[.13em] text-[#9a7a39]">Certificate ID</p>
                </div>
              </div>

              <div className="certificate-verification mt-4 border-t border-[#e9dfc8] pt-3">
                <p className="text-[8px] font-bold uppercase tracking-[.17em] text-[#9a7a39]">Verify this award</p>
                <a href={verificationUrl} className="mt-1 block break-all text-[9px] text-[#55447f] underline decoration-[#c5ad72] underline-offset-2">
                  {verificationUrl}
                </a>
              </div>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
