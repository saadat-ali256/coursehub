import mongoose, { Schema, Document } from "mongoose";

export interface ICourseAccess extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;

  access: boolean;

  grantedAt?: Date;
  expiresAt?: Date;
}

const CourseAccessSchema = new Schema<ICourseAccess>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    access: {
      type: Boolean,
      required: true,
      default: false,
    },

    grantedAt: {
      type: Date,
    },

    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

const CourseAccess =
  mongoose.models.CourseAccess ||
  mongoose.model<ICourseAccess>("CourseAccess", CourseAccessSchema);

export default CourseAccess;
