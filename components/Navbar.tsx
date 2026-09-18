"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/payment-shield", label: "Payment Shield" },
  { href: "/categorizer", label: "Smart Categorizer" },
  { href: "/sme-pulse", label: "SME Pulse" },
  { href: "/evaluation", label: "Model Evaluation" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-natnorth-border/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-natnorth-purple text-white shadow-md shadow-natnorth-purple/25 transition group-hover:scale-105">
            <Shield className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold tracking-tight text-natnorth-purple">
              NatNorth
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-natnorth-muted">
              Risk Intelligence
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-natnorth-purple"
                    : "text-natnorth-muted hover:text-natnorth-charcoal"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg bg-natnorth-purple-soft"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex md:hidden">
          <select
            className="rounded-lg border border-natnorth-border bg-white px-2 py-1.5 text-sm text-natnorth-charcoal"
            value={pathname}
            onChange={(e) => {
              window.location.href = e.target.value;
            }}
          >
            {NAV.map((item) => (
              <option key={item.href} value={item.href}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
