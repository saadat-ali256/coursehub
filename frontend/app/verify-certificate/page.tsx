import type { Metadata } from "next";
import CertificateVerification from "@/components/CertificateVerification";

export const metadata: Metadata = {
  title: "Verify a Certificate | CourseHub",
  description: "Check whether a CourseHub certificate is authentic and valid.",
};

export default async function VerifyCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <CertificateVerification key={id || "empty"} initialId={id || ""} />;
}
