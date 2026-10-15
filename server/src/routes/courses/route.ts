import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "@/models/Course";

// GET → courses ko MongoDB se nikalna
export async function GET() {
  try {
    await connectDB();
    const courses = await Course.find({ published: true }).sort({
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get courses",
      },
      { status: 500 },
    );
  }
}

// POST → naya course MongoDB mein banana
export async function POST(request: Request) {
  try {
    const body = await request.json();

    await connectDB();

    const course = await Course.create({
      name: body.name,
      description: body.description,
      price: body.price,
      interval: body.interval,
    });

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create course",
      },
      { status: 500 },
    );
  }
}
