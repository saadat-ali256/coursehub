/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import CourseComment from "@/models/CourseComment";
import { hasCourseAccess } from "@/lib/subscription-access";
export async function GET(
  _r: Request,
  c: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 },
      );
    const { id } = await c.params;
    if (!(await hasCourseAccess(user, id)))
      return NextResponse.json(
        {
          success: false,
          message: "Subscribe to access premium course comments.",
        },
        { status: 403 },
      );
    await connectDB();
    const comments = await CourseComment.find({
      courseId: id,
    })
      .sort({
        createdAt: -1,
      })
      .populate("userId", "name");
    return NextResponse.json({
      success: true,
      comments,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load comments",
      },
      {
        status: 500,
      },
    );
  }
}
export async function POST(
  r: Request,
  c: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        {
          success: false,
          message: "Login required",
        },
        {
          status: 401,
        },
      );
    const { id } = await c.params;
    if (!(await hasCourseAccess(user, id)))
      return NextResponse.json(
        {
          success: false,
          message: "Subscribe to access premium course features.",
        },
        { status: 403 },
      );
    const body = await r.json();
    const text = String(body.text || "").trim();
    if (!text)
      return NextResponse.json(
        {
          success: false,
          message: "Comment is required",
        },
        {
          status: 400,
        },
      );
    await connectDB();
    const comment = await CourseComment.create({
      courseId: id,
      userId: user._id,
      text,
    });
    const populated = await comment.populate("userId", "name");
    return NextResponse.json(
      {
        success: true,
        comment: populated,
      },
      {
        status: 201,
      },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to add comment",
      },
      {
        status: 500,
      },
    );
  }
}
