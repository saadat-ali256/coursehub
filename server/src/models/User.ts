/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IUser extends Document {
  name: string;
  username?: string;
  email: string;
  password?: string;
  clerkUserId?: string;
  stripeCustomerId?: string;
  role: string;
  adminPermissions: string[];
  status: "active" | "suspended";
  tokenVersion: number;
  emailVerified?: boolean;
  emailVerificationRequired?: boolean;
  emailOtpHash?: string;
  emailOtpExpiresAt?: Date;
  emailOtpLastSentAt?: Date;
  emailOtpAttempts?: number;
  emailOtpResendCount?: number;
  emailOtpResendWindowStartedAt?: Date;
  welcomeEmailStatus?: "pending" | "sending" | "sent" | "failed";
  welcomeEmailSendingAt?: Date;
  welcomeEmailSentAt?: Date;
  avatarUrl?: string;
  coverImage?: string;
  bio?: string;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 24,
      match: /^[a-z0-9._]+$/,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    clerkUserId: {
      type: String,
      unique: true,
      sparse: true,
    },
    stripeCustomerId: {
      type: String,
      index: true,
      sparse: true,
    },
    role: {
      type: String,
      required: true,
      default: "user",
    },
    adminPermissions: {
      type: [String],
      enum: ["manage_community", "moderate_feed", "manage_users"],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    emailVerified: {
      type: Boolean,
    },
    emailVerificationRequired: {
      type: Boolean,
    },
    emailOtpHash: {
      type: String,
      select: false,
    },
    emailOtpExpiresAt: {
      type: Date,
      select: false,
    },
    emailOtpLastSentAt: {
      type: Date,
      select: false,
    },
    emailOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    emailOtpResendCount: {
      type: Number,
      default: 0,
      select: false,
    },
    emailOtpResendWindowStartedAt: {
      type: Date,
      select: false,
    },
    welcomeEmailStatus: {
      type: String,
      enum: ["pending", "sending", "sent", "failed"],
      select: false,
    },
    welcomeEmailSendingAt: {
      type: Date,
      select: false,
    },
    welcomeEmailSentAt: {
      type: Date,
      select: false,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
