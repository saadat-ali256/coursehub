import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasCommunityAccess } from "@/lib/community-access";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username || "",
        email: user.email,
        role: user.role,
        adminPermissions: user.adminPermissions || [],
        communityAccess: await hasCommunityAccess(user),
        avatarUrl: user.avatarUrl || "",
        coverImage: user.coverImage || "",
        bio: user.bio || "",
        lastSeenAt: user.lastSeenAt,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get current user",
      },
      { status: 500 },
    );
  }
}
