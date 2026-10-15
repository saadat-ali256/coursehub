"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignUp } from "@clerk/nextjs";
import { CSpinner } from "@/components/CourseHubLoader";
import { syncCourseHubProfile } from "@/lib/sync-coursehub-profile";
import CourseHubLogo from "@/components/CourseHubLogo";
import "../login/login.css";

export default function RegisterPage() {
  const router = useRouter();
  const { fetchStatus, signUp } = useSignUp();
  const { getToken } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function getSafeNext() {
    const next = new URLSearchParams(window.location.search).get("next");

    return next?.startsWith("/") &&
      !next.startsWith("//") &&
      !next.includes("\\")
      ? next
      : "";
  }

  function getLoginPath() {
    const safeNext = getSafeNext();

    return safeNext
      ? `/login?next=${encodeURIComponent(safeNext)}`
      : "/login";
  }

  function getVerificationPath(verifiedEmail: string, expiresAt?: string) {
    const params = new URLSearchParams({ email: verifiedEmail });
    if (expiresAt) params.set("expiresAt", expiresAt);
    const safeNext = getSafeNext();
    if (safeNext) params.set("next", safeNext);
    return `/verify-email?${params.toString()}`;
  }

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setMessage("");
    if (fetchStatus === "fetching") {
      setMessage("Authentication is still loading. Please try again.");
      return;
    }
    setLoading(true);

    try {
      const { error } = await signUp.password({
        emailAddress: email.trim().toLowerCase(),
        password,
        unsafeMetadata: {
          courseHubName: name.trim(),
          courseHubUsername: username.trim().toLowerCase(),
        },
      });
      if (error) throw error;
      if (signUp.status === "complete") {
        const finalized = await signUp.finalize();
        if (finalized.error) throw finalized.error;
        await syncCourseHubProfile(getToken);
        const safeNext = getSafeNext();
        router.push(safeNext || "/");
        return;
      }
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) throw sent.error;
      router.push(getVerificationPath(email.trim().toLowerCase()));
    } catch (error) {
      const clerkError = error as {
        errors?: Array<{ longMessage?: string; message?: string }>;
      };
      setMessage(
        clerkError.errors?.[0]?.longMessage ||
          clerkError.errors?.[0]?.message ||
          (error instanceof Error ? error.message : "Registration failed. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-wrapper">
        {/* COURSEHUB VIDEO */}
        <section className="illustration-area">
          <video
            className="login-video"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source
              src="/videos/boy-wave.mp4"
              type="video/mp4"
            />
          </video>
        </section>

        {/* REGISTER FORM */}
        <section className="login-panel">
          <div className="login-card register-card">
            <div className="coursehub-logo">
              <CourseHubLogo />
            </div>

            <div className="login-welcome">
              <h1>Create Account</h1>
              <p>Join CourseHub and start your learning journey.</p>
            </div>

            <form
              onSubmit={handleRegister}
              className="login-form register-form"
            >
              <div className="login-field">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9._]/g, "")
                    )
                  }
                  minLength={3}
                  maxLength={24}
                  pattern="[a-z0-9._]{3,24}"
                  placeholder="Choose a unique username"
                  autoComplete="username"
                  required
                />
                <p className="register-hint">
                  3–24 characters: letters, numbers, . or _
                </p>
              </div>

              <div className="login-field">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div id="clerk-captcha" data-cl-theme="auto" />

              <button
                type="submit"
                className="login-submit"
                disabled={loading || fetchStatus === "fetching"}
              >
                {loading ? (
                  <>
                    <CSpinner className="coursehub-loader__mark--small" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <span className="submit-arrow">→</span>
                  </>
                )}
              </button>
            </form>

            {message && (
              <p className="login-error" role="alert">
                {message}
              </p>
            )}

            <div className="login-divider">
              <span>ALREADY A MEMBER?</span>
            </div>

            <p className="register-prompt">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => router.push(getLoginPath())}
                className="register-link"
              >
                Log In
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}