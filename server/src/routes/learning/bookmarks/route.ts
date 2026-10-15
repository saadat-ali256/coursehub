/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import Lesson from "@/models/Lesson";
import LessonBookmark from "@/models/LessonBookmark";
import { hasCourseAccess } from "@/lib/subscription-access";
export async function GET(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();
  const bookmarks = await LessonBookmark.find({
    userId: user!._id,
  })
    .populate("lessonId", "title courseId order")
    .lean();
  const accessibleBookmarks = [];
  for (const bookmark of bookmarks) {
    if (
      bookmark.lessonId &&
      typeof bookmark.lessonId === "object" &&
      "courseId" in bookmark.lessonId &&
      (await hasCourseAccess(
        user!,
        String(bookmark.lessonId.courseId),
      ))
    ) {
      accessibleBookmarks.push(bookmark);
    }
  }
  return NextResponse.json({
    success: true,
    bookmarks: accessibleBookmarks,
  });
}
export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  const lesson = await Lesson.findById(b.lessonId);
  if (!lesson)
    return NextResponse.json(
      { success: false, message: "Lesson not found" },
      { status: 404 },
    );
  if (!(await hasCourseAccess(user!, String(lesson.courseId))))
    return NextResponse.json(
      {
        success: false,
        message: "Subscribe to access premium lesson bookmarks.",
      },
      { status: 403 },
    );
  const existing = await LessonBookmark.findOne({
    userId: user!._id,
    lessonId: b.lessonId,
  });
  if (existing) {
    await existing.deleteOne();
    return NextResponse.json({
      success: true,
      bookmarked: false,
    });
  }
  await LessonBookmark.create({
    userId: user!._id,
    courseId: lesson.courseId,
    lessonId: b.lessonId,
  });
  return NextResponse.json({
    success: true,
    bookmarked: true,
  });
}
