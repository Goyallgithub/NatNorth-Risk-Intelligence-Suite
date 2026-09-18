import type { Metadata } from "next";
import { Anton, Archivo, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NatNorth | Risk Intelligence Suite",
  description:
    "NatNorth Risk Intelligence Suite: APP fraud detection, transaction categorisation, and SME early-warning models for a data science portfolio.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${anton.variable} ${jetbrainsMono.variable} min-h-screen bg-natnorth-cream font-sans antialiased`}>
        <Navbar />
        <main className="site-main">{children}</main>
        <footer className="poster-footer">
          <span>NatNorth Risk Intelligence Suite</span>
          <span>Bhavya Goyal</span>
          <span>Synthetic data / offline-trained ML</span>
        </footer>
      </body>
    </html>
  );
}
