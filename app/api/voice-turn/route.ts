import { NextRequest, NextResponse } from "next/server";
import {
  OPENING,
  VOICE_FALLBACK,
  bufferToBase64,
  converseVoice,
  packVoiceResult,
  safeJson,
  synthesizeSpeech,
  transcribeAudio,
  type ChatMsg,
} from "@/lib/voice-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One round-trip voice turn: STT → chat → TTS.
 * Client shows text + plays audio together — no dead air between JSON and speech fetch.
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        ...packVoiceResult(VOICE_FALLBACK, null, ""),
        assistant_message: OPENING,
        audio_base64: null,
        error: "Add OPENAI_API_KEY to enable live voice.",
      });
    }

    let history: ChatMsg[] = [];
    let userText = "";

    const form = await req.formData().catch(() => null);
    if (form) {
      history = safeJson<ChatMsg[]>(String(form.get("history") || "[]"), []);
      history = history.filter(
        (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      );
      if (history.length > 12) history = history.slice(-12);

      const audio = form.get("audio");
      const typed = String(form.get("text") || "").trim();
      if (audio instanceof Blob && audio.size > 0) {
        userText = await transcribeAudio(audio, apiKey);
      } else if (typed) {
        userText = typed;
      }
    }

    const priorUser = history
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");

    if (!userText) {
      const packed = packVoiceResult(
        {
          ...VOICE_FALLBACK,
          assistant_message: "I didn't catch that — tap and try again?",
        },
        null,
        priorUser
      );
      const audio = await synthesizeSpeech(packed.assistant_message, apiKey);
      return NextResponse.json({
        ...packed,
        audio_base64: audio ? bufferToBase64(audio) : null,
      });
    }

    const messages: ChatMsg[] = [
      ...history,
      { role: "user", content: userText },
    ];
    const allUserText = [priorUser, userText].filter(Boolean).join(" ");
    const signals = await converseVoice(messages, apiKey);
    const packed = packVoiceResult(signals, userText, allUserText);

    // TTS in same request so the client never waits on a second network hop
    const audio = await synthesizeSpeech(packed.assistant_message, apiKey);

    return NextResponse.json({
      ...packed,
      audio_base64: audio ? bufferToBase64(audio) : null,
    });
  } catch (e) {
    console.error("[voice-turn]", e);
    return NextResponse.json({
      ...packVoiceResult(VOICE_FALLBACK, null, ""),
      assistant_message: "Something glitched — tap and say that again?",
      audio_base64: null,
    });
  }
}
