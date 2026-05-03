"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && typeof console !== "undefined") {
      console.error("[route-error]", error);
    }
  }, [error]);

  return (
    <main className="not-found-shell" role="alert">
      <section className="not-found-panel">
        <p className="eyebrow-text">出错了</p>
        <h1 className="page-title">页面未能加载</h1>
        <p className="page-description">
          服务暂时无法响应，可能是网络抖动或数据暂时缺失。可以重试或回到工作台继续其它工作。
        </p>
        {error?.digest ? (
          <p className="page-description" style={{ fontSize: "0.75rem", opacity: 0.7 }}>
            错误编号：{error.digest}
          </p>
        ) : null}
        <div className="link-row">
          <button type="button" className="action-button" onClick={() => reset()}>
            重新加载
          </button>
          <Link href="/" className="ghost-link">
            返回工作台
          </Link>
        </div>
      </section>
    </main>
  );
}
