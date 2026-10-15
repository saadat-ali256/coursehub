import { NextResponse } from "next/server";
import {
  ClerkProfileSyncError,
  getClerkUserId,
  syncClerkUser,
} from "@/lib/clerk";
import { sendWelcomeEmailOnce } from "@/lib/welcome-email";

export async function POST(request: Request) {
  let stage = "validating_session";
  try {
    const clerkUserId = await getClerkUserId(request);
    if (!clerkUserId)
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );

    stage = "synchronizing_profile";
    const { user, isNewAccount } = await syncClerkUser(clerkUserId);
    let welcomeEmailSent = false;
    let welcomeEmailWarning: string | undefined;
    if (
      isNewAccount ||
      user.welcomeEmailStatus === "pending" ||
      user.welcomeEmailStatus === "failed"
    ) {
      const result = await sendWelcomeEmailOnce(String(user._id));
      welcomeEmailSent = result.sent;
      welcomeEmailWarning = result.warning;
    }
    return NextResponse.json({
      success: true,
      welcomeEmailSent,
      welcomeEmailWarning,
      user: {
        id: user._id,
        name: user.name,
        username: user.username || "",
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof ClerkProfileSyncError)
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 403 },
      );
    console.error("Clerk account synchronization failed", {
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
      {
        success: false,
        message: "Unable to synchronize this account right now.",
      },
      { status: 500 },
    );
  }
}
