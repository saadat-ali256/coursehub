/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import Notification from "@/models/Notification";
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();
  return NextResponse.json({
    success: true,
    notifications: await Notification.find({
      userId: user!._id,
      type: { $in: ["course", "blog"] },
    })
      .sort({
        createdAt: -1,
      })
      .limit(50)
      .lean(),
  });
}
export async function PATCH(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  if (b.all)
    await Notification.updateMany(
      {
        userId: user!._id,
      },
      {
        read: true,
      },
    );
  else
    await Notification.updateOne(
      {
        _id: b.id,
        userId: user!._id,
      },
      {
        read: true,
      },
    );
  return NextResponse.json({
    success: true,
  });
}
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Notifications are created automatically when content is published.",
    },
    { status: 405 },
  );
}
