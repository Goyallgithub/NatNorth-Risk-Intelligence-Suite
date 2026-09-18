import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  serial,
}: {
  children: ReactNode;
  className?: string;
  serial?: string;
}) {
  return (
    <section className={cn("bp-panel draw-in", className)}>
      {serial && <p className="bp-label mb-2">[{serial}]</p>}
      <span className="bp-corner-bl" />
      <span className="bp-corner-br" />
      {children}
    </section>
  );
}

export function StampLink({
  href,
  children,
  hot = false,
  className,
}: {
  href: string;
  children: ReactNode;
  hot?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("bp-stamp", hot && "bp-stamp-hot", className)}>
      {children}
    </Link>
  );
}
