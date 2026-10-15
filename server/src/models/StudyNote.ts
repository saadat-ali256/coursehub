/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IStudyNote extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  text: string;
  timestamp?: number;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<IStudyNote>(
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
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 3000,
    },
    timestamp: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.StudyNote ||
  mongoose.model<IStudyNote>("StudyNote", S);
