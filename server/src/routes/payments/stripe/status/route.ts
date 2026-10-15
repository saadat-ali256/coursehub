import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStripeClient, syncStripeSubscription } from "@/lib/stripe-billing";
import Payment from "@/models/Payment";
import Subscription from "@/models/Subscription";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { success: false, message: "Login required" },
      { status: 401 },
    );

  const subscriptionId = new URL(request.url).searchParams.get("subscriptionId");
  if (!subscriptionId || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId))
    return NextResponse.json(
      { success: false, message: "A valid subscription ID is required." },
      { status: 400 },
    );

  try {
    const payment = await Payment.findOne({
      userId: user._id,
      provider: "stripe",
      stripeSubscriptionId: subscriptionId,
    });
    if (!payment)
      return NextResponse.json(
        { success: false, message: "Subscription payment not found." },
        { status: 404 },
      );

    const stripeSubscription = await getStripeClient().subscriptions.retrieve(
      subscriptionId,
      { expand: ["latest_invoice.confirmation_secret"] },
    );
    await syncStripeSubscription(getStripeClient(), stripeSubscription);

    const subscription = await Subscription.findOne({
      userId: user._id,
      planId: payment.planId,
      stripeSubscriptionId: subscriptionId,
    }).select("status currentPeriodEnd");

    return NextResponse.json({
      success: true,
      status: subscription?.status || stripeSubscription.status,
      paymentStatus: payment.status,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() || null,
    });
  } catch (error) {
    console.error("Stripe payment status lookup failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { success: false, message: "Unable to verify payment status right now." },
      { status: 502 },
    );
  }
}
