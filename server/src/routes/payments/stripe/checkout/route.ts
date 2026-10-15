import { NextResponse } from "next/server";
import Stripe from "stripe";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { getStripeClient } from "@/lib/stripe-billing";
import PremiumPlan from "@/models/PremiumPlan";
import Payment from "@/models/Payment";
import Subscription from "@/models/Subscription";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function paymentClientSecret(subscription: Stripe.Subscription) {
  const invoice = subscription.latest_invoice;
  if (!invoice || typeof invoice === "string") return null;
  return invoice.confirmation_secret?.client_secret || null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { success: false, message: "Login required" },
      { status: 401 },
    );
  if (!rateLimit(`stripe-subscription:${user._id}:${clientKey(request)}`, 5, 60_000))
    return NextResponse.json(
      { success: false, message: "Too many checkout attempts. Please wait a minute." },
      { status: 429 },
    );
  if (!process.env.STRIPE_PUBLISHABLE_KEY)
    return NextResponse.json(
      { success: false, message: "Stripe publishable key is not configured" },
      { status: 503 },
    );

  try {
    const body = await request.json();
    const planId = String(body?.planId || "");
    if (!mongoose.isValidObjectId(planId))
      return NextResponse.json(
        { success: false, message: "Choose a valid subscription plan." },
        { status: 400 },
      );

    await connectDB();
    const plan = await PremiumPlan.findOne({ _id: planId, active: true });
    if (!plan || !Number.isFinite(plan.price) || plan.price <= 0)
      return NextResponse.json(
        { success: false, message: "Plan not found or unavailable." },
        { status: 404 },
      );

    const existingSubscription = await Subscription.findOne({
      userId: user._id,
      planId: plan._id,
      status: "active",
      currentPeriodEnd: { $gt: new Date() },
    }).select("stripeSubscriptionId");
    if (existingSubscription)
      return NextResponse.json(
        { success: false, message: "You already have an active subscription to this plan." },
        { status: 409 },
      );

    const stripe = getStripeClient();
    const pendingPayment = await Payment.findOne({
      userId: user._id,
      planId: plan._id,
      provider: "stripe",
      status: "pending",
      stripeSubscriptionId: { $exists: true },
      updatedAt: { $gt: new Date(Date.now() - 24 * 60 * 60_000) },
    }).sort({ updatedAt: -1 });

    let payment = pendingPayment;
    if (payment?.stripeSubscriptionId) {
      const existing = await stripe.subscriptions.retrieve(
        payment.stripeSubscriptionId,
        { expand: ["latest_invoice.confirmation_secret"] },
      );
      if (
        existing.status === "incomplete" ||
        existing.status === "past_due"
      ) {
        const clientSecret = paymentClientSecret(existing);
        if (clientSecret)
          return NextResponse.json({
            success: true,
            clientSecret,
            subscriptionId: existing.id,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            email: user.email,
          });
      }
      if (existing.status === "active" || existing.status === "trialing")
        return NextResponse.json({
          success: true,
          alreadyActive: true,
          subscriptionId: existing.id,
        });
    }

    if (!payment) {
      payment = await Payment.create({
        userId: user._id,
        planId: plan._id,
        provider: "stripe",
        status: "pending",
        amount: plan.price,
        currency: "USD",
        metadata: { safeNext: typeof body.next === "string" ? body.next : "" },
      });
    }

    let customerId = user.stripeCustomerId;
    if (customerId) {
      await stripe.customers.update(customerId, {
        email: user.email,
        name: user.name,
      });
    } else {
      const customer = await stripe.customers.create(
        {
          email: user.email,
          name: user.name,
          metadata: { coursehubUserId: user._id.toString() },
        },
        { idempotencyKey: `coursehub-customer-${user._id}` },
      );
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    let priceId = plan.stripePriceId;
    if (priceId) {
      const existingPrice = await stripe.prices.retrieve(priceId);
      if (!existingPrice.active || existingPrice.recurring?.interval !== plan.interval)
        return NextResponse.json(
          { success: false, message: "The Stripe price configured for this plan is not recurring on the correct interval." },
          { status: 409 },
        );
    } else {
      const product = await stripe.products.create(
        {
          name: plan.name,
          description: plan.description || undefined,
          metadata: { coursehubPlanId: plan._id.toString() },
        },
        { idempotencyKey: `coursehub-product-${plan._id}` },
      );
      const price = await stripe.prices.create(
        {
          product: product.id,
          currency: "usd",
          unit_amount: Math.round(plan.price * 100),
          recurring: { interval: plan.interval },
        },
        { idempotencyKey: `coursehub-price-${plan._id}-${Math.round(plan.price * 100)}` },
      );
      priceId = price.id;
      plan.stripePriceId = priceId;
      await plan.save();
    }

    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
          payment_method_types: ["card"],
        },
        expand: ["latest_invoice.confirmation_secret"],
        metadata: {
          userId: user._id.toString(),
          planId: plan._id.toString(),
          coursehubPaymentId: payment._id.toString(),
        },
      },
      { idempotencyKey: `coursehub-subscription-${payment._id}` },
    );

    const clientSecret = paymentClientSecret(subscription);
    if (!clientSecret) {
      await payment.updateOne({
        $set: {
          status: "failed",
          stripeSubscriptionId: subscription.id,
        },
      });
      return NextResponse.json(
        {
          success: false,
          message: "Stripe did not return a payment confirmation. Please retry or contact support.",
        },
        { status: 502 },
      );
    }

    payment.stripeSubscriptionId = subscription.id;
    await payment.save();

    return NextResponse.json({
      success: true,
      clientSecret,
      subscriptionId: subscription.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      email: user.email,
    });
  } catch (error) {
    console.error("Stripe subscription intent creation failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { success: false, message: "Unable to start Stripe payment. Please try again." },
      { status: 500 },
    );
  }
}
