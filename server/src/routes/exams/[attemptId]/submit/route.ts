import mongoose from "mongoose";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import ExamAttempt, {
  type IExamQuestionSnapshot,
} from "@/models/ExamAttempt";
import ExamSubject from "@/models/ExamSubject";
import Certificate from "@/models/Certificate";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (user!.role === "admin")
    return NextResponse.json(
      { success: false, message: "Administrators can preview exams but cannot submit them." },
      { status: 403 },
    );

  try {
    const { attemptId } = await params;
    if (!mongoose.Types.ObjectId.isValid(attemptId))
      return NextResponse.json(
        { success: false, message: "Invalid exam attempt." },
        { status: 400 },
      );
    const body = await request.json();
    if (
      !Array.isArray(body.answers) ||
      body.answers.length !== 20 ||
      body.answers.some(
        (answer: unknown) =>
          answer !== null &&
          (!Number.isInteger(answer) || (answer as number) < 0 || (answer as number) > 3),
      )
    )
      return NextResponse.json(
        { success: false, message: "Submit exactly 20 answers, each an option index from 0 to 3 or null." },
        { status: 400 },
      );

    await connectDB();
    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      userId: user!._id,
    });
    if (!attempt)
      return NextResponse.json(
        { success: false, message: "Exam attempt not found." },
        { status: 404 },
      );
    if (attempt.status !== "in-progress")
      return NextResponse.json(
        { success: false, message: "This exam attempt has already been submitted." },
        { status: 409 },
      );

    const selectedAnswers = body.answers as Array<number | null>;
    const questionSnapshots =
      attempt.questionSnapshots as unknown as IExamQuestionSnapshot[];
    let correctCount = 0;
    questionSnapshots.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) correctCount += 1;
    });
    const unansweredCount = selectedAnswers.filter((answer) => answer === null).length;
    const incorrectCount = attempt.totalQuestions - correctCount - unansweredCount;
    const score = correctCount * 5;
    const passed = score >= 75;
    const submittedAt = new Date();
    const timeTaken = Math.max(
      0,
      Math.floor((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000),
    );
    const gradedAttempt = await ExamAttempt.findOneAndUpdate(
      { _id: attempt._id, userId: user!._id, status: "in-progress" },
      {
        $set: {
          selectedAnswers,
          correctCount,
          incorrectCount,
          unansweredCount,
          score,
          percentage: score,
          status: passed ? "passed" : "failed",
          submittedAt,
          timeTaken,
        },
      },
      { new: true },
    );
    if (!gradedAttempt)
      return NextResponse.json(
        { success: false, message: "This exam attempt has already been submitted." },
        { status: 409 },
      );

    let certificate:
      | {
          certificateId: string;
          issuedAt: Date;
        }
      | undefined;
    if (passed) {
      const issueKey = `${String(user!._id)}:${String(attempt.courseId)}`;
      const existing = await Certificate.findOne({
        userId: user!._id,
        courseId: attempt.courseId,
      });
      const subject = await ExamSubject.findById(attempt.subjectId).select("name");
      let issued = existing;
      if (issued && !issued.examAttemptId) {
        issued.examAttemptId = attempt._id;
        issued.studentName = attempt.studentDisplayName;
        issued.subjectName = subject?.name || "";
        issued.score = score;
        issued.percentage = score;
        await issued.save();
      }
      if (!issued) {
        try {
          issued = await Certificate.findOneAndUpdate(
            { issueKey },
            {
              $setOnInsert: {
                issueKey,
                userId: user!._id,
                courseId: attempt.courseId,
                examAttemptId: attempt._id,
                studentName: attempt.studentDisplayName,
                subjectName: subject?.name || "",
                score,
                percentage: score,
                certificateId: `CH-${new Date().getFullYear()}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
                status: "valid",
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
        } catch (error) {
          if (!(error && typeof error === "object" && "code" in error && error.code === 11000))
            throw error;
          issued = await Certificate.findOne({ issueKey });
          if (!issued) throw error;
        }
      }
      if (!issued) throw new Error("Certificate issue could not be confirmed.");
      certificate = {
        certificateId: issued.certificateId,
        issuedAt: issued.issuedAt,
      };
    }

    return NextResponse.json({
      success: true,
      result: {
        attemptId: String(attempt._id),
        studentDisplayName: attempt.studentDisplayName,
        courseId: String(attempt.courseId),
        subjectId: String(attempt.subjectId),
        totalQuestions: attempt.totalQuestions,
        correctCount,
        incorrectCount,
        unansweredCount,
        score,
        percentage: score,
        passed,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        submittedAt,
        timeTaken,
        review: questionSnapshots.map((question, index) => ({
          number: index + 1,
          questionText: question.questionText,
          options: question.options,
          selectedAnswer: selectedAnswers[index],
          correctAnswer: question.correctAnswer,
          isCorrect: selectedAnswers[index] === question.correctAnswer,
          explanation: question.explanation,
          topic: question.topic,
          difficulty: question.difficulty,
        })),
        certificate,
      },
    });
  } catch (error) {
    console.error("Could not submit final exam.", error);
    return NextResponse.json(
      { success: false, message: "Could not submit the final exam." },
      { status: 500 },
    );
  }
}
