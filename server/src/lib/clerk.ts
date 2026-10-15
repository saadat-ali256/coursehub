
import { createClerkClient, verifyToken } from "@clerk/backend";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

let clerkClientInstance: ReturnType<typeof createClerkClient> | undefined;

const profileSyncsInFlight = new Map<
  string,
  ReturnType<typeof performClerkUserSync>
>();

export class ClerkProfileSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClerkProfileSyncError";
  }
}

/**
 * Get Clerk backend client
 */
export function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  clerkClientInstance ??= createClerkClient({
    secretKey,
  });

  return clerkClientInstance;
}

/**
 * Get Clerk session token.
 *
 * Supports:
 * Authorization: Bearer <token>
 *
 * and Clerk __session cookie.
 */
function getSessionToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const sessionCookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("__session="));

  if (!sessionCookie) {
    return null;
  }

  const value = sessionCookie.slice("__session=".length);

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Get authenticated Clerk user ID.
 */
export async function getClerkUserId(request: Request) {
  const token = getSessionToken(request);
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!token || !secretKey) {
    return null;
  }

  const configuredParties = process.env.CLERK_AUTHORIZED_PARTIES
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const authorizedParties =
    configuredParties && configuredParties.length > 0
      ? configuredParties
      : undefined;

  try {
    const claims = await verifyToken(token, {
      secretKey,
      ...(authorizedParties
        ? { authorizedParties }
        : {}),
    });

    if (
      typeof claims.sub !== "string" ||
      !claims.sub
    ) {
      return null;
    }

    return claims.sub;
  } catch {
    return null;
  }
}

/**
 * Read safe text from Clerk metadata.
 */
function metadataText(
  metadata: Record<string, unknown>,
  key: string,
  maxLength: number,
) {
  const value = metadata[key];

  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

/**
 * Generate a unique username.
 */
async function availableUsername(
  userId: string,
  desired: string,
) {
  const cleanDesired =
    desired
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "")
      .slice(0, 18)
      .replace(/^[._]+|[._]+$/g, "");

  const base = cleanDesired || "learner";

  if (/^[a-z0-9._]{3,24}$/.test(base)) {
    const exists = await User.exists({
      username: base,
    });

    if (!exists) {
      return base;
    }
  }

  const suffix =
    userId
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(-7) || "user";

  for (let attempt = 0; attempt < 100; attempt++) {
    const extra = attempt === 0
      ? ""
      : attempt.toString(36);

    const candidate =
      `${base}.${suffix}${extra}`.slice(0, 24);

    const exists = await User.exists({
      username: candidate,
    });

    if (!exists) {
      return candidate;
    }
  }

  throw new ClerkProfileSyncError(
    "Unable to create a unique username",
  );
}

/**
 * Sync Clerk user with MongoDB.
 */
async function performClerkUserSync(
  clerkUserId: string,
) {
  await connectDB();

  const clerkUser =
    await getClerkClient().users.getUser(
      clerkUserId,
    );

  const primaryEmail =
    clerkUser.emailAddresses.find(
      (address) =>
        address.id ===
        clerkUser.primaryEmailAddressId,
    );

  if (!primaryEmail) {
    throw new ClerkProfileSyncError(
      "No primary email address found in Clerk",
    );
  }

  const email =
    primaryEmail.emailAddress
      .trim()
      .toLowerCase();

  /**
   * Clerk already handles email verification.
   * We don't block login because of the MongoDB
   * email verification fields.
   */
  const metadata =
    (clerkUser.unsafeMetadata || {}) as Record<
      string,
      unknown
    >;

  const displayName =
    metadataText(
      metadata,
      "courseHubName",
      120,
    ) ||
    [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ") ||
    email.split("@")[0];

  /**
   * First search by Clerk ID.
   */
  let user = await User.findOne({
    clerkUserId,
  }).select("+welcomeEmailStatus");
  let isNewAccount = false;

  /**
   * If not found, search by email.
   * This allows existing CourseHub users
   * to be connected to Clerk.
   */
  if (!user) {
    user = await User.findOne({
      email,
    }).select("+welcomeEmailStatus");
  }

  /**
   * Create a new MongoDB user.
   */
  if (!user) {
    const username =
      await availableUsername(
        clerkUserId,
        metadataText(
          metadata,
          "courseHubUsername",
          24,
        ) || email.split("@")[0],
      );

    user = new User({
      name: displayName,
      username,
      email,
      clerkUserId,

      // Clerk handles authentication.
      password: undefined,

      role: "user",

      emailVerified: true,
      emailVerificationRequired: false,

      avatarUrl:
        clerkUser.imageUrl || "",
      welcomeEmailStatus: "pending",
    });
    isNewAccount = true;
  } else {
    /**
     * Prevent one email from being linked
     * to multiple MongoDB accounts.
     */
    const emailOwner =
      await User.findOne({
        email,
        _id: { $ne: user._id },
      }).select("_id");

    if (emailOwner) {
      throw new ClerkProfileSyncError(
        "This email is already linked to another CourseHub account",
      );
    }

    user.email = email;
    user.clerkUserId = clerkUserId;
    if (!user.name?.trim()) {
      user.name = displayName;
    }
    user.emailVerified = true;
    user.emailVerificationRequired = false;

    if (!user.avatarUrl && clerkUser.imageUrl) {
      user.avatarUrl = clerkUser.imageUrl;
    }
  }

  /**
   * Don't allow suspended accounts.
   */
  if (user.status === "suspended") {
    throw new ClerkProfileSyncError(
      "This CourseHub account is suspended",
    );
  }

  /**
   * Old OTP data is no longer required
   * because Clerk handles authentication.
   */
  user.emailOtpHash = undefined;
  user.emailOtpExpiresAt = undefined;
  user.emailOtpLastSentAt = undefined;
  user.emailOtpAttempts = undefined;
  user.emailOtpResendCount = undefined;
  user.emailOtpResendWindowStartedAt = undefined;

  await user.save();

  return { user, isNewAccount };
}

/**
 * Prevent duplicate MongoDB sync requests.
 */
export function syncClerkUser(
  clerkUserId: string,
) {
  const existing =
    profileSyncsInFlight.get(
      clerkUserId,
    );

  if (existing) {
    return existing;
  }

  const sync =
    performClerkUserSync(
      clerkUserId,
    ).finally(() => {
      profileSyncsInFlight.delete(
        clerkUserId,
      );
    });

  profileSyncsInFlight.set(
    clerkUserId,
    sync,
  );

  return sync;
}

/**
 * Get currently logged-in CourseHub user.
 */
export async function getCurrentClerkUser(
  request: Request,
) {
  const clerkUserId =
    await getClerkUserId(request);

  if (!clerkUserId) {
    return null;
  }

  try {
    const { user } =
      await syncClerkUser(
        clerkUserId,
      );

    return user;
  } catch {
    return null;
  }
}
