"use client";

import { useEffect, useRef, useState } from "react";
import type { ThemePreference } from "@agent-control-plane/domain";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

const storageKey = "acp-theme-preference";

const options: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof MonitorIcon;
}> = [
  { value: "system", label: "跟随系统", description: "自动匹配当前设备外观。", icon: MonitorIcon },
  { value: "light", label: "浅色主题", description: "适合白天与高亮环境。", icon: SunIcon },
  { value: "dark", label: "深色主题", description: "降低夜间使用时的视觉刺激。", icon: MoonIcon }
];

function resolveTheme(preference: ThemePreference) {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return preference;
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  localStorage.setItem(storageKey, preference);
  return resolved;
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const preferenceRef = useRef<ThemePreference>("system");

  useEffect(() => {
    const initial = (document.documentElement.dataset.themePreference as ThemePreference | undefined) ?? "system";
    preferenceRef.current = initial;
    setPreference(initial);
    setResolved((document.documentElement.dataset.theme as "light" | "dark" | undefined) ?? "light");
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (preferenceRef.current === "system") {
        setResolved(applyTheme("system"));
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  function handleSelect(nextPreference: ThemePreference) {
    preferenceRef.current = nextPreference;
    setPreference(nextPreference);
    setResolved(applyTheme(nextPreference));
    detailsRef.current?.removeAttribute("open");
  }

  const ResolvedIcon = resolved === "dark" ? MoonIcon : SunIcon;

  return (
    <details ref={detailsRef} className="theme-toggle">
      <summary className="theme-toggle-trigger" aria-label="切换主题">
        <ResolvedIcon className="theme-toggle-glyph" />
      </summary>

      <div className="theme-toggle-popover" role="menu" aria-label="主题模式">
        <div className="theme-toggle-header">
          <span className="theme-toggle-caption">界面主题</span>
          <span className="theme-toggle-state">当前为 {resolved === "dark" ? "深色" : "浅色"}</span>
        </div>

        <div className="theme-toggle-stack">
          {options.map((option) => {
            const OptionIcon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                className="theme-toggle-option"
                data-active={preference === option.value ? "true" : "false"}
                onClick={() => handleSelect(option.value)}
              >
                <span className="theme-toggle-option-icon">
                  <OptionIcon />
                </span>
                <span className="theme-toggle-option-copy">
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}
