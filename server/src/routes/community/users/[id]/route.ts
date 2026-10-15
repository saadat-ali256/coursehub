/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";
export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json(
      {
        success: false,
        message: "Invalid user id",
      },
      {
        status: 400,
      },
    );
  await connectDB();
  const u = await User.findById(id)
    .select("name username avatarUrl coverImage bio role lastSeenAt createdAt")
    .lean();
  if (!u)
    return NextResponse.json(
      {
        success: false,
        message: "User not found",
      },
      {
        status: 404,
      },
    );
  return NextResponse.json({
    success: true,
    user: u,
  });
}
