import { NextRequest, NextResponse } from "next/server";
import {
  OPENING,
  VOICE_FALLBACK,
  converseVoice,
  packVoiceResult,
  safeJson,
  transcribeAudio,
  type ChatMsg,
} from "@/lib/voice-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** JSON-only chat (kept for compatibility). Prefer /api/voice-turn for the orb. */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        ...packVoiceResult({ ...VOICE_FALLBACK, assistant_message: OPENING }, null, ""),
        error: "Add OPENAI_API_KEY to enable live voice.",
      });
    }

    let history: ChatMsg[] = [];
    let userText = "";

    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        history = safeJson<ChatMsg[]>(String(form.get("history") || "[]"), []);
        history = history.filter(
          (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        );
        const audio = form.get("audio");
        const typed = String(form.get("text") || "").trim();
        if (audio instanceof Blob && audio.size > 0) {
          userText = await transcribeAudio(audio, apiKey);
        } else if (typed) {
          userText = typed;
        }
      } else {
        const body = await req.json().catch(() => ({}));
        history = Array.isArray(body.history) ? body.history : [];
        history = history.filter(
          (m: ChatMsg) =>
            m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        );
        userText = String(body.text || "").trim();
      }
    } catch {
      history = [];
      userText = "";
    }

    if (history.length > 12) history = history.slice(-12);

    if (!userText && history.length === 0) {
      return NextResponse.json(
        packVoiceResult({ ...VOICE_FALLBACK, assistant_message: OPENING }, null, "")
      );
    }

    if (!userText) {
      return NextResponse.json(
        packVoiceResult(
          {
            ...VOICE_FALLBACK,
            assistant_message: "I didn't catch that — tap and try again?",
          },
          null,
          history
            .filter((m) => m.role === "user")
            .map((m) => m.content)
            .join(" ")
        )
      );
    }

    const priorUser = history
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");
    const messages: ChatMsg[] = [...history, { role: "user", content: userText }];
    const signals = await converseVoice(messages, apiKey);
    return NextResponse.json(
      packVoiceResult(signals, userText, [priorUser, userText].filter(Boolean).join(" "))
    );
  } catch (e) {
    console.error("[voice-chat]", e);
    return NextResponse.json(packVoiceResult(VOICE_FALLBACK, null, ""));
  }
}
