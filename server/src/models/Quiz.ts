/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IQuizQuestion {
  question: string;
  type: "single" | "multiple" | "truefalse";
  options: string[];
  answers: number[];
  points: number;
}
export interface IQuiz extends Document {
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  questions: IQuizQuestion[];
  passPercent: number;
  timeLimit: number;
  maxAttempts: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const Q = new Schema<IQuizQuestion>(
  {
    question: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["single", "multiple", "truefalse"],
      default: "single",
    },
    options: [String],
    answers: [Number],
    points: {
      type: Number,
      default: 1,
    },
  },
  {
    _id: false,
  },
);
const S = new Schema<IQuiz>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    questions: [Q],
    passPercent: {
      type: Number,
      default: 70,
    },
    timeLimit: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.Quiz || mongoose.model<IQuiz>("Quiz", S);
