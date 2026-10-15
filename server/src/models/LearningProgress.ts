/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ILearningProgress extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  position: number;
  duration: number;
  completed: boolean;
  completedAt?: Date;
  updatedAt: Date;
  createdAt: Date;
}
const S = new Schema<ILearningProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
      index: true,
    },
    position: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);
S.index(
  {
    userId: 1,
    lessonId: 1,
  },
  {
    unique: true,
  },
);
export default mongoose.models.LearningProgress ||
  mongoose.model<ILearningProgress>("LearningProgress", S);
