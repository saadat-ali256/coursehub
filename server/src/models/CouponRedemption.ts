/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ICouponRedemption extends Document {
  couponId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  discount: number;
  createdAt: Date;
}
const S = new Schema<ICouponRedemption>(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);
S.index({
  couponId: 1,
  userId: 1,
});
export default mongoose.models.CouponRedemption ||
  mongoose.model<ICouponRedemption>("CouponRedemption", S);
