/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import { hasCourseAccess } from "@/lib/subscription-access";
export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  const assignment = await Assignment.findById(b.assignmentId);
  if (!assignment)
    return NextResponse.json(
      { success: false, message: "Assignment not found" },
      { status: 404 },
    );
  if (!(await hasCourseAccess(user!, String(assignment.courseId))))
    return NextResponse.json(
      {
        success: false,
        message: "Subscribe to access premium course assignments.",
      },
      { status: 403 },
    );
  return NextResponse.json(
    {
      success: true,
      submission: await AssignmentSubmission.create({
        assignmentId: b.assignmentId,
        userId: user!._id,
        text: b.text || "",
        fileUrl: b.fileUrl,
      }),
    },
    {
      status: 201,
    },
  );
}
