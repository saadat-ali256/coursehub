/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ICertificate extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  certificateId: string;
  issuedAt: Date;
  verified: boolean;
  examAttemptId?: mongoose.Types.ObjectId;
  studentName?: string;
  subjectName?: string;
  score?: number;
  percentage?: number;
  status: "valid" | "revoked";
  revokedAt?: Date;
  revocationReason?: string;
  issueKey?: string;
}
const S = new Schema<ICertificate>({
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
  certificateId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  },
  verified: {
    type: Boolean,
    default: true,
  },
  examAttemptId: {
    type: Schema.Types.ObjectId,
    ref: "ExamAttempt",
    index: true,
  },
  studentName: { type: String, trim: true, maxlength: 100 },
  subjectName: { type: String, trim: true, maxlength: 100 },
  score: { type: Number, min: 0, max: 100 },
  percentage: { type: Number, min: 0, max: 100 },
  status: { type: String, enum: ["valid", "revoked"], default: "valid", index: true },
  revokedAt: { type: Date },
  revocationReason: { type: String, trim: true, maxlength: 1000 },
  issueKey: { type: String, unique: true, sparse: true },
});
export default mongoose.models.Certificate ||
  mongoose.model<ICertificate>("Certificate", S);
