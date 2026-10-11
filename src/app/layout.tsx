import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const display = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", weight: ["400", "500", "600", "700", "800", "900"], display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], variable: "--font-instrument-serif", weight: "400", style: ["normal", "italic"], display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "TREND//RADAR — Know what's about to trend", template: "%s · TREND//RADAR" },
  description: "Pattern-level YouTube intelligence for creators: live topic clusters, momentum, and a Sunday brief that says what to film next.",
};

export const viewport: Viewport = { themeColor: "#0b0b0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
