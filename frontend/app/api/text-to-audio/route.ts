import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prismaClient";
import { getCurrentUser } from "../auth/lib";

const TTS_ENDPOINT = process.env.TTS_ENDPOINT;

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

  const audios = await prisma.generatedAudio.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ audios });
}

type GenerateAudioPayload = {
  text?: string;
  description?: string;
  voiceLabel?: string;
};

type TTSResponse = {
  audio_url?: string;
  audioUrl?: string;
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  if (!TTS_ENDPOINT) {
    return NextResponse.json(
      { error: "TTS endpoint not configured" },
      { status: 500 }
    );
  }

  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GenerateAudioPayload;
  try {
    body = (await req.json()) as GenerateAudioPayload;
  } catch (error) {
    console.error("Invalid JSON body for text-to-audio:", error);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawText = typeof body.text === "string" ? body.text.trim() : "";
  const rawDescription =
    typeof body.description === "string" ? body.description.trim() : "";
  const voiceLabel =
    typeof body.voiceLabel === "string" && body.voiceLabel.trim().length > 0
      ? body.voiceLabel.trim()
      : null;

  if (!rawText) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  if (rawText.length > 400) {
    return NextResponse.json(
      { error: "Text must be 400 characters or less" },
      { status: 400 }
    );
  }

  if (!rawDescription) {
    return NextResponse.json(
      { error: "Voice description is required" },
      { status: 400 }
    );
  }

  let remoteResponse: Response;
  try {
    remoteResponse = await fetch(TTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: rawText,
        description: rawDescription,
      }),
    });
  } catch (err) {
    console.error("Failed to call TTS endpoint:", err);
    return NextResponse.json(
      { error: "Unable to reach TTS service" },
      { status: 502 }
    );
  }

  if (!remoteResponse.ok) {
    const rawMessage = await remoteResponse.text();
    let parsedMessage: string | null = null;
    try {
      const parsed = JSON.parse(rawMessage);
      if (typeof parsed?.error === "string") {
        parsedMessage = parsed.error;
      } else if (typeof parsed?.detail === "string") {
        parsedMessage = parsed.detail;
      } else if (Array.isArray(parsed?.detail)) {
        const msgs = parsed.detail
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item.msg === "string") return item.msg;
            return null;
          })
          .filter(Boolean);
        if (msgs.length > 0) {
          parsedMessage = msgs.join("; ");
        }
      }
    } catch (parseErr) {
      // message wasn't JSON; fall back to raw text below
    }

    const message = parsedMessage || rawMessage || remoteResponse.statusText;
    console.error("TTS endpoint error:", remoteResponse.status, message);
    return NextResponse.json(
      {
        error: message || "TTS service failed",
      },
      { status: remoteResponse.status || 502 }
    );
  }

  let ttsPayload: TTSResponse;
  try {
    ttsPayload = (await remoteResponse.json()) as TTSResponse;
  } catch (err) {
    console.error("Unable to parse TTS response:", err);
    return NextResponse.json(
      { error: "Invalid response from TTS service" },
      { status: 502 }
    );
  }

  const audioUrl =
    typeof ttsPayload?.audio_url === "string"
      ? ttsPayload.audio_url
      : typeof ttsPayload?.audioUrl === "string"
      ? ttsPayload.audioUrl
      : null;

  if (!audioUrl) {
    return NextResponse.json(
      { error: "TTS service did not return an audio URL" },
      { status: 502 }
    );
  }

  const audioRecord = await prisma.generatedAudio.create({
    data: {
      text: rawText,
      description: rawDescription,
      voiceLabel,
      audioUrl,
      userId: user.id,
    },
  });

  return NextResponse.json({ audio: audioRecord });
}
