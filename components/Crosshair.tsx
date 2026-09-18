"use client";

import { useEffect, useState } from "react";

export function Crosshair() {
  const [pos, setPos] = useState({ x: 0, y: 0, on: false });

  useEffect(() => {
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY, on: true });
    const leave = () => setPos((p) => ({ ...p, on: false }));
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", leave);
    };
  }, []);

  if (!pos.on) return null;
  return (
    <div className="crosshair" style={{ left: pos.x, top: pos.y }} aria-hidden>
      x:{pos.x} y:{pos.y}
    </div>
  );
}
