/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { hasCommunityAccess } from "@/lib/community-access";
export async function PATCH(req: Request) {
  const u = await getCurrentUser();
  if (!u)
    return NextResponse.json(
      {
        success: false,
        message: "Login required",
      },
      {
        status: 401,
      },
    );
  if (!(await hasCommunityAccess(u)))
    return NextResponse.json(
      { success: false, message: "A subscription is required to edit your profile." },
      { status: 403 },
    );
  const b = await req.json();
  const name = String(b.name ?? u.name).trim();
  const username = String(b.username ?? u.username ?? "").trim().toLowerCase();
  const bio = String(b.bio ?? u.bio ?? "").trim();
  if (name.length < 2 || name.length > 80)
    return NextResponse.json(
      {
        success: false,
        message: "Name must be 2-80 characters",
      },
      {
        status: 400,
      },
    );
  if (bio.length > 500)
    return NextResponse.json(
      {
        success: false,
        message: "Bio is too long",
      },
      {
        status: 400,
      },
    );
  if (!/^[a-z0-9._]{3,24}$/.test(username))
    return NextResponse.json(
      { success: false, message: "Username must be 3-24 characters using letters, numbers, dots or underscores" },
      { status: 400 },
    );
  await connectDB();
  const usernameOwner = await User.findOne({
    username,
    _id: { $ne: u._id },
  }).select("_id");
  if (usernameOwner)
    return NextResponse.json(
      { success: false, message: "Username is already in use" },
      { status: 409 },
    );
  let user;
  try {
    user = await User.findByIdAndUpdate(
      u._id,
      {
        name,
        username,
        bio,
        avatarUrl: String(b.avatarUrl ?? u.avatarUrl ?? ""),
        coverImage: String(b.coverImage ?? u.coverImage ?? ""),
      },
      {
        new: true,
      },
    ).select("-password");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      return NextResponse.json(
        { success: false, message: "Username is already in use" },
        { status: 409 },
      );
    throw error;
  }
  if (!user)
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 },
    );
  return NextResponse.json({
    success: true,
    user,
  });
}
