import mongoose, { Schema, type Document } from "mongoose";

export interface IAdminSetting extends Document {
  key: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSettingSchema = new Schema<IAdminSetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 1_000_000_000,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.AdminSetting ||
  mongoose.model<IAdminSetting>("AdminSetting", AdminSettingSchema);
