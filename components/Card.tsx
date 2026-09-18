import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Blueprint";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <Panel className={cn(className)}>{children}</Panel>;
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 max-w-3xl">
      {eyebrow && <p className="bp-label mb-2">{eyebrow}</p>}
      <h2 className="text-xl font-bold uppercase tracking-wide sm:text-2xl">{title}</h2>
      {subtitle && <p className="bp-body mt-2">{subtitle}</p>}
    </div>
  );
}
