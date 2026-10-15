/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import PremiumPlan from "@/models/PremiumPlan";
import Payment from "@/models/Payment";
async function token() {
  const base =
    process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
  const r = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error("PayPal auth failed");
  return (await r.json()).access_token as string;
}
async function ensurePlan(plan: any, t: string) {
  if (plan.paypalPlanId) return plan.paypalPlanId;
  const base =
    process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
  const product = await fetch(`${base}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: plan.name,
      description: plan.description || plan.name,
      type: "SERVICE",
      category: "EDUCATIONAL_AND_TEXTBOOKS",
    }),
  }).then((r) => r.json());
  const unit = plan.interval === "year" ? "YEAR" : "MONTH";
  const body = {
    product_id: product.id,
    name: plan.name,
    description: plan.description || plan.name,
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: unit,
          interval_count: 1,
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: plan.price.toFixed(2),
            currency_code: "USD",
          },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: {
        value: "0",
        currency_code: "USD",
      },
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3,
    },
  };
  const pr = await fetch(`${base}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then((r) => r.json());
  if (!pr.id) throw new Error("Could not create PayPal plan");
  plan.paypalPlanId = pr.id;
  await plan.save();
  return pr.id;
}
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
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
    return NextResponse.json(
      {
        success: false,
        message: "PayPal is not configured",
      },
      {
        status: 503,
      },
    );
  try {
    const { planId, next } = await req.json();
    await connectDB();
    const plan = await PremiumPlan.findById(planId);
    if (!plan || !plan.active)
      return NextResponse.json(
        {
          success: false,
          message: "Plan not found",
        },
        {
          status: 404,
        },
      );
    const t = await token();
    const pid = await ensurePlan(plan, t);
    const base =
      process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.CLIENT_URL ||
      "http://localhost:3000";
    const safeNext =
      typeof next === "string" &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.includes("\\")
        ? next
        : "/dashboard";
    const r = await fetch(`${base}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: pid,
        custom_id: `${user._id}:${plan._id}`,
        subscriber: {
          name: {
            given_name: user.name.split(" ")[0],
          },
          email_address: user.email,
        },
        application_context: {
          brand_name: "CourseHub",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${appUrl}/subscriptions?paypal=success&next=${encodeURIComponent(safeNext)}`,
          cancel_url: `${appUrl}/subscriptions?paypal=canceled&next=${encodeURIComponent(safeNext)}`,
        },
      }),
    });
    const d = await r.json();
    if (!r.ok)
      return NextResponse.json(
        {
          success: false,
          message: d.message || "PayPal subscription failed",
        },
        {
          status: 502,
        },
      );
    await Payment.create({
      userId: user._id,
      planId: plan._id,
      provider: "paypal",
      status: "pending",
      amount: plan.price,
      currency: "USD",
      providerPaymentId: d.id,
    });
    const link = d.links?.find((x: any) => x.rel === "approve")?.href;
    return NextResponse.json({
      success: true,
      url: link,
      subscriptionId: d.id,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        success: false,
        message: "PayPal checkout could not be created",
      },
      {
        status: 500,
      },
    );
  }
}
