"use client";

import { useEffect } from "react";
import { ErrorBanner } from "@agent-control-plane/ui";

/**
 * Reusable client error boundary content for route-level `error.tsx`.
 *
 * Wraps the shared `ErrorBanner` with the standard reset action and a
 * console log so production errors land in the browser logger / Sentry.
 */
export function RouteErrorView({
  area,
  error,
  reset,
}: {
  area: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error to the client logger; Next.js already attaches
    // `digest` for server errors so we forward it for cross-referencing.
    console.error(`[route:${area}]`, error);
  }, [area, error]);

  return (
    <div style={{ padding: "var(--acp-space-lg, 1.5rem)" }}>
      <ErrorBanner
        title={`${area}加载失败`}
        message={
          error?.message
            ? `${error.message}${error.digest ? `（错误编号：${error.digest}）` : ""}`
            : "请稍后重试，若问题持续请联系运维。"
        }
        action={
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "var(--acp-radius-md, 0.5rem)",
              border: "1px solid currentColor",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            重试
          </button>
        }
      />
    </div>
  );
}
