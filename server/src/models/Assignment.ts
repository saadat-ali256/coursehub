/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IAssignment extends Document {
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  title: string;
  instructions: string;
  dueAt?: Date;
  maxScore: number;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<IAssignment>(
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
    instructions: {
      type: String,
      default: "",
    },
    dueAt: {
      type: Date,
    },
    maxScore: {
      type: Number,
      default: 100,
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.Assignment ||
  mongoose.model<IAssignment>("Assignment", S);
