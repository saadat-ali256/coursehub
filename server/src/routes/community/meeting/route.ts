/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CommunityMeeting from "@/models/CommunityMeeting";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { hasCommunityAccess } from "@/lib/community-access";
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(await hasCommunityAccess(user)))
    return NextResponse.json(
      { success: false, message: "Subscription required" },
      { status: user ? 403 : 401 },
    );
  await connectDB();
  const m = await CommunityMeeting.findOne({
    active: true,
    $or: [
      {
        endsAt: {
          $exists: false,
        },
      },
      {
        endsAt: null,
      },
      {
        endsAt: {
          $gt: new Date(),
        },
      },
    ],
  })
    .sort({
      startsAt: 1,
      createdAt: -1,
    })
    .lean();
  return NextResponse.json({
    success: true,
    meeting: m,
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
  const u = await getCurrentUser();
  await connectDB();
  const b = await req.json();
  if (!b.title || !b.meetingUrl)
    return NextResponse.json(
      {
        success: false,
        message: "Title and meeting URL are required",
      },
      {
        status: 400,
      },
    );
  await CommunityMeeting.updateMany(
    {
      active: true,
    },
    {
      $set: {
        active: false,
      },
    },
  );
  const m = await CommunityMeeting.create({
    title: String(b.title),
    meetingUrl: String(b.meetingUrl),
    provider: b.provider || "zoom",
    startsAt: b.startsAt || undefined,
    endsAt: b.endsAt || undefined,
    active: true,
    createdBy: u!._id,
  });
  return NextResponse.json(
    {
      success: true,
      meeting: m,
    },
    {
      status: 201,
    },
  );
}
export async function DELETE() {
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
  await CommunityMeeting.updateMany(
    {
      active: true,
    },
    {
      $set: {
        active: false,
      },
    },
  );
  return NextResponse.json({
    success: true,
  });
}
