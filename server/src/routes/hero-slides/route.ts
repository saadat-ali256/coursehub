import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import HeroSlide from "@/models/HeroSlide";

export async function GET() {
  await connectDB();
  const slides = await HeroSlide.find({ active: true })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select(
      "eyebrow title description imageUrl imageAlt buttonLabel buttonUrl sortOrder",
    )
    .lean();
  return NextResponse.json(
    { success: true, slides },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
