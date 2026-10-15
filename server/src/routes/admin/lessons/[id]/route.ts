/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { isAdmin } from "@/lib/auth";
import Lesson from "@/models/Lesson";
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  if (!(await isAdmin()))
    return NextResponse.json(
      {
        success: false,
        message: "Admin access required",
      },
      {
        status: 403,
      },
    );
  await connectDB();
  const { id } = await params;
  const lesson = await Lesson.findByIdAndUpdate(id, await request.json(), {
    new: true,
    runValidators: true,
  });
  if (!lesson)
    return NextResponse.json(
      {
        success: false,
        message: "Lesson not found",
      },
      {
        status: 404,
      },
    );
  return NextResponse.json({
    success: true,
    lesson,
  });
}
export async function DELETE(
  _: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  if (!(await isAdmin()))
    return NextResponse.json(
      {
        success: false,
        message: "Admin access required",
      },
      {
        status: 403,
      },
    );
  await connectDB();
  const { id } = await params;
  await Lesson.findByIdAndDelete(id);
  return NextResponse.json({
    success: true,
  });
}
