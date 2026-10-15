/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import Coupon from "@/models/Coupon";
import CouponRedemption from "@/models/CouponRedemption";
import Subscription from "@/models/Subscription";
export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  const code = String(b.code || "")
    .trim()
    .toUpperCase();
  const coupon = await Coupon.findOne({
    code,
    active: true,
  });
  if (!coupon)
    return NextResponse.json(
      {
        success: false,
        message: "Invalid or inactive coupon",
      },
      {
        status: 400,
      },
    );
  const now = new Date();
  if (coupon.startAt && now < coupon.startAt)
    return NextResponse.json(
      {
        success: false,
        message: "Coupon is not active yet",
      },
      {
        status: 400,
      },
    );
  if (coupon.endAt && now > coupon.endAt)
    return NextResponse.json(
      {
        success: false,
        message: "Coupon has expired",
      },
      {
        status: 400,
      },
    );
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    return NextResponse.json(
      {
        success: false,
        message: "Coupon usage limit reached",
      },
      {
        status: 400,
      },
    );
  const userUses = await CouponRedemption.countDocuments({
    couponId: coupon._id,
    userId: user!._id,
  });
  if (userUses >= coupon.perUserLimit)
    return NextResponse.json(
      {
        success: false,
        message: "You have already used this coupon",
      },
      {
        status: 400,
      },
    );
  const amount = Number(b.amount || 0);
  if (amount < coupon.minimumAmount)
    return NextResponse.json(
      {
        success: false,
        message: `Minimum amount is ${coupon.minimumAmount}`,
      },
      {
        status: 400,
      },
    );
  if (
    coupon.firstTimeOnly &&
    (await Subscription.exists({
      userId: user!._id,
    }))
  )
    return NextResponse.json(
      {
        success: false,
        message: "Coupon is for first-time customers only",
      },
      {
        status: 400,
      },
    );
  if (
    coupon.courseIds.length &&
    b.courseId &&
    !coupon.courseIds.some(
      (x: mongoose.Types.ObjectId) => String(x) === String(b.courseId),
    )
  )
    return NextResponse.json(
      {
        success: false,
        message: "Coupon does not apply to this course",
      },
      {
        status: 400,
      },
    );
  let discount =
    coupon.discountType === "percentage"
      ? (amount * coupon.value) / 100
      : coupon.value;
  discount = Math.min(discount, amount);
  return NextResponse.json({
    success: true,
    couponId: coupon._id,
    code: coupon.code,
    discount,
    finalAmount: amount - discount,
  });
}
