/* AUTO-FORMATTED FOR READABILITY */
/* Page: renders the UI for this route. */
"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CourseHubLoader from "@/components/CourseHubLoader";
import StripePaymentForm from "./StripePaymentForm";
import CourseHubLogo from "@/components/CourseHubLogo";

type SubscriptionPlan = {
  _id: string;
  name: string;
  description: string;
  interval: string;
  price: number;
  features: string[];
};

type BankDetails = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  instructions: string;
};

type PlansResponse = {
  success?: boolean;
  message?: string;
  plans?: SubscriptionPlan[];
};

type BankResponse = {
  success?: boolean;
  message?: string;
  bank?: BankDetails;
};

function SubscriptionContent() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [stripeCheckout, setStripeCheckout] = useState<{
    clientSecret: string;
    subscriptionId: string;
    publishableKey: string;
    planName: string;
    email: string;
  } | null>(null);
  const params = useSearchParams();
  const router = useRouter();
  const nextPath = params.get("next");
  const redirectPath =
    nextPath?.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\")
      ? nextPath
      : "/dashboard";
  const stripeSuccess = params.get("success") === "1";
  const stripeReturn = params.get("stripe") === "return";
  const stripeSubscriptionId = params.get("subscription_id");
  const paypalSuccess = params.get("paypal") === "success";
  const paypalSubscriptionId = params.get("subscription_id");

  useEffect(() => {
    let active = true;

    async function loadCheckoutOptions() {
      const [plansResponse, bankResponse] = await Promise.all([
        fetch("/api/premium/plans"),
        fetch("/api/payments/bank"),
      ]);
      const [plansData, bankData] = (await Promise.all([
        plansResponse.json(),
        bankResponse.json(),
      ])) as [PlansResponse, BankResponse];
      if (!plansResponse.ok || !plansData.success) {
        throw new Error(plansData.message || "Could not load subscription plans.");
      }
      if (!bankResponse.ok || !bankData.success) {
        throw new Error(bankData.message || "Could not load bank details.");
      }
      if (active) {
        setPlans(plansData.plans || []);
        setBank(bankData.bank || null);
      }
    }

    void loadCheckoutOptions()
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load subscription options.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if ((!stripeSuccess && !stripeReturn) && !paypalSuccess) return;
    let active = true;

    async function confirmSubscription() {
      setVerifying(true);
      setVerificationError("");
      if (paypalSuccess) {
        if (!paypalSubscriptionId) {
          setVerificationError("PayPal did not return a subscription ID. Please contact support.");
          setVerifying(false);
          return;
        }
        try {
          const response = await fetch("/api/payments/paypal/capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId: paypalSubscriptionId }),
          });
          const data = await response.json();
          if (!response.ok || data.status !== "ACTIVE") {
            throw new Error(data.message || "PayPal subscription is not active yet.");
          }
        } catch (error) {
          if (active) {
            setVerificationError(
              error instanceof Error ? error.message : "Could not verify PayPal subscription.",
            );
            setVerifying(false);
          }
          return;
        }
      }

      for (let attempt = 0; attempt < 30; attempt += 1) {
        try {
          if (stripeReturn && stripeSubscriptionId) {
            const statusResponse = await fetch(
              `/api/payments/stripe/status?subscriptionId=${encodeURIComponent(stripeSubscriptionId)}`,
              { cache: "no-store" },
            );
            const statusData = await statusResponse.json();
            if (statusResponse.ok && statusData.status === "active") {
              router.replace(redirectPath);
              return;
            }
          }
          const courseMatch = redirectPath.match(/^\/courses\/([^/?#]+)/);
          const response = courseMatch
            ? await fetch(
                `/api/courses/${encodeURIComponent(courseMatch[1])}/access`,
                { cache: "no-store" },
              )
            : await fetch("/api/auth/me", { cache: "no-store" });
          const data = await response.json();
          if (!active) return;
          if (
            response.ok &&
            (courseMatch ? data.hasAccess : data.user?.communityAccess)
          ) {
            router.replace(redirectPath);
            return;
          }
        } catch (error) {
          console.error("Could not verify the new subscription yet.", error);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (active) {
        setVerificationError(
          "Payment received, but provider confirmation is still pending. Your course will unlock as soon as the subscription is confirmed.",
        );
        setVerifying(false);
      }
    }

    void confirmSubscription();
    return () => {
      active = false;
    };
  }, [
    paypalSubscriptionId,
    paypalSuccess,
    redirectPath,
    router,
    stripeReturn,
    stripeSubscriptionId,
    stripeSuccess,
  ]);

  async function startStripeCheckout(plan: SubscriptionPlan) {
    setBusy(plan._id + "stripe");
    setVerificationError("");
    try {
      const response = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan._id, next: nextPath || "" }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          router.push(`/login?next=${encodeURIComponent(returnTo)}`);
          return;
        }
        throw new Error(data.message || "Stripe payment could not start.");
      }
      if (data.alreadyActive) {
        router.replace(redirectPath);
        return;
      }
      if (!data.clientSecret || !data.subscriptionId || !data.publishableKey)
        throw new Error("Stripe did not return the payment details. Please try again.");
      setStripeCheckout({
        clientSecret: data.clientSecret,
        subscriptionId: data.subscriptionId,
        publishableKey: data.publishableKey,
        planName: plan.name,
        email: data.email || "",
      });
    } catch (error) {
      setVerificationError(
        error instanceof Error ? error.message : "Stripe payment could not start.",
      );
    } finally {
      setBusy("");
    }
  }

  async function pay(plan: SubscriptionPlan) {
    setBusy(plan._id + "paypal");
    const endpoint = "/api/payments/paypal/create";
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan._id,
          next: nextPath || "",
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 401) {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          router.push(`/login?next=${encodeURIComponent(returnTo)}`);
        } else {
          throw new Error(d.message || "Payment could not start.");
        }
        return;
      }
      if (d.url) {
        location.href = d.url;
      } else {
        throw new Error("PayPal did not return a checkout link.");
      }
    } catch (error) {
      setVerificationError(
        error instanceof Error ? error.message : "Payment could not start.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <main className="coursehub-page min-h-screen bg-[radial-gradient(circle_at_20%_0%,#e0e7ff,transparent_30%),radial-gradient(circle_at_90%_10%,#cffafe,transparent_25%),#f6f8fc] p-5 md:p-10">
      <div className="desktop-content-width mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-black">
            <CourseHubLogo size="sm" />
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold"
          >
            Dashboard
          </Link>
        </div>
        <div className="py-12 text-center">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
            ✦ PREMIUM LEARNING
          </span>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">
            Choose your learning plan.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-500">
            Subscribe to unlock every premium course, full playlist, lesson,
            and learning feature. Secure checkout is available with Stripe or
            PayPal, plus manual bank-transfer verification.
          </p>
          {nextPath && !stripeSuccess && !stripeReturn && !paypalSuccess && (
            <div
              role="status"
              className="mx-auto mt-5 max-w-xl rounded-2xl border border-indigo-200 bg-indigo-50 p-4 font-bold text-indigo-800"
            >
              This course or feature needs an active subscription. Subscribe,
              then you will be able to access it.
            </div>
          )}
          {verifying && (
            <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">
              Confirming your subscription and course access…
            </div>
          )}
          {verificationError && (
            <div role="alert" className="mx-auto mt-5 max-w-xl rounded-2xl bg-amber-50 p-4 font-bold text-amber-800">
              {verificationError}
            </div>
          )}
          {loadError && (
            <div role="alert" className="mx-auto mt-5 max-w-xl rounded-2xl bg-rose-50 p-4 font-bold text-rose-800">
              {loadError}
            </div>
          )}
          {params.get("canceled") && (
            <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-amber-50 p-4 font-bold text-amber-700">
              Checkout canceled.
            </div>
          )}
        </div>
        {loading ? (
          <CourseHubLoader label="Loading subscription plans..." className="min-h-72" />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {plans.map((p) => (
              <div key={p._id} className="card overflow-hidden p-7">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-black">{p.name}</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {p.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                    {p.interval}
                  </span>
                </div>
                <div className="mt-6 text-5xl font-black">
                  ${p.price}
                  <span className="text-base font-semibold text-slate-400">
                    /{p.interval}
                  </span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  {(p.features || []).map((x: string) => (
                    <li key={x}>✓ {x}</li>
                  ))}
                </ul>
                <div className="mt-7 grid gap-2 sm:grid-cols-2">
                  <button
                    disabled={!!busy}
                    onClick={() => startStripeCheckout(p)}
                    className="rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white disabled:opacity-50"
                  >
                    {busy === p._id + "stripe" ? "Opening…" : "Pay with Stripe"}
                  </button>
                  <button
                    disabled={!!busy}
                    onClick={() => pay(p)}
                    className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50"
                  >
                    {busy === p._id + "paypal" ? "Opening…" : "PayPal"}
                  </button>
                </div>
                {stripeCheckout && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="stripe-payment-title"
                  >
                    <div className="w-full max-w-lg rounded-3xl bg-slate-50 p-6 shadow-2xl">
                      <h2 id="stripe-payment-title" className="mb-2 text-2xl font-black">
                        Subscribe to {stripeCheckout.planName}
                      </h2>
                      <p className="mb-5 text-sm text-slate-600">
                        Secure recurring card payment processed by Stripe.
                      </p>
                      <StripePaymentForm
                        publishableKey={stripeCheckout.publishableKey}
                        clientSecret={stripeCheckout.clientSecret}
                        subscriptionId={stripeCheckout.subscriptionId}
                        email={stripeCheckout.email}
                        returnUrl={`${window.location.origin}/subscriptions?stripe=return&subscription_id=${encodeURIComponent(stripeCheckout.subscriptionId)}&next=${encodeURIComponent(redirectPath)}`}
                        onClose={() => setStripeCheckout(null)}
                        onComplete={() => {
                          setStripeCheckout(null);
                          router.replace(redirectPath);
                        }}
                      />
                    </div>
                  </div>
                )}
                <button
                  onClick={() =>
                    alert(
                      `Bank: ${bank?.bankName || "Configure bank details"}\nAccount: ${bank?.accountNumber || "Configure account"}\nIBAN: ${bank?.iban || "Configure IBAN"}\n\nAfter transfer, submit the reference from your dashboard.`,
                    )
                  }
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm font-bold"
                >
                  🏦 Bank Transfer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function Subscriptions() {
  return (
    <Suspense
      fallback={
        <CourseHubLoader fullScreen label="Loading subscription plans..." />
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
}
