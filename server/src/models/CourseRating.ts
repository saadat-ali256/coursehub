/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ICourseRating extends Document {
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}
const SchemaDef = new Schema<ICourseRating>(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);
SchemaDef.index(
  {
    courseId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);
export default mongoose.models.CourseRating ||
  mongoose.model<ICourseRating>("CourseRating", SchemaDef);
