"use client";

import { useState } from "react";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const cardStyle = {
  style: {
    base: {
      color: "#172554",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      "::placeholder": { color: "#94a3b8" },
    },
    invalid: { color: "#dc2626" },
  },
};

function CardCheckout({
  clientSecret,
  subscriptionId,
  email,
  returnUrl,
  onClose,
  onComplete,
}: {
  clientSecret: string;
  subscriptionId: string;
  email: string;
  returnUrl: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function checkSubscription() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(
        `/api/payments/stripe/status?subscriptionId=${encodeURIComponent(subscriptionId)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (response.ok && data.status === "active") {
        onComplete();
        return true;
      }
      if (!response.ok && response.status !== 502)
        throw new Error(data.message || "Could not check subscription status.");
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
    return false;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!stripe || !elements) {
      setError("Secure payment form is still loading.");
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setError("Card details are not ready yet.");
      return;
    }

    setBusy(true);
    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: { email },
        },
        return_url: returnUrl,
      });
      if (result.error)
        throw new Error(result.error.message || "Card payment could not be confirmed.");
      if (result.paymentIntent?.status !== "succeeded" &&
          result.paymentIntent?.status !== "processing")
        throw new Error("Stripe has not confirmed this payment yet.");

      setMessage("Payment confirmed. Activating your subscription…");
      if (!(await checkSubscription()))
        setMessage(
          "Payment is confirmed. Subscription activation is still processing; this page will update when it is ready.",
        );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <CardElement options={cardStyle} />
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Your card is saved by Stripe for automatic subscription renewals. CourseHub
        does not receive or store your card number.
      </p>
      {message && <p role="status" className="text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || busy}
          className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white disabled:opacity-50"
        >
          {busy ? "Confirming…" : "Confirm subscription"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-xl border px-4 py-3 font-bold disabled:opacity-50"
        >
          Close
        </button>
      </div>
    </form>
  );
}

export default function StripePaymentForm({
  publishableKey,
  clientSecret,
  subscriptionId,
  email,
  returnUrl,
  onClose,
  onComplete,
}: {
  publishableKey: string;
  clientSecret: string;
  subscriptionId: string;
  email: string;
  returnUrl: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const stripePromise = loadStripe(publishableKey);
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardCheckout
        clientSecret={clientSecret}
        subscriptionId={subscriptionId}
        email={email}
        returnUrl={returnUrl}
        onClose={onClose}
        onComplete={onComplete}
      />
    </Elements>
  );
}
