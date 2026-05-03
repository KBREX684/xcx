"use client";

import { useSyncExternalStore, useEffect, useState } from "react";
import { navStore } from "./nav-store";

/**
 * Linear 风格的 1px 顶部进度线。
 *
 * 设计原则：
 * - 严禁旋转/骨架；仅一根 1px 渐变细线。
 * - pending=true 时立即从 0% 渐入 → 缓动到 70% 暂留（暗示"还在推进"）。
 * - pending=false 时跳到 100% → 透明度淡出 → 复位。
 * - prefers-reduced-motion: 立即出现/消失，无过渡。
 *
 * 与 useTransition 协同：sidebar 在 click 时 setPendingHref；路由跳转完成后
 * sidebar 的 pathname useEffect 会清掉 pendingHref，这里随即收尾。
 */
export function TopProgress() {
  const snapshot = useSyncExternalStore(
    navStore.subscribe,
    navStore.getSnapshot,
    navStore.getServerSnapshot,
  );
  const isPending = snapshot.pendingHref !== null;
  const [phase, setPhase] = useState<"idle" | "running" | "settling">("idle");

  useEffect(() => {
    if (isPending) {
      setPhase("running");
      return;
    }
    if (phase === "running") {
      setPhase("settling");
      const t = window.setTimeout(() => setPhase("idle"), 220);
      return () => window.clearTimeout(t);
    }
  }, [isPending, phase]);

  if (phase === "idle") return null;

  return (
    <div
      className="top-progress"
      data-phase={phase}
      role="progressbar"
      aria-busy={isPending}
      aria-label="页面切换中"
    >
      <span className="top-progress-bar" />
    </div>
  );
}
