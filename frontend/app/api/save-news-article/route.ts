import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prismaClient";
import { getCurrentUser } from "../auth/lib"; // get user from auth_token

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getCurrentUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { threadId, result, url } = body;

    if (!threadId || !result) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const saved = await prisma.newsArticle.create({
      data: {
        threadID: threadId,
        username: user.username,
        result,
        url: url || "",
      },
    });

    return NextResponse.json({ status: "success", saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}