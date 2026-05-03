import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const secureStore = vi.hoisted(() => ({
  session: null as null | {
    accessToken: string;
    refreshToken: string;
    memberId: string;
    role: string;
    name: string;
  },
  writes: [] as unknown[],
  clearCount: 0,
}));

vi.mock("../config/env", () => ({
  env: {
    apiBaseUrl: "https://api.test",
    appVersion: "0.1.0",
    channel: "yingyongbao",
    privacyVersion: "2026-04-26",
  },
}));

vi.mock("../storage/secureTokenStore", () => ({
  readSession: vi.fn(async () => secureStore.session),
  writeSession: vi.fn(async (session: typeof secureStore.session) => {
    secureStore.session = session;
    secureStore.writes.push(session);
  }),
  clearSession: vi.fn(async () => {
    secureStore.session = null;
    secureStore.clearCount += 1;
  }),
}));

import { apiClient } from "./apiClient";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

describe("mobile apiClient", () => {
  beforeEach(() => {
    secureStore.session = {
      accessToken: "access.old",
      refreshToken: "refresh.old",
      memberId: "mem_1",
      role: "admin",
      name: "Mobile Admin",
    };
    secureStore.writes = [];
    secureStore.clearCount = 0;
    vi.restoreAllMocks();
  });

  it("attaches mobile headers and parses response envelopes", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ data: { value: "ok" } }, { headers: { "x-trace-id": "tr_1" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await apiClient.request({
      path: "/api/v1/mobile/ping",
      query: { page: 1 },
      schema: z.object({ value: z.literal("ok") }),
    });

    expect(res).toEqual({ ok: true, data: { value: "ok" } });
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [url, init] = firstCall as unknown as [string, RequestInit];
    expect(url).toBe("https://api.test/api/v1/mobile/ping?page=1");
    expect(init.headers).toMatchObject({
      authorization: "Bearer access.old",
      "x-app-platform": "android",
      "x-app-version": "0.1.0",
      "x-app-channel": "yingyongbao",
    });
    expect((init.headers as Record<string, string>)["x-client-request-id"]).toMatch(/^mb:/);
  });

  it("serializes concurrent refresh requests after 401", async () => {
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return jsonResponse({
          accessToken: "access.new",
          refreshToken: "refresh.new",
          memberId: "mem_1",
          role: "admin",
          name: "Mobile Admin",
        });
      }
      const auth = (init?.headers as Record<string, string>).authorization;
      if (auth === "Bearer access.old") return jsonResponse({ message: "expired" }, { status: 401 });
      return jsonResponse({ data: { value: "ok" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      apiClient.request({ path: "/api/v1/mobile/protected", schema: z.object({ value: z.string() }) }),
      apiClient.request({ path: "/api/v1/mobile/protected", schema: z.object({ value: z.string() }) }),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(secureStore.session?.accessToken).toBe("access.new");
  });

  it("maps schema mismatches to validation errors", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: { value: 123 } }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await apiClient.request({
      path: "/api/v1/mobile/bad",
      schema: z.object({ value: z.string() }),
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("VALIDATION");
    }
  });

  it("clears session and returns 401 when refresh itself fails", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        return jsonResponse({ message: "refresh denied" }, { status: 401 });
      }
      return jsonResponse({ message: "expired" }, { status: 401 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await apiClient.request({
      path: "/api/v1/mobile/protected",
      schema: z.object({ value: z.string() }),
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.status).toBe(401);
    expect(secureStore.session).toBeNull();
    expect(secureStore.clearCount).toBeGreaterThan(0);
  });

  it("issues distinct idempotency client request ids on retries", async () => {
    const seen: string[] = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const id = (init?.headers as Record<string, string>)["x-client-request-id"];
      if (id) seen.push(id);
      return jsonResponse({ data: { value: "ok" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const r1 = await apiClient.request({
      path: "/api/v1/mobile/approvals/approve",
      method: "POST",
      idempotencyPrefix: "approval",
      schema: z.object({ value: z.string() }),
    });
    const r2 = await apiClient.request({
      path: "/api/v1/mobile/approvals/approve",
      method: "POST",
      idempotencyPrefix: "approval",
      schema: z.object({ value: z.string() }),
    });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[0]).toMatch(/^approval:/);
    expect(seen[1]).toMatch(/^approval:/);
  });

  it("returns NETWORK_TIMEOUT when fetch is aborted", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err: Error & { name?: string } = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await apiClient.request({
      path: "/api/v1/mobile/slow",
      schema: z.object({ value: z.string() }),
      timeoutMs: 5,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("NETWORK_TIMEOUT");
  });
});
