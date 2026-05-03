import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    getAllKeys: vi.fn(async () => Array.from(storage.keys())),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

import { staleCache } from "./staleCache";
import { setStaleCacheObserver, type StaleCacheObservation } from "./staleCache";

describe("staleCache", () => {
  beforeEach(() => {
    storage.clear();
    setStaleCacheObserver(null);
    vi.useRealTimers();
  });

  it("returns only fresh scoped cache entries", async () => {
    await staleCache.write("home.mem_1", { count: 1 });

    await expect(staleCache.read<{ count: number }>("home.mem_1")).resolves.toMatchObject({
      data: { count: 1 },
      stale: true,
    });
    await expect(staleCache.read("home.mem_2")).resolves.toBeNull();
  });

  it("clears only ACP cache keys", async () => {
    await staleCache.write("agents.mem_1", [{ id: "agt_1" }]);
    storage.set("other.product.key", "keep");

    await staleCache.clearAll();

    expect(storage.has("acp.cache.v1.agents.mem_1")).toBe(false);
    expect(storage.get("other.product.key")).toBe("keep");
  });

  it("emits hit / miss / expired / corrupt observations", async () => {
    const events: StaleCacheObservation[] = [];
    setStaleCacheObserver((e) => events.push(e));

    // miss
    await staleCache.read("home.mem_x");
    // hit
    await staleCache.write("home.mem_y", { v: 1 });
    await staleCache.read("home.mem_y");
    // expired (mock 25h ago)
    storage.set(
      "acp.cache.v1.home.mem_z",
      JSON.stringify({ data: { v: 2 }, savedAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(), schemaVersion: 1 }),
    );
    await staleCache.read("home.mem_z");
    // corrupt (bad json)
    storage.set("acp.cache.v1.home.mem_bad", "{not json");
    await staleCache.read("home.mem_bad");

    const outcomes = events.map((e) => e.outcome);
    expect(outcomes).toEqual(["miss", "hit", "expired", "corrupt"]);
  });

  it("treats schemaVersion mismatch as corrupt", async () => {
    storage.set(
      "acp.cache.v1.home.mem_v0",
      JSON.stringify({ data: { v: 1 }, savedAt: new Date().toISOString(), schemaVersion: 0 }),
    );
    const events: StaleCacheObservation[] = [];
    setStaleCacheObserver((e) => events.push(e));
    await staleCache.read("home.mem_v0");
    expect(events).toEqual([{ scope: "home.mem_v0", outcome: "corrupt" }]);
  });
});
