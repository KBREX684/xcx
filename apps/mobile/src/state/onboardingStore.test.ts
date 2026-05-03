import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

import { ONBOARDING_VERSION } from "../onboarding/content";
import {
  markOnboardingComplete,
  onboardingStorageKey,
  readOnboardingState,
  resetOnboarding,
} from "./onboardingStore";

describe("onboardingStore", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("starts as incomplete when no onboarding version exists", async () => {
    await expect(readOnboardingState()).resolves.toEqual({
      version: null,
      completed: false,
    });
  });

  it("marks the current onboarding version as complete", async () => {
    await expect(markOnboardingComplete()).resolves.toEqual({
      version: ONBOARDING_VERSION,
      completed: true,
    });
    await expect(readOnboardingState()).resolves.toEqual({
      version: ONBOARDING_VERSION,
      completed: true,
    });
  });

  it("treats older onboarding versions as incomplete", async () => {
    storage.set(onboardingStorageKey, "2026-01-01");

    await expect(readOnboardingState()).resolves.toEqual({
      version: "2026-01-01",
      completed: false,
    });
  });

  it("can reset the replayable intro flag without touching other storage", async () => {
    storage.set(onboardingStorageKey, ONBOARDING_VERSION);
    storage.set("acp.consent.version", "keep");

    await resetOnboarding();

    expect(storage.has(onboardingStorageKey)).toBe(false);
    expect(storage.get("acp.consent.version")).toBe("keep");
  });
});
