import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NatNorth | Risk Intelligence Suite",
  description:
    "NatNorth Risk Intelligence Suite — APP fraud detection, transaction categorisation, and SME early-warning models for a data science portfolio.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} min-h-screen bg-natnorth-cream font-sans antialiased`}>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-natnorth-border/80 bg-white/60 py-8 text-center text-xs text-natnorth-muted">
          NatNorth Risk Intelligence Suite · Portfolio project by Bhavya Goyal · Synthetic data · Offline-trained ML
        </footer>
      </body>
    </html>
  );
}
