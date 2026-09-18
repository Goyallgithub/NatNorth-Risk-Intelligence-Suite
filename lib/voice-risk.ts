/** Deterministic linguistic risk so demos move the needle even if the LLM under-scores. */

export type VoiceFlags = {
  urgency_language: boolean;
  third_party_coaching_language: boolean;
  mentions_gift_card_or_crypto: boolean;
  mentions_remote_access: boolean;
  secrecy_language: boolean;
};

const RX = {
  stranger:
    /\b(stranger|unknown (person|guy|account|payee)|someone i (don'?t|do not) know|random (person|guy|account)|new (person|contact)|person i('ve| have)? never)\b/i,
  secrecy:
    /\b(secret|secrecy|don'?t tell|do not tell|keep (it |this )?quiet|between us|off the record|don'?t (say|mention|inform)|hide (it|this)|nobody (should|must) know)\b/i,
  urgency:
    /\b(urgent|right now|immediately|asap|hurry|quick(ly)?|today only|deadline|can'?t wait|right away)\b/i,
  coaching:
    /\b((he|she|they|someone|friend|scammer) (told|asked|said|instructed|coached)|told me to say|script|what to say)\b/i,
  giftCrypto:
    /\b(gift ?cards?|itunes|steam card|bitcoin|btc|crypto|usdt|ethereum|eth|irreversible)\b/i,
  remote:
    /\b(anydesk|teamviewer|remote (access|desktop|control)|screen ?share|let them on (my )?computer)\b/i,
  sendMoney: /\b(send(ing)?|transfer(ring)?|wire|pay(ing)?)\b.{0,40}\b(money|cash|funds|amount|₹|rs\.?|rupees?|dollars?)\b/i,
  largeAmount:
    /\b(\d{4,}|\d+\s?k\b|lakh|crore|thousand|million|large (sum|amount)|lot of money|big (payment|transfer))\b/i,
};

export function deriveFlagsFromText(text: string, model: Partial<VoiceFlags> = {}): VoiceFlags {
  const t = text || "";
  return {
    urgency_language: !!model.urgency_language || RX.urgency.test(t),
    third_party_coaching_language: !!model.third_party_coaching_language || RX.coaching.test(t),
    mentions_gift_card_or_crypto: !!model.mentions_gift_card_or_crypto || RX.giftCrypto.test(t),
    mentions_remote_access: !!model.mentions_remote_access || RX.remote.test(t),
    secrecy_language: !!model.secrecy_language || RX.secrecy.test(t),
  };
}

export function calibrateLinguisticRisk(
  modelScore: number,
  flags: VoiceFlags,
  userText: string
): { score: number; reasoning: string } {
  const t = (userText || "").trim();
  let h = 0;

  if (flags.urgency_language) h += 18;
  if (flags.third_party_coaching_language) h += 26;
  if (flags.mentions_gift_card_or_crypto) h += 28;
  if (flags.mentions_remote_access) h += 30;
  if (flags.secrecy_language) h += 24;

  if (RX.stranger.test(t)) h += 28;
  if (RX.sendMoney.test(t) && (RX.stranger.test(t) || flags.secrecy_language)) h += 18;
  if (RX.largeAmount.test(t)) h += 14;
  if (RX.sendMoney.test(t) && RX.secrecy.test(t)) h += 12;

  const model = Math.max(0, Math.min(100, Number(modelScore) || 0));
  // Demo-friendly: never let clear red flags stay near zero
  const score = Math.max(0, Math.min(100, Math.round(Math.max(model, h))));

  const bits: string[] = [];
  if (RX.stranger.test(t)) bits.push("unknown recipient");
  if (flags.secrecy_language) bits.push("secrecy");
  if (flags.urgency_language) bits.push("urgency");
  if (flags.third_party_coaching_language) bits.push("third-party coaching");
  if (flags.mentions_gift_card_or_crypto) bits.push("gift card / crypto");
  if (flags.mentions_remote_access) bits.push("remote access");
  if (RX.largeAmount.test(t)) bits.push("large amount");

  const reasoning =
    bits.length > 0
      ? `Elevated risk from ${bits.join(", ")}.`
      : score >= 40
        ? "Combined payment cues suggest elevated social-engineering risk."
        : "No strong coercion cues yet — keep checking recipient and urgency.";

  return { score, reasoning };
}
