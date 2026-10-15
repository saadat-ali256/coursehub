import dotenv from "dotenv";
import { connectDB } from "@/lib/mongodb";
import { getClerkClient } from "@/lib/clerk";
import User from "@/models/User";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  await connectDB();
  const clerk = getClerkClient();
  const users = await User.find({
    clerkUserId: { $exists: false },
    emailVerificationRequired: { $ne: true },
  }).select("+password");

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.password || !/^\$2[aby]\$\d{2}\$/.test(user.password)) {
      console.error("Skipped account with unsupported legacy password hash", {
        userId: user._id.toString(),
      });
      skipped++;
      continue;
    }

    try {
      const existing = await clerk.users.getUserList({
        emailAddress: [user.email.toLowerCase()],
        limit: 1,
      });
      let clerkUser = existing.data[0];

      if (clerkUser) {
        const primaryEmail = clerkUser.emailAddresses.find(
          (address) => address.id === clerkUser.primaryEmailAddressId,
        );
        if (
          !primaryEmail ||
          primaryEmail.emailAddress.toLowerCase() !== user.email.toLowerCase() ||
          primaryEmail.verification?.status !== "verified"
        )
          throw new Error("A matching Clerk account exists without a verified primary email");
        if (clerkUser.externalId && clerkUser.externalId !== user._id.toString())
          throw new Error("The Clerk account is linked to a different external user");
        if (
          clerkUser.privateMetadata.coursehubPasswordImported !== true ||
          clerkUser.privateMetadata.coursehubSourceUserId !== user._id.toString()
        )
          throw new Error(
            "An existing Clerk account is not a CourseHub password import; resolve it manually before migration",
          );
        if (!clerkUser.externalId)
          clerkUser = await clerk.users.updateUser(clerkUser.id, {
            externalId: user._id.toString(),
          });
      } else {
        clerkUser = await clerk.users.createUser({
          externalId: user._id.toString(),
          emailAddress: [user.email.toLowerCase()],
          passwordDigest: user.password,
          passwordHasher: "bcrypt",
          firstName: user.name.slice(0, 255),
          skipLegalChecks: true,
          banned: user.status === "suspended",
          privateMetadata: {
            coursehubPasswordImported: true,
            coursehubSourceUserId: user._id.toString(),
          },
        });
      }

      user.clerkUserId = clerkUser.id;
      user.emailVerified = true;
      user.emailVerificationRequired = false;
      await user.save();
      migrated++;
    } catch (error) {
      console.error("Could not migrate CourseHub account", {
        userId: user._id.toString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
      failed++;
    }
  }

  console.log(`Clerk migration complete: ${migrated} migrated, ${skipped} skipped, ${failed} failed.`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Clerk account migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  });
