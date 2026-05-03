/**
 * Certificate Envelope v1
 *
 * Frozen JSON shape for the trust-chain envelope used by:
 *   - the API certificate issuance pipeline (apps/api control-plane.service)
 *   - the public verification page (/certificates/verify/[code])
 *   - the offline `acp-verify` CLI (packages/domain/bin/acp-verify.ts)
 *
 * Goals:
 *   1. **Independent verifiability** — given the envelope JSON + the published
 *      Ed25519 public key (with `kid`), any third party can recompute the
 *      digest and verify the signature **without contacting the API**.
 *   2. **No implicit fields** — every field that contributes to the digest
 *      MUST be enumerated below. Adding a field is a breaking change that
 *      requires bumping `envelopeVersion`.
 *   3. **Deterministic canonicalization** — `summary` is canonicalized via
 *      `canonicalizeJson` (sorted keys) before hashing.
 *
 * Wire format (the bytes a verifier consumes):
 *   {
 *     "envelopeVersion": "v1",
 *     "summary": { ... },              // arbitrary signed payload
 *     "digestSha256": "<hex>",         // sha256(canonicalJson(summary))
 *     "signature": "ed25519:<kid>:<hex>" | "hmac:<hex>",
 *     "publicKeyFingerprint": "<sha256-of-public-key-hex>" | null,
 *     "issuedAt": "<ISO-8601>",
 *     "verificationCode": "<code>",
 *     "verificationUrl": "<url>"
 *   }
 *
 * Verification algorithm (must be implemented identically on server + CLI):
 *   1. Parse envelope JSON.
 *   2. Recompute `digest = sha256Hex(canonicalizeJson(summary))`.
 *   3. Reject if `digest !== envelope.digestSha256`.
 *   4. Parse `signature`:
 *        - "ed25519:<kid>:<hex>" → look up public key for `kid` in the well-known
 *          key set, then call `verifyDigestSignature(digest, signature, publicKey)`.
 *        - "hmac:<hex>"          → only acceptable in dev/test mode.
 *   5. Optionally check `issuedAt` against an allowed time window (replay guard).
 *   6. Optionally check the verification code against the published revocation list.
 */

import { canonicalizeJson, sha256Hex } from "./provenance";

export const CERTIFICATE_ENVELOPE_VERSION = "v1" as const;

export type CertificateEnvelopeVersion = typeof CERTIFICATE_ENVELOPE_VERSION;

export interface CertificateEnvelopeV1<TSummary = unknown> {
  envelopeVersion: CertificateEnvelopeVersion;
  summary: TSummary;
  digestSha256: string;
  /** "ed25519:<kid>:<hex>" in production; "hmac:<hex>" only in dev. */
  signature: string;
  /** sha256 of the public key hex used to sign; null when HMAC fallback. */
  publicKeyFingerprint: string | null;
  /** ISO-8601 timestamp when the envelope was sealed. */
  issuedAt: string;
  /** Public verification code embedded into the verification URL. */
  verificationCode: string;
  /** Canonical public verification URL (frontend route). */
  verificationUrl: string;
}

export interface CertificateVerifyOk {
  ok: true;
  algorithm: "ed25519" | "hmac";
  keyId: string | null;
  digestSha256: string;
}

export type CertificateVerifyFailureReason =
  | "invalid_envelope"
  | "digest_mismatch"
  | "signature_format_unknown"
  | "key_not_found"
  | "signature_mismatch"
  | "revoked"
  | "expired";

export interface CertificateVerifyFailure {
  ok: false;
  reason: CertificateVerifyFailureReason;
  message: string;
}

export type CertificateVerifyResult = CertificateVerifyOk | CertificateVerifyFailure;

/** Map of `kid → publicKeyHex` (typically loaded from `.well-known/acp-signing-keys.json`). */
export type SigningKeySet = Record<string, string>;

export interface VerifyOptions {
  /** Reject envelopes whose `issuedAt` is older than this many milliseconds. */
  maxAgeMs?: number;
  /** Reject envelopes whose `issuedAt` is more than this many ms in the future (clock skew). */
  futureSkewMs?: number;
  /** When true, accept "hmac:" signatures (dev/test only). Default false. */
  allowHmac?: boolean;
  /** Verification codes present in the published revocation list. */
  revokedVerificationCodes?: Iterable<string>;
  /** Override "now" for deterministic tests. */
  now?: Date;
}

/**
 * Compute the canonical SHA-256 fingerprint of a public key hex.
 * Used both server-side (when minting envelopes) and verifier-side (when
 * cross-checking which key was used).
 */
export function computePublicKeyFingerprint(publicKeyHex: string): string {
  return sha256Hex(publicKeyHex.toLowerCase());
}

/**
 * Pure-function verifier. Does NOT touch the filesystem or network.
 * Callers (API + CLI) must supply the trusted key set obtained out-of-band.
 */
