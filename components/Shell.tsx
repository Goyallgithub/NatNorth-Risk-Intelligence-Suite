"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Crosshair } from "@/components/Crosshair";
import { BootSplash } from "@/components/BootSplash";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDash = pathname === "/";

  return (
    <>
      <BootSplash />
      <Crosshair />
      <Navbar />
      <main className="site-main">{children}</main>
      {!isDash && (
        <footer className="border-t border-white/15 px-[clamp(0.75rem,2vw,1.5rem)] py-2.5 text-center text-[10px] uppercase tracking-[0.2em] text-white/45">
          NatNorth Risk Intelligence · Offline ML · Live LR + Voice
        </footer>
      )}
    </>
  );
}
