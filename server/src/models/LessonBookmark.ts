/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ILessonBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  createdAt: Date;
}
const S = new Schema<ILessonBookmark>(
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
export default mongoose.models.LessonBookmark ||
  mongoose.model<ILessonBookmark>("LessonBookmark", S);
