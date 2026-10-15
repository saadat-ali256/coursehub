import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import DirectMessage from "@/models/DirectMessage";
import User from "@/models/User";
import { hasCommunityAccess } from "@/lib/community-access";

export async function GET(request: Request) {
  let stage = "resolving_user";
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 },
      );
    stage = "connecting_database";
    await connectDB();
    stage = "checking_community_access";
    if (!(await hasCommunityAccess(user)))
      return NextResponse.json(
        {
          success: false,
          message: "An active premium subscription is required to use private messages.",
        },
        { status: 403 },
      );
    const contactId = new URL(request.url).searchParams.get("userId");
    if (contactId) {
      stage = "validating_contact";
      if (!mongoose.Types.ObjectId.isValid(contactId))
        return NextResponse.json(
          { success: false, message: "Invalid user id" },
          { status: 400 },
        );
      stage = "loading_contact";
      const contact = await User.findOne({
        _id: contactId,
        status: { $ne: "suspended" },
      }).select("name avatarUrl bio role");
      if (!contact)
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 },
        );
      if (String(user._id) === String(contact._id))
        return NextResponse.json(
          { success: false, message: "You cannot message yourself" },
          { status: 400 },
        );
        stage = "loading_conversation";
        const messageFilter = {
        $or: [
          { senderId: user._id, recipientId: contact._id },
          { senderId: contact._id, recipientId: user._id },
        ],
      };
      await DirectMessage.updateMany(
        { recipientId: user._id, senderId: contact._id, readAt: null },
        { $set: { readAt: new Date() } },
      );
      const messages = await DirectMessage.find(messageFilter)
        .sort({ createdAt: 1 })
        .limit(300)
        .populate("senderId", "name avatarUrl")
        .populate("recipientId", "name avatarUrl");
      return NextResponse.json({
        success: true,
        contact,
        messages,
      });
    }

    stage = "loading_conversations";
    const recent = await DirectMessage.find(
      { $or: [{ senderId: user._id }, { recipientId: user._id }] },
    )
      .sort({ createdAt: -1 })
      .limit(200)
      .populate<{
        senderId: {
          _id: mongoose.Types.ObjectId;
          name: string;
          avatarUrl: string;
          role: string;
        };
        recipientId: {
          _id: mongoose.Types.ObjectId;
          name: string;
          avatarUrl: string;
          role: string;
        };
      }>("senderId", "name avatarUrl role")
      .populate("recipientId", "name avatarUrl role");
    const conversations = new Map<string, (typeof recent)[number]>();
    for (const message of recent) {
      if (!message.senderId || !message.recipientId) continue;
      const peer =
        String(message.senderId._id) === String(user._id)
          ? message.recipientId
          : message.senderId;
      const peerId = String(peer._id);
      if (!conversations.has(peerId)) conversations.set(peerId, message);
    }
    const items = Array.from(conversations.values()).map((message) => {
      const peer =
        String(message.senderId._id) === String(user._id)
          ? message.recipientId
          : message.senderId;
      return {
        user: peer,
        message,
      };
    });
    return NextResponse.json({ success: true, conversations: items });
  } catch (error) {
    console.error("Could not load private messages", {
      stage,
      errorName: error instanceof Error ? error.name : "UnknownError",
      message:
        error instanceof Error
          ? error.message
              .replace(
                /\b(?:sk|pk)_(?:test|live)_[A-Za-z0-9_-]+/gi,
                "[REDACTED_KEY]",
              )
              .replace(
                /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
                "[REDACTED_TOKEN]",
              )
              .slice(0, 240)
          : "Non-error value thrown",
    });
    return NextResponse.json(
      { success: false, message: "Could not load private messages" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 },
      );
    const body = await request.json();
    const recipientId = String(body.recipientId || "");
    const text = String(body.text || "").trim();
    if (!mongoose.Types.ObjectId.isValid(recipientId))
      return NextResponse.json(
        { success: false, message: "Valid recipient required" },
        { status: 400 },
      );
    if (!text || text.length > 2000)
      return NextResponse.json(
        { success: false, message: "Message must be 1-2000 characters" },
        { status: 400 },
      );
    if (String(user._id) === recipientId)
      return NextResponse.json(
        { success: false, message: "You cannot message yourself" },
        { status: 400 },
      );
    await connectDB();
    if (!(await hasCommunityAccess(user)))
      return NextResponse.json(
        {
          success: false,
          message: "An active premium subscription is required to send private messages.",
        },
        { status: 403 },
      );
    const recipient = await User.findOne({
      _id: recipientId,
      status: { $ne: "suspended" },
    }).select("_id role");
    if (!recipient)
      return NextResponse.json(
        { success: false, message: "Recipient not found" },
        { status: 404 },
      );
    const message = await DirectMessage.create({
      senderId: user._id,
      recipientId: recipient._id,
      text,
    });
    await message.populate([
      { path: "senderId", select: "name avatarUrl" },
      { path: "recipientId", select: "name avatarUrl" },
    ]);
    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error("Could not send private message", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message:
        error instanceof Error
          ? error.message
              .replace(
                /\b(?:sk|pk)_(?:test|live)_[A-Za-z0-9_-]+/gi,
                "[REDACTED_KEY]",
              )
              .replace(
                /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
                "[REDACTED_TOKEN]",
              )
              .slice(0, 240)
          : "Non-error value thrown",
    });
    return NextResponse.json(
      { success: false, message: "Could not send private message" },
      { status: 500 },
    );
  }
}
