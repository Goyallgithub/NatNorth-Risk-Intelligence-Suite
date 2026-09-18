import { NextRequest, NextResponse } from "next/server";
import { calibrateLinguisticRisk, deriveFlagsFromText } from "@/lib/voice-risk";

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
Scoring: stranger payee ≥45; secrecy +20; urgency +15; coaching +25; gift/crypto +25; remote +30. Stack signals. Never return single-digit scores when clear fraud cues are present.`;

async function transcribe(audio: Blob, apiKey: string): Promise<string> {
  for (const model of ["whisper-1", "gpt-4o-transcribe"] as const) {
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
    return (data.text as string) || "";
  }
  throw new Error("Transcription failed");
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
      max_tokens: 200,
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
    throw new Error(`Voice model error: ${err}`);
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
        { error: "Voice model is offline. Add your API key in .env.local to try me." },
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
    const flags = deriveFlagsFromText(transcript, signals);
    const calibrated = calibrateLinguisticRisk(
      Number(signals.overall_linguistic_risk_score) || 0,
      flags,
      transcript
    );

    return NextResponse.json({
      transcript,
      ...flags,
      overall_linguistic_risk_score: calibrated.score,
      one_line_reasoning: String(signals.one_line_reasoning || calibrated.reasoning),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Voice risk analysis failed" },
      { status: 500 }
    );
  }
}
