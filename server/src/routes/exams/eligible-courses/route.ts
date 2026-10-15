import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import Course from "@/models/Course";
import ExamAttempt from "@/models/ExamAttempt";
import LearningProgress from "@/models/LearningProgress";
import Lesson from "@/models/Lesson";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  try {
    await connectDB();
    const completedCourseIds = await LearningProgress.distinct("courseId", {
      userId: user!._id,
      completed: true,
    });
    if (!completedCourseIds.length)
      return NextResponse.json({ success: true, courses: [] });

    const requiredLessons = await Lesson.find({
      courseId: { $in: completedCourseIds },
      published: true,
      required: true,
    })
      .select("_id courseId")
      .lean();
    const lessonsByCourse = new Map<
      string,
      { lessonIds: typeof requiredLessons; completedCount: number }
    >();
    requiredLessons.forEach((lesson) => {
      const courseId = String(lesson.courseId);
      if (!lessonsByCourse.has(courseId))
        lessonsByCourse.set(courseId, { lessonIds: [], completedCount: 0 });
      lessonsByCourse.get(courseId)!.lessonIds.push(lesson);
    });
    const completedLessonIds = await LearningProgress.distinct("lessonId", {
      userId: user!._id,
      completed: true,
      lessonId: { $in: requiredLessons.map((lesson) => lesson._id) },
    });
    const completedLessonSet = new Set(completedLessonIds.map(String));
    lessonsByCourse.forEach((data) => {
      data.completedCount = data.lessonIds.filter((lesson) =>
        completedLessonSet.has(String(lesson._id)),
      ).length;
    });
    const eligibleIds = [...lessonsByCourse.entries()]
      .filter(([, data]) =>
        data.lessonIds.length > 0 &&
        data.completedCount === data.lessonIds.length,
      )
      .map(([courseId]) => courseId);
    if (!eligibleIds.length)
      return NextResponse.json({ success: true, courses: [] });

    const [courses, attempts] = await Promise.all([
      Course.find({ _id: { $in: eligibleIds } })
        .select("name thumbnail")
        .lean(),
      ExamAttempt.find({ userId: user!._id, courseId: { $in: eligibleIds } })
        .populate("subjectId", "name")
        .sort({ createdAt: -1 })
        .select("courseId subjectId status score percentage attemptNumber createdAt")
        .lean(),
    ]);
    const attemptsByCourse = new Map<string, typeof attempts>();
    attempts.forEach((attempt) => {
      const courseId = String(attempt.courseId);
      if (!attemptsByCourse.has(courseId)) attemptsByCourse.set(courseId, []);
      attemptsByCourse.get(courseId)!.push(attempt);
    });

    return NextResponse.json({
      success: true,
      courses: courses.map((course) => ({
        id: String(course._id),
        name: course.name,
        thumbnail: course.thumbnail || "",
        attempts: (attemptsByCourse.get(String(course._id)) || []).map(
          (attempt) => ({
            id: String(attempt._id),
            subject:
              typeof attempt.subjectId === "object" && attempt.subjectId
                ? attempt.subjectId.name
                : "Exam",
            status: attempt.status,
            score: attempt.score,
            percentage: attempt.percentage,
            attemptNumber: attempt.attemptNumber,
            createdAt: attempt.createdAt,
          }),
        ),
      })),
    });
  } catch (error) {
    console.error("Could not load exam-eligible courses.", error);
    return NextResponse.json(
      { success: false, message: "Could not load completed courses." },
      { status: 500 },
    );
  }
}
