/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/api-helpers";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import LearningProgress from "@/models/LearningProgress";
import Certificate from "@/models/Certificate";
import QuizAttempt from "@/models/QuizAttempt";
import Assignment from "@/models/Assignment";
import CommunityMessage from "@/models/CommunityMessage";
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  await connectDB();
  const [
    users,
    activeSubscriptions,
    completedLessons,
    certificates,
    quizAttempts,
    passedQuizzes,
    assignments,
    communityMessages,
  ] = await Promise.all([
    User.countDocuments(),
    Subscription.countDocuments({
      status: {
        $in: ["active", "trialing"],
      },
    }),
    LearningProgress.countDocuments({
      completed: true,
    }),
    Certificate.countDocuments(),
    QuizAttempt.countDocuments(),
    QuizAttempt.countDocuments({
      passed: true,
    }),
    Assignment.countDocuments(),
    CommunityMessage.countDocuments(),
  ]);
  return NextResponse.json({
    success: true,
    users,
    activeSubscriptions,
    completedLessons,
    certificates,
    quizAttempts,
    passedQuizzes,
    assignments,
    communityMessages,
  });
}
