"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "@agent-control-plane/ui";
import { MoonIcon, SunIcon } from "./icons";

const storageKey = "acp-theme-preference";
const themeCookieMaxAge = 60 * 60 * 24 * 365;
type ThemeMode = "light" | "dark";

function getSystemTheme(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function persistTheme(nextTheme: ThemeMode) {
  localStorage.setItem(storageKey, nextTheme);
  document.cookie = `${storageKey}=${nextTheme}; path=/; max-age=${themeCookieMaxAge}; samesite=lax`;
}

function applyTheme(nextTheme: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;
  persistTheme(nextTheme);
  return nextTheme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem(storageKey);
    const storedTheme = stored === "light" || stored === "dark" ? stored : null;
    const serverTheme =
      root.dataset.theme === "light" || root.dataset.theme === "dark" ? root.dataset.theme : null;
    const initial = storedTheme ?? serverTheme ?? getSystemTheme();

    root.style.colorScheme = initial;

    if (!serverTheme || serverTheme !== initial) {
      root.dataset.theme = initial;
    }

    if (storedTheme !== initial) {
      persistTheme(initial);
    }

    setTheme(initial);
  }, []);

  function handleToggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(applyTheme(nextTheme));
  }

  const Icon = theme === "dark" ? SunIcon : MoonIcon;
  const nextThemeLabel = theme === "dark" ? "浅色" : "深色";

  return (
    <Tooltip content={`切换到${nextThemeLabel}主题`}>
      <button
        type="button"
        className="theme-toggle-trigger"
        aria-label={`切换到${nextThemeLabel}主题`}
        onClick={handleToggleTheme}
      >
        <Icon className="theme-toggle-glyph" />
      </button>
    </Tooltip>
  );
}
