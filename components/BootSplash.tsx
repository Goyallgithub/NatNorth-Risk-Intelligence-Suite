"use client";

import { useEffect, useState } from "react";

const BOOT_MS = 2000;
const KEY = "natnorth-booted";

export function BootSplash() {
  const [phase, setPhase] = useState<"check" | "boot" | "out" | "done">("check");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
    } catch {
      /* ignore */
    }

    if (seen) {
      setPhase("done");
      return;
    }

    setPhase("boot");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduce ? 350 : BOOT_MS;
    const outAt = window.setTimeout(() => setPhase("out"), hold);
    const doneAt = window.setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
    }, hold + 420);

    return () => {
      window.clearTimeout(outAt);
      window.clearTimeout(doneAt);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={phase === "out" ? "boot-splash is-out" : "boot-splash"}
      aria-hidden={phase !== "boot"}
      role="presentation"
    >
      {phase !== "check" && (
        <>
          <div className="boot-grid" />
          <div className="boot-frame">
            <span className="boot-corner tl" />
            <span className="boot-corner tr" />
            <span className="boot-corner bl" />
            <span className="boot-corner br" />
            <p className="boot-kicker">System init</p>
            <h1 className="boot-brand">
              NAT<span>NORTH</span>
            </h1>
            <p className="boot-sub">Risk Intelligence Suite</p>
            <div className="boot-bar">
              <span className="boot-bar-fill" />
            </div>
            <p className="boot-status">Calibrating models · fraud · spend · SME</p>
          </div>
          <div className="boot-scan" />
        </>
      )}
    </div>
  );
}
