import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  await connectDB();
  const admins = await User.find({
    role: "admin",
    status: { $ne: "suspended" },
    email: { $ne: "saadatali3330@gmail.com" },
  })
    .select("name email")
    .sort({ createdAt: 1 })
    .lean();
  return NextResponse.json({
    success: true,
    admins: admins.map((admin) => ({
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
    })),
  });
}
