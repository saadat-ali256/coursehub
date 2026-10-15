import mongoose from "mongoose";

let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose;
  }

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/coursehub";

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(uri).catch((err) => {
      cachedPromise = null;
      throw err;
    });
  }

  return cachedPromise;
}

