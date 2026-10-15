import { connectDB } from "@/lib/mongodb";
import CourseAccess from "@/models/CourseAccess";
import Subscription from "@/models/Subscription";

export async function hasActiveSubscription(user: {
  _id: unknown;
  role?: string;
}) {
  if (user.role === "admin") return true;
  await connectDB();
  return Boolean(
    await Subscription.exists({
      userId: user._id,
      status: { $in: ["active", "trialing", "paid"] },
      $or: [
        { currentPeriodEnd: { $exists: false } },
        { currentPeriodEnd: null },
        { currentPeriodEnd: { $gt: new Date() } },
      ],
    }),
  );
}

export async function hasCourseAccess(
  user: { _id: unknown; role?: string },
  courseId: string,
) {
  if (await hasActiveSubscription(user)) return true;
  await connectDB();
  return Boolean(
    await CourseAccess.exists({
      userId: user._id,
      courseId,
      access: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    }),
  );
}
