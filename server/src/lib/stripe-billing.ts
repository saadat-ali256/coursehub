import Stripe from "stripe";
import Subscription from "@/models/Subscription";
import Payment from "@/models/Payment";

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(secretKey);
}

export async function syncStripeSubscription(
  stripe: Stripe,
  stripeSubscription: Stripe.Subscription,
) {
  const userId = stripeSubscription.metadata.userId;
  const planId = stripeSubscription.metadata.planId;
  if (!userId || !planId) {
    console.error("Stripe subscription is missing CourseHub metadata", {
      stripeSubscriptionId: stripeSubscription.id,
    });
    return;
  }

  const item = stripeSubscription.items.data[0];
  const start = item?.current_period_start;
  const end = item?.current_period_end;
  const status =
    stripeSubscription.status === "active" ||
    stripeSubscription.status === "trialing"
      ? "active"
      : stripeSubscription.status === "past_due" ||
          stripeSubscription.status === "unpaid"
        ? "past_due"
        : stripeSubscription.status === "canceled" ||
            stripeSubscription.status === "incomplete_expired"
          ? "canceled"
          : "pending";

  await Subscription.findOneAndUpdate(
    { userId, planId },
    {
      $set: {
        userId,
        planId,
        provider: "stripe",
        stripeCustomerId:
          typeof stripeSubscription.customer === "string"
            ? stripeSubscription.customer
            : stripeSubscription.customer.id,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: item?.price.id,
        status,
        ...(start ? { currentPeriodStart: new Date(start * 1000) } : {}),
        ...(end ? { currentPeriodEnd: new Date(end * 1000) } : {}),
      },
    },
    { upsert: true, new: true },
  );

  const paymentId = stripeSubscription.metadata.coursehubPaymentId;
  if (paymentId && status === "active") {
    const latestInvoice = stripeSubscription.latest_invoice;
    await Payment.updateOne(
      { _id: paymentId, provider: "stripe" },
      {
        $set: {
          status: "paid",
          stripeSubscriptionId: stripeSubscription.id,
          ...(typeof latestInvoice === "object" && latestInvoice
            ? { providerPaymentId: latestInvoice.id }
            : {}),
        },
      },
    );
  }
}
