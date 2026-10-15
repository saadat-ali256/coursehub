/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import User from "@/models/User";
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json(
      {
        success: false,
        message: "Login required",
      },
      {
        status: 401,
      },
    );
  await connectDB();
  const q =
    new URL(req.url).searchParams.get("q")?.trim().replace(/^@/, "") || "";
  if (q.length < 2)
    return NextResponse.json({
      success: true,
      users: [],
    });
  const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const userFilter: Record<string, unknown> = {
    status: { $ne: "suspended" },
    _id: {
      $ne: me._id,
    },
    username: { $regex: `^${escapedQuery}`, $options: "i" },
  };
  const users = await User.find(userFilter)
    .select("name username avatarUrl bio role lastSeenAt")
    .limit(20)
    .lean();
  return NextResponse.json({
    success: true,
    users: users.map((user) => ({
      ...user,
    })),
  });
}
