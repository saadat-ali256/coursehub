"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { CSpinner } from "@/components/CourseHubLoader";
import CourseHubLogo from "@/components/CourseHubLogo";
import "../login/login.css";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { fetchStatus, signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function showError(cause: unknown) {
    const clerkError = cause as {
      longMessage?: string;
      message?: string;
      errors?: Array<{ longMessage?: string; message?: string }>;
    };
    setError(
      clerkError.errors?.[0]?.longMessage ||
        clerkError.errors?.[0]?.message ||
        clerkError.longMessage ||
        clerkError.message ||
        "Unable to complete the request. Please try again.",
    );
  }

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const created = await signIn.create({ identifier: email.trim().toLowerCase() });
      if (created.error) throw created.error;
      const sent = await signIn.resetPasswordEmailCode.sendCode();
      if (sent.error) throw sent.error;
      setStep("code");
      setMessage("If the account can be recovered, a reset code was sent to its email.");
    } catch (cause) {
      showError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await signIn.resetPasswordEmailCode.verifyCode({ code });
      if (result.error) throw result.error;
      setStep("password");
      setMessage("Code accepted. Choose a new password.");
    } catch (cause) {
      showError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await signIn.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      });
      if (result.error) throw result.error;
      setMessage("Password reset. You can now sign in with your new password.");
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch (cause) {
      showError(cause);
    } finally {
      setBusy(false);
    }
  }

  const onSubmit =
    step === "email"
      ? sendCode
      : step === "code"
        ? verifyCode
        : resetPassword;

  return (
    <main className="login-page">
      <div className="login-wrapper">
        <section className="illustration-area">
          <video className="login-video" autoPlay loop muted playsInline preload="metadata">
            <source src="/videos/boy-wave.mp4" type="video/mp4" />
          </video>
        </section>
        <section className="login-panel">
          <div className="login-card">
            <div className="coursehub-logo">
              <CourseHubLogo />
            </div>
            <div className="login-welcome">
              <h1>Reset password</h1>
              <p>
                {step === "email"
                  ? "We will send a reset code to your email."
                  : step === "code"
                    ? `Enter the code sent to ${email}.`
                    : "Create a new password for your account."}
              </p>
            </div>
            <form onSubmit={onSubmit} className="login-form">
              {step === "email" && (
                <div className="login-field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              )}
              {step === "code" && (
                <div className="login-field">
                  <label htmlFor="code">Reset code</label>
                  <input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                  />
                </div>
              )}
              {step === "password" && (
                <div className="login-field">
                  <label htmlFor="password">New password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              )}
              <button
                type="submit"
                className="login-submit"
                disabled={busy || fetchStatus === "fetching"}
              >
                {busy ? (
                  <>
                    <CSpinner className="coursehub-loader__mark--small" />
                    Please wait...
                  </>
                ) : step === "email" ? (
                  "Send reset code"
                ) : step === "code" ? (
                  "Verify code"
                ) : (
                  "Update password"
                )}
              </button>
            </form>
            {message && <p className="verify-success" role="status">{message}</p>}
            {error && <p className="login-error" role="alert">{error}</p>}
            <p className="register-prompt">
              <button type="button" onClick={() => router.push("/login")} className="register-link">
                Back to login
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
