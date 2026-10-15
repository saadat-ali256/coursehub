/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import PremiumPlan from "@/models/PremiumPlan";
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json(
      {
        success: false,
        message: "Admin access required",
      },
      {
        status: 403,
      },
    );
  await connectDB();
  return NextResponse.json({
    success: true,
    plans: await PremiumPlan.find()
      .sort({
        price: 1,
      })
      .lean(),
  });
}
export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      {
        success: false,
        message: "Admin access required",
      },
      {
        status: 403,
      },
    );
  await connectDB();
  const b = await req.json();
  const p = await PremiumPlan.create({
    name: b.name,
    slug: b.slug,
    price: Number(b.price),
    interval: b.interval,
    description: b.description,
    features: b.features || [],
    active: b.active !== false,
    stripePriceId: b.stripePriceId || undefined,
    paypalPlanId: b.paypalPlanId || undefined,
  });
  return NextResponse.json(
    {
      success: true,
      plan: p,
    },
    {
      status: 201,
    },
  );
}

export async function PATCH(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 },
    );

  const body = await req.json();
  const id = String(body.id || "");
  const name = String(body.name || "").trim();
  const slug = String(body.slug || "").trim();
  const price = Number(body.price);
  const interval = body.interval;
  const features = body.features;

  if (
    !id ||
    !name ||
    !slug ||
    !Number.isFinite(price) ||
    price < 0 ||
    !["month", "year"].includes(interval) ||
    !Array.isArray(features) ||
    !features.every((feature: unknown) => typeof feature === "string")
  ) {
    return NextResponse.json(
      { success: false, message: "Enter a valid name, slug, price, billing interval, and features." },
      { status: 400 },
    );
  }

  await connectDB();
  try {
    const plan = await PremiumPlan.findByIdAndUpdate(
      id,
      {
        name,
        slug,
        price,
        interval,
        description: String(body.description || ""),
        features,
      },
      { new: true, runValidators: true },
    );

    if (!plan)
      return NextResponse.json(
        { success: false, message: "Premium plan not found." },
        { status: 404 },
      );

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { success: false, message: "That plan slug is already in use." },
        { status: 409 },
      );
    }
    console.error("Could not update premium plan.", error);
    return NextResponse.json(
      { success: false, message: "Could not update premium plan." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 },
    );

  const id = new URL(req.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { success: false, message: "Premium plan ID is required." },
      { status: 400 },
    );

  await connectDB();
  const plan = await PremiumPlan.findByIdAndDelete(id);
  if (!plan)
    return NextResponse.json(
      { success: false, message: "Premium plan not found." },
      { status: 404 },
    );

  return NextResponse.json({ success: true });
}
