import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { syncPublishedContentPost } from "@/lib/community-content";
import { notifyStudentsAboutCourse } from "@/lib/course-notifications";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 },
    );
  await connectDB();
  const courses = await Course.find().sort({ createdAt: -1 }).lean();
  const counts = await Lesson.aggregate([
    { $group: { _id: "$courseId", count: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((x) => [String(x._id), x.count]));
  return NextResponse.json({
    success: true,
    courses: courses.map((c) => ({
      ...c,
      lessonCount: map.get(String(c._id)) || 0,
    })),
  });
}

export async function POST(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 },
    );
  try {
    const body = await request.json();
    const price = Number(body.price);
    if (
      !String(body.name || "").trim() ||
      !String(body.description || "").trim() ||
      String(body.price ?? "").trim() === "" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !String(body.category || "").trim()
    )
      return NextResponse.json(
        {
          success: false,
          message:
            "Course name, description, a valid non-negative price and category are required.",
        },
        { status: 400 },
      );
    await connectDB();
    const user = await getCurrentUser();
    const slug =
      body.slug ||
      String(body.name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    const course = await Course.create({
      ...body,
      name: String(body.name).trim(),
      description: String(body.description).trim(),
      slug,
      price,
      views: 0,
    });
    if (user) {
      await syncPublishedContentPost({
        sourceType: "course",
        sourceId: String(course._id),
        userId: user._id,
        title: course.name,
        summary: course.description,
        url: `/courses/${course._id}`,
        imageUrl: course.thumbnail,
        published: course.published,
      });
    }
    let notificationCount = 0;
    let notificationWarning: string | undefined;
    if (course.published) {
      try {
        const result = await notifyStudentsAboutCourse(course);
        notificationCount = result;
      } catch (error) {
        console.error("Failed to notify students about the new course", error);
        notificationWarning =
          "The course was created, but in-app notifications could not be saved.";
      }
    }
    return NextResponse.json(
      {
        success: true,
        course,
        notificationCount,
        notificationWarning,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to create course" },
      { status: 500 },
    );
  }
}
