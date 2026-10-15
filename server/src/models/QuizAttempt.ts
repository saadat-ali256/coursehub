/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  answers: number[][];
  score: number;
  percent: number;
  passed: boolean;
  startedAt: Date;
  submittedAt?: Date;
  attempt: number;
}
const S = new Schema<IQuizAttempt>({
  quizId: {
    type: Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  answers: [[Number]],
  score: {
    type: Number,
    default: 0,
  },
  percent: {
    type: Number,
    default: 0,
  },
  passed: {
    type: Boolean,
    default: false,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  submittedAt: {
    type: Date,
  },
  attempt: {
    type: Number,
    default: 1,
  },
});
export default mongoose.models.QuizAttempt ||
  mongoose.model<IQuizAttempt>("QuizAttempt", S);
