import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/api-helpers";
import Certificate from "@/models/Certificate";
import ExamAttempt from "@/models/ExamAttempt";
import ExamQuestion from "@/models/ExamQuestion";
import ExamSubject from "@/models/ExamSubject";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    await connectDB();
    const [subjects, totalAttempts, passedAttempts, certificates, attempts] =
      await Promise.all([
        ExamSubject.find().sort({ category: 1, sortOrder: 1, name: 1 }).lean(),
        ExamAttempt.countDocuments(),
        ExamAttempt.countDocuments({ status: "passed" }),
        Certificate.countDocuments({ examAttemptId: { $exists: true } }),
        ExamAttempt.find()
          .populate("userId", "name email")
          .populate("courseId", "name")
          .populate("subjectId", "name")
          .sort({ createdAt: -1 })
          .limit(100)
          .select("userId courseId subjectId studentDisplayName status score attemptNumber startedAt submittedAt createdAt")
          .lean(),
      ]);
    const subjectIds = subjects.map((subject) => subject._id);
    const counts = await ExamQuestion.aggregate([
      { $match: { subjectId: { $in: subjectIds } } },
      {
        $group: {
          _id: "$subjectId",
          total: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
        },
      },
    ]);
    const questionCounts = new Map(
      counts.map((entry) => [
        String(entry._id),
        { total: entry.total as number, active: entry.active as number },
      ]),
    );
    return NextResponse.json({
      success: true,
      stats: {
        subjects: subjects.length,
        activeSubjects: subjects.filter((subject) => subject.isActive).length,
        totalAttempts,
        passedAttempts,
        passRate: totalAttempts
          ? Math.round((passedAttempts / totalAttempts) * 100)
          : 0,
        certificates,
      },
      subjects: subjects.map((subject) => ({
        ...subject,
        questionCount: questionCounts.get(String(subject._id))?.total || 0,
        activeQuestionCount: questionCounts.get(String(subject._id))?.active || 0,
      })),
      attempts: attempts.map((attempt) => ({
        id: String(attempt._id),
        studentName:
          attempt.studentDisplayName ||
          (typeof attempt.userId === "object" && attempt.userId
            ? attempt.userId.name
            : "Unknown student"),
        studentEmail:
          typeof attempt.userId === "object" && attempt.userId
            ? attempt.userId.email
            : "",
        course:
          typeof attempt.courseId === "object" && attempt.courseId
            ? attempt.courseId.name
            : "Deleted course",
        subject:
          typeof attempt.subjectId === "object" && attempt.subjectId
            ? attempt.subjectId.name
            : "Deleted subject",
        status: attempt.status,
        score: attempt.score,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
      })),
    });
  } catch (error) {
    console.error("Could not load admin exam management data.", error);
    return NextResponse.json(
      { success: false, message: "Could not load exams and certificates." },
      { status: 500 },
    );
  }
}

function validateSubject(body: Record<string, unknown>) {
  const name = String(body.name || "").trim().replace(/\s+/g, " ");
  const category = String(body.category || "").trim().replace(/\s+/g, " ");
  const description = String(body.description || "").trim();
  const slug = String(body.slug || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!name || name.length > 80)
    return { error: "Subject name must be 1-80 characters." };
  if (!category || category.length > 80)
    return { error: "Category must be 1-80 characters." };
  if (description.length > 500)
    return { error: "Description must be no more than 500 characters." };
  if (!slug || slug.length > 100)
    return { error: "Subject slug is invalid." };
  return { value: { name, category, description, slug } };
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validated = validateSubject(body);
    if (validated.error)
      return NextResponse.json(
        { success: false, message: validated.error },
        { status: 400 },
      );
    await connectDB();
    const subject = await ExamSubject.create({
      ...validated.value,
      isActive: body.isActive !== false,
      sortOrder: Number.isInteger(body.sortOrder) ? body.sortOrder : 0,
    });
    return NextResponse.json({ success: true, subject }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000)
      return NextResponse.json(
        { success: false, message: "A subject with this name/slug already exists." },
        { status: 409 },
      );
    console.error("Could not create exam subject.", error);
    return NextResponse.json(
      { success: false, message: "Could not create exam subject." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || "");
    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json(
        { success: false, message: "Valid subject ID required." },
        { status: 400 },
      );
    const validated = validateSubject(body);
    if (validated.error)
      return NextResponse.json(
        { success: false, message: validated.error },
        { status: 400 },
      );
    if (typeof body.isActive !== "boolean")
      return NextResponse.json(
        { success: false, message: "Subject status is required." },
        { status: 400 },
      );
    await connectDB();
    const subject = await ExamSubject.findByIdAndUpdate(
      id,
      {
        ...validated.value,
        isActive: body.isActive,
        ...(Number.isInteger(body.sortOrder) ? { sortOrder: body.sortOrder } : {}),
      },
      { new: true, runValidators: true },
    );
    if (!subject)
      return NextResponse.json(
        { success: false, message: "Exam subject not found." },
        { status: 404 },
      );
    return NextResponse.json({ success: true, subject });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000)
      return NextResponse.json(
        { success: false, message: "A subject with this name/slug already exists." },
        { status: 409 },
      );
    console.error("Could not update exam subject.", error);
    return NextResponse.json(
      { success: false, message: "Could not update exam subject." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json(
        { success: false, message: "Valid subject ID required." },
        { status: 400 },
      );
    await connectDB();
    const subject = await ExamSubject.findById(id);
    if (!subject)
      return NextResponse.json(
        { success: false, message: "Exam subject not found." },
        { status: 404 },
      );
    if (await ExamAttempt.exists({ subjectId: subject._id }))
      return NextResponse.json(
        { success: false, message: "This subject has exam history. Disable it instead to preserve student results." },
        { status: 409 },
      );
    await ExamQuestion.deleteMany({ subjectId: subject._id });
    await subject.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not delete exam subject.", error);
    return NextResponse.json(
      { success: false, message: "Could not delete exam subject." },
      { status: 500 },
    );
  }
}
