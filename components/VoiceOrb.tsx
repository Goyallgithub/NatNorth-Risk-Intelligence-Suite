"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

type VoiceResult = {
  transcript: string;
  urgency_language: boolean;
  third_party_coaching_language: boolean;
  mentions_gift_card_or_crypto: boolean;
  mentions_remote_access: boolean;
  secrecy_language: boolean;
  overall_linguistic_risk_score: number;
  one_line_reasoning: string;
};

export function VoiceOrb({
  onResult,
}: {
  onResult: (result: VoiceResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const volumeRef = useRef(0);

  // Premium reactive orb animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let t = 0;
    const dpr = window.devicePixelRatio || 1;
    const size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const draw = () => {
      t += 0.02;
      const vol = volumeRef.current;
      const pulse = recording
        ? 1 + vol * 0.55 + Math.sin(t * 2.2) * 0.04
        : 1 + Math.sin(t) * 0.03;

      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      // Outer glow rings
      for (let i = 3; i >= 1; i--) {
        const r = 70 * pulse + i * 14 + vol * 20;
        const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
        g.addColorStop(0, `rgba(90,40,125,${0.18 - i * 0.04 + vol * 0.15})`);
        g.addColorStop(1, "rgba(90,40,125,0)");
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      // Morphing blob via layered circles
      const baseR = 58 * pulse;
      const grad = ctx.createRadialGradient(
        cx - 12,
        cy - 16,
        8,
        cx,
        cy,
        baseR * 1.2
      );
      grad.addColorStop(0, "#9B6BB8");
      grad.addColorStop(0.45, "#5A287D");
      grad.addColorStop(1, "#3D1A56");

      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.08) {
        const wobble =
          Math.sin(a * 3 + t * 1.4) * (4 + vol * 10) +
          Math.cos(a * 5 - t * 1.1) * (3 + vol * 6);
        const r = baseR + wobble;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.shadowColor = `rgba(90,40,125,${0.45 + vol * 0.4})`;
      ctx.shadowBlur = 28 + vol * 40;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner highlight
      ctx.beginPath();
      ctx.arc(cx - 14, cy - 18, 16, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [recording]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        volumeRef.current = avg;
        setVolume(avg);
        if (recording || mediaRef.current?.state === "recording") {
          requestAnimationFrame(poll);
        }
      };

      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        setLoading(true);
        try {
          const blob = new Blob(chunksRef.current, { type: mime });
          const fd = new FormData();
          fd.append("audio", blob, `recording.${mime.includes("webm") ? "webm" : "mp4"}`);
          const res = await fetch("/api/voice-risk", { method: "POST", body: fd });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Voice analysis failed");
          onResult(json as VoiceResult);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Voice analysis failed");
        } finally {
          setLoading(false);
          stopTracks();
          volumeRef.current = 0;
          setVolume(0);
        }
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
      requestAnimationFrame(poll);
    } catch {
      setError("Microphone access denied. Allow mic permissions to use Voice Payment Check.");
    }
  }, [onResult, recording]);

  const stopRecording = () => {
    setRecording(false);
    mediaRef.current?.stop();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <canvas ref={canvasRef} className="drop-shadow-xl" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white drop-shadow" />
          </div>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={recording ? stopRecording : startRecording}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition ${
          recording
            ? "bg-natnorth-coral shadow-natnorth-coral/30"
            : "bg-natnorth-purple shadow-natnorth-purple/30 hover:bg-natnorth-purple-dark"
        } disabled:opacity-60`}
      >
        {recording ? (
          <>
            <Square className="h-4 w-4 fill-current" /> Stop & Analyse
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" /> Record Voice Check
          </>
        )}
      </motion.button>

      {recording && (
        <p className="text-xs text-natnorth-muted">
          Listening… amplitude {(volume * 100).toFixed(0)}%
        </p>
      )}
      {error && (
        <p className="max-w-sm text-center text-xs text-natnorth-coral">{error}</p>
      )}
      <p className="max-w-md text-center text-[11px] leading-relaxed text-natnorth-muted">
        Speaks to OpenAI Whisper for transcription, then GPT-4o-mini extracts
        linguistic coercion signals (urgency, gift-card/crypto, remote access,
        secrecy, third-party coaching). Requires OPENAI_API_KEY.
      </p>
    </div>
  );
}
