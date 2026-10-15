/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, hasAdminPermission } from "@/lib/auth";
import CommunityGroup from "@/models/CommunityGroup";
import { hasCommunityAccess } from "@/lib/community-access";
export async function GET() {
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
    const subscriber = await hasCommunityAccess(user);
    await connectDB();
    const canManage = hasAdminPermission(user, "manage_community");
    const filter = canManage ? {} : { active: true };
    const foundGroups = await CommunityGroup.find(filter)
      .sort({
        createdAt: 1,
      })
      .populate("createdBy", "name")
      .lean();
    const visibleGroups = canManage
      ? foundGroups
      : foundGroups.filter(
          (group) => {
            const explicitlyMember = group.memberIds?.some(
              (id: unknown) => String(id) === String(user._id),
            );
            return (
              explicitlyMember ||
              (subscriber &&
                !group.memberAccessRestricted &&
                !group.memberIds?.length)
            );
          },
        );
    const groups = canManage
      ? visibleGroups
      : visibleGroups.map(({ memberIds: _memberIds, ...group }) => group);
    return NextResponse.json({
      success: true,
      subscriber,
      groups,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load groups",
      },
      {
        status: 500,
      },
    );
  }
}
export async function POST(r: Request) {
  try {
    const actor = await getCurrentUser();
    if (!hasAdminPermission(actor, "manage_community"))
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        {
          status: 403,
        },
      );
    const b = await r.json();
    await connectDB();
    const group = await CommunityGroup.create({
      name: b.name,
      description: b.description || "",
      avatarUrl: String(b.avatarUrl || ""),
      audience: b.audience || "subscribers",
      createdBy: actor!._id,
    });
    return NextResponse.json(
      {
        success: true,
        group,
      },
      {
        status: 201,
      },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create group",
      },
      {
        status: 500,
      },
    );
  }
}
