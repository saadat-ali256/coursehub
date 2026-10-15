import mongoose, { Document, Schema } from "mongoose";
import type { ExamDifficulty } from "@/models/ExamQuestion";

export interface IExamQuestionSnapshot {
  questionId: mongoose.Types.ObjectId;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: ExamDifficulty;
  topic: string;
}

export interface IExamAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  studentDisplayName: string;
  questionSnapshots: IExamQuestionSnapshot[];
  selectedAnswers: Array<number | null>;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  score: number;
  percentage: number;
  status: "in-progress" | "grading" | "passed" | "failed";
  startedAt: Date;
  submittedAt?: Date;
  timeTaken?: number;
  attemptNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSnapshotSchema = new Schema<IExamQuestionSnapshot>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "ExamQuestion", required: true },
    questionText: { type: String, required: true },
    options: {
      type: [{ type: String, required: true }],
      validate: {
        validator: (options: string[]) => options.length === 4,
        message: "Question snapshots must have exactly four options.",
      },
    },
    correctAnswer: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    topic: { type: String, required: true },
  },
  { _id: false },
);

const ExamAttemptSchema = new Schema<IExamAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "ExamSubject", required: true, index: true },
    studentDisplayName: { type: String, required: true, trim: true, maxlength: 100 },
    questionSnapshots: {
      type: [QuestionSnapshotSchema],
      required: true,
      validate: {
        validator: (questions: IExamQuestionSnapshot[]) => questions.length === 20,
        message: "Certification exams must contain exactly 20 questions.",
      },
    },
    selectedAnswers: {
      type: [{ type: Number, min: 0, max: 3 }],
      default: [],
    },
    totalQuestions: { type: Number, required: true, default: 20, min: 20, max: 20 },
    correctCount: { type: Number, default: 0, min: 0, max: 20 },
    incorrectCount: { type: Number, default: 0, min: 0, max: 20 },
    unansweredCount: { type: Number, default: 20, min: 0, max: 20 },
    score: { type: Number, default: 0, min: 0, max: 100 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["in-progress", "grading", "passed", "failed"],
      default: "in-progress",
      index: true,
    },
    startedAt: { type: Date, default: Date.now, required: true },
    submittedAt: { type: Date },
    timeTaken: { type: Number, min: 0 },
    attemptNumber: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

ExamAttemptSchema.index({ userId: 1, courseId: 1, subjectId: 1, createdAt: -1 });
ExamAttemptSchema.index(
  { userId: 1, courseId: 1, subjectId: 1, attemptNumber: 1 },
  { unique: true },
);

export default mongoose.models.ExamAttempt ||
  mongoose.model<IExamAttempt>("ExamAttempt", ExamAttemptSchema);