export function verifyCertificateEnvelope(
  envelope: unknown,
  keySet: SigningKeySet,
  options: VerifyOptions = {},
): CertificateVerifyResult {
  if (!isEnvelope(envelope)) {
    return fail("invalid_envelope", "Envelope JSON is missing required fields.");
  }

  const recomputedDigest = sha256Hex(canonicalizeJson(envelope.summary));
  if (recomputedDigest !== envelope.digestSha256) {
    return fail("digest_mismatch", "Recomputed digest does not match envelope.digestSha256.");
  }

  const sig = envelope.signature;
  let algorithm: "ed25519" | "hmac";
  let keyId: string | null = null;
  let signatureHex: string;
  if (sig.startsWith("ed25519:")) {
    const parts = sig.split(":");
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      return fail("signature_format_unknown", `Malformed ed25519 signature: ${sig}`);
    }
    algorithm = "ed25519";
    keyId = parts[1];
    signatureHex = parts[2];
  } else if (sig.startsWith("hmac:")) {
    if (!options.allowHmac) {
      return fail(
        "signature_format_unknown",
        "HMAC signatures are only accepted in dev/test mode (allowHmac=false).",
      );
    }
    // HMAC verification must be done by the caller because it requires the
    // shared secret which is intentionally NOT shipped to verifiers.
    return fail(
      "signature_format_unknown",
      "HMAC verification not supported in offline verifier. Set ACP_ED25519_PRIVATE_KEY_HEX in production.",
    );
  } else {
    return fail("signature_format_unknown", `Unrecognized signature scheme: ${sig.split(":")[0]}`);
  }

  const publicKeyHex = keyId ? keySet[keyId] : undefined;
  if (!publicKeyHex) {
    return fail("key_not_found", `No public key found for kid="${keyId}". Update the key set.`);
  }

  // Optional fingerprint cross-check — informational only; mismatch downgrades
  // to signature_mismatch since either key set or envelope was tampered.
  if (envelope.publicKeyFingerprint) {
    const recomputed = computePublicKeyFingerprint(publicKeyHex);
    if (recomputed !== envelope.publicKeyFingerprint) {
      return fail(
        "signature_mismatch",
        "Envelope publicKeyFingerprint does not match the supplied key set.",
      );
    }
  }

  // Time window check
  const now = options.now ?? new Date();
  const issuedAt = Date.parse(envelope.issuedAt);
  if (Number.isNaN(issuedAt)) {
    return fail("invalid_envelope", "issuedAt is not a valid ISO-8601 timestamp.");
  }
  if (typeof options.futureSkewMs === "number" && issuedAt - now.getTime() > options.futureSkewMs) {
    return fail("expired", "Envelope issuedAt is too far in the future (clock skew).");
  }
  if (typeof options.maxAgeMs === "number" && now.getTime() - issuedAt > options.maxAgeMs) {
    return fail("expired", "Envelope is older than the configured maxAgeMs.");
  }

  // Inline Ed25519 verify — kept dependency-free to allow CLI to bundle without
  // pulling the entire Nest stack.
  const ok = ed25519Verify(envelope.digestSha256, signatureHex, publicKeyHex);
  if (!ok) {
    return fail("signature_mismatch", "Ed25519 signature verification failed.");
  }

  const revokedCodes = options.revokedVerificationCodes
    ? new Set(options.revokedVerificationCodes)
    : null;
  if (revokedCodes?.has(envelope.verificationCode)) {
    return fail(
      "revoked",
      `Certificate verificationCode="${envelope.verificationCode}" is revoked.`,
    );
  }

  return { ok: true, algorithm, keyId, digestSha256: envelope.digestSha256 };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function isEnvelope(value: unknown): value is CertificateEnvelopeV1 {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    e.envelopeVersion === CERTIFICATE_ENVELOPE_VERSION &&
    typeof e.digestSha256 === "string" &&
    typeof e.signature === "string" &&
    typeof e.issuedAt === "string" &&
    typeof e.verificationCode === "string" &&
    typeof e.verificationUrl === "string" &&
    "summary" in e &&
    (e.publicKeyFingerprint === null || typeof e.publicKeyFingerprint === "string")
  );
}

function fail(reason: CertificateVerifyFailureReason, message: string): CertificateVerifyFailure {
  return { ok: false, reason, message };
}

// Wraps @noble Ed25519 with try/catch so a malformed key never throws to the caller.
function ed25519Verify(digestUtf8: string, signatureHex: string, publicKeyHex: string): boolean {
  try {
    // Lazy import keeps the verifier tree-shakable in the CLI bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ed25519 } = require("@noble/curves/ed25519.js");
    const sigBytes = Buffer.from(signatureHex, "hex");
    const keyBytes = Buffer.from(publicKeyHex, "hex");
    return ed25519.verify(sigBytes, Buffer.from(digestUtf8, "utf8"), keyBytes);
  } catch {
    return false;
  }
}
