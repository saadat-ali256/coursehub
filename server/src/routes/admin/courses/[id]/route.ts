import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import CommunityPost from "@/models/CommunityPost";
import { syncPublishedContentPost } from "@/lib/community-content";
import { notifyStudentsAboutCourse } from "@/lib/course-notifications";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 },
    );
  await connectDB();
  const { id } = await params;
  const body = await request.json();
  if (!String(body.category || "").trim())
    return NextResponse.json(
      { success: false, message: "Select a course category first" },
      { status: 400 },
    );
  const previousCourse = await Course.findById(id);
  if (!previousCourse)
    return NextResponse.json(
      { success: false, message: "Course not found" },
      { status: 404 },
    );
  const wasPublished = previousCourse.published;
  const updates = { ...body };
  delete updates.views;
  const course = await Course.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
  if (!course) throw new Error("Course disappeared while being updated");
  const admin = await getCurrentUser();
  if (admin) {
    await syncPublishedContentPost({
      sourceType: "course",
      sourceId: String(course._id),
      userId: admin._id,
      title: course.name,
      summary: course.description,
      url: `/courses/${course._id}`,
      imageUrl: course.thumbnail,
      published: course.published,
    });
  }
  let notificationWarning: string | undefined;
  let notificationCount = 0;
  if (!wasPublished && course.published) {
    try {
      notificationCount = await notifyStudentsAboutCourse(course);
    } catch (error) {
      console.error("Failed to notify students about the newly published course", error);
      notificationWarning =
        "The course was published, but in-app notifications could not be saved.";
    }
  }
  return NextResponse.json({
    success: true,
    course,
    notificationCount,
    notificationWarning,
  });
}
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 },
    );
  await connectDB();
  const { id } = await params;
  await Lesson.deleteMany({ courseId: id });
  const course = await Course.findByIdAndDelete(id);
  if (!course)
    return NextResponse.json(
      { success: false, message: "Course not found" },
      { status: 404 },
    );
  await CommunityPost.deleteOne({
    sourceType: "course",
    sourceId: String(course._id),
  });
  return NextResponse.json({ success: true });
}
