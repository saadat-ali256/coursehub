import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import Subscription from "@/models/Subscription";
import User from "@/models/User";
import mongoose from "mongoose";
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 },
    );
  await connectDB();
  const subscriptions = await Subscription.find()
    .populate("userId", "name email")
    .populate("courseId", "name price interval")
    .populate("grantedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
  const users = await User.find({ role: { $ne: "admin" }, status: "active" })
    .select("name email")
    .sort({ name: 1 })
    .lean();
  return NextResponse.json({ success: true, subscriptions, users });
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 },
    );
  const admin = await getCurrentUser();
  const body = await req.json();
  const durationDays = Number(body.durationDays);
  if (!mongoose.isValidObjectId(body.userId))
    return NextResponse.json(
      { success: false, message: "Choose a valid user." },
      { status: 400 },
    );
  if (![30, 90, 180, 365].includes(durationDays))
    return NextResponse.json(
      { success: false, message: "Choose a valid access duration." },
      { status: 400 },
    );

  await connectDB();
  const user = await User.findOne({
    _id: body.userId,
    role: { $ne: "admin" },
    status: "active",
  }).select("_id");
  if (!user)
    return NextResponse.json(
      { success: false, message: "Active user not found." },
      { status: 404 },
    );

  const now = new Date();
  const subscription = await Subscription.findOneAndUpdate(
    {
      userId: user._id,
      provider: "admin",
      status: "active",
    },
    {
      userId: user._id,
      provider: "admin",
      grantedBy: admin?._id,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + durationDays * 86400000),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return NextResponse.json(
    { success: true, subscription },
    { status: 201 },
  );
}

export async function PATCH(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 },
    );
  const { id } = await req.json();
  if (!mongoose.isValidObjectId(id))
    return NextResponse.json(
      { success: false, message: "Choose a valid complimentary subscription." },
      { status: 400 },
    );
  await connectDB();
  const subscription = await Subscription.findOneAndUpdate(
    { _id: id, provider: "admin", status: "active" },
    { status: "canceled", currentPeriodEnd: new Date() },
    { new: true },
  );
  if (!subscription)
    return NextResponse.json(
      { success: false, message: "Active admin-granted access not found." },
      { status: 404 },
    );
  return NextResponse.json({ success: true, subscription });
}
