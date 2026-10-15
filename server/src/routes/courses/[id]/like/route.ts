/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import CourseLike from "@/models/CourseLike";
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
        {
          success: false,
          message: "Login required",
        },
        { status: 401 },
      );
    const { id } = await c.params;
    if (!(await hasCourseAccess(user, id)))
      return NextResponse.json(
        {
          success: false,
          message: "Subscribe to access premium course likes.",
        },
        { status: 403 },
      );
    await connectDB();
    const count = await CourseLike.countDocuments({ courseId: id });
    const liked = !!(await CourseLike.exists({
      courseId: id,
      userId: user._id,
    }));
    return NextResponse.json({
      success: true,
      count,
      liked,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load likes",
      },
      {
        status: 500,
      },
    );
  }
}
export async function POST(
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
    await connectDB();
    const old = await CourseLike.findOne({
      courseId: id,
      userId: user._id,
    });
    if (old) await old.deleteOne();
    else
      await CourseLike.create({
        courseId: id,
        userId: user._id,
      });
    return NextResponse.json({
      success: true,
      liked: !old,
      count: await CourseLike.countDocuments({
        courseId: id,
      }),
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update like",
      },
      {
        status: 500,
      },
    );
  }
}
