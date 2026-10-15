
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn, useAuth } from "@clerk/nextjs";
import { CSpinner } from "@/components/CourseHubLoader";
import { syncCourseHubProfile } from "@/lib/sync-coursehub-profile";
import CourseHubLogo from "@/components/CourseHubLogo";
import "./login.css";

type SecondFactor = "email_code" | "phone_code" | "totp" | "backup_code";

function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\")
    ? next
    : "";
}

async function getPostLoginPath() {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.success || !data.user) {
    throw new Error(data.message || "Unable to determine your dashboard.");
  }

  const user = data.user as {
    role?: string;
    adminPermissions?: string[];
  };
  const hasAdminAccess =
    user.role === "admin" ||
    (user.role === "subadmin" &&
      (user.adminPermissions || []).some((permission) =>
        ["manage_community", "moderate_feed", "manage_users"].includes(permission),
      ));

  return hasAdminAccess ? "/admin" : getSafeNextPath() || "/dashboard";
}

function clerkErrorMessage(error: unknown) {
  const clerkError = error as {
    errors?: Array<{
      code?: string;
      longMessage?: string;
      long_message?: string;
      message?: string;
    }>;
  };
  return (
    clerkError.errors?.[0]?.longMessage ||
    clerkError.errors?.[0]?.long_message ||
    clerkError.errors?.[0]?.message ||
    (error instanceof Error ? error.message : "Login failed. Please try again.")
  );
}

