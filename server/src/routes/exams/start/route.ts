import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import { hasCourseAccess } from "@/lib/subscription-access";
import Course from "@/models/Course";
import ExamAttempt, { type IExamQuestionSnapshot } from "@/models/ExamAttempt";
import ExamQuestion from "@/models/ExamQuestion";
import ExamSubject from "@/models/ExamSubject";
import LearningProgress from "@/models/LearningProgress";
import Lesson from "@/models/Lesson";

const QUESTION_COUNT = 20;
const MAX_ATTEMPTS = 3;

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (user!.role === "admin")
    return NextResponse.json(
      { success: false, message: "Administrators can preview exams but cannot take them." },
      { status: 403 },
    );

  try {
    const body = await request.json();
    const courseId = String(body.courseId || "");
    const subjectId = String(body.subjectId || "");
    const studentDisplayName = String(body.studentDisplayName || "")
      .trim()
      .replace(/\s+/g, " ");
    if (
      !mongoose.Types.ObjectId.isValid(courseId) ||
      !mongoose.Types.ObjectId.isValid(subjectId)
    )
      return NextResponse.json(
        { success: false, message: "Select a valid course and exam subject." },
        { status: 400 },
      );
    if (studentDisplayName.length < 2 || studentDisplayName.length > 100)
      return NextResponse.json(
        { success: false, message: "Enter a name between 2 and 100 characters." },
        { status: 400 },
      );

    await connectDB();
    const [course, subject] = await Promise.all([
      Course.findById(courseId).select("_id name"),
      ExamSubject.findOne({ _id: subjectId, isActive: true }).select("_id name"),
    ]);
    if (!course)
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 },
      );
    if (!subject)
      return NextResponse.json(
        { success: false, message: "Exam subject is not available." },
        { status: 404 },
      );
    if (!(await hasCourseAccess(user!, courseId)))
      return NextResponse.json(
        { success: false, message: "Course access is required to take its final exam." },
        { status: 403 },
      );

    const requiredLessons = await Lesson.find({
      courseId,
      published: true,
      required: true,
    })
      .select("_id")
      .lean();
    if (!requiredLessons.length)
      return NextResponse.json(
        { success: false, message: "This course has no required lessons to certify." },
        { status: 400 },
      );
    const completedLessons = await LearningProgress.countDocuments({
      userId: user!._id,
      courseId,
      lessonId: { $in: requiredLessons.map((lesson) => lesson._id) },
      completed: true,
    });
    if (completedLessons < requiredLessons.length)
      return NextResponse.json(
        { success: false, message: "Complete all required course lessons before taking the final exam." },
        { status: 400 },
      );

    const attempts = await ExamAttempt.countDocuments({
      userId: user!._id,
      courseId,
      subjectId,
    });
    if (attempts >= MAX_ATTEMPTS)
      return NextResponse.json(
        { success: false, message: "You have reached the maximum of three attempts for this course and subject." },
        { status: 400 },
      );

    const bank = await ExamQuestion.find({ subjectId, isActive: true }).lean();
    if (bank.length < QUESTION_COUNT)
      return NextResponse.json(
        { success: false, message: "This subject does not have enough questions yet." },
        { status: 409 },
      );

    const snapshots = shuffle(bank)
      .slice(0, QUESTION_COUNT)
      .map(
        (question): IExamQuestionSnapshot => {
          const optionOrder = shuffle([0, 1, 2, 3]);
          return {
            questionId: question._id,
            questionText: question.questionText,
            options: optionOrder.map((index) => question.options[index]),
            correctAnswer: optionOrder.indexOf(question.correctAnswer),
            explanation: question.explanation,
            difficulty: question.difficulty,
            topic: question.topic,
          };
        },
      );
    const attempt = await ExamAttempt.create({
      userId: user!._id,
      courseId,
      subjectId,
      studentDisplayName,
      questionSnapshots: snapshots,
      selectedAnswers: Array<number | null>(QUESTION_COUNT).fill(null),
      totalQuestions: QUESTION_COUNT,
      attemptNumber: attempts + 1,
    });

    return NextResponse.json(
      {
        success: true,
        attemptId: String(attempt._id),
        course: { id: String(course._id), name: course.name },
        subject: { id: String(subject._id), name: subject.name },
        studentDisplayName,
        attemptNumber: attempt.attemptNumber,
        attemptsRemaining: MAX_ATTEMPTS - attempt.attemptNumber,
        startedAt: attempt.startedAt,
        totalQuestions: QUESTION_COUNT,
        questions: snapshots.map(({ questionText, options, topic, difficulty }, index) => ({
          number: index + 1,
          questionText,
          options,
          topic,
          difficulty,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      return NextResponse.json(
        { success: false, message: "An exam attempt is already being created. Please try again." },
        { status: 409 },
      );
    console.error("Could not start final exam.", error);
    return NextResponse.json(
      { success: false, message: "Could not start the final exam." },
      { status: 500 },
    );
  }
}
