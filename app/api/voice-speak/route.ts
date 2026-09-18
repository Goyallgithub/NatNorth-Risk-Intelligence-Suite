import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VOICE_INSTRUCTIONS = `Speak like a warm, premium banking assistant on a live call.
Natural pacing. Soft thinking sounds are welcome — a light "hmm", "um", or brief pause before the question.
Friendly, calm, never robotic. Keep energy low and confident.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "offline", ok: false }, { status: 503 });
    }

    let text = "";
    try {
      const body = await req.json();
      text = String(body?.text || "").trim().slice(0, 800);
    } catch {
      return NextResponse.json({ error: "bad_request", ok: false }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: "empty", ok: false }, { status: 400 });
    }

    const attempts: Array<Record<string, unknown>> = [
      {
        model: "gpt-4o-mini-tts",
        voice: "coral",
        input: text,
        instructions: VOICE_INSTRUCTIONS,
        response_format: "mp3",
      },
      {
        model: "tts-1-hd",
        voice: "nova",
        input: text,
        response_format: "mp3",
      },
      {
        model: "tts-1",
        voice: "alloy",
        input: text,
        response_format: "mp3",
      },
    ];

    for (const body of attempts) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 25000);
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