function hasClerkErrorCode(error: unknown, expectedCode: string) {
  const clerkError = error as {
    errors?: Array<{ code?: string }>;
  };

  return (
    clerkError.errors?.some(({ code }) => code === expectedCode) ?? false
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { fetchStatus, signIn } = useSignIn();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [profileSyncFailed, setProfileSyncFailed] = useState(false);
  const [loginLocked, setLoginLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [recoveringSession, setRecoveringSession] = useState(false);
  const [secondFactor, setSecondFactor] = useState<SecondFactor | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const loginRequestInFlight = useRef(false);
  const loginFinalizationInProgress = useRef(false);
  const dashboardRedirectInProgress = useRef(false);

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      loginFinalizationInProgress.current ||
      dashboardRedirectInProgress.current
    ) return;

    dashboardRedirectInProgress.current = true;
    let active = true;
    getPostLoginPath()
      .then((path) => {
        if (active) router.replace(path);
      })
      .catch((error) => {
        if (!active) return;
        setProfileSyncFailed(true);
        setMessage(
          `You are signed in, but CourseHub could not determine your dashboard: ${clerkErrorMessage(error)}`,
        );
      });

    return () => {
      active = false;
      dashboardRedirectInProgress.current = false;
    };
  }, [isLoaded, isSignedIn, router]);

  async function sendSecondFactorCode(factor: SecondFactor) {
    if (factor === "email_code") {
      const result = await signIn.mfa.sendEmailCode();
      if (result.error) throw result.error;
    } else if (factor === "phone_code") {
      const result = await signIn.mfa.sendPhoneCode();
      if (result.error) throw result.error;
    }
  }

  async function completeLogin() {
    loginFinalizationInProgress.current = true;
    try {
      const finalized = await signIn.finalize({
        navigate: async () => undefined,
      });

      if (finalized.error) {
        throw finalized.error;
      }

      setSyncing(true);
      setProfileSyncFailed(false);

      try {
        await syncCourseHubProfile(getToken);
        router.replace(await getPostLoginPath());
      } catch (error) {
        setProfileSyncFailed(true);
        setMessage(
          `You are signed in, but CourseHub could not finish setting up your dashboard: ${clerkErrorMessage(error)}`,
        );
      } finally {
        setSyncing(false);
      }
    } catch (error) {
      throw error;
    } finally {
      loginFinalizationInProgress.current = false;
    }
  }

  async function retryProfileSync() {
    setSyncing(true);
    setMessage("");
    try {
      await syncCourseHubProfile(getToken);
      setProfileSyncFailed(false);
      router.replace(await getPostLoginPath());
    } catch (error) {
      setMessage(
        `CourseHub could not sync your profile: ${clerkErrorMessage(error)}`,
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    if (loginRequestInFlight.current) return;
    if (!isLoaded || isSignedIn || recoveringSession || loginLocked) {
      if (loginLocked)
        setMessage(
          "Your Clerk account is temporarily locked. Wait until the lock expires before trying again.",
        );
      return;
    }
    if (fetchStatus === "fetching") {
      setMessage("Authentication is still loading. Please try again.");
      return;
    }
    loginRequestInFlight.current = true;
    loginFinalizationInProgress.current = false;
    setProfileSyncFailed(false);
    setLoading(true);

    try {
      if (signIn.status !== "needs_identifier") {
        const reset = await signIn.reset();
        if (reset.error) throw reset.error;
      }
      const { error } = await signIn.password({
        identifier: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      if (signIn.status !== "complete") {
        if (
          signIn.status === "needs_second_factor" ||
          signIn.status === "needs_client_trust"
        ) {
          const supported = signIn.supportedSecondFactors.map(
            (factor) => factor.strategy,
          );
          const candidates =
            signIn.status === "needs_client_trust"
              ? (["email_code", "phone_code"] as const)
              : (["email_code", "phone_code", "totp", "backup_code"] as const);
          const factor = candidates.find((strategy) =>
            supported.includes(strategy),
          );
          if (!factor) {
            setMessage(
              signIn.status === "needs_client_trust"
                ? "Clerk requires a new-device check, but no email or phone code is available for this account. Verify an email address or phone number in Clerk and enable email-code or SMS verification."
                : "Your account requires another verification method that this login page cannot complete. Enable email-code or authenticator verification in Clerk, or contact support.",
            );
            return;
          }
          await sendSecondFactorCode(factor);
          setSecondFactor(factor);
          setMessage(
            signIn.status === "needs_client_trust"
              ? factor === "email_code"
                ? "Clerk needs to verify this new device. Enter the code sent to your email."
                : "Clerk needs to verify this new device. Enter the code sent to your phone."
              : factor === "email_code"
                ? "A verification code was sent to your email."
                : factor === "phone_code"
                  ? "A verification code was sent to your phone."
                  : factor === "totp"
                    ? "Enter the code from your authenticator app."
                    : "Enter one of your saved backup codes.",
          );
          return;
        }
        setMessage(
          `Sign-in needs another Clerk step (${signIn.status || "unknown"}). Check your Clerk sign-in and verification settings.`,
        );
        return;
      }
      await completeLogin();
    } catch (error) {
      if (hasClerkErrorCode(error, "user_locked")) {
        setLoginLocked(true);
        setMessage(
          "Your Clerk account is temporarily locked. Please wait until the lock expires or unlock the account in Clerk.",
        );
      } else if (hasClerkErrorCode(error, "session_exists")) {
        setPassword("");
        setRecoveringSession(true);
        setMessage("Clearing the existing session reported by Clerk…");
        let timeoutId: number | undefined;

        try {
          const reset = await signIn.reset();
          if (reset.error) throw reset.error;

          const loginUrl = `${window.location.pathname}${window.location.search}`;
          await Promise.race([
            (async () => {
              const resetAfterSignOut = await signIn.reset();
              if (resetAfterSignOut.error) throw resetAfterSignOut.error;
              await signOut({ redirectUrl: loginUrl });
            })(),
            new Promise<never>((_, reject) => {
              timeoutId = window.setTimeout(
                () =>
                  reject(
                    new Error(
                      "Session cleanup timed out. Please retry sign-in.",
                    ),
                  ),
                10_000,
              );
            }),
          ]);
          setMessage("The previous Clerk session was cleared. Please try again.");
        } catch (signOutError) {
          setMessage(
            `Could not clear the existing sign-in session: ${clerkErrorMessage(signOutError)}`,
          );
        } finally {
          if (timeoutId !== undefined) window.clearTimeout(timeoutId);
          setRecoveringSession(false);
        }
      } else {
        setMessage(clerkErrorMessage(error));
      }
    } finally {
      loginRequestInFlight.current = false;
      setSyncing(false);
      setLoading(false);
    }
  }

  async function handleSecondFactor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!secondFactor || loginRequestInFlight.current) return;
    loginRequestInFlight.current = true;
    setMessage("");
    setLoading(true);
    try {
      const result =
        secondFactor === "email_code"
          ? await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() })
          : secondFactor === "phone_code"
            ? await signIn.mfa.verifyPhoneCode({ code: verificationCode.trim() })
            : secondFactor === "totp"
              ? await signIn.mfa.verifyTOTP({ code: verificationCode.trim() })
              : await signIn.mfa.verifyBackupCode({ code: verificationCode.trim() });
      if (result.error) throw result.error;
      if (signIn.status !== "complete") {
        setMessage(
          `Another verification step is still required (${signIn.status || "unknown"}).`,
        );
        return;
      }
      await completeLogin();
    } catch (error) {
      if (hasClerkErrorCode(error, "user_locked")) {
        setLoginLocked(true);
        setMessage(
          "Your Clerk account is temporarily locked. Please wait until the lock expires or unlock the account in Clerk.",
        );
      } else {
        setMessage(clerkErrorMessage(error));
      }
    } finally {
      loginRequestInFlight.current = false;
      setLoading(false);
      setSyncing(false);
    }
  }

  async function handleResendCode() {
    if (!secondFactor || (secondFactor !== "email_code" && secondFactor !== "phone_code"))
      return;
    setMessage("");
    setLoading(true);
    try {
      await sendSecondFactorCode(secondFactor);
      setMessage(
        secondFactor === "email_code"
          ? "A new verification code was sent to your email."
          : "A new verification code was sent to your phone.",
      );
    } catch (error) {
      setMessage(clerkErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded || recoveringSession || (isSignedIn && !profileSyncFailed)) {
    return (
      <main className="login-page">
        <div className="login-card">
          <CSpinner className="coursehub-loader__mark--small" />
          <p role="status">
            {message ||
              (recoveringSession
                ? "Clearing the session Clerk identified…"
                : "Loading login…")}
          </p>
        </div>
      </main>
    );
  }

  if (isSignedIn && profileSyncFailed) {
    return (
      <main className="login-page">
        <div className="login-card">
          <CourseHubLogo />
          <p role="alert">{message}</p>
          <button
            type="button"
            className="login-submit"
            onClick={retryProfileSync}
            disabled={syncing}
          >
            {syncing ? "Syncing profile…" : "Retry profile sync"}
          </button>
        </div>
      </main>
    );
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
            <source src="/videos/boy-wave.mp4" type="video/mp4" />
          </video>
        </section>

        {/* LOGIN FORM */}
        <section className="login-panel">
          <div className="login-card">
            <div className="coursehub-logo">
              <CourseHubLogo />
            </div>

            <div className="login-welcome">
              <h1>Welcome Back!</h1>
              <p>Login to continue your learning journey.</p>
            </div>

            {secondFactor ? (
              <form onSubmit={handleSecondFactor} className="login-form">
                <div className="login-field">
                  <label htmlFor="verification-code">
                    {secondFactor === "totp"
                      ? "Authenticator code"
                      : secondFactor === "backup_code"
                        ? "Backup code"
                        : "Verification code"}
                  </label>
                  <input
                    id="verification-code"
                    type="text"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    autoComplete="one-time-code"
                    inputMode={secondFactor === "backup_code" ? "text" : "numeric"}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="login-submit"
                  disabled={
                    loading || syncing || loginLocked || fetchStatus === "fetching"
                  }
                >
                  {loading || syncing ? (
                    <>
                      <CSpinner className="coursehub-loader__mark--small" />
                      Verifying...
                    </>
                  ) : (
                    "Verify and Log In"
                  )}
                </button>
                {(secondFactor === "email_code" || secondFactor === "phone_code") && (
                  <button
                    type="button"
                    className="forgot-password"
                    onClick={handleResendCode}
                    disabled={loading || loginLocked}
                  >
                    Resend code
                  </button>
                )}
                <button
                  type="button"
                  className="forgot-password"
                  disabled={loading}
                  onClick={() => {
                    void signIn.reset();
                    setSecondFactor(null);
                    setVerificationCode("");
                    setMessage("");
                  }}
                >
                  Back to login
                </button>
              </form>
            ) : (
            <form onSubmit={handleLogin} className="login-form">
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="login-options">
                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => router.push("/forgot-password")}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={
                  loading || syncing || loginLocked || fetchStatus === "fetching"
                }
              >
                {loading || syncing ? (
                  <>
                    <CSpinner className="coursehub-loader__mark--small" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Log In
                    <span className="submit-arrow">→</span>
                  </>
                )}
              </button>
            </form>
            )}

            {message && (
              <p className="login-error" role="alert">
                {message}
              </p>
            )}
            <div className="login-divider">
              <span>NEW TO COURSEHUB?</span>
            </div>

            <p className="register-prompt">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="register-link"
              >
                Create Account
              </button>
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
