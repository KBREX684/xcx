import type { CSSProperties, ReactNode } from "react";
import { controlPlaneTypography } from "@agent-control-plane/ui";
import "./globals.css";

const rootVariables: CSSProperties = {
  ["--font-display" as string]: controlPlaneTypography.display,
  ["--font-body" as string]: controlPlaneTypography.body,
  ["--font-mono" as string]: controlPlaneTypography.mono
};

const themeBootScript = `
(() => {
  const key = "acp-theme-preference";
  const root = document.documentElement;
  try {
    const preference = localStorage.getItem(key) || "system";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const resolved = preference === "system" ? (media.matches ? "dark" : "light") : preference;
    root.dataset.themePreference = preference;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  } catch {
    root.dataset.themePreference = "system";
    root.dataset.theme = "light";
    root.style.colorScheme = "light";
  }
})();
`;

export const metadata = {
  title: "智能代理指挥台",
  description: "全中文、可切换明暗主题的 AI Agent 控制台"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning style={rootVariables}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
