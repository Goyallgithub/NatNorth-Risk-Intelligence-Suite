import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a banking APP-fraud linguistic risk analyst for NatNorth.
Given a customer voice transcript about a payment they want to make, extract structured risk signals.
Return ONLY valid JSON with these exact keys:
{
  "urgency_language": boolean,
  "third_party_coaching_language": boolean,
  "mentions_gift_card_or_crypto": boolean,
  "mentions_remote_access": boolean,
  "secrecy_language": boolean,
  "overall_linguistic_risk_score": number,
  "one_line_reasoning": string
}
Rules:
- urgency_language: true if rushed / "right now" / "today only" / deadline pressure
- third_party_coaching_language: true if someone else is telling them what to say/do ("he told me", "they said")
- mentions_gift_card_or_crypto: true if gift cards, Bitcoin, crypto, or similar irreversible rails
- mentions_remote_access: true if AnyDesk, TeamViewer, remote desktop, screen share to stranger
- secrecy_language: true if "don't tell the bank", "keep this secret", "don't talk to staff"
- overall_linguistic_risk_score: integer 0-100 reflecting combined social-engineering risk
- one_line_reasoning: one concise sentence
If the transcript is empty, unclear, or unrelated to a payment, set score low and flags false.`;

async function transcribe(audio: Blob, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, "audio.webm");
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper error: ${err}`);
  }
  const data = await res.json();
  return (data.text as string) || "";
}

async function extractSignals(transcript: string, apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Customer payment voice transcript:\n"""${transcript}"""`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GPT error: ${err}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not set. Add it in Vercel env vars (or .env.local) to enable Voice Payment Check.",
        },
        { status: 503 }
      );
    }

    const form = await req.formData();
    const audio = form.get("audio");
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio blob" }, { status: 400 });
    }

    const transcript = await transcribe(audio, apiKey);
    const signals = await extractSignals(transcript, apiKey);

    return NextResponse.json({
      transcript,
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
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Voice risk analysis failed" },
      { status: 500 }
    );
  }
}
