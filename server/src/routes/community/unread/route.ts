/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminPermission } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CommunityGroup from "@/models/CommunityGroup";
import CommunityMessage from "@/models/CommunityMessage";
import CommunityRead from "@/models/CommunityRead";
import DirectMessage from "@/models/DirectMessage";
import { hasCommunityAccess } from "@/lib/community-access";
export async function GET() {
  try {
    const u = await getCurrentUser();
    if (!u)
      return NextResponse.json(
        { success: false, count: 0, groups: [] },
        { status: 401 },
      );
    await connectDB();
    const communityAccess = await hasCommunityAccess(u);
    let groups: any[] = [];
    const availableGroups = await CommunityGroup.find({ active: true })
      .select("_id memberIds")
      .lean();
    groups = hasAdminPermission(u, "manage_community")
      ? availableGroups
      : availableGroups.filter((group) => {
          const explicitlyMember = group.memberIds?.some(
            (memberId: unknown) => String(memberId) === String(u._id),
          );
          return (
            explicitlyMember ||
            (communityAccess &&
              !group.memberAccessRestricted &&
              !group.memberIds?.length)
          );
        });

    const reads = await CommunityRead.find({ userId: u._id }).lean();
    const readAtByGroup = new Map(
      reads.map((read) => [String(read.groupId), read.lastReadAt]),
    );
    const unreadGroups = await Promise.all(
      groups.map(async (group) => {
        const groupId = group._id;
        const readAt = readAtByGroup.get(String(groupId));
        const count = await CommunityMessage.countDocuments({
          groupId,
          userId: { $ne: u._id },
          ...(readAt ? { createdAt: { $gt: readAt } } : {}),
        });
        return { groupId: String(groupId), count };
      }),
    );
    const privateMessageCount = await DirectMessage.countDocuments({
      recipientId: u._id,
      readAt: null,
    });
    const groupMessageCount = unreadGroups.reduce(
      (total, group) => total + group.count,
      0,
    );
    return NextResponse.json({
      success: true,
      communityAccess,
      count: groupMessageCount + privateMessageCount,
      groupMessageCount,
      privateMessageCount,
      groups: unreadGroups.filter((group) => group.count > 0),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load unread messages" },
      { status: 500 },
    );
  }
}

export async function POST(r: Request) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 },
      );
    const { groupId } = await r.json();
    if (!groupId)
      return NextResponse.json(
        { success: false, message: "groupId required" },
        { status: 400 },
      );
    await connectDB();
    const group = await CommunityGroup.findById(groupId);
    const moderator = hasAdminPermission(user, "manage_community");
    const explicitlyMember = group?.memberIds?.some(
      (memberId: unknown) => String(memberId) === String(user._id),
    );
    const accessibleBySubscription =
      !!group &&
      !group.memberAccessRestricted &&
      !group.memberIds?.length &&
      (await hasCommunityAccess(user));
    if (
      !group ||
      (!group.active && !moderator) ||
      (!moderator && !explicitlyMember && !accessibleBySubscription)
    )
      return NextResponse.json(
        { success: false, message: "Group not found or inactive" },
        { status: 404 },
      );

    await CommunityRead.findOneAndUpdate(
      { userId: user._id, groupId },
      { $set: { lastReadAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to mark group as read" },
      { status: 500 },
    );
  }
}
