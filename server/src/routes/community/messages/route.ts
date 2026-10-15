/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, hasAdminPermission } from "@/lib/auth";
import CommunityMessage from "@/models/CommunityMessage";
import CommunityGroup from "@/models/CommunityGroup";
import { hasCommunityAccess } from "@/lib/community-access";
const reactions = ["❤️", "😂", "👍"];
async function allowed(user: any, group: any) {
  if (hasAdminPermission(user, "manage_community")) return true;
  if (!group.active) return false;
  if (group.memberIds?.some((id: unknown) => String(id) === String(user._id)))
    return true;
  if (group.memberAccessRestricted || group.memberIds?.length) return false;
  return hasCommunityAccess(user);
}
export async function GET(r: Request) {
  try {
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
    const id = new URL(r.url).searchParams.get("groupId");
    if (!id)
      return NextResponse.json(
        {
          success: false,
          message: "groupId required",
        },
        {
          status: 400,
        },
      );
    await connectDB();
    const group = await CommunityGroup.findById(id);
    if (!group || !(await allowed(user, group)))
      return NextResponse.json(
        {
          success: false,
          message: "Access denied",
        },
        {
          status: 403,
        },
      );
    const messages = await CommunityMessage.find({
      groupId: id,
    })
      .sort({
        createdAt: 1,
      })
      .limit(200)
      .populate("userId", "name role avatarUrl")
      .populate({
        path: "replyTo",
        populate: {
          path: "userId",
          select: "name role avatarUrl",
        },
      });
    return NextResponse.json({
      success: true,
      messages,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load messages",
      },
      {
        status: 500,
      },
    );
  }
}
export async function POST(r: Request) {
  try {
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
    const b = await r.json();
    const text = String(b.text || "").trim();
    const attachmentUrl = String(b.attachmentUrl || "");
    if (text.length > 2000)
      return NextResponse.json(
        { success: false, message: "Message is too long" },
        { status: 400 },
      );
    if (
      !text &&
      !/^\/uploads\/community\/[A-Za-z0-9._-]+$/.test(attachmentUrl)
    )
      return NextResponse.json(
        {
          success: false,
          message: "Message or uploaded image required",
        },
        {
          status: 400,
        },
      );
    await connectDB();
    const group = await CommunityGroup.findById(b.groupId);
    if (!group || !(await allowed(user, group)))
      return NextResponse.json(
        {
          success: false,
          message: "Access denied",
        },
        {
          status: 403,
        },
      );
    if (b.replyTo) {
      const parent = await CommunityMessage.findOne({
        _id: b.replyTo,
        groupId: b.groupId,
      });
      if (!parent)
        return NextResponse.json(
          { success: false, message: "Reply target not found" },
          { status: 404 },
        );
    }
    const m = await CommunityMessage.create({
      groupId: b.groupId,
      userId: user._id,
      text,
      attachmentUrl: attachmentUrl || undefined,
      replyTo: b.replyTo || undefined,
    });
    const populated = await m.populate([
      { path: "userId", select: "name role avatarUrl" },
      {
        path: "replyTo",
        populate: { path: "userId", select: "name role avatarUrl" },
      },
    ]);
    return NextResponse.json(
      {
        success: true,
        message: populated,
      },
      {
        status: 201,
      },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to send message",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(r: Request) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 },
      );
    const body = await r.json();
    const { messageId, emoji } = body;
    if (!messageId || !reactions.includes(emoji))
      return NextResponse.json(
        { success: false, message: "Valid message and reaction required" },
        { status: 400 },
      );
    await connectDB();
    const message = await CommunityMessage.findById(messageId);
    if (!message)
      return NextResponse.json(
        { success: false, message: "Message not found" },
        { status: 404 },
      );
    const group = await CommunityGroup.findById(message.groupId);
    if (!group || !(await allowed(user, group)))
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 },
      );

    const users = Array.isArray(message.reactions?.[emoji])
      ? message.reactions[emoji]
      : [];
    const userId = String(user._id);
    const hasReacted = users.some((id) => String(id) === userId);
    message.reactions = {
      ...(message.reactions || {}),
      [emoji]: hasReacted
        ? users.filter((id) => String(id) !== userId)
        : [...users, userId],
    };
    await message.save();
    return NextResponse.json({
      success: true,
      reactions: message.reactions,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to update reaction" },
      { status: 500 },
    );
  }
}

export async function DELETE(r: Request) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Login required" }, { status: 401 });
    const { messageId } = await r.json();
    if (!messageId || !mongoose.Types.ObjectId.isValid(String(messageId)))
      return NextResponse.json({ success: false, message: "Valid message id required" }, { status: 400 });
    await connectDB();
    const message = await CommunityMessage.findById(messageId);
    if (!message)
      return NextResponse.json({ success: false, message: "Message not found" }, { status: 404 });
    const group = await CommunityGroup.findById(message.groupId);
    const moderator = hasAdminPermission(user, "manage_community");
    if (!group || (!moderator && !(await allowed(user, group))))
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    if (!moderator && String(message.userId) !== String(user._id))
      return NextResponse.json({ success: false, message: "Not allowed to delete this message" }, { status: 403 });
    await CommunityMessage.deleteOne({ _id: message._id });
    await CommunityMessage.updateMany({ replyTo: message._id }, { $unset: { replyTo: 1 } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to delete message" }, { status: 500 });
  }
}
