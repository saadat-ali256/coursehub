import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import CourseAccess from "@/models/CourseAccess";
import Course from "@/models/Course";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;

    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 },
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 },
      );
    }

    await connectDB();

    // Check karo course exist karta hai ya nahi
    const course = await Course.findById(id);

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found",
        },
        { status: 404 },
      );
    }

    // Pehle se access record hai?
    let courseAccess = await CourseAccess.findOne({
      userId: user._id,
      courseId: course._id,
    });

    if (courseAccess) {
      courseAccess.access = true;
      courseAccess.grantedAt = new Date();

      await courseAccess.save();
    } else {
      courseAccess = await CourseAccess.create({
        userId: user._id,
        courseId: course._id,
        access: true,
        grantedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Course access granted",
      access: courseAccess,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to grant course access",
      },
      { status: 500 },
    );
  }
}
