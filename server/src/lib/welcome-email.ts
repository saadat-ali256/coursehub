import User from "@/models/User";

type ResendEmailResponse = {
  id?: string;
  message?: string;
  name?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function welcomeHtml(name: string, websiteUrl: string) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";
  const year = new Date().getUTCFullYear();

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Welcome to CourseHub</title></head>
  <body style="margin:0;padding:0;background:#f3f5fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your CourseHub learning journey starts here.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f5fb;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border:1px solid #e5e9f2;border-radius:20px;background:#fff;">
          <tr><td align="center" style="padding:32px 24px 20px;">
            <a href="${escapeHtml(websiteUrl)}" style="color:#3730a3;font-size:18px;font-weight:800;letter-spacing:2px;text-decoration:none;">COURSEHUB</a>
          </td></tr>
          <tr><td style="padding:10px 32px 34px;">
            <p style="margin:0 0 12px;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:1.5px;text-align:center;">YOUR NEXT CHAPTER STARTS HERE</p>
            <h1 style="margin:0 0 22px;color:#111827;font-size:28px;line-height:1.3;text-align:center;">Welcome to CourseHub!</h1>
            <p style="margin:0 0 14px;color:#334155;font-size:16px;line-height:1.6;">${greeting}</p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">Your account is ready. We are excited to have you with us. Explore practical courses, build useful skills, and keep moving toward your goals, one step at a time.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td align="center" style="border-radius:12px;background:#4f46e5;">
              <a href="${escapeHtml(websiteUrl)}" style="display:inline-block;padding:14px 26px;border:1px solid #4f46e5;border-radius:12px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">Start learning</a>
            </td></tr></table>
            <p style="margin:26px 0 0;color:#64748b;font-size:14px;line-height:1.7;">You received this email because a CourseHub account was created with this email address. If you did not create this account, please contact our support team.</p>
          </td></tr>
          <tr><td align="center" style="padding:20px 24px 24px;border-top:1px solid #edf0f6;">
            <p style="margin:0 0 6px;color:#3730a3;font-size:14px;font-weight:700;">CourseHub</p>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.5;"><a href="${escapeHtml(websiteUrl)}" style="color:#4f46e5;text-decoration:underline;">${escapeHtml(new URL(websiteUrl).host)}</a></p>
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">&copy; ${year} CourseHub. All rights reserved.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendWelcomeEmailOnce(userId: string) {
  const now = new Date();
  const lockExpiredAt = new Date(now.getTime() - 5 * 60_000);
  const claimedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { welcomeEmailStatus: { $in: ["pending", "failed"] } },
        {
          welcomeEmailStatus: "sending",
          welcomeEmailSendingAt: { $lt: lockExpiredAt },
        },
      ],
    },
    {
      $set: {
        welcomeEmailStatus: "sending",
        welcomeEmailSendingAt: now,
      },
    },
    { new: true },
  )
    .select("name email")
    .lean();

  if (!claimedUser) return { sent: false, warning: undefined };

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const clientUrl =
    process.env.CLIENT_URL?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (!apiKey || !from || !clientUrl) {
    await User.updateOne(
      { _id: userId, welcomeEmailStatus: "sending" },
      {
        $set: { welcomeEmailStatus: "failed" },
        $unset: { welcomeEmailSendingAt: 1 },
      },
    );
    return {
      sent: false,
      warning:
        "Your account was created, but the welcome email is not configured. Please contact the site administrator.",
    };
  }

  const websiteUrl = clientUrl.replace(/\/+$/, "");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [claimedUser.email],
        subject: "Welcome to CourseHub!",
        html: welcomeHtml(claimedUser.name?.trim() || "", websiteUrl),
        text: [
          claimedUser.name?.trim()
            ? `Hi ${claimedUser.name.trim()},`
            : "Hi there,",
          "",
          "Welcome to CourseHub! Your account is ready.",
          "Explore practical courses, build useful skills, and keep moving toward your goals, one step at a time.",
          "",
          `Start learning: ${websiteUrl}`,
          "",
          "You received this email because a CourseHub account was created with this email address.",
        ].join("\n"),
      }),
    });
    const result = (await response.json().catch(() => ({}))) as ResendEmailResponse;
    if (!response.ok || !result.id) {
      await User.updateOne(
        { _id: userId, welcomeEmailStatus: "sending" },
        {
          $set: { welcomeEmailStatus: "failed" },
          $unset: { welcomeEmailSendingAt: 1 },
        },
      );
      console.error("Resend rejected a CourseHub welcome email.", {
        status: response.status,
        error: result.name || result.message || "Unknown provider error",
      });
      return {
        sent: false,
        warning:
          "Your account was created, but the welcome email could not be sent. We’ll retry on your next sign-in.",
      };
    }

    await User.updateOne(
      { _id: userId, welcomeEmailStatus: "sending" },
      {
        $set: {
          welcomeEmailStatus: "sent",
          welcomeEmailSentAt: new Date(),
        },
        $unset: { welcomeEmailSendingAt: 1 },
      },
    );
    return { sent: true, warning: undefined };
  } catch (error) {
    await User.updateOne(
      { _id: userId, welcomeEmailStatus: "sending" },
      {
        $set: { welcomeEmailStatus: "failed" },
        $unset: { welcomeEmailSendingAt: 1 },
      },
    );
    console.error("Could not send a CourseHub welcome email.", {
      error: error instanceof Error ? error.message : "Unknown network error",
    });
    return {
      sent: false,
      warning:
        "Your account was created, but the welcome email could not be sent. We’ll retry on your next sign-in.",
    };
  }
}
