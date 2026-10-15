/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PremiumPlan from "@/models/PremiumPlan";
export async function GET() {
  await connectDB();
  let plans = await PremiumPlan.find({
    active: true,
  })
    .sort({
      price: 1,
    })
    .lean();
  if (!plans.length) {
    await PremiumPlan.insertMany([
      {
        name: "Premium Monthly",
        slug: "monthly",
        price: 19,
        interval: "month",
        description: "Full access to premium learning.",
        features: [
          "All premium courses",
          "Full video playlists",
          "Quizzes & certificates",
          "Private community",
          "Study resources",
        ],
      },
      {
        name: "Premium Yearly",
        slug: "yearly",
        price: 149,
        interval: "year",
        description: "Best value for serious learners.",
        features: [
          "Everything in Monthly",
          "Priority community",
          "Annual savings",
          "All future premium courses",
          "Premium events",
        ],
      },
    ]);
    plans = await PremiumPlan.find({
      active: true,
    })
      .sort({
        price: 1,
      })
      .lean();
  }
  return NextResponse.json({
    success: true,
    plans,
  });
}
