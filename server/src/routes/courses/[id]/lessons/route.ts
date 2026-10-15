import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import Lesson from "@/models/Lesson";
import { hasCourseAccess } from "@/lib/subscription-access";

// GET → Course ke lessons lana
export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;

    const user = await getCurrentUser();

    await connectDB();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 },
      );
    }

    if (!(await hasCourseAccess(user, id))) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have access to this course",
          hasAccess: false,
        },
        { status: 403 },
      );
    }

    const lessons = await Lesson.find({ courseId: id, published: true }).sort({
      order: 1,
    });

    return NextResponse.json({
      success: true,
      lessons,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get lessons",
      },
      { status: 500 },
    );
  }
}

// POST → New lesson create karna
export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;

    // Only admins can create lessons from the CMS.
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 },
      );
    }

    // MongoDB connect
    await connectDB();

    // Request body
    const body = await request.json();
    const missing = [
      !String(body.courseId || id).trim() && "course",
      !String(body.category || "").trim() && "category",
      !String(body.title || "").trim() && "title",
      !String(body.description || "").trim() && "description",
      !String(body.content || "").trim() && "content",
      (!Number.isInteger(Number(body.order)) || Number(body.order) < 1) &&
        "lesson order",
    ].filter(Boolean);
    if (missing.length)
      return NextResponse.json(
        {
          success: false,
          message: `Please provide the required lesson fields: ${missing.join(", ")}.`,
        },
        { status: 400 },
      );

    // Create lesson
    const lesson = await Lesson.create({
      courseId: id,
      title: body.title,
      description: body.description,
      content: body.content,
      category: String(body.category || "").trim(),
      order: body.order,
      type: body.type || "article",
      duration: body.duration || 10,
      published: body.published !== false,
      preview: body.preview === true,
      visibility: body.visibility === "public" ? "public" : "premium",
      thumbnail: body.thumbnail || "",
      live: body.live === true,
      meetingUrl: body.meetingUrl || "",
      videoUrl: body.videoUrl || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Lesson created successfully",
      lesson,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create lesson",
      },
      { status: 500 },
    );
  }
}
