/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser, requireAdmin } from "@/lib/api-helpers";
import Quiz from "@/models/Quiz";
import type { IQuizQuestion } from "@/models/Quiz";
import QuizAttempt from "@/models/QuizAttempt";
import { hasCourseAccess } from "@/lib/subscription-access";
export async function GET(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();
  const u = new URL(req.url),
    courseId = u.searchParams.get("courseId"),
    id = u.searchParams.get("id");
  if (id) {
    const q = await Quiz.findById(id).lean();
    if (!q)
      return NextResponse.json(
        {
          success: false,
          message: "Quiz not found",
        },
        {
          status: 404,
        },
      );
    if (!(await hasCourseAccess(user!, String(q.courseId))))
      return NextResponse.json(
        {
          success: false,
          message: "Subscribe to access premium course quizzes.",
        },
        { status: 403 },
      );
    return NextResponse.json({
      success: true,
      quiz: {
        ...q,
        questions: q.questions.map((x: IQuizQuestion) => ({
          ...x,
          answers: undefined,
        })),
      },
    });
  }
  const quizzes = await Quiz.find(
    courseId
      ? {
          courseId,
          published: true,
        }
      : {
          published: true,
        },
  )
    .select(
      "title description courseId lessonId passPercent timeLimit maxAttempts questions",
    )
    .lean();
  const accessibleQuizzes = [];
  for (const quiz of quizzes) {
    if (await hasCourseAccess(user!, String(quiz.courseId))) {
      accessibleQuizzes.push(quiz);
    }
  }
  return NextResponse.json({
    success: true,
    quizzes: accessibleQuizzes,
  });
}
export async function POST(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  return NextResponse.json(
    {
      success: true,
      quiz: await Quiz.create(b),
    },
    {
      status: 201,
    },
  );
}
export async function PATCH(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const b = await req.json();
  await connectDB();
  return NextResponse.json({
    success: true,
    quiz: await Quiz.findByIdAndUpdate(b.id, b, {
      new: true,
    }),
  });
}
export async function DELETE(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const id = new URL(req.url).searchParams.get("id");
  await connectDB();
  await Quiz.findByIdAndDelete(id);
  return NextResponse.json({
    success: true,
  });
}
