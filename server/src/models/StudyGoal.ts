/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IStudyGoal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  targetMinutes: number;
  targetLessons: number;
  weekStart: Date;
  minutesDone: number;
  lessonsDone: number;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<IStudyGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Weekly learning goal",
    },
    targetMinutes: {
      type: Number,
      default: 180,
    },
    targetLessons: {
      type: Number,
      default: 5,
    },
    weekStart: {
      type: Date,
      required: true,
    },
    minutesDone: {
      type: Number,
      default: 0,
    },
    lessonsDone: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.StudyGoal ||
  mongoose.model<IStudyGoal>("StudyGoal", S);
