/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import StudyPlan from "@/models/StudyPlan";
import Lesson from "@/models/Lesson";
import { hasCourseAccess } from "@/lib/subscription-access";
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();
  const plans = await StudyPlan.find({
    userId: user!._id,
  })
    .populate("lessonId", "title courseId")
    .sort({ scheduledFor: 1 })
    .lean();
  const accessiblePlans = [];
  for (const plan of plans) {
    if (
      plan.lessonId &&
      typeof plan.lessonId === "object" &&
      "courseId" in plan.lessonId &&
      (await hasCourseAccess(user!, String(plan.lessonId.courseId)))
    ) {
      accessiblePlans.push(plan);
    }
  }
  return NextResponse.json({
    success: true,
    plans: accessiblePlans,
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
        message: "Subscribe to access premium study plans.",
      },
      { status: 403 },
    );
  return NextResponse.json({
    success: true,
    plan: await StudyPlan.create({
      userId: user!._id,
      lessonId: lesson._id,
      scheduledFor: new Date(b.scheduledFor),
      done: false,
    }),
  });
}
export async function PATCH(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  const plan = await StudyPlan.findOne({
    _id: b.id,
    userId: user!._id,
  }).populate("lessonId", "courseId");
  const lesson =
    plan?.lessonId && typeof plan.lessonId === "object"
      ? plan.lessonId
      : null;
  if (
    !lesson ||
    !("courseId" in lesson) ||
    !(await hasCourseAccess(user!, String(lesson.courseId)))
  )
    return NextResponse.json(
      {
        success: false,
        message: "Subscribe to access premium study plans.",
      },
      { status: 403 },
    );
  return NextResponse.json({
    success: true,
    plan: await StudyPlan.findOneAndUpdate(
      {
        _id: b.id,
        userId: user!._id,
      },
      {
        done: Boolean(b.done),
      },
      {
        new: true,
      },
    ),
  });
}
