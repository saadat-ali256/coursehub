import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { connectDB } from "@/lib/mongodb";
import AdminSetting from "@/models/AdminSetting";
import Certificate from "@/models/Certificate";
import CommunityMessage from "@/models/CommunityMessage";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import Assignment from "@/models/Assignment";
import LearningProgress from "@/models/LearningProgress";
import Payment from "@/models/Payment";
import QuizAttempt from "@/models/QuizAttempt";
import Subscription from "@/models/Subscription";
import User from "@/models/User";

const ALLOWED_PERIODS = [7, 30, 90, 365] as const;
const PAID_STATUSES = ["paid"];
const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"];

function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  await connectDB();
  const requestedDays = Number(new URL(request.url).searchParams.get("days"));
  const days = ALLOWED_PERIODS.includes(
    requestedDays as (typeof ALLOWED_PERIODS)[number],
  )
    ? requestedDays
    : 30;

  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
  const currentRange = { $gte: from, $lte: now };
  const previousRange = { $gte: previousFrom, $lt: from };
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    revenueTargetSetting,
    users,
    newUsers,
    previousUsers,
    courses,
    publishedCourses,
    lessons,
    subscriptions,
    activeSubscriptions,
    newSubscriptions,
    previousSubscriptions,
    currentPayments,
    previousPayments,
    monthPayments,
    topCourses,
    activeLearnerIds,
    coursesWithLessonIds,
    completedLessons,
    certificates,
    quizAttempts,
    passedQuizzes,
    assignments,
    communityMessages,
    paidUserIds,
  ] = await Promise.all([
    AdminSetting.findOne({ key: "monthlyRevenueTarget" }).lean(),
    User.countDocuments(),
    User.countDocuments({ createdAt: currentRange }),
    User.countDocuments({ createdAt: previousRange }),
    Course.countDocuments(),
    Course.countDocuments({ published: true }),
    Lesson.countDocuments({ published: true }),
    Subscription.countDocuments(),
    Subscription.countDocuments({ status: { $in: ACTIVE_SUBSCRIPTION_STATUSES } }),
    Subscription.countDocuments({ createdAt: currentRange }),
    Subscription.countDocuments({ createdAt: previousRange }),
    Payment.aggregate([
      { $match: { status: { $in: PAID_STATUSES }, createdAt: currentRange } },
      { $group: { _id: null, total: { $sum: "$amount" }, transactions: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: { $in: PAID_STATUSES }, createdAt: previousRange } },
      { $group: { _id: null, total: { $sum: "$amount" }, transactions: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: { $in: PAID_STATUSES }, createdAt: { $gte: monthStart, $lte: now } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Course.aggregate([
      { $match: { published: true, views: { $gt: 0 } } },
      { $sort: { views: -1, _id: 1 } },
      { $limit: 5 },
      { $project: { name: 1, views: 1 } },
    ]),
    LearningProgress.distinct("userId", { updatedAt: currentRange }),
    Course.aggregate([
      { $match: { published: true } },
      {
        $lookup: {
          from: Lesson.collection.name,
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$courseId", "$$courseId"] },
                    { $eq: ["$published", true] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "publishedLessons",
        },
      },
      { $match: { "publishedLessons.0": { $exists: true } } },
      { $count: "count" },
    ]),
    LearningProgress.countDocuments({ completed: true }),
    Certificate.countDocuments(),
    QuizAttempt.countDocuments(),
    QuizAttempt.countDocuments({ passed: true }),
    Assignment.countDocuments(),
    CommunityMessage.countDocuments(),
    Payment.distinct("userId", { status: { $in: PAID_STATUSES } }),
  ]);

  const bucketUnit = days <= 30 ? "day" : days <= 90 ? "week" : "month";
  const bucketCount = days <= 7 ? 7 : days <= 30 ? 30 : days <= 90 ? 14 : 13;
  const periodPayments = await Payment.aggregate([
    { $match: { status: { $in: PAID_STATUSES }, createdAt: currentRange } },
    {
      $group: {
        _id: {
          $dateTrunc: { date: "$createdAt", unit: bucketUnit },
        },
        revenue: { $sum: "$amount" },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const paymentByBucket = new Map(
    periodPayments.map((bucket) => [new Date(bucket._id).toISOString(), bucket]),
  );
  const firstBucket = new Date(now);
  firstBucket.setUTCHours(0, 0, 0, 0);
  if (bucketUnit === "week") {
    firstBucket.setUTCDate(firstBucket.getUTCDate() - firstBucket.getUTCDay());
  } else if (bucketUnit === "month") {
    firstBucket.setUTCDate(1);
  }
  if (bucketUnit === "day") firstBucket.setUTCDate(firstBucket.getUTCDate() - bucketCount + 1);
  else if (bucketUnit === "week") firstBucket.setUTCDate(firstBucket.getUTCDate() - (bucketCount - 1) * 7);
  else firstBucket.setUTCMonth(firstBucket.getUTCMonth() - bucketCount + 1);

  const monthly = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(firstBucket);
    if (bucketUnit === "month") date.setUTCMonth(date.getUTCMonth() + index);
    else if (bucketUnit === "week") date.setUTCDate(date.getUTCDate() + index * 7);
    else date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString();
    const bucket = paymentByBucket.get(key);
    return {
      _id: {
        date: key,
        y: date.getUTCFullYear(),
        m: date.getUTCMonth() + 1,
        label:
          bucketUnit === "month"
            ? date.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })
            : bucketUnit === "week"
              ? `Week ${index + 1}`
              : date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      },
      revenue: bucket?.revenue || 0,
      transactions: bucket?.transactions || 0,
    };
  });

  const currentRevenue = currentPayments[0]?.total || 0;
  const previousRevenue = previousPayments[0]?.total || 0;
  const coveredCourses = coursesWithLessonIds[0]?.count || 0;

  return NextResponse.json({
    success: true,
    monthlyRevenueTarget: revenueTargetSetting?.value || 1000,
    stats: {
      users,
      newUsers,
      courses,
      publishedCourses,
      lessons,
      subscriptions,
      activeSubscriptions,
      newSubscriptions,
      revenue: currentRevenue,
      transactions: currentPayments[0]?.transactions || 0,
      monthlyRevenue: monthPayments[0]?.total || 0,
      activeLearners: activeLearnerIds.length,
      paidUsers: paidUserIds.length,
      coursesWithLessons: coveredCourses,
      contentHealth: publishedCourses
        ? Math.round((coveredCourses / publishedCourses) * 100)
        : 0,
    },
    trends: {
      users: percentageChange(newUsers, previousUsers),
      revenue: percentageChange(currentRevenue, previousRevenue),
      subscriptions: percentageChange(newSubscriptions, previousSubscriptions),
      previousRevenue,
      previousTransactions: previousPayments[0]?.transactions || 0,
    },
    period: { days, from, to: now },
    topCourses,
    monthly,
    engagement: {
      completedLessons,
      certificates,
      quizAttempts,
      passedQuizzes,
      assignments,
      communityMessages,
    },
  });
}

export async function PATCH(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json();
  const target = Number(body?.monthlyRevenueTarget);
  if (
    !Number.isFinite(target) ||
    target < 1 ||
    target > 1_000_000_000
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Monthly revenue target must be between $1 and $1,000,000,000.",
      },
      { status: 400 },
    );
  }

  await connectDB();
  await AdminSetting.findOneAndUpdate(
    { key: "monthlyRevenueTarget" },
    { $set: { value: target } },
    { new: true, upsert: true, runValidators: true },
  );

  return NextResponse.json({
    success: true,
    monthlyRevenueTarget: target,
  });
}
