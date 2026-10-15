import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { isAdmin } from "@/lib/auth";
import HeroSlide from "@/models/HeroSlide";

type SlideInput = {
  eyebrow?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  sortOrder?: number;
  active?: boolean;
};

function validateSlide(
  input: SlideInput,
):
  | { error: string }
  | {
      value: {
        eyebrow: string;
        title: string;
        description: string;
        imageUrl: string;
        imageAlt: string;
        buttonLabel: string;
        buttonUrl: string;
        sortOrder: number;
        active: boolean;
      };
    } {
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  const buttonLabel = String(input.buttonLabel || "").trim();
  const buttonUrl = String(input.buttonUrl || "").trim();
  const imageUrl = String(input.imageUrl || "").trim();
  const sortOrder = Number(input.sortOrder ?? 0);
  const allowedUrl = (value: string) => {
    if (!value) return true;
    if (value.startsWith("/"))
      return !value.startsWith("//") && !value.includes("\\");
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  if (!title || title.length > 140)
    return { error: "Enter a title of 1 to 140 characters." };
  if (description.length > 360)
    return { error: "Description must be 360 characters or fewer." };
  if (String(input.eyebrow || "").trim().length > 80)
    return { error: "Eyebrow must be 80 characters or fewer." };
  if (buttonLabel.length > 48)
    return { error: "Button text must be 48 characters or fewer." };
  if (buttonUrl.length > 2048 || imageUrl.length > 2048)
    return { error: "Button and image links must be 2048 characters or fewer." };
  if (String(input.imageAlt || "").trim().length > 180)
    return { error: "Image description must be 180 characters or fewer." };
  if (!allowedUrl(buttonUrl) || !allowedUrl(imageUrl))
    return { error: "Use a relative path or an http/https URL." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0)
    return { error: "Order must be a whole number of 0 or more." };
  if (Boolean(buttonLabel) !== Boolean(buttonUrl))
    return { error: "Provide both button text and a button link, or leave both blank." };

  return {
    value: {
      eyebrow: String(input.eyebrow || "").trim(),
      title,
      description,
      imageUrl,
      imageAlt: String(input.imageAlt || "").trim(),
      buttonLabel,
      buttonUrl,
      sortOrder,
      active: input.active !== false,
    },
  };
}

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required." },
      { status: 403 },
    );

  await connectDB();
  const slides = await HeroSlide.find()
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
  return NextResponse.json(
    { success: true, slides },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required." },
      { status: 403 },
    );

  const body = (await request.json()) as SlideInput;
  const validation = validateSlide(body);
  if ("error" in validation)
    return NextResponse.json(
      { success: false, message: validation.error },
      { status: 400 },
    );

  await connectDB();
  const slide = await HeroSlide.create(validation.value);
  return NextResponse.json({ success: true, slide }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required." },
      { status: 403 },
    );

  const body = (await request.json()) as SlideInput & { id?: string };
  const id = String(body.id || "");
  if (!id)
    return NextResponse.json(
      { success: false, message: "Slide ID is required." },
      { status: 400 },
    );

  const validation = validateSlide(body);
  if ("error" in validation)
    return NextResponse.json(
      { success: false, message: validation.error },
      { status: 400 },
    );

  await connectDB();
  const slide = await HeroSlide.findByIdAndUpdate(id, validation.value, {
    new: true,
    runValidators: true,
  });
  if (!slide)
    return NextResponse.json(
      { success: false, message: "Hero slide not found." },
      { status: 404 },
    );
  return NextResponse.json({ success: true, slide });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { success: false, message: "Admin access required." },
      { status: 403 },
    );

  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { success: false, message: "Slide ID is required." },
      { status: 400 },
    );

  await connectDB();
  const slide = await HeroSlide.findByIdAndDelete(id);
  if (!slide)
    return NextResponse.json(
      { success: false, message: "Hero slide not found." },
      { status: 404 },
    );
  return NextResponse.json({ success: true });
}
