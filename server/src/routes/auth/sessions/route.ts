/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { getClerkClient } from "@/lib/clerk";
export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!user?.clerkUserId)
    return NextResponse.json(
      { success: false, message: "Clerk account is not linked" },
      { status: 409 },
    );
  const sessions = await getClerkClient().sessions.getSessionList({
    userId: user.clerkUserId,
    status: "active",
    limit: 100,
  });
  await Promise.all(
    sessions.data.map((session) =>
      getClerkClient().sessions.revokeSession(session.id),
    ),
  );
  return NextResponse.json({
    success: true,
    message: "All sessions revoked. Please sign in again.",
  });
}
