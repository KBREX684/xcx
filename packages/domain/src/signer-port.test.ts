import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveSignerPortFromEnv, signDigestWithPort } from "./signer-port";
import { verifyDigestSignature } from "./provenance";

describe("SignerPort shared helper", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs with env-ed25519 in the canonical certificate signature format", async () => {
    vi.stubEnv("ACP_SIGNER_PROVIDER", "env-ed25519");
    vi.stubEnv("ACP_ED25519_PRIVATE_KEY_HEX", "1".repeat(64));
    vi.stubEnv("ACP_KEY_VERSION", "test-v1");

    const { signer } = resolveSignerPortFromEnv();
    const digest = "a".repeat(64);
    const signature = await signDigestWithPort(digest, signer);

    expect(signature).toMatch(/^ed25519:test-v1:[0-9a-f]+$/);
    expect(verifyDigestSignature(digest, signature, undefined)).toBe(false);
  });
});
