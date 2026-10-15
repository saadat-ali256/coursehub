import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { hasCourseAccess } from "@/lib/subscription-access";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    // URL se course ID lena
    const { id } = await context.params;

    // Check karna ke user logged in hai
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

    // MongoDB connect
    await connectDB();
    if (await hasCourseAccess(user, id)) {
      return NextResponse.json({
        success: true,
        hasAccess: true,
      });
    }
    return NextResponse.json({
      success: true,
      hasAccess: false,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to check course access",
      },
      { status: 500 },
    );
  }
}
