/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import Subscription from "@/models/Subscription";
import CourseAccess from "@/models/CourseAccess";
export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  const sub = await Subscription.findOne({
    _id: b.subscriptionId,
    userId: user!._id,
  });
  if (!sub)
    return NextResponse.json(
      {
        success: false,
        message: "Subscription not found",
      },
      {
        status: 404,
      },
    );
  if (b.action === "cancel") sub.status = "canceled";
  else if (b.action === "resume")
    return NextResponse.json(
      {
        success: false,
        message: "Resume your subscription with its original payment provider.",
      },
      { status: 400 },
    );
  else if (b.action === "upgrade")
    sub.stripePriceId = b.priceId || sub.stripePriceId;
  await sub.save();
  if (b.action === "cancel")
    await CourseAccess.updateOne(
      {
        userId: user!._id,
        courseId: sub.courseId,
      },
      {
        access: true,
        expiresAt: sub.currentPeriodEnd,
      },
    );
  return NextResponse.json({
    success: true,
    subscription: sub,
  });
}
