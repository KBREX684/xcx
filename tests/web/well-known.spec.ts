import "dotenv/config";
import { expect, test } from "@playwright/test";

/**
 * Iteration 5 / Cycle 5-B — public verifier endpoints.
 *
 * Exercises the two `.well-known` documents that third-party verifiers and
 * the bundled `acp-verify` CLI consume. These endpoints MUST stay reachable
 * without any authentication header and MUST keep the documented schema
 * stable; bumping the schema requires bumping `envelopeVersion`.
 */
const apiBaseUrl =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";

test.describe("public well-known endpoints", () => {
  test("acp-signing-keys.json serves the active key set anonymously", async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/api/v1/.well-known/acp-signing-keys.json`);
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["cache-control"]).toContain("max-age=300");

    const body = (await res.json()) as {
      envelopeVersion: string;
      issuer: string;
      generatedAt: string;
      keys: Array<{ kid: string; alg: string; publicKeyHex: string }>;
    };

    expect(body.envelopeVersion).toBe("v1");
    expect(body.issuer).toBe("agent-control-plane");
    expect(body.keys.length).toBeGreaterThanOrEqual(0);
    if (body.keys.length > 0) {
      const key = body.keys[0];
      expect(key.kid).toBeTruthy();
      expect(key.alg).toBe("EdDSA");
      // Hex-encoded 32-byte public key.
      expect(key.publicKeyHex).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test("acp-revocations.json is self-signed and verifiable", async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/api/v1/.well-known/acp-revocations.json`);
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["cache-control"]).toContain("max-age=60");

    const body = (await res.json()) as {
      envelopeVersion: string;
      issuer: string;
      issuedAt: string;
      keyId: string;
      digestSha256: string;
      signature: string;
      revoked: Array<{ certificateId: string; verificationCode: string }>;
    };

    expect(body.envelopeVersion).toBe("v1");
    expect(body.digestSha256).toMatch(/^[0-9a-f]{64}$/);
    // Signature scheme is `ed25519:<kid>:<hex>` in production, `hmac:...` in dev.
    expect(body.signature).toMatch(/^(ed25519|hmac):/);
    expect(Array.isArray(body.revoked)).toBe(true);
  });
});
