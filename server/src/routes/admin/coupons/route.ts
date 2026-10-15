/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/api-helpers";
import Coupon from "@/models/Coupon";
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  await connectDB();
  return NextResponse.json({
    success: true,
    coupons: await Coupon.find()
      .populate("courseIds", "name")
      .sort({
        createdAt: -1,
      })
      .lean(),
  });
}
export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  try {
    return NextResponse.json(
      {
        success: true,
        coupon: await Coupon.create({
          ...b,
          code: String(b.code).toUpperCase(),
        }),
      },
      {
        status: 201,
      },
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        message: e.message,
      },
      {
        status: 400,
      },
    );
  }
}
export async function PATCH(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  return NextResponse.json({
    success: true,
    coupon: await Coupon.findByIdAndUpdate(
      b.id,
      {
        ...b,
        code: String(b.code || "").toUpperCase(),
      },
      {
        new: true,
      },
    ),
  });
}
export async function DELETE(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  await connectDB();
  await Coupon.findByIdAndDelete(new URL(req.url).searchParams.get("id"));
  return NextResponse.json({
    success: true,
  });
}
