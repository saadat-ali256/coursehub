/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { isAdmin, getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Subscription from "@/models/Subscription";
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
    payments: await Payment.find()
      .populate("userId", "name email")
      .populate("planId", "name price interval")
      .sort({
        createdAt: -1,
      })
      .lean(),
  });
}
export async function PATCH(req: Request) {
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
  const u = await getCurrentUser();
  await connectDB();
  const b = await req.json();
  const p = await Payment.findById(b.id).populate("planId");
  if (!p)
    return NextResponse.json(
      {
        success: false,
        message: "Payment not found",
      },
      {
        status: 404,
      },
    );
  if (b.status === "paid") {
    p.status = "paid";
    await p.save();
    const plan: any = p.planId;
    await Subscription.findOneAndUpdate(
      {
        userId: p.userId,
        planId: plan?._id,
      },
      {
        userId: p.userId,
        planId: plan?._id,
        provider: p.provider,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(
          Date.now() + (plan?.interval === "year" ? 365 : 30) * 86400000,
        ),
      },
      {
        upsert: true,
      },
    );
  } else if (b.status === "failed" || b.status === "refunded") {
    p.status = b.status;
    await p.save();
  }
  return NextResponse.json({
    success: true,
    payment: p,
    verifiedBy: u?._id,
  });
}
