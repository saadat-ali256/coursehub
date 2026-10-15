import { NextResponse } from "next/server";
import Stripe from "stripe";
import { connectDB } from "@/lib/mongodb";
import { getStripeClient, syncStripeSubscription } from "@/lib/stripe-billing";
import Subscription from "@/models/Subscription";
import Payment from "@/models/Payment";

export const runtime = "nodejs";

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription;
  return typeof subscription === "string" ? subscription : subscription?.id;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return new NextResponse("Stripe webhook is not configured", { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return new NextResponse("Missing Stripe signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return new NextResponse("Invalid Stripe webhook signature", { status: 400 });
  }

  try {
    await connectDB();
    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getInvoiceSubscriptionId(invoice);
      if (subscriptionId) {
        const stripeSubscription = await getStripeClient().subscriptions.retrieve(
          subscriptionId,
        );
        await syncStripeSubscription(getStripeClient(), stripeSubscription);
        if (event.type === "invoice.payment_failed") {
          await Subscription.updateOne(
            { stripeSubscriptionId: subscriptionId },
            { $set: { status: "past_due" } },
          );
        } else {
          await Payment.findOneAndUpdate(
            {
              provider: "stripe",
              stripeSubscriptionId: subscriptionId,
            },
            {
              $set: {
                status: "paid",
                providerPaymentId: invoice.id,
              },
            },
            { sort: { createdAt: -1 } },
          );
        }
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncStripeSubscription(
        getStripeClient(),
        event.data.object as Stripe.Subscription,
      );
    }

    return new NextResponse("ok");
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}
