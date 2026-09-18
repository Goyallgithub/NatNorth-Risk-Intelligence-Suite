"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceResult = {
  transcript: string;
  urgency_language: boolean;
  third_party_coaching_language: boolean;
  mentions_gift_card_or_crypto: boolean;
  mentions_remote_access: boolean;
  secrecy_language: boolean;
  overall_linguistic_risk_score: number;
  one_line_reasoning: string;
};

type Bubble = { role: "assistant" | "user"; text: string };
type Phase = "idle" | "listening" | "thinking" | "speaking";

const OPENING = "Hi — I'm NatNorth voice check. What payment are you trying to make?";

function browserSpeak(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
      setTimeout(done, Math.min(16000, 1200 + text.length * 55));
    } catch {
      resolve();
    }
  });
}

function b64ToBlob(b64: string, type = "audio/mpeg"): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function VoiceOrb({ onResult }: { onResult: (r: VoiceResult) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [caption, setCaption] = useState("Tap the orb to start — I'll ask first.");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);

  const history = useRef<Bubble[]>([]);
  const phaseRef = useRef<Phase>("idle");
  const alive = useRef(true);
  const busy = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const openingUrl = useRef<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);

  const setPhaseSafe = (p: Phase) => {
    phaseRef.current = p;
    if (alive.current) setPhase(p);
  };

  const stopPlayback = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }, []);

  const stopTracks = useCallback(() => {
    try {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      });
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
      mediaRef.current = null;
      if (alive.current) setLevel(0);
    } catch {
      /* ignore */
    }
  }, []);

  const playBlob = useCallback(
    async (blob: Blob) => {
      if (!alive.current || blob.size < 32) return;
      stopPlayback();
      setPhaseSafe("speaking");
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audio.playbackRate = 1.0;
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        audio.onended = done;
        audio.onerror = done;
        audio.play().catch(done);
        setTimeout(done, 20000);
      });
      if (alive.current) setPhaseSafe("idle");
    },
    [stopPlayback]
  );

  const playText = useCallback(
    async (text: string, inlineB64?: string | null, preferCache?: string | null) => {
      if (!text || !alive.current) return;
      setPhaseSafe("speaking");

      if (preferCache) {
        try {
          await playBlob(await fetch(preferCache).then((r) => r.blob()));
          return;
        } catch {
          /* fall through */
        }
      }

      if (inlineB64) {
        try {
          await playBlob(b64ToBlob(inlineB64));
          return;
        } catch {
          /* fall through */
        }
      }

      try {
        const res = await fetch("/api/voice-speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const type = res.headers.get("content-type") || "";
        if (res.ok && type.includes("audio")) {
          const blob = await res.blob();
          if (blob.size > 0) {
            await playBlob(blob);
            return;
          }
        }
      } catch {
        /* browser fallback */
      }

      await browserSpeak(text);
      if (alive.current) setPhaseSafe("idle");
    },
    [playBlob]
  );

  // Prefetch opening audio while idle — first tap speaks immediately
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/voice-speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: OPENING }),
        });
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (blob.size < 32 || cancelled) return;
        openingUrl.current = URL.createObjectURL(blob);
      } catch {
        /* optional */
      }
    })();

    return () => {
      cancelled = true;
      alive.current = false;
      busy.current = false;
      stopTracks();
      stopPlayback();
      if (openingUrl.current) {
        URL.revokeObjectURL(openingUrl.current);
        openingUrl.current = null;
      }
    };
  }, [stopPlayback, stopTracks]);

  const pushResult = (json: Record<string, unknown>, transcript?: string) => {
    try {
      const s = Math.max(0, Math.min(100, Number(json.overall_linguistic_risk_score) || 0));
      if (alive.current) setScore(s);
      onResult({
        transcript: transcript || String(json.transcript || ""),
        urgency_language: !!json.urgency_language,
        third_party_coaching_language: !!json.third_party_coaching_language,
        mentions_gift_card_or_crypto: !!json.mentions_gift_card_or_crypto,
        mentions_remote_access: !!json.mentions_remote_access,
        secrecy_language: !!json.secrecy_language,
        overall_linguistic_risk_score: s,
        one_line_reasoning: String(json.one_line_reasoning || json.assistant_message || ""),
      });
    } catch {
      /* never crash parent */
    }
  };

  const startSession = async () => {
    if (busy.current || !alive.current) return;
    busy.current = true;
    if (alive.current) {
      setError(null);
      setBooted(true);
      setCaption(OPENING);
    }
    history.current = [{ role: "assistant", text: OPENING }];
    try {
      await playText(OPENING, null, openingUrl.current);
    } finally {
      busy.current = false;
      if (alive.current && phaseRef.current !== "speaking") setPhaseSafe("idle");
    }
  };

  const sendAudio = async (blob: Blob, mime: string) => {
    if (busy.current) return;
    busy.current = true;
    setPhaseSafe("thinking");
    if (alive.current) setCaption("Got it…");

    try {
      if (!blob || blob.size < 64) {
        const msg = "Didn't catch that — tap and try again?";
        if (alive.current) setCaption(msg);
        await playText(msg);
        return;
      }

      const fd = new FormData();
      fd.append("audio", blob, `rec.${mime.includes("webm") ? "webm" : "mp4"}`);
      fd.append(
        "history",
        JSON.stringify(history.current.map((b) => ({ role: b.role, content: b.text })))
      );

      const res = await fetch("/api/voice-turn", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      const msg = String(json.assistant_message || "Tell me a bit more?");

      if (json.transcript) {
        history.current.push({ role: "user", text: String(json.transcript) });
      }
      history.current.push({ role: "assistant", text: msg });
      if (history.current.length > 16) history.current = history.current.slice(-16);

      // Text + risk first (no gap waiting for a second speak request)
      if (alive.current) setCaption(msg);
      pushResult(json, json.transcript ? String(json.transcript) : undefined);

      await playText(msg, json.audio_base64 ? String(json.audio_base64) : null);
    } catch {
      const msg = "Something glitched — tap and say that again?";
      if (alive.current) {
        setCaption(msg);
        setError(null);
      }
      await playText(msg);
    } finally {
      busy.current = false;
      if (alive.current && phaseRef.current !== "speaking") setPhaseSafe("idle");
    }
  };

  const startListening = async () => {
    if (busy.current) return;
    if (phaseRef.current === "thinking" || phaseRef.current === "speaking") return;
    stopPlayback();
    if (alive.current) setError(null);

    if (!booted) {
      await startSession();
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (alive.current) setError("This browser can't use the mic.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const poll = () => {
          if (!analyserRef.current || !alive.current) return;
          try {
            analyserRef.current.getByteFrequencyData(data);
            setLevel(data.reduce((a, b) => a + b, 0) / data.length / 255);
          } catch {
            /* ignore */
          }
          rafRef.current = requestAnimationFrame(poll);
        };
        poll();
      } catch {
        /* visualiser optional */
      }

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";

      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        stopTracks();
        setPhaseSafe("idle");
        if (alive.current) setError("Mic glitch — tap to try again.");
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mime || "audio/webm";
        const out = new Blob(chunksRef.current, { type });
        stopTracks();
        void sendAudio(out, type);
      };
      mediaRef.current = recorder;
      recorder.start(200);
      setPhaseSafe("listening");
      if (alive.current) setCaption("Listening… tap again when you're done.");
    } catch {
      if (alive.current) {
        setError("Allow the microphone, then tap the orb.");
        setPhaseSafe("idle");
      }
    }
  };

  const stopListening = () => {
    try {
      if (mediaRef.current && mediaRef.current.state === "recording") {
        mediaRef.current.stop();
        setPhaseSafe("thinking");
      } else {
        stopTracks();
        setPhaseSafe("idle");
      }
    } catch {
      stopTracks();
      setPhaseSafe("idle");
    }
  };

  const onOrbClick = () => {
    try {
      if (phaseRef.current === "listening") stopListening();
      else if (phaseRef.current === "idle") void startListening();
    } catch {
      setPhaseSafe("idle");
    }
  };

  const pulse = phase === "listening" ? 1 + level * 0.55 : phase === "speaking" ? 1.08 : 1;
  const status =
    phase === "listening"
      ? "Listening"
      : phase === "thinking"
        ? "Working"
        : phase === "speaking"
          ? "Speaking"
          : "Tap to talk";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <button
        type="button"
        onClick={onOrbClick}
        disabled={phase === "thinking"}
        aria-label={status}
        className="group relative isolate flex h-[min(48vw,260px)] w-[min(48vw,260px)] items-center justify-center outline-none disabled:opacity-80 sm:h-[280px] sm:w-[280px]"
      >
        <span
          className="absolute inset-[-28%] blur-3xl transition-all duration-500"
          style={{
            transform: `scale(${pulse})`,
            opacity: phase === "listening" ? 0.9 : 0.65,
            background:
              phase === "listening"
                ? "radial-gradient(circle, rgba(255,90,110,0.55), rgba(124,58,237,0.2) 45%, transparent 70%)"
                : phase === "speaking"
                  ? "radial-gradient(circle, rgba(94,242,255,0.5), rgba(124,58,237,0.25) 45%, transparent 70%)"
                  : "radial-gradient(circle, rgba(167,139,250,0.55), rgba(94,242,255,0.18) 40%, transparent 70%)",
          }}
        />
        <span
          className="absolute inset-0 overflow-hidden shadow-[0_0_80px_rgba(124,58,237,0.45)] transition-transform duration-300"
          style={{
            borderRadius: "9999px",
            transform: `scale(${pulse})`,
            background:
              "radial-gradient(circle at 32% 28%, #f5e9ff 0%, #c4b5fd 18%, #8b5cf6 42%, #5b21b6 68%, #1e0b3a 100%)",
          }}
        >
          <span
            className="absolute inset-[-20%]"
            style={{
              borderRadius: "9999px",
              animation:
                phase === "speaking"
                  ? "orbSpin 4s linear infinite"
                  : phase === "idle"
                    ? "orbSpin 16s linear infinite"
                    : "orbSpin 6s linear infinite",
              background:
                "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.35) 10%, transparent 22%, rgba(94,242,255,0.4) 40%, transparent 55%, rgba(255,77,94,0.35) 75%, transparent 90%)",
              mixBlendMode: "screen",
              opacity: 0.55,
            }}
          />
          <span
            className="absolute left-[18%] top-[16%] h-[28%] w-[34%] bg-white/50 blur-xl"
            style={{ borderRadius: "9999px" }}
          />
        </span>
        <span className="relative z-10 text-[10px] font-medium uppercase tracking-[0.28em] text-white drop-shadow">
          {status}
        </span>
      </button>

      <p className="max-w-md px-4 text-center text-sm leading-relaxed text-white/80 sm:text-base">
        {caption}
      </p>

      {score != null && (
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--bp-cyan)]">
          Linguistic risk · {score}/100
        </p>
      )}

      {error && <p className="px-4 text-center text-xs text-[var(--bp-red)]">{error}</p>}

      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
        {phase === "listening" ? "Tap orb to send" : "Tap orb · natural voice"}
      </p>
    </div>
  );
}
