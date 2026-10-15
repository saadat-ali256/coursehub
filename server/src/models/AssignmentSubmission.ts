/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IAssignmentSubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  fileUrl?: string;
  score?: number;
  feedback?: string;
  status: "submitted" | "graded";
  submittedAt: Date;
  gradedAt?: Date;
}
const S = new Schema<IAssignmentSubmission>({
  assignmentId: {
    type: Schema.Types.ObjectId,
    ref: "Assignment",
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  text: {
    type: String,
    default: "",
  },
  fileUrl: {
    type: String,
  },
  score: {
    type: Number,
  },
  feedback: {
    type: String,
  },
  status: {
    type: String,
    enum: ["submitted", "graded"],
    default: "submitted",
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  gradedAt: {
    type: Date,
  },
});
export default mongoose.models.AssignmentSubmission ||
  mongoose.model<IAssignmentSubmission>("AssignmentSubmission", S);
