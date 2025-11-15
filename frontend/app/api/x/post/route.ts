"use server";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prismaClient";
import { getCurrentUser } from "../../auth/lib";
const { encryptSecret, decryptSecret } = require("@/lib/xCrypto");

async function getAuthedUser(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  return getCurrentUser(token);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    console.log("POST BODY:", body);

    // 1. Read credentials from DB
    const creds = await prisma.xCredential.findUnique({
      where: { userId: user.id },
    });

    if (!creds) {
      return NextResponse.json(
        { error: "No saved X credentials found for this user." },
        { status: 400 }
      );
    }

    // 2. Decrypt stored values
    console.log(creds.id);
    console.log(creds.userId);
    const apiKey = decryptSecret(creds.apiKeyEncrypted);
    const apiSecret = decryptSecret(creds.apiSecretEncrypted);

    // Bearer is plain text
    const bearerToken = creds.bearerToken;
    console.log(apiKey);
    console.log(apiSecret);
    console.log(creds.bearerToken);
    if (!apiKey || !apiSecret || !bearerToken) {
      return NextResponse.json(
        { error: "X credentials are incomplete. Please fill them out again." },
        { status: 400 }
      );
    }

    // 3. Extract tweet (what you want to post)
    const { text } = body;
    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    console.log("Using X Credentials:");
    console.log({ apiKey, apiSecret, bearerToken });

    // 🚀 4. TODO — now send to X API (next step)
    return NextResponse.json({
      ok: true,
      posted: text,
      debug: "Credentials loaded from DB successfully",
    });
  } catch (err: any) {
    console.error("Error posting to X:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
