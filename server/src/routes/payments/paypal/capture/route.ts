/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Payment from "@/models/Payment";
import Subscription from "@/models/Subscription";
import PremiumPlan from "@/models/PremiumPlan";
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      {
        success: false,
        message: "Login required",
      },
      {
        status: 401,
      },
    );
  const { subscriptionId } = await req.json();
  if (!subscriptionId)
    return NextResponse.json(
      {
        success: false,
        message: "Subscription ID required",
      },
      {
        status: 400,
      },
    );
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
    return NextResponse.json(
      {
        success: false,
        message: "PayPal not configured",
      },
      {
        status: 503,
      },
    );
  try {
    const base =
      process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
    ).toString("base64");
    const tr = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const t = (await tr.json()).access_token;
    const r = await fetch(
      `${base}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
      },
    );
    const d = await r.json();
    if (
      !r.ok ||
      d.subscriber?.email_address?.toLowerCase() !== user.email.toLowerCase()
    )
      return NextResponse.json(
        {
          success: false,
          message: "PayPal verification failed",
        },
        {
          status: 400,
        },
      );
    await connectDB();
    const p = await Payment.findOneAndUpdate(
      {
        provider: "paypal",
        providerPaymentId: subscriptionId,
        userId: user._id,
      },
      {
        status: d.status === "ACTIVE" ? "paid" : "pending",
      },
      {
        new: true,
      },
    );
    if (d.status === "ACTIVE" && p) {
      const plan = await PremiumPlan.findById(p.planId);
      await Subscription.findOneAndUpdate(
        {
          userId: user._id,
          planId: p.planId,
        },
        {
          userId: user._id,
          planId: p.planId,
          provider: "paypal",
          paypalSubscriptionId: subscriptionId,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(
            Date.now() +
              (plan?.interval === "year" ? 365 : 30) * 86400000,
          ),
        },
        {
          upsert: true,
        },
      );
    }
    return NextResponse.json({
      success: true,
      status: d.status,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        success: false,
        message: "PayPal verification failed",
      },
      {
        status: 500,
      },
    );
  }
}
