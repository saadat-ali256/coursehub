import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import ExamAttempt, {
  type IExamQuestionSnapshot,
} from "@/models/ExamAttempt";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { attemptId } = await params;
  if (!mongoose.Types.ObjectId.isValid(attemptId))
    return NextResponse.json(
      { success: false, message: "Invalid exam attempt." },
      { status: 400 },
    );

  try {
    await connectDB();
    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      userId: user!._id,
    })
      .populate("courseId", "name")
      .populate("subjectId", "name")
      .lean();
    if (!attempt)
      return NextResponse.json(
        { success: false, message: "Exam attempt not found." },
        { status: 404 },
      );

    const snapshots = attempt.questionSnapshots as IExamQuestionSnapshot[];
    const common = {
      id: String(attempt._id),
      studentDisplayName: attempt.studentDisplayName,
      course:
        typeof attempt.courseId === "object" && attempt.courseId
          ? attempt.courseId.name
          : "",
      subject:
        typeof attempt.subjectId === "object" && attempt.subjectId
          ? attempt.subjectId.name
          : "",
      status: attempt.status,
      score: attempt.score,
      percentage: attempt.percentage,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unansweredCount: attempt.unansweredCount,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timeTaken: attempt.timeTaken,
    };
    if (attempt.status === "in-progress")
      return NextResponse.json({
        success: true,
        attempt: {
          ...common,
          questions: snapshots.map(({ questionText, options, topic, difficulty }, index) => ({
            number: index + 1,
            questionText,
            options,
            topic,
            difficulty,
          })),
          answers: attempt.selectedAnswers,
        },
      });

    return NextResponse.json({
      success: true,
      attempt: {
        ...common,
        review: snapshots.map((question, index) => ({
          number: index + 1,
          questionText: question.questionText,
          options: question.options,
          selectedAnswer: attempt.selectedAnswers[index] ?? null,
          correctAnswer: question.correctAnswer,
          isCorrect:
            attempt.selectedAnswers[index] === question.correctAnswer,
          explanation: question.explanation,
          topic: question.topic,
          difficulty: question.difficulty,
        })),
      },
    });
  } catch (error) {
    console.error("Could not load exam attempt.", error);
    return NextResponse.json(
      { success: false, message: "Could not load exam attempt." },
      { status: 500 },
    );
  }
}
