/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { isAdmin } from "@/lib/auth";
import Lesson from "@/models/Lesson";
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json(
      {
        success: false,
        message: "Admin access required",
      },
      {
        status: 403,
      },
    );
  await connectDB();
  const lessons = await Lesson.find()
    .populate("courseId", "name")
    .sort({
      courseId: 1,
      order: 1,
    })
    .lean();
  return NextResponse.json({
    success: true,
    lessons,
  });
}
