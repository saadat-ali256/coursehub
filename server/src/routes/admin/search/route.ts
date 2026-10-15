import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { connectDB } from "@/lib/mongodb";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import User from "@/models/User";

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2) {
    return NextResponse.json({ success: true, results: [] });
  }

  await connectDB();
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "i");

  const [users, courses, lessons] = await Promise.all([
    User.find({ $or: [{ name: pattern }, { email: pattern }] })
      .select("name email")
      .limit(5)
      .lean(),
    Course.find({ $or: [{ name: pattern }, { category: pattern }] })
      .select("name category")
      .limit(5)
      .lean(),
    Lesson.find({ title: pattern })
      .select("title courseId")
      .limit(5)
      .lean(),
  ]);

  const results = [
    ...users.map((user) => ({
      id: String(user._id),
      kind: "User",
      label: user.name,
      detail: user.email,
      href: "/admin/users",
    })),
    ...courses.map((course) => ({
      id: String(course._id),
      kind: "Course",
      label: course.name,
      detail: course.category || "Course",
      href: "/admin/courses",
    })),
    ...lessons.map((lesson) => ({
      id: String(lesson._id),
      kind: "Lesson",
      label: lesson.title,
      detail: "Course lesson",
      href: "/admin/lessons",
    })),
  ];

  return NextResponse.json({ success: true, results });
}
