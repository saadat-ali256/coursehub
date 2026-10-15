const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, default: "user" },
    clerkUserId: { type: String, unique: true, sparse: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationRequired: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function main() {
  const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD are required in .env or .env.local",
    );
  }
  await mongoose.connect(MONGODB_URI);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = existing.name || "CourseHub Admin";
    existing.password = hash;
    existing.role = "admin";
    existing.emailVerified = true;
    existing.emailVerificationRequired = false;
    await existing.save();
    console.log(`Admin account updated: ${email}`);
    await syncClerkAdmin(existing, email, ADMIN_PASSWORD);
  } else {
    const admin = await User.create({
      name: "CourseHub Admin",
      email,
      password: hash,
      role: "admin",
      emailVerified: true,
      emailVerificationRequired: false,
    });
    await syncClerkAdmin(admin, email, ADMIN_PASSWORD);
    console.log(`Admin account created: ${email}`);
  }
  await mongoose.disconnect();
}

async function syncClerkAdmin(user, email, password) {
  const { CLERK_SECRET_KEY } = process.env;
  if (!CLERK_SECRET_KEY)
    throw new Error("CLERK_SECRET_KEY is required to seed an admin for Clerk");

  const { createClerkClient } = await import("@clerk/backend");
  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });
  let clerkUser;
  if (user.clerkUserId) {
    clerkUser = await clerk.users.getUser(user.clerkUserId);
  } else {
    const results = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    clerkUser = results.data[0];
  }

  if (clerkUser) {
    if (clerkUser.externalId && clerkUser.externalId !== user._id.toString())
      throw new Error("The matching Clerk account is linked to a different CourseHub user");
    await clerk.users.updateUser(clerkUser.id, {
      externalId: user._id.toString(),
      password,
      skipPasswordChecks: true,
    });
  } else {
    clerkUser = await clerk.users.createUser({
      externalId: user._id.toString(),
      emailAddress: [email],
      password,
      firstName: "CourseHub Admin",
      skipPasswordChecks: true,
      skipLegalChecks: true,
    });
  }

  user.clerkUserId = clerkUser.id;
  user.emailVerified = true;
  user.emailVerificationRequired = false;
  await user.save();
}

main().catch(async (err) => {
  console.error(err.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
