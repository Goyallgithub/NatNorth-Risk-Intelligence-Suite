import { NextRequest, NextResponse } from "next/server";
import { calibrateLinguisticRisk, deriveFlagsFromText } from "@/lib/voice-risk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are NatNorth Voice Intent Guard — a sharp banking fraud verification agent on a live voice call.
You ALWAYS lead with the next question. Detect APP / social-engineering fraud risk.

SPEECH STYLE (assistant_message):
- ONE short sentence, max ~18 words. No fillers (no hmm/um/okay so).
- Direct, warm, fast to speak aloud.
- Never name models or APIs.

ASK ABOUT: amount, recipient (known?), hurry, coaching, gift cards/crypto, remote access, secrecy.
After 3–5 exchanges set done=true with a crisp spoken verdict.

RISK SCORE RUBRIC (overall_linguistic_risk_score 0–100) — be decisive for demos:
- Benign known payee, no pressure: 0–15
- Sending money to stranger / unknown person: at least 45
- Secrecy ("don't tell", secret): +20 (stack)
- Urgency / hurry: +15
- Third-party coaching: +25
- Gift cards / crypto: +25
- Remote access tools: +30
- Large amount + stranger or secrecy: push into 70–95
If multiple signals fire, score must reflect them (do NOT return single digits when risk is clear).

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
  assistant_message: "Hey — what payment are you trying to make?",
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

function pack(signals: Record<string, unknown>, transcript: string | null, allUserText: string) {
  const flags = deriveFlagsFromText(allUserText, {
    urgency_language: !!signals.urgency_language,
    third_party_coaching_language: !!signals.third_party_coaching_language,
    mentions_gift_card_or_crypto: !!signals.mentions_gift_card_or_crypto,
    mentions_remote_access: !!signals.mentions_remote_access,
    secrecy_language: !!signals.secrecy_language,
  });
  const calibrated = calibrateLinguisticRisk(
    Number(signals.overall_linguistic_risk_score) || 0,
    flags,
    allUserText
  );

  return {
    transcript,
    assistant_message: String(signals.assistant_message || FALLBACK.assistant_message),
    done: !!signals.done,
    ...flags,
    overall_linguistic_risk_score: calibrated.score,
    one_line_reasoning: String(signals.one_line_reasoning || calibrated.reasoning),
  };
}

async function transcribe(audio: Blob, apiKey: string): Promise<string> {
  if (!audio || audio.size < 64) return "";
  // whisper-1 first — usually faster than gpt-4o-transcribe
  for (const model of ["whisper-1", "gpt-4o-transcribe"] as const) {
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
  // Faster models first for snappy demo turns
  for (const model of ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"] as const) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.35,
          max_tokens: 220,
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
        { ...pack(FALLBACK, null, ""), error: "Add OPENAI_API_KEY to enable live voice." },
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

    if (history.length > 12) history = history.slice(-12);

    const messages: Msg[] = [...history];
    if (userText) {
      messages.push({ role: "user", content: userText });
    } else if (history.length === 0) {
      messages.push({
        role: "user",
        content:
          "[session_start] Greet in one short line, then ask what payment they want to make. No fillers.",
      });
    } else if (!userText) {
      return NextResponse.json(
        pack(
          {
            ...FALLBACK,
            assistant_message: "I didn't catch that — say it again?",
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
    const allUserText = [priorUser, userText].filter(Boolean).join(" ");

    const signals = await converse(messages, apiKey);
    return NextResponse.json(pack(signals, userText || null, allUserText));
  } catch (e) {
    console.error("[voice-chat]", e);
    return NextResponse.json(pack(FALLBACK, null, ""), { status: 200 });
  }
}
