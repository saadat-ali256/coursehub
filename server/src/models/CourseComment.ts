/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ICourseComment extends Document {
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}
const SchemaDef = new Schema<ICourseComment>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.CourseComment ||
  mongoose.model<ICourseComment>("CourseComment", SchemaDef);
