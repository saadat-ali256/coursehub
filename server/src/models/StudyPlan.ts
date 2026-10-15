/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IStudyPlan extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  scheduledFor: Date;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<IStudyPlan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    done: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.StudyPlan ||
  mongoose.model<IStudyPlan>("StudyPlan", S);
