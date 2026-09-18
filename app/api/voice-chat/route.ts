import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are NatNorth Voice Intent Guard — a warm, premium banking fraud verification agent on a live voice call.
You ALWAYS lead: ask the next question. Goal: gently discover APP / social-engineering fraud risk.

Write assistant_message exactly as it should be spoken aloud:
- 1–2 short sentences max
- Natural human speech: occasional soft fillers like "hmm,", "um,", "okay so,", "right," — sparingly
- Contractions: I'll, you're, what's
- Never robotic. Never name models or APIs.

Ask about payment amount, recipient, hurry, coaching, gift cards/crypto, remote access, secrecy.
After 3–5 exchanges, close with a clear spoken assessment.

Return ONLY valid JSON:
{
  "assistant_message": string,
  "done": boolean,
  "urgency_language": boolean,
  "third_party_coaching_language": boolean,
  "mentions_gift_card_or_crypto": boolean,
  "mentions_remote_access": boolean,
  "secrecy_language": boolean,
  "overall_linguistic_risk_score": number,
  "one_line_reasoning": string
}`;

const FALLBACK = {
  assistant_message: "Hmm — hey. What payment are you trying to make?",
  done: false,
  urgency_language: false,
  third_party_coaching_language: false,
  mentions_gift_card_or_crypto: false,
  mentions_remote_access: false,
  secrecy_language: false,
  overall_linguistic_risk_score: 0,
  one_line_reasoning: "Waiting for more detail.",
};

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function pack(signals: Record<string, unknown>, transcript: string | null) {
  return {
    transcript,
    assistant_message: String(signals.assistant_message || FALLBACK.assistant_message),
    done: !!signals.done,
    urgency_language: !!signals.urgency_language,
    third_party_coaching_language: !!signals.third_party_coaching_language,
    mentions_gift_card_or_crypto: !!signals.mentions_gift_card_or_crypto,
    mentions_remote_access: !!signals.mentions_remote_access,
    secrecy_language: !!signals.secrecy_language,
    overall_linguistic_risk_score: Math.max(
      0,
      Math.min(100, Number(signals.overall_linguistic_risk_score) || 0)
    ),
    one_line_reasoning: String(signals.one_line_reasoning || ""),
  };
}

async function transcribe(audio: Blob, apiKey: string): Promise<string> {
  if (!audio || audio.size < 64) return "";
  for (const model of ["gpt-4o-transcribe", "whisper-1"] as const) {
    try {
      const form = new FormData();
      form.append("file", audio, "audio.webm");
      form.append("model", model);
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!res.ok) continue;
      const data = await res.json();
      return String(data.text || "").trim();
    } catch {
      /* try next */
    }
  }
  return "";
}

async function converse(messages: Msg[], apiKey: string) {
  for (const model of ["gpt-4o", "gpt-4.1", "gpt-4o-mini"] as const) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.55,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) continue;
      const parsed = safeJson<Record<string, unknown>>(content, FALLBACK);
      if (!parsed.assistant_message) continue;
      return parsed;
    } catch {
      /* try next */
    }
  }
  return FALLBACK;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ...pack(FALLBACK, null), error: "Add OPENAI_API_KEY to enable live voice." },
        { status: 200 }
      );
    }

    let history: Msg[] = [];
    let userText = "";

    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        history = safeJson<Msg[]>(String(form.get("history") || "[]"), []);
        history = history.filter(
          (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        );
        const audio = form.get("audio");
        const typed = String(form.get("text") || "").trim();
        if (audio instanceof Blob && audio.size > 0) {
          userText = await transcribe(audio, apiKey);
        } else if (typed) {
          userText = typed;
        }
      } else {
        const body = await req.json().catch(() => ({}));
        history = Array.isArray(body.history) ? body.history : [];
        history = history.filter(
          (m: Msg) =>
            m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        );
        userText = String(body.text || "").trim();
      }
    } catch {
      history = [];
      userText = "";
    }

    // Cap history so payloads never explode
    if (history.length > 16) history = history.slice(-16);

    const messages: Msg[] = [...history];
    if (userText) {
      messages.push({ role: "user", content: userText });
    } else if (history.length === 0) {
      messages.push({
        role: "user",
        content:
          "[session_start] Greet me warmly in one short line with a soft hmm, then ask your first payment-safety question.",
      });
    } else if (!userText) {
      return NextResponse.json(
        pack(
          {
            ...FALLBACK,
            assistant_message: "Hmm — I didn't catch that. Could you say that again?",
          },
          null
        )
      );
    }

    const signals = await converse(messages, apiKey);
    return NextResponse.json(pack(signals, userText || null));
  } catch (e) {
    console.error("[voice-chat]", e);
    return NextResponse.json(pack(FALLBACK, null), { status: 200 });
  }
}
