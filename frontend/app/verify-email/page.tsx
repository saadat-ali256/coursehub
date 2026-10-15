"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useSignUp } from "@clerk/nextjs";
import { CSpinner } from "@/components/CourseHubLoader";
import { syncCourseHubProfile } from "@/lib/sync-coursehub-profile";
import CourseHubLogo from "@/components/CourseHubLogo";
import "../login/login.css";

const EXPIRY_MS = 10 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="login-page">Loading verification...</main>}>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchStatus, signUp } = useSignUp();
  const { getToken } = useAuth();
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const next = searchParams.get("next") || "";
  const initialExpiry = searchParams.get("expiresAt");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [remaining, setRemaining] = useState(() => {
    const timestamp = Date.parse(initialExpiry || "");
    const expiry = Number.isFinite(timestamp) ? timestamp : Date.now() + EXPIRY_MS;
    return Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
  });
  const [resendRemaining, setResendRemaining] = useState(
    Math.ceil(RESEND_COOLDOWN_MS / 1000),
  );
  const [verified, setVerified] = useState(false);
  const [expiresAt, setExpiresAt] = useState(() => {
    const timestamp = Date.parse(initialExpiry || "");
    return Number.isFinite(timestamp) ? timestamp : Date.now() + EXPIRY_MS;
  });
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_COOLDOWN_MS);

  useEffect(() => {
    const update = () => {
      setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
      setResendRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    };
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, resendAt]);

  function safeNext() {
    return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
      ? next
      : "";
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!email) {
      setError("Email address is missing. Return to registration and try again.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    if (fetchStatus === "fetching") {
      setError("Your verification session has expired. Please register again.");
      return;
    }

    setLoading(true);
    try {
      const { error: verificationError } =
        await signUp.verifications.verifyEmailCode({ code: otp });
      if (verificationError) throw verificationError;
      if (signUp.status !== "complete")
        throw new Error("The verification could not be completed. Check the code and try again.");
      const finalized = await signUp.finalize();
      if (finalized.error) throw finalized.error;
      setVerified(true);
      await syncCourseHubProfile(getToken);
      setMessage("Your email is verified. You can now log in.");
      const safeTarget = safeNext();
      router.replace(safeTarget || "/");
    } catch (cause) {
      const clerkError = cause as {
        errors?: Array<{ longMessage?: string; message?: string }>;
      };
      setError(
        clerkError.errors?.[0]?.longMessage ||
          clerkError.errors?.[0]?.message ||
          (cause instanceof Error ? cause.message : "Unable to connect. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setMessage("");
    if (!email) {
      setError("Email address is missing. Return to registration and try again.");
      return;
    }

    if (fetchStatus === "fetching") {
      setError("Your verification session has expired. Please register again.");
      return;
    }

    setResending(true);
    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) throw error;
      setMessage("A new verification code was sent. Check your inbox.");
      setOtp("");
      const now = Date.now();
      setExpiresAt(now + EXPIRY_MS);
      setResendAt(now + RESEND_COOLDOWN_MS);
    } catch (cause) {
      const clerkError = cause as {
        longMessage?: string;
        message?: string;
      };
      setError(
        clerkError.longMessage ||
          clerkError.message ||
          "Unable to resend the code. Please try again.",
      );
    } finally {
      setResending(false);
    }
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <main className="login-page">
      <div className="login-wrapper">
        <section className="illustration-area">
          <video
            className="login-video"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src="/videos/boy-wave.mp4" type="video/mp4" />
          </video>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="coursehub-logo">
              <CourseHubLogo />
            </div>
            <div className="login-welcome">
              <h1>Verify your email</h1>
              <p>Enter the six-digit code sent to</p>
              <strong>{email || "your email address"}</strong>
            </div>

            {!verified ? (
              <form onSubmit={handleVerify} className="login-form">
                <div className="login-field">
                  <label htmlFor="otp">Six-digit verification code</label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    required
                  />
                </div>
                <p className="verify-countdown" aria-live="polite">
                  {remaining > 0
                    ? `This code expires in ${minutes}:${String(seconds).padStart(2, "0")}.`
                    : "This code may have expired. Request a new code to continue."}
                </p>
                <button type="submit" className="login-submit"                                 disabled={loading || fetchStatus === "fetching"}>
                  {loading ? (
                    <>
                      <CSpinner className="coursehub-loader__mark--small" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Email
                      <span className="submit-arrow">→</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="verify-resend"
                  onClick={handleResend}
                  disabled={resending || resendRemaining > 0}
                >
                  {resending
                    ? "Requesting..."
                    : resendRemaining > 0
                      ? `Resend code in ${resendRemaining}s`
                      : "Resend OTP"}
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="login-submit"
                onClick={() => {
                  const target = safeNext();
                  router.push(
                    target
                      ? `/login?next=${encodeURIComponent(target)}`
                      : "/login",
                  );
                }}
              >
                Continue to Log In
                <span className="submit-arrow">→</span>
              </button>
            )}

            {message && (
              <p className="verify-success" role="status">
                {message}
              </p>
            )}
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <p className="register-prompt">
              Need to use another email?{" "}
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="register-link"
              >
                Return to registration
              </button>
            </p>
            <p className="register-prompt">
              Already verified?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="register-link"
              >
                Log in
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
