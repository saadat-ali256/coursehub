import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ExamQuestion from "@/models/ExamQuestion";
import ExamSubject from "@/models/ExamSubject";

export async function GET() {
  try {
    await connectDB();
    const subjects = await ExamSubject.find({ isActive: true })
      .select("name slug category description sortOrder")
      .sort({ category: 1, sortOrder: 1, name: 1 })
      .lean();
    const counts = await ExamQuestion.aggregate([
      {
        $match: {
          isActive: true,
          subjectId: { $in: subjects.map((subject) => subject._id) },
        },
      },
      { $group: { _id: "$subjectId", count: { $sum: 1 } } },
    ]);
    const questionCounts = new Map(
      counts.map((entry) => [String(entry._id), entry.count as number]),
    );
    return NextResponse.json({
      success: true,
      subjects: subjects.map((subject) => {
        const questionCount = questionCounts.get(String(subject._id)) || 0;
        return {
          ...subject,
          questionCount,
          examAvailable: questionCount >= 20,
        };
      }),
    });
  } catch (error) {
    console.error("Could not load exam subjects.", error);
    return NextResponse.json(
      { success: false, message: "Could not load exam subjects." },
      { status: 500 },
    );
  }
}
