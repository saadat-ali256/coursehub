/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import LearningProgress from "@/models/LearningProgress";
import Subscription from "@/models/Subscription";
import Lesson from "@/models/Lesson";
import QuizAttempt from "@/models/QuizAttempt";
import LessonBookmark from "@/models/LessonBookmark";
import StudyGoal from "@/models/StudyGoal";
import StudyPlan from "@/models/StudyPlan";
import { hasCommunityAccess } from "@/lib/community-access";
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();
  const uid = user!._id;
  const [subs, progress, attempts, bookmarks, goal, plan] = await Promise.all([
    Subscription.find({
      userId: uid,
    })
      .populate("courseId", "name thumbnail")
      .lean(),
    LearningProgress.find({
      userId: uid,
    })
      .populate("courseId", "name")
      .populate("lessonId", "title duration order")
      .sort({
        updatedAt: -1,
      })
      .lean(),
    QuizAttempt.find({
      userId: uid,
    })
      .populate("quizId", "title")
      .sort({
        submittedAt: -1,
      })
      .limit(20)
      .lean(),
    LessonBookmark.find({
      userId: uid,
    })
      .populate("lessonId", "title courseId")
      .lean(),
    StudyGoal.findOne({
      userId: uid,
    })
      .sort({
        createdAt: -1,
      })
      .lean(),
    StudyPlan.find({
      userId: uid,
    })
      .populate("lessonId", "title")
      .sort({
        scheduledFor: 1,
      })
      .limit(20)
      .lean(),
  ]);
  const activeSubscriptionStatuses = ["active", "trialing", "paid", "complete"];
  const subscribedCourseIds = subs.flatMap((subscription) => {
    if (!activeSubscriptionStatuses.includes(subscription.status)) return [];
    const course = subscription.courseId;
    return course && typeof course === "object" && "_id" in course
      ? [course._id]
      : [];
  });
  const overallCourseIds = new Map<string, (typeof subscribedCourseIds)[number]>();
  subscribedCourseIds.forEach((courseId) =>
    overallCourseIds.set(String(courseId), courseId),
  );
  progress.forEach((item) => {
    const course = item.courseId;
    const courseId =
      course && typeof course === "object" && "_id" in course
        ? course._id
        : course;
    if (courseId) overallCourseIds.set(String(courseId), courseId);
  });
  const courseIds = [...overallCourseIds.values()];
  const lessonCountRows = courseIds.length
    ? await Lesson.aggregate([
        { $match: { courseId: { $in: courseIds }, published: true } },
        { $group: { _id: "$courseId", count: { $sum: 1 } } },
      ])
    : [];
  const lessonCountByCourse = new Map(
    lessonCountRows.map((row) => [String(row._id), row.count]),
  );
  const totalLessons = lessonCountRows.reduce((total, row) => total + row.count, 0);
  const subscriptionsWithLessonCounts = subs.map((subscription) => {
    const course = subscription.courseId;
    if (!course || typeof course !== "object" || !("_id" in course)) {
      return subscription;
    }
    return {
      ...subscription,
      courseId: {
        ...course,
        lessonCount: lessonCountByCourse.get(String(course._id)) || 0,
      },
    };
  });
  const completedDates = new Set(
    progress
      .filter((item) => item.completed && item.completedAt)
      .map((item) => new Date(item.completedAt!).toISOString().slice(0, 10)),
  );
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (!completedDates.has(today.toISOString().slice(0, 10))) {
    today.setUTCDate(today.getUTCDate() - 1);
  }
  let learningStreak = 0;
  while (completedDates.has(today.toISOString().slice(0, 10))) {
    learningStreak += 1;
    today.setUTCDate(today.getUTCDate() - 1);
  }
  return NextResponse.json({
    success: true,
    user: {
      id: user!._id,
      name: user!.name,
      email: user!.email,
      role: user!.role,
      bio: user!.bio || "",
      avatarUrl: user!.avatarUrl || "",
      username: user!.username || "",
      coverImage: user!.coverImage || "",
      communityAccess: await hasCommunityAccess(user!),
    },
    subscriptions: subscriptionsWithLessonCounts,
    progress,
    totalLessons,
    quizAttempts: attempts,
    bookmarks,
    goal,
    learningStreak,
    plan,
  });
}
