import { afterEach, describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import {
  getSigningMetadata,
  getSigningPublicKeyHex,
  setDigestSignerForTesting,
  signDigest,
  verifyDigestSignature,
  type DigestSigner,
} from "./provenance";

const ORIGINAL_ENV = { ...process.env };

describe("provenance signer provider", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    setDigestSignerForTesting(null);
  });

  it("uses env-ed25519 when a private key is configured", () => {
    const privateKeyHex = "2".repeat(64);
    const publicKeyHex = Buffer.from(
      ed25519.getPublicKey(Buffer.from(privateKeyHex, "hex")),
    ).toString("hex");
    process.env.ACP_ED25519_PRIVATE_KEY_HEX = privateKeyHex;
    process.env.ACP_KEY_VERSION = "v-test";
    delete process.env.ACP_SIGNER_PROVIDER;

    const signature = signDigest("digest-1");

    expect(signature).toMatch(/^ed25519:v-test:/);
    expect(getSigningPublicKeyHex()).toBe(publicKeyHex);
    expect(getSigningMetadata()).toEqual({
      provider: "env-ed25519",
      algorithm: "ed25519",
      keyVersion: "v-test",
      publicKeyHex,
    });
    expect(verifyDigestSignature("digest-1", signature, publicKeyHex)).toBe(true);
  });

  it("requires explicit dev-hmac fallback when no key is configured", () => {
    delete process.env.ACP_ED25519_PRIVATE_KEY_HEX;
    process.env.ACP_SIGNER_PROVIDER = "dev-hmac";
    process.env.ACP_SIGNING_SECRET = "test-secret";

    const signature = signDigest("digest-2");

    expect(signature).toMatch(/^hmac:/);
    expect(getSigningMetadata()).toEqual({
      provider: "dev-hmac",
      algorithm: "hmac-sha256",
      keyVersion: null,
      publicKeyHex: null,
    });
    expect(verifyDigestSignature("digest-2", signature)).toBe(true);
  });

  it("allows signer injection for isolated crypto boundary tests", () => {
    const signer: DigestSigner = {
      provider: "env-ed25519",
      algorithm: "ed25519",
      keyVersion: "mock",
      publicKeyHex: () => "public-key",
      sign: (digest) => `mock:${digest}`,
    };
    setDigestSignerForTesting(signer);

    expect(signDigest("digest-3")).toBe("mock:digest-3");
    expect(getSigningMetadata().provider).toBe("env-ed25519");
    expect(getSigningPublicKeyHex()).toBe("public-key");
  });
});
