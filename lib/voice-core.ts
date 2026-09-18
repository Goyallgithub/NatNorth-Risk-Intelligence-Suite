import { calibrateLinguisticRisk, deriveFlagsFromText } from "@/lib/voice-risk";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export const OPENING =
  "Hi — I'm NatNorth voice check. What payment are you trying to make?";

export const VOICE_SYSTEM = `You are NatNorth Voice Intent Guard on a live banking call.
Lead with the next question. Detect APP / social-engineering fraud risk.

assistant_message rules:
- Exactly one short spoken sentence (≤16 words).
- Natural, calm banking tone. No fillers (hmm/um). No model names.

Cover: amount, known vs unknown recipient, hurry, coaching, gift cards/crypto, remote access, secrecy.
After 3–5 user turns set done=true with a clear spoken verdict.

Risk score 0–100 (decisive):
- Known benign payee: 0–15
- Money to stranger/unknown: ≥45
- Secrecy +20, urgency +15, coaching +25, gift/crypto +25, remote +30 (stack)
- Large amount + stranger/secrecy → 70–95
Never return single-digit scores when clear risk cues exist.

Return ONLY JSON:
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

export const VOICE_FALLBACK = {
  assistant_message: OPENING,
  done: false,
  urgency_language: false,
  third_party_coaching_language: false,
  mentions_gift_card_or_crypto: false,
  mentions_remote_access: false,
  secrecy_language: false,
  overall_linguistic_risk_score: 0,
  one_line_reasoning: "Waiting for more detail.",
};

export function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function packVoiceResult(
  signals: Record<string, unknown>,
  transcript: string | null,
  allUserText: string
) {
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
    assistant_message: String(signals.assistant_message || VOICE_FALLBACK.assistant_message)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220),
    done: !!signals.done,
    ...flags,
    overall_linguistic_risk_score: calibrated.score,
    one_line_reasoning: String(signals.one_line_reasoning || calibrated.reasoning),
  };
}

export async function transcribeAudio(audio: Blob, apiKey: string): Promise<string> {
  if (!audio || audio.size < 64) return "";
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
      /* next */
    }
  }
  return "";
}

export async function converseVoice(messages: ChatMsg[], apiKey: string) {
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
          temperature: 0.3,
          max_tokens: 180,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: VOICE_SYSTEM },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) continue;
      const parsed = safeJson<Record<string, unknown>>(content, VOICE_FALLBACK);
      if (!parsed.assistant_message) continue;
      return parsed;
    } catch {
      /* next */
    }
  }
  return VOICE_FALLBACK;
}

/** Natural-pace TTS. Prefer low-latency tts-1 at speed 1.0 (not rushed). */
export async function synthesizeSpeech(text: string, apiKey: string): Promise<ArrayBuffer | null> {
  const input = text.trim().slice(0, 280);
  if (!input) return null;

  const attempts: Array<Record<string, unknown>> = [
    {
      model: "tts-1",
      voice: "nova",
      input,
      speed: 1.0,
      response_format: "mp3",
    },
    {
      model: "gpt-4o-mini-tts",
      voice: "coral",
      input,
      instructions:
        "Warm, clear banking assistant. Natural conversational pace. No rushing. No long pauses.",
      response_format: "mp3",
    },
  ];

  for (const body of attempts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
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
      if (ab.byteLength > 0) return ab;
    } catch {
      /* next */
    }
  }
  return null;
}

export function bufferToBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64");
}
