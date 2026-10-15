import { connectDB } from "@/lib/mongodb";
import CourseAccess from "@/models/CourseAccess";
import { hasActiveSubscription } from "@/lib/subscription-access";

export async function hasCommunityAccess(user: {
  _id: unknown;
  role?: string;
}) {
  if (user.role === "admin") return true;
  await connectDB();
  const [subscription, courseAccess] = await Promise.all([
    hasActiveSubscription(user),
    CourseAccess.exists({
      userId: user._id,
      access: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    }),
  ]);
  return !!subscription || !!courseAccess;
}
