import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prismaClient";
import { getCurrentUser } from "../auth/lib";

async function requireUser(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  return getCurrentUser(token);
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const images = await prisma.generatedImage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ images });
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { prompt, fileKey, imageUrl } = body;

  if (!prompt || !fileKey || !imageUrl) {
    return NextResponse.json(
      { error: "Missing prompt, fileKey, or imageUrl" },
      { status: 400 }
    );
  }

  const image = await prisma.generatedImage.create({
    data: {
      prompt,
      fileKey,
      imageUrl,
      userId: user.id,
    },
  });

  return NextResponse.json({ status: "success", image });
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");
  const id = idParam ? parseInt(idParam, 10) : NaN;

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.generatedImage.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.generatedImage.delete({ where: { id } });
  return NextResponse.json({ status: "deleted" });
}
