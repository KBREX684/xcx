"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

const storageKey = "acp-theme-preference";
type ThemeMode = "light" | "dark";

function applyTheme(nextTheme: ThemeMode) {
  const root = document.documentElement;
  root.dataset.themePreference = nextTheme;
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;
  localStorage.setItem(storageKey, nextTheme);
  return nextTheme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const initial = (document.documentElement.dataset.theme as ThemeMode | undefined) ?? "light";
    setTheme(initial);
  }, []);

  function handleToggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(applyTheme(nextTheme));
  }

  const Icon = theme === "dark" ? SunIcon : MoonIcon;
  const nextThemeLabel = theme === "dark" ? "浅色" : "深色";

  return (
    <button
      type="button"
      className="theme-toggle-trigger"
      aria-label={`切换到${nextThemeLabel}主题`}
      title={`切换到${nextThemeLabel}主题`}
      onClick={handleToggleTheme}
    >
      <Icon className="theme-toggle-glyph" />
    </button>
  );
}
