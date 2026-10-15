import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/api-helpers";
import ExamAttempt from "@/models/ExamAttempt";
import ExamQuestion from "@/models/ExamQuestion";
import ExamSubject from "@/models/ExamSubject";

const difficulties = new Set(["beginner", "intermediate", "advanced"]);

function validateQuestion(body: Record<string, unknown>) {
  const subjectId = String(body.subjectId || "");
  const questionText = String(body.questionText || "").trim();
  const options = Array.isArray(body.options)
    ? body.options.map((option) => String(option).trim())
    : [];
  const correctAnswer = Number(body.correctAnswer);
  const explanation = String(body.explanation || "").trim();
  const topic = String(body.topic || "").trim();
  const difficulty = String(body.difficulty || "");
  if (!mongoose.Types.ObjectId.isValid(subjectId))
    return { error: "Select a valid exam subject." };
  if (!questionText || questionText.length > 1000)
    return { error: "Question text must be 1-1000 characters." };
  if (options.length !== 4 || options.some((option) => !option || option.length > 500))
    return { error: "Provide exactly four non-empty options (maximum 500 characters each)." };
  if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3)
    return { error: "Select the correct answer." };
  if (!explanation || explanation.length > 1000)
    return { error: "Explanation must be 1-1000 characters." };
  if (!topic || topic.length > 100)
    return { error: "Topic must be 1-100 characters." };
  if (!difficulties.has(difficulty))
    return { error: "Select a valid question difficulty." };
  return {
    value: {
      subjectId,
      questionText,
      options,
      correctAnswer,
      explanation,
      topic,
      difficulty,
      isActive: body.isActive !== false,
    },
  };
}

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const subjectId = new URL(request.url).searchParams.get("subjectId") || "";
  if (!mongoose.Types.ObjectId.isValid(subjectId))
    return NextResponse.json(
      { success: false, message: "Valid subject ID required." },
      { status: 400 },
    );
  try {
    await connectDB();
    const subject = await ExamSubject.findById(subjectId).select("name");
    if (!subject)
      return NextResponse.json(
        { success: false, message: "Exam subject not found." },
        { status: 404 },
      );
    const [questions, questionsInAttempts] = await Promise.all([
      ExamQuestion.find({ subjectId }).sort({ createdAt: -1 }).lean(),
      ExamAttempt.distinct("questionSnapshots.questionId", { subjectId }),
    ]);
    const usedQuestionIds = new Set(questionsInAttempts.map(String));
    return NextResponse.json({
      success: true,
      questions: questions.map((question) => ({
        ...question,
        hasAttemptHistory: usedQuestionIds.has(String(question._id)),
      })),
    });
  } catch (error) {
    console.error("Could not load exam questions.", error);
    return NextResponse.json(
      { success: false, message: "Could not load exam questions." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validated = validateQuestion(body);
    if (validated.error)
      return NextResponse.json(
        { success: false, message: validated.error },
        { status: 400 },
      );
    if (!validated.value)
      return NextResponse.json(
        { success: false, message: "Invalid question data." },
        { status: 400 },
      );
    await connectDB();
    if (!(await ExamSubject.exists({ _id: validated.value.subjectId })))
      return NextResponse.json(
        { success: false, message: "Exam subject not found." },
        { status: 404 },
      );
    const question = await ExamQuestion.create(validated.value);
    return NextResponse.json({ success: true, question }, { status: 201 });
  } catch (error) {
    console.error("Could not create exam question.", error);
    return NextResponse.json(
      { success: false, message: "Could not create exam question." },
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
        { success: false, message: "Valid question ID required." },
        { status: 400 },
      );
    const validated = validateQuestion(body);
    if (validated.error)
      return NextResponse.json(
        { success: false, message: validated.error },
        { status: 400 },
      );
    if (!validated.value)
      return NextResponse.json(
        { success: false, message: "Invalid question data." },
        { status: 400 },
      );
    await connectDB();
    const questionExists = await ExamQuestion.exists({ _id: id });
    if (!questionExists)
      return NextResponse.json(
        { success: false, message: "Exam question not found." },
        { status: 404 },
      );
    if (!(await ExamSubject.exists({ _id: validated.value.subjectId })))
      return NextResponse.json(
        { success: false, message: "Exam subject not found." },
        { status: 404 },
      );
    const question = await ExamQuestion.findByIdAndUpdate(
      id,
      validated.value,
      { new: true, runValidators: true },
    );
    if (!question)
      return NextResponse.json(
        { success: false, message: "Exam question not found." },
        { status: 404 },
      );
    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error("Could not update exam question.", error);
    return NextResponse.json(
      { success: false, message: "Could not update exam question." },
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
        { success: false, message: "Valid question ID required." },
        { status: 400 },
      );
    await connectDB();
    const question = await ExamQuestion.findById(id);
    if (!question)
      return NextResponse.json(
        { success: false, message: "Exam question not found." },
        { status: 404 },
      );
    if (
      await ExamAttempt.exists({
        "questionSnapshots.questionId": question._id,
      })
    ) {
      question.isActive = false;
      await question.save();
      return NextResponse.json({
        success: true,
        archived: true,
        message: "Question was used in an exam and has been disabled to preserve history.",
      });
    }
    await question.deleteOne();
    return NextResponse.json({ success: true, archived: false });
  } catch (error) {
    console.error("Could not delete exam question.", error);
    return NextResponse.json(
      { success: false, message: "Could not delete exam question." },
      { status: 500 },
    );
  }
}
