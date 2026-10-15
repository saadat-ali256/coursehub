import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { isAdmin } from "@/lib/auth";
import Course from "@/models/Course";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    // URL se course ID lena
    const { id } = await context.params;

    // MongoDB connect
    await connectDB();

    // Course links may use either the database ID or its public slug.
    let course = mongoose.Types.ObjectId.isValid(id)
      ? await Course.findById(id)
      : null;
    if (!course) course = await Course.findOne({ slug: id });

    // Course nahi mila
    if (!course || (!course.published && !(await isAdmin()))) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found",
        },
        { status: 404 },
      );
    }

    if (course.published) {
      await Course.updateOne(
        { _id: course._id, published: true },
        { $inc: { views: 1 } },
      );
    }

    // Course frontend ko bhejna
    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get course",
      },
      { status: 500 },
    );
  }
}
