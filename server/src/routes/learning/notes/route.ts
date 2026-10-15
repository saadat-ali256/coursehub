/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import StudyNote from "@/models/StudyNote";
import Lesson from "@/models/Lesson";
import { hasCourseAccess } from "@/lib/subscription-access";
export async function GET(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();
  const u = new URL(req.url);
  const q: any = {
    userId: user!._id,
  };
  const lessonId = u.searchParams.get("lessonId");
  if (lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson)
      return NextResponse.json(
        { success: false, message: "Lesson not found" },
        { status: 404 },
      );
    if (!(await hasCourseAccess(user!, String(lesson.courseId))))
      return NextResponse.json(
        {
          success: false,
          message: "Subscribe to access premium lesson notes.",
        },
        { status: 403 },
      );
    q.lessonId = lessonId;
  }
  const notes = await StudyNote.find(q).sort({ createdAt: -1 }).lean();
  const accessibleNotes = [];
  for (const note of notes) {
    if (await hasCourseAccess(user!, String(note.courseId))) {
      accessibleNotes.push(note);
    }
  }
  return NextResponse.json({
    success: true,
    notes: accessibleNotes,
  });
}
export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const b = await req.json();
  if (!b.text || !b.lessonId || !b.courseId)
    return NextResponse.json(
      {
        success: false,
        message: "lessonId, courseId and text are required",
      },
      {
        status: 400,
      },
    );
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
        message: "Subscribe to access premium lesson notes.",
      },
      { status: 403 },
    );
  return NextResponse.json({
    success: true,
    note: await StudyNote.create({
      userId: user!._id,
      courseId: lesson.courseId,
      lessonId: b.lessonId,
      text: String(b.text).slice(0, 3000),
      timestamp: b.timestamp,
    }),
  });
}
export async function DELETE(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const id = new URL(req.url).searchParams.get("id");
  await connectDB();
  await StudyNote.deleteOne({
    _id: id,
    userId: user!._id,
  });
  return NextResponse.json({
    success: true,
  });
}
