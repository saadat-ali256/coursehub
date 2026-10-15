import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Subscription from "@/models/Subscription";

export async function GET() {
  try {
    // Current logged-in user lena
    const user = await getCurrentUser();

    // Agar login nahi hai
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 },
      );
    }

    // MongoDB connect
    await connectDB();

    // Sirf current user ki subscriptions find karna
    const subscriptions = await Subscription.find({
      userId: user._id,
    }).populate("courseId");

    return NextResponse.json({
      success: true,
      subscriptions,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get subscriptions",
      },
      { status: 500 },
    );
  }
}
