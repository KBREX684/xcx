import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenTimestampsAnchorProvider, SigstoreRekorAnchorProvider } from "./anchor-providers";

const metadata = {
  projectId: "project-1",
  sequenceNo: 12,
  anchoredAt: "2026-05-03T00:00:00.000Z",
};
const hash = "a".repeat(64);

describe("external anchor providers", () => {
  beforeEach(() => {
    vi.stubEnv("ACP_OTS_CALENDAR_URLS", "https://ots.local");
    vi.stubEnv("ACP_REKOR_URL", "https://rekor.local");
    vi.stubEnv("ACP_ED25519_PRIVATE_KEY_HEX", "1".repeat(64));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("submits an OpenTimestamps digest and stores the calendar proof payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(Buffer.from("ots-proof"), { status: 200 })),
    );

    const provider = new OpenTimestampsAnchorProvider();
    const anchor = await provider.anchor(hash, metadata);

    expect(anchor.providerType).toBe("opentimestamps");
    expect(anchor.externalRef).toBe("ots:https://ots.local");
    expect(JSON.parse(anchor.proofPayload)).toMatchObject({
      version: "ots-calendar-v1",
      hashChainRoot: hash,
      calendarUrl: "https://ots.local",
    });
    await expect(provider.verify(anchor)).resolves.toMatchObject({ valid: true });
  });

  it("posts a hashedrekord entry to Rekor and stores the returned proof fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "GET") {
          return new Response(JSON.stringify({ uuid: "abc123" }), { status: 200 });
        }

        expect(url).toBe("https://rekor.local/api/v1/log/entries");
        const body = JSON.parse(String(init?.body));
        expect(body.kind).toBe("hashedrekord");
        expect(body.spec.data.hash.value).toBe(hash);
        return new Response(
          JSON.stringify({
            abc123: {
              logIndex: 7,
              integratedTime: 1_777_777_777,
              logID: "log-1",
              verification: {
                inclusionProof: { hashes: [] },
                signedEntryTimestamp: "set",
              },
            },
          }),
          { status: 201 },
        );
      }),
    );

    const provider = new SigstoreRekorAnchorProvider();
    const anchor = await provider.anchor(hash, metadata);

    expect(anchor.providerType).toBe("sigstore-rekor");
    expect(anchor.externalRef).toContain("/api/v1/log/entries/abc123");
    expect(JSON.parse(anchor.proofPayload)).toMatchObject({
      version: "rekor-hashedrekord-v1",
      uuid: "abc123",
      logIndex: 7,
    });
    await expect(provider.verify(anchor)).resolves.toMatchObject({ valid: true });
  });
});
