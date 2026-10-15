/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import StudyGoal from "@/models/StudyGoal";
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();
  return NextResponse.json({
    success: true,
    goal: await StudyGoal.findOne({
      userId: user!._id,
    }).sort({
      createdAt: -1,
    }),
  });
}
export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const b = await req.json();
  const targetMinutes = Number(b.targetMinutes);
  const targetLessons = Number(b.targetLessons);
  if (
    !Number.isInteger(targetMinutes) ||
    targetMinutes < 1 ||
    targetMinutes > 10080 ||
    !Number.isInteger(targetLessons) ||
    targetLessons < 1 ||
    targetLessons > 500
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Set weekly goals between 1 and 10,080 minutes and 1 and 500 lessons.",
      },
      { status: 400 },
    );
  }
  await connectDB();
  const weekStart = new Date();
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  let goal = await StudyGoal.findOne({ userId: user!._id });
  if (!goal) {
    goal = await StudyGoal.create({
      userId: user!._id,
      title: b.title || "Weekly learning goal",
      targetMinutes,
      targetLessons,
      weekStart,
    });
  } else {
    if (goal.weekStart < weekStart) {
      goal.minutesDone = 0;
      goal.lessonsDone = 0;
    }
    goal.title = b.title || "Weekly learning goal";
    goal.targetMinutes = targetMinutes;
    goal.targetLessons = targetLessons;
    goal.weekStart = weekStart;
    await goal.save();
  }
  return NextResponse.json({
    success: true,
    goal,
  });
}
