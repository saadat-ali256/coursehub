/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import LearningProgress from "@/models/LearningProgress";
import Lesson from "@/models/Lesson";
import StudyGoal from "@/models/StudyGoal";
import { hasCourseAccess } from "@/lib/subscription-access";
export async function GET(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();
  const u = new URL(req.url),
    courseId = u.searchParams.get("courseId"),
    lessonId = u.searchParams.get("lessonId");
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
          message: "Subscribe to access premium lesson progress.",
        },
        { status: 403 },
      );
  } else if (courseId && !(await hasCourseAccess(user!, courseId))) {
    return NextResponse.json(
      {
        success: false,
        message: "Subscribe to access premium course progress.",
      },
      { status: 403 },
    );
  }
  const q: any = {
    userId: user!._id,
  };
  if (courseId) q.courseId = courseId;
  if (lessonId) q.lessonId = lessonId;
  return NextResponse.json({
    success: true,
    progress: await LearningProgress.find(q).lean(),
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
      {
        success: false,
        message: "Lesson not found",
      },
      {
        status: 404,
      },
    );
  if (!(await hasCourseAccess(user!, String(lesson.courseId))))
    return NextResponse.json(
      {
        success: false,
        message: "Subscribe to access premium lesson progress.",
      },
      { status: 403 },
    );
  const position = Number(b.position ?? 0);
  const duration = Number(b.duration ?? 0);
  if (
    !Number.isFinite(position) ||
    position < 0 ||
    !Number.isFinite(duration) ||
    duration < 0
  ) {
    return NextResponse.json(
      { success: false, message: "Lesson position and duration must be valid non-negative numbers." },
      { status: 400 },
    );
  }
  const previous = await LearningProgress.findOne({
    userId: user!._id,
    lessonId: b.lessonId,
  }).lean();
  const completed = Boolean(b.completed) || Boolean(previous?.completed);
  const completedAt = completed
    ? previous?.completedAt || new Date()
    : undefined;
  const update = {
    position: Math.max(position, previous?.position || 0),
    duration: Math.max(duration, previous?.duration || 0),
    completed,
    ...(completedAt ? { completedAt } : {}),
  };
  const newlyCompleted = completed && !previous?.completed;
  const watchedSeconds = b.completed
    ? 0
    : Math.min(60, Math.max(0, position - (previous?.position || 0)));
  const p = await LearningProgress.findOneAndUpdate(
    {
      userId: user!._id,
      lessonId: b.lessonId,
    },
    {
      userId: user!._id,
      courseId: lesson.courseId,
      lessonId: b.lessonId,
      ...update,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
  const goal = await StudyGoal.findOne({ userId: user!._id });
  if (goal) {
    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    if (goal.weekStart < weekStart) {
      goal.weekStart = weekStart;
      goal.minutesDone = 0;
      goal.lessonsDone = 0;
    }
    goal.minutesDone += watchedSeconds / 60;
    if (newlyCompleted) goal.lessonsDone += 1;
    await goal.save();
  }
  return NextResponse.json({
    success: true,
    progress: p,
  });
}
