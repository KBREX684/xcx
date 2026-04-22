"use client";

import { useEffect, useRef, useState } from "react";
import type { ThemePreference } from "@agent-control-plane/domain";

const storageKey = "acp-theme-preference";

const options: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" }
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
  }

  return (
    <div className="theme-toggle" aria-label="主题切换">
      <span className="theme-toggle-caption">主题</span>
      <div className="theme-toggle-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="theme-toggle-button"
            data-active={preference === option.value ? "true" : "false"}
            onClick={() => handleSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <span className="theme-toggle-state">当前 {resolved === "dark" ? "深色" : "浅色"}</span>
    </div>
  );
}
