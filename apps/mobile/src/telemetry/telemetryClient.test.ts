import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());
const api = vi.hoisted(() => ({
  request: vi.fn(async () => ({ ok: true, data: null })),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

vi.mock("../config/env", () => ({
  env: {
    apiBaseUrl: "https://api.test",
    appVersion: "0.1.0",
    channel: "yingyongbao",
    privacyVersion: "2026-04-26",
  },
}));

vi.mock("../storage/deviceIdStore", () => ({
  getStableDeviceId: vi.fn(async () => "device_1"),
}));

vi.mock("../services/apiClient", () => ({
  apiClient: api,
}));

import { telemetryClient } from "./telemetryClient";

describe("telemetryClient", () => {
  beforeEach(() => {
    storage.clear();
    api.request.mockClear();
    telemetryClient.setConsentEnabled(true);
  });

  it("sanitizes sensitive attrs before flushing telemetry", async () => {
    await telemetryClient.track("login_failure", {
      outcome: "error",
      attrs: {
        screen: "login",
        accessToken: "secret-token",
        userEmail: "owner@example.com",
        phone: "13800138000",
        nested: { unsafe: true },
      },
    });
    await telemetryClient.stop();

    expect(api.request).toHaveBeenCalledTimes(1);
    const firstCall = api.request.mock.calls[0] as unknown as
      | [
          {
            body: { events: Array<{ attrs?: Record<string, unknown> }> };
          },
        ]
      | undefined;
    expect(firstCall).toBeDefined();
    if (!firstCall) throw new Error("expected telemetry request");
    const request = firstCall[0];
    expect(request.body.events[0]?.attrs).toEqual({ screen: "login" });
  });

  it("does not enqueue events before consent", async () => {
    telemetryClient.setConsentEnabled(false);
    await telemetryClient.track("login_success");
    await telemetryClient.stop();

    expect(api.request).not.toHaveBeenCalled();
  });
});
