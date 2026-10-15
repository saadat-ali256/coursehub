/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser, requireAdmin } from "@/lib/api-helpers";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import { hasCourseAccess } from "@/lib/subscription-access";
export async function GET(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();
  const courseId = new URL(req.url).searchParams.get("courseId");
  const assignments = await Assignment.find(
    courseId ? { courseId } : {},
  )
    .sort({ createdAt: -1 })
    .lean();
  const accessibleAssignments = [];
  for (const assignment of assignments) {
    if (await hasCourseAccess(user!, String(assignment.courseId))) {
      accessibleAssignments.push(assignment);
    }
  }
  return NextResponse.json({
    success: true,
    assignments: accessibleAssignments,
    submissions: await AssignmentSubmission.find({
      userId: user!._id,
    })
      .sort({
        submittedAt: -1,
      })
      .lean(),
  });
}
export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  await connectDB();
  return NextResponse.json(
    {
      success: true,
      assignment: await Assignment.create(await req.json()),
    },
    {
      status: 201,
    },
  );
}
export async function PATCH(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  return NextResponse.json({
    success: true,
    assignment: await Assignment.findByIdAndUpdate(b.id, b, {
      new: true,
    }),
  });
}
export async function DELETE(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  await connectDB();
  await Assignment.findByIdAndDelete(new URL(req.url).searchParams.get("id"));
  return NextResponse.json({
    success: true,
  });
}
