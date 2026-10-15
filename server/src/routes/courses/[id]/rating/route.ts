/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import CourseRating from "@/models/CourseRating";
import { hasCourseAccess } from "@/lib/subscription-access";
export async function GET(
  _r: Request,
  c: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await c.params;
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 },
      );
    if (!(await hasCourseAccess(user, id)))
      return NextResponse.json(
        {
          success: false,
          message: "Subscribe to access premium course ratings.",
        },
        { status: 403 },
      );
    await connectDB();
    const rows = await CourseRating.find({
      courseId: id,
    });
    const avg = rows.length
      ? rows.reduce((a, x) => a + x.rating, 0) / rows.length
      : 0;
    return NextResponse.json({
      success: true,
      average: Number(avg.toFixed(1)),
      count: rows.length,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load rating",
      },
      {
        status: 500,
      },
    );
  }
}
export async function POST(
  r: Request,
  c: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        {
          success: false,
          message: "Login required",
        },
        {
          status: 401,
        },
      );
    const { id } = await c.params;
    if (!(await hasCourseAccess(user, id)))
      return NextResponse.json(
        {
          success: false,
          message: "Subscribe to access premium course features.",
        },
        { status: 403 },
      );
    const body = await r.json();
    const rating = Math.max(1, Math.min(5, Number(body.rating) || 0));
    if (!rating)
      return NextResponse.json(
        {
          success: false,
          message: "Rating must be 1-5",
        },
        {
          status: 400,
        },
      );
    await connectDB();
    await CourseRating.findOneAndUpdate(
      {
        courseId: id,
        userId: user._id,
      },
      {
        rating,
        review: String(body.review || "").trim(),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to save rating",
      },
      {
        status: 500,
      },
    );
  }
}
