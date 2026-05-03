import type { CSSProperties, ReactNode } from "react";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { controlPlaneTypography } from "@agent-control-plane/ui";
import "./globals.css";
import "@agent-control-plane/ui/tokens.css";

const themeStorageKey = "acp-theme-preference";

const rootVariables: CSSProperties = {
  ["--font-display" as string]: controlPlaneTypography.display,
  ["--font-body" as string]: controlPlaneTypography.body,
  ["--font-mono" as string]: controlPlaneTypography.mono,
};

export const metadata = {
  title: "蜂聚合指挥台",
  description: "蜂聚合智能体交付控制台，管理项目、任务、审批与证明。",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(themeStorageKey)?.value;
  const initialTheme = themeCookie === "light" || themeCookie === "dark" ? themeCookie : undefined;

  return (
    <html lang="zh-CN" suppressHydrationWarning style={rootVariables} data-theme={initialTheme}>
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
