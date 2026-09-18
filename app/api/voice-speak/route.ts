import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/voice-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Prefetch / fallback TTS at natural pace. */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "offline", ok: false }, { status: 503 });
    }

    let text = "";
    try {
      const body = await req.json();
      text = String(body?.text || "").trim().slice(0, 280);
    } catch {
      return NextResponse.json({ error: "bad_request", ok: false }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: "empty", ok: false }, { status: 400 });
    }

    const ab = await synthesizeSpeech(text, apiKey);
    if (!ab) {
      return NextResponse.json({ error: "speech_unavailable", ok: false }, { status: 502 });
    }

    return new NextResponse(ab, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[voice-speak]", e);
    return NextResponse.json({ error: "speech_failed", ok: false }, { status: 500 });
  }
}
