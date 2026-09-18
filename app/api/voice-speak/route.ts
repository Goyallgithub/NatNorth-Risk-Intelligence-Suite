import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FAST_INSTRUCTIONS = `Speak quickly and clearly — brisk conversational pace, about 15% faster than normal.
No long pauses. No drawn-out thinking sounds. Warm but snappy. Short sentences only.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "offline", ok: false }, { status: 503 });
    }

    let text = "";
    try {
      const body = await req.json();
      text = String(body?.text || "").trim().slice(0, 400);
    } catch {
      return NextResponse.json({ error: "bad_request", ok: false }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: "empty", ok: false }, { status: 400 });
    }

    // Prefer fast TTS first (speed > 1). HD models are slower to generate and play.
    const attempts: Array<Record<string, unknown>> = [
      {
        model: "tts-1",
        voice: "nova",
        input: text,
        speed: 1.35,
        response_format: "mp3",
      },
      {
        model: "gpt-4o-mini-tts",
        voice: "coral",
        input: text,
        instructions: FAST_INSTRUCTIONS,
        speed: 1.3,
        response_format: "mp3",
      },
      {
        model: "tts-1-hd",
        voice: "nova",
        input: text,
        speed: 1.3,
        response_format: "mp3",
      },
    ];

    for (const body of attempts) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const res = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) continue;
        const ab = await res.arrayBuffer();
        if (!ab.byteLength) continue;
        return new NextResponse(ab, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      } catch {
        /* try next model */
      }
    }

    return NextResponse.json({ error: "speech_unavailable", ok: false }, { status: 502 });
  } catch (e) {
    console.error("[voice-speak]", e);
    return NextResponse.json({ error: "speech_failed", ok: false }, { status: 500 });
  }
}
