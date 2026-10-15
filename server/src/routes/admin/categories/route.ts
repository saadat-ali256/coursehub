import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { isAdmin } from "@/lib/auth";
import ContentCategory from "@/models/ContentCategory";

export async function GET() {
  await connectDB();
  const categories = await ContentCategory.find().sort({ name: 1 }).lean();
  return NextResponse.json({ success: true, categories });
}

export async function POST(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 },
    );
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name || name.length > 50)
    return NextResponse.json(
      { success: false, message: "Category must be 1-50 characters" },
      { status: 400 },
    );
  const key = name.toLocaleLowerCase();
  await connectDB();
  const category = await ContentCategory.findOneAndUpdate(
    { key },
    { $setOnInsert: { name, key } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return NextResponse.json({ success: true, category });
}
