import mongoose, { Document, Schema } from "mongoose";

export type ExamDifficulty = "beginner" | "intermediate" | "advanced";

export interface IExamQuestion extends Document {
  subjectId: mongoose.Types.ObjectId;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: ExamDifficulty;
  topic: string;
  isActive: boolean;
  seedKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExamQuestionSchema = new Schema<IExamQuestion>(
  {
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "ExamSubject",
      required: true,
      index: true,
    },
    questionText: { type: String, required: true, trim: true, maxlength: 1000 },
    options: {
      type: [{ type: String, required: true, trim: true, maxlength: 500 }],
      validate: {
        validator: (options: string[]) => options.length === 4,
        message: "Exam questions must have exactly four options.",
      },
    },
    correctAnswer: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true, trim: true, maxlength: 1000 },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    topic: { type: String, required: true, trim: true, maxlength: 100 },
    isActive: { type: Boolean, default: true, index: true },
    seedKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

ExamQuestionSchema.index({ subjectId: 1, isActive: 1 });

export default mongoose.models.ExamQuestion ||
  mongoose.model<IExamQuestion>("ExamQuestion", ExamQuestionSchema);
