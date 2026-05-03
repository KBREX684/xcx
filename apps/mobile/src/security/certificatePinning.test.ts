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

import {
  DEFAULT_POLICY,
  evaluatePinning,
  pinningStore,
  setPinningObserver,
  shouldBlock,
  type PinningEvent,
  type PinningPolicy,
} from "./certificatePinning";

const VALID_SHA = "a".repeat(64);
const OTHER_SHA = "b".repeat(64);

const policy: PinningPolicy = {
  mode: "enforce",
  expectedSha256: [VALID_SHA],
  hosts: ["api.example.com"],
  version: 1,
};

describe("certificatePinning", () => {
  beforeEach(async () => {
    storage.clear();
    setPinningObserver(null);
    await pinningStore.clear();
  });

  it("defaults to OFF and treats every evaluation as out_of_scope", async () => {
    await pinningStore.load();
    expect(pinningStore.current()).toEqual(DEFAULT_POLICY);
    expect(evaluatePinning("api.example.com", VALID_SHA)).toBe("out_of_scope");
  });

  it("rejects older versions when saving (anti-rollback)", async () => {
    await pinningStore.save(policy);
    const older: PinningPolicy = { ...policy, version: 0, expectedSha256: [OTHER_SHA] };
    await pinningStore.save(older);
    expect(pinningStore.current().version).toBe(1);
    expect(pinningStore.current().expectedSha256).toEqual([VALID_SHA]);
  });

  it("evaluates allow / violation / unverifiable", async () => {
    await pinningStore.save(policy);
    expect(evaluatePinning("api.example.com", VALID_SHA)).toBe("allow");
    expect(evaluatePinning("api.example.com", OTHER_SHA)).toBe("violation");
    expect(evaluatePinning("api.example.com")).toBe("unverifiable");
    expect(evaluatePinning("other.example.com", VALID_SHA)).toBe("out_of_scope");
  });

  it("blocks only when mode=enforce and outcome=violation", () => {
    expect(shouldBlock("violation", "enforce")).toBe(true);
    expect(shouldBlock("violation", "report")).toBe(false);
    expect(shouldBlock("allow", "enforce")).toBe(false);
    expect(shouldBlock("unverifiable", "enforce")).toBe(false);
  });

  it("emits policy_loaded / policy_updated / evaluation events", async () => {
    const events: PinningEvent[] = [];
    setPinningObserver((e) => events.push(e));
    await pinningStore.load();
    await pinningStore.save(policy);
    evaluatePinning("api.example.com", VALID_SHA);
    expect(events.map((e) => e.kind)).toEqual(["policy_loaded", "policy_updated", "evaluation"]);
  });

  it("treats out-of-window policies as out_of_window", async () => {
    await pinningStore.save({
      ...policy,
      version: 2,
      notAfter: new Date(Date.now() - 1000).toISOString(),
    });
    expect(evaluatePinning("api.example.com", VALID_SHA)).toBe("out_of_window");
  });

  it("ignores corrupt persisted policy and falls back to default", async () => {
    storage.set("acp.security.pinning.v1", "{not json");
    await pinningStore.load();
    expect(pinningStore.current()).toEqual(DEFAULT_POLICY);
  });
});
