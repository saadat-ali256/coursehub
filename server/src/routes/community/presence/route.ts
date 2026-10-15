/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import User from "@/models/User";
export async function POST() {
  const u = await getCurrentUser();
  if (!u)
    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 401,
      },
    );
  await connectDB();
  await User.findByIdAndUpdate(u._id, {
    lastSeenAt: new Date(),
  });
  return NextResponse.json({
    success: true,
  });
}
