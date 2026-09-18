import type { Metadata } from "next";
import { Architects_Daughter, Roboto_Mono } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

const mono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const note = Architects_Daughter({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-note",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NatNorth | Risk Intelligence",
  description:
    "Explainable banking risk OS: fraud scoring, merchant categorisation, SME early-warning, and voice coercion checks.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${mono.variable} ${note.variable} site-shell`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
