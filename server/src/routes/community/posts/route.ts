/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import CommunityPost from "@/models/CommunityPost";
import CommunityPostComment from "@/models/CommunityPostComment";
import Subscription from "@/models/Subscription";
import CourseAccess from "@/models/CourseAccess";
import { hasCommunityAccess } from "@/lib/community-access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
export async function GET() {
  await connectDB();
  const posts = await CommunityPost.find()
    .sort({
      createdAt: -1,
    })
    .limit(100)
    .populate("userId", "name username role avatarUrl")
    .lean();
  const authors = posts
    .map((post: any) => post.userId?._id)
    .filter(Boolean);
  const [subscribers, courseAccess] = await Promise.all([
    Subscription.distinct("userId", {
      userId: { $in: authors },
      status: { $in: ["active", "trialing", "paid"] },
    }),
    CourseAccess.distinct("userId", {
      userId: { $in: authors },
      access: true,
    }),
  ]);
  const subscribedIds = new Set(
    [...subscribers, ...courseAccess].map((id) => String(id)),
  );
  const ids = posts.map((p: any) => p._id);
  const counts = await CommunityPostComment.aggregate([
    {
      $match: {
        postId: {
          $in: ids,
        },
      },
    },
    {
      $group: {
        _id: "$postId",
        count: {
          $sum: 1,
        },
      },
    },
  ]);
  const map = new Map(counts.map((x: any) => [String(x._id), x.count]));
  return NextResponse.json({
    success: true,
    posts: posts.map((p: any) => ({
      ...p,
      userId: p.userId
        ? {
            ...p.userId,
            isSubscriber: subscribedIds.has(String(p.userId._id)),
          }
        : null,
      commentCount: map.get(String(p._id)) || 0,
    })),
  });
}
export async function POST(req: Request) {
  if (!rateLimit(`post:${clientKey(req)}`, 20, 60_000))
    return NextResponse.json(
      {
        success: false,
        message: "Posting too fast. Try again shortly.",
      },
      {
        status: 429,
      },
    );
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      {
        success: false,
        message: "Login required",
      },
      {
        status: 401,
      },
    );
  if (!(await hasCommunityAccess(user)))
    return NextResponse.json(
      { success: false, message: "A subscription is required to post." },
      { status: 403 },
    );
  await connectDB();
  const b = await req.json();
  const text = String(b.text || "").trim();
  const imageUrl = String(b.imageUrl || "");
  const isSafeImageUrl =
    !imageUrl ||
    (/^\/uploads\/community\/[A-Za-z0-9._-]+$/.test(imageUrl) ||
      (() => {
        try {
          const url = new URL(imageUrl);
          return url.protocol === "https:" || url.protocol === "http:";
        } catch {
          return false;
        }
      })());
  if (!isSafeImageUrl)
    return NextResponse.json(
      {
        success: false,
        message: "Invalid image URL",
      },
      {
        status: 400,
      },
    );
  if (!text && !b.imageUrl)
    return NextResponse.json(
      {
        success: false,
        message: "Write something or add an image",
      },
      {
        status: 400,
      },
    );
  const post = await CommunityPost.create({
    userId: user._id,
    text,
    imageUrl: imageUrl || undefined,
  });
  return NextResponse.json(
    {
      success: true,
      post: await post.populate("userId", "name role avatarUrl"),
    },
    {
      status: 201,
    },
  );
}
