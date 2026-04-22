import type { CSSProperties, ReactNode } from "react";
import { Bricolage_Grotesque, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { controlPlaneTheme } from "@agent-control-plane/ui";
import "./globals.css";

const displayFont = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600"]
});

const bodyFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

const themeVariables: CSSProperties = {
  ["--canvas" as string]: controlPlaneTheme.palette.canvas,
  ["--paper" as string]: controlPlaneTheme.palette.paper,
  ["--ink" as string]: controlPlaneTheme.palette.ink,
  ["--charcoal" as string]: controlPlaneTheme.palette.charcoal,
  ["--steel" as string]: controlPlaneTheme.palette.steel,
  ["--copper" as string]: controlPlaneTheme.palette.copper,
  ["--moss" as string]: controlPlaneTheme.palette.moss,
  ["--signal" as string]: controlPlaneTheme.palette.signal,
  ["--border" as string]: controlPlaneTheme.palette.border,
  ["--haze" as string]: controlPlaneTheme.palette.haze,
  ["--halo-gradient" as string]: controlPlaneTheme.gradients.halo,
  ["--panel-gradient" as string]: controlPlaneTheme.gradients.panel,
  ["--soft-shadow" as string]: controlPlaneTheme.shadows.soft,
  ["--line-shadow" as string]: controlPlaneTheme.shadows.line
};

export const metadata = {
  title: "Agent 指挥台 P1",
  description: "Agent 指挥台 MVP P1 控制台"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" style={themeVariables}>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
        {children}
      </body>
    </html>
  );
}

