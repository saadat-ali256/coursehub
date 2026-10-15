/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getCurrentUser, hasAdminPermission } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CommunityPost from "@/models/CommunityPost";
import CommunityPostComment from "@/models/CommunityPostComment";
import { hasCommunityAccess } from "@/lib/community-access";
export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const u = await getCurrentUser();
  if (!u)
    return NextResponse.json(
      {
        success: false,
        message: "Login required",
      },
      {
        status: 401,
      },
    );
  if (!(await hasCommunityAccess(u)))
    return NextResponse.json(
      { success: false, message: "A subscription is required to interact with posts." },
      { status: 403 },
    );
  await connectDB();
  const b = await req.json();
  const id = (await params).id;
  const post = await CommunityPost.findById(id);
  if (!post)
    return NextResponse.json(
      {
        success: false,
        message: "Post not found",
      },
      {
        status: 404,
      },
    );
  if (b.action === "like") {
    const i = post.likes.findIndex(
      (x: mongoose.Types.ObjectId) => String(x) === String(u._id),
    );
    if (i >= 0) post.likes.splice(i, 1);
    else post.likes.push(u._id);
    await post.save();
    return NextResponse.json({
      success: true,
      likes: post.likes.length,
      liked: i < 0,
    });
  }
  if (b.action === "reaction") {
    const type = String(b.type || "👍");
    if (!["❤️", "👍", "😂", "🔥", "👏", "🎉"].includes(type))
      return NextResponse.json(
        {
          success: false,
          message: "Invalid reaction",
        },
        {
          status: 400,
        },
      );
    post.reactions = post.reactions || [];
    post.reactions = post.reactions.filter(
      (r: any) => String(r.userId) !== String(u._id),
    );
    post.reactions.push({
      userId: u._id,
      type,
    });
    await post.save();
    return NextResponse.json({
      success: true,
      reactions: post.reactions,
    });
  }
  if (b.action === "comment") {
    const text = String(b.text || "").trim();
    if (!text)
      return NextResponse.json(
        {
          success: false,
          message: "Comment required",
        },
        {
          status: 400,
        },
      );
    const c = await CommunityPostComment.create({
      postId: id,
      userId: u._id,
      text,
    });
    return NextResponse.json(
      {
        success: true,
        comment: await c.populate("userId", "name avatarUrl"),
      },
      {
        status: 201,
      },
    );
  }
  return NextResponse.json(
    {
      success: false,
      message: "Invalid action",
    },
    {
      status: 400,
    },
  );
}
export async function GET(
  _r: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  await connectDB();
  const comments = await CommunityPostComment.find({
    postId: (await params).id,
  })
    .sort({
      createdAt: 1,
    })
    .populate("userId", "name avatarUrl")
    .lean();
  return NextResponse.json({
    success: true,
    comments,
  });
}
export async function DELETE(
  _r: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const u = await getCurrentUser();
  if (!u)
    return NextResponse.json(
      {
        success: false,
        message: "Login required",
      },
      {
        status: 401,
      },
    );
  const moderator = hasAdminPermission(u, "moderate_feed");
  if (!moderator && !(await hasCommunityAccess(u)))
    return NextResponse.json(
      { success: false, message: "A subscription is required to manage posts." },
      { status: 403 },
    );
  await connectDB();
  const p = await CommunityPost.findById((await params).id);
  if (!p)
    return NextResponse.json(
      {
        success: false,
        message: "Post not found",
      },
      {
        status: 404,
      },
    );
  if (String(p.userId) !== String(u._id) && !moderator)
    return NextResponse.json(
      {
        success: false,
        message: "Not allowed",
      },
      {
        status: 403,
      },
    );
  await CommunityPostComment.deleteMany({
    postId: p._id,
  });
  await p.deleteOne();
  return NextResponse.json({
    success: true,
  });
}
