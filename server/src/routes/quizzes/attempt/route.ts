/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import Quiz from "@/models/Quiz";
import type { IQuizQuestion } from "@/models/Quiz";
import QuizAttempt from "@/models/QuizAttempt";
import { hasCourseAccess } from "@/lib/subscription-access";
export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  const quiz = await Quiz.findById(b.quizId);
  if (!quiz)
    return NextResponse.json(
      {
        success: false,
        message: "Quiz not found",
      },
      {
        status: 404,
      },
    );
  if (!(await hasCourseAccess(user!, String(quiz.courseId))))
    return NextResponse.json(
      {
        success: false,
        message: "Subscribe to access premium course quizzes.",
      },
      { status: 403 },
    );
  const attempts = await QuizAttempt.countDocuments({
    quizId: quiz._id,
    userId: user!._id,
  });
  if (attempts >= quiz.maxAttempts)
    return NextResponse.json(
      {
        success: false,
        message: "Maximum attempts reached",
      },
      {
        status: 400,
      },
    );
  const answers: Array<number[]> = Array.isArray(b.answers) ? b.answers : [];
  let score = 0,
    total = quiz.questions.reduce(
      (n: number, q: IQuizQuestion) => n + q.points,
      0,
    );
  quiz.questions.forEach((q: IQuizQuestion, i: number) => {
    const a = [...(answers[i] || [])].sort((a, b) => a - b);
    const c = [...q.answers].sort((a, b) => a - b);
    if (JSON.stringify(a) === JSON.stringify(c)) score += q.points;
  });
  const percent = total ? Math.round((score / total) * 100) : 0;
  const passed = percent >= quiz.passPercent;
  const attempt = await QuizAttempt.create({
    quizId: quiz._id,
    userId: user!._id,
    answers,
    score,
    percent,
    passed,
    attempt: attempts + 1,
    submittedAt: new Date(),
  });
  return NextResponse.json({
    success: true,
    result: {
      score,
      total,
      percent,
      passed,
      attempt,
    },
  });
}
