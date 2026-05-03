import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { canonicalizeJson, sha256Hex, signDigest } from "./provenance";
import {
  CERTIFICATE_ENVELOPE_VERSION,
  computePublicKeyFingerprint,
  verifyCertificateEnvelope,
  type CertificateEnvelopeV1,
  type SigningKeySet,
} from "./certificate-envelope";

const KID = "v-test";
const PRIV_HEX = "1".repeat(64); // 32 bytes
const PUB_HEX = Buffer.from(ed25519.getPublicKey(Buffer.from(PRIV_HEX, "hex"))).toString("hex");

const KEY_SET: SigningKeySet = { [KID]: PUB_HEX };

function buildEnvelope(overrides: Partial<CertificateEnvelopeV1> = {}): CertificateEnvelopeV1 {
  const summary = { project: "P-001", events: [{ id: "e1", seq: 1 }] };
  const digest = sha256Hex(canonicalizeJson(summary));
  const sig = signDigest(digest);
  return {
    envelopeVersion: CERTIFICATE_ENVELOPE_VERSION,
    summary,
    digestSha256: digest,
    signature: sig,
    publicKeyFingerprint: computePublicKeyFingerprint(PUB_HEX),
    issuedAt: new Date().toISOString(),
    verificationCode: "code-001",
    verificationUrl: "http://localhost:3000/certificates/verify/code-001",
    ...overrides,
  };
}

describe("certificate-envelope v1", () => {
  const ORIGINAL_PRIV = process.env.ACP_ED25519_PRIVATE_KEY_HEX;
  const ORIGINAL_KID = process.env.ACP_KEY_VERSION;

  beforeAll(() => {
    process.env.ACP_ED25519_PRIVATE_KEY_HEX = PRIV_HEX;
    process.env.ACP_KEY_VERSION = KID;
  });
  afterAll(() => {
    if (ORIGINAL_PRIV !== undefined) process.env.ACP_ED25519_PRIVATE_KEY_HEX = ORIGINAL_PRIV;
    else delete process.env.ACP_ED25519_PRIVATE_KEY_HEX;
    if (ORIGINAL_KID !== undefined) process.env.ACP_KEY_VERSION = ORIGINAL_KID;
    else delete process.env.ACP_KEY_VERSION;
  });

  it("verifies a valid envelope", () => {
    const env = buildEnvelope();
    const r = verifyCertificateEnvelope(env, KEY_SET);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.algorithm).toBe("ed25519");
      expect(r.keyId).toBe(KID);
    }
  });

  it("rejects when summary is tampered (digest mismatch)", () => {
    const env = buildEnvelope();
    env.summary = { project: "EVIL", events: [] };
    const r = verifyCertificateEnvelope(env, KEY_SET);
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "digest_mismatch" }));
  });

  it("rejects when signature is tampered", () => {
    const env = buildEnvelope();
    env.signature = `ed25519:${KID}:${"a".repeat(128)}`;
    const r = verifyCertificateEnvelope(env, KEY_SET);
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "signature_mismatch" }));
  });

  it("rejects unknown kid", () => {
    const env = buildEnvelope();
    const r = verifyCertificateEnvelope(env, { other: PUB_HEX });
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "key_not_found" }));
  });

  it("rejects when publicKeyFingerprint disagrees with key set", () => {
    const env = buildEnvelope({ publicKeyFingerprint: "deadbeef" });
    const r = verifyCertificateEnvelope(env, KEY_SET);
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "signature_mismatch" }));
  });

  it("rejects malformed signature scheme", () => {
    const env = buildEnvelope({ signature: "rsa:something" });
    const r = verifyCertificateEnvelope(env, KEY_SET);
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "signature_format_unknown" }));
  });

  it("rejects malformed ed25519 signature (missing parts)", () => {
    const env = buildEnvelope({ signature: "ed25519:onlyone" });
    const r = verifyCertificateEnvelope(env, KEY_SET);
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "signature_format_unknown" }));
  });

  it("rejects HMAC signatures by default (offline verifier safe)", () => {
    const env = buildEnvelope({ signature: "hmac:" + "0".repeat(64) });
    const r = verifyCertificateEnvelope(env, KEY_SET);
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "signature_format_unknown" }));
  });

  it("rejects an envelope older than maxAgeMs", () => {
    const env = buildEnvelope({ issuedAt: new Date(Date.now() - 10_000).toISOString() });
    const r = verifyCertificateEnvelope(env, KEY_SET, { maxAgeMs: 1_000 });
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "expired" }));
  });

  it("rejects an envelope from too far in the future", () => {
    const env = buildEnvelope({ issuedAt: new Date(Date.now() + 10_000).toISOString() });
    const r = verifyCertificateEnvelope(env, KEY_SET, { futureSkewMs: 1_000 });
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "expired" }));
  });

  it("rejects a valid envelope listed in revocations", () => {
    const env = buildEnvelope();
    const r = verifyCertificateEnvelope(env, KEY_SET, {
      revokedVerificationCodes: ["code-001"],
    });
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "revoked" }));
  });

  it("rejects malformed envelope shape", () => {
    const r = verifyCertificateEnvelope({ foo: "bar" }, KEY_SET);
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "invalid_envelope" }));
  });

  it("rejects malformed issuedAt", () => {
    const env = buildEnvelope({ issuedAt: "not-a-date" });
    const r = verifyCertificateEnvelope(env, KEY_SET);
    expect(r).toEqual(expect.objectContaining({ ok: false, reason: "invalid_envelope" }));
  });

  it("computePublicKeyFingerprint is deterministic and case-insensitive", () => {
    const a = computePublicKeyFingerprint(PUB_HEX.toUpperCase());
    const b = computePublicKeyFingerprint(PUB_HEX.toLowerCase());
    expect(a).toBe(b);
  });
});
