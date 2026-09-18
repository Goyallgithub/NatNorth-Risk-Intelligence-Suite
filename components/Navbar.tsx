"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <header className="poster-nav">
      <div className="poster-nav__inner">
        <Link href="/" className="poster-wordmark" aria-label="NatNorth home">
          NAT<span>NORTH</span>
          <small>RISK INTELLIGENCE</small>
        </Link>

        <nav className="poster-nav__links" aria-label="Primary navigation">
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
                  "poster-nav__link",
                  active && "is-active"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="poster-nav__mobile">
          <label htmlFor="mobile-nav" className="sr-only">Navigate to</label>
          <select
            id="mobile-nav"
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
