import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminPermission } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  const user = await getCurrentUser();
  if (!hasAdminPermission(user, "manage_community"))
    return NextResponse.json(
      { success: false, message: "Community management permission required" },
      { status: 403 },
    );
  await connectDB();
  const users = await User.find({ status: { $ne: "suspended" }, role: { $ne: "admin" } })
    .select("name username email avatarUrl")
    .sort({ name: 1 })
    .lean();
  return NextResponse.json({ success: true, users });
}
