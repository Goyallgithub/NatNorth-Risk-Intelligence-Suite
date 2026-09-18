"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", code: "00" },
  { href: "/payment-shield", label: "Payment Shield", code: "01" },
  { href: "/categorizer", label: "Categorizer", code: "02" },
  { href: "/sme-pulse", label: "SME Pulse", code: "03" },
  { href: "/lab", label: "Model Lab", code: "04" },
  { href: "/about", label: "About", code: "05" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const menu =
    mounted &&
    open &&
    createPortal(
      <div className="nav-sheet lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
        <div className="nav-sheet-grid" aria-hidden />
        <div className="nav-sheet-top">
          <span className="text-sm font-bold uppercase tracking-[0.16em]">
            NAT<span className="text-[var(--bp-red)]">NORTH</span>
          </span>
          <button
            type="button"
            aria-label="Close menu"
            className="nav-burger is-open"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="nav-sheet-links">
          {NAV.map((item, i) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("nav-sheet-link", active && "is-active")}
                style={{ animationDelay: `${80 + i * 45}ms` }}
                onClick={() => setOpen(false)}
              >
                <span className="nav-sheet-code">{item.code}</span>
                <span className="nav-sheet-label">{item.label}</span>
                <span className="nav-sheet-arrow" aria-hidden>
                  →
                </span>
              </Link>
            );
          })}
        </nav>
        <p className="nav-sheet-foot">Risk intelligence · offline ML · live scoring</p>
      </div>,
      document.body
    );

  return (
    <header className="sticky top-0 z-[60] border-b border-white/15 bg-[#0c0518]/95 backdrop-blur-xl">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-sm font-bold uppercase tracking-[0.16em]">
            NAT<span className="text-[var(--bp-red)]">NORTH</span>
          </span>
          <span className="hidden text-[9px] uppercase tracking-[0.22em] text-[var(--bp-cyan)] sm:inline">
            Risk OS
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-white",
                  active && "text-[var(--bp-cyan)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className={cn("nav-burger lg:hidden", open && "is-open")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menu}
    </header>
  );
}
