import { createHash, createHmac, randomUUID } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519.js";

export type SignerProvider = "env-ed25519" | "vault-transit" | "dev-hmac";

export interface DigestSigner {
  provider: SignerProvider;
  algorithm: "ed25519" | "hmac-sha256";
  keyVersion: string | null;
  publicKeyHex(): string | null;
  sign(digest: string): string;
}

let signerOverride: DigestSigner | null = null;

function getEd25519PrivateKey(): Uint8Array | null {
  const hex = process.env.ACP_ED25519_PRIVATE_KEY_HEX;
  if (!hex || hex.length !== 64) return null;
  try {
    return Buffer.from(hex, "hex");
  } catch {
    return null;
  }
}

function getHmacSigningSecret() {
  return process.env.ACP_SIGNING_SECRET ?? "acp-local-signing-secret";
}

function createEnvEd25519Signer(privateKey: Uint8Array): DigestSigner {
  return {
    provider: "env-ed25519",
    algorithm: "ed25519",
    keyVersion: getKeyVersion(),
    publicKeyHex() {
      return Buffer.from(ed25519.getPublicKey(privateKey)).toString("hex");
    },
    sign(digest: string) {
      const sig = ed25519.sign(Buffer.from(digest, "utf8"), privateKey);
      return `ed25519:${getKeyVersion()}:${Buffer.from(sig).toString("hex")}`;
    },
  };
}

function createDevHmacSigner(): DigestSigner {
  return {
    provider: "dev-hmac",
    algorithm: "hmac-sha256",
    keyVersion: null,
    publicKeyHex() {
      return null;
    },
    sign(digest: string) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          "[ACP SECURITY] Using HMAC fallback for signing. Set ACP_ED25519_PRIVATE_KEY_HEX for production use.",
        );
      }
      const hmacSig = createHmac("sha256", getHmacSigningSecret()).update(digest).digest("hex");
      return `hmac:${hmacSig}`;
    },
  };
}

export function getActiveDigestSigner(): DigestSigner {
  if (signerOverride) {
    return signerOverride;
  }

  const provider = process.env.ACP_SIGNER_PROVIDER as SignerProvider | undefined;
  if (provider === "dev-hmac") {
    return createDevHmacSigner();
  }

  // Both "env-ed25519" and "vault-transit" use the env Ed25519 signer at the
  // provenance layer. When ACP_SIGNER_PROVIDER=vault-transit, the SignerPort
  // (apps/api/src/auth/signer) handles Vault communication; the provenance
  // module's signDigest() is a legacy path that still reads the env key for
  // backward compatibility during the C1 migration period.
  const privateKey = getEd25519PrivateKey();
  if (privateKey) {
    return createEnvEd25519Signer(privateKey);
  }

  return createDevHmacSigner();
}

export function setDigestSignerForTesting(signer: DigestSigner | null): void {
  signerOverride = signer;
}

export function getSigningMetadata() {
  const signer = getActiveDigestSigner();
  return {
    provider: signer.provider,
    algorithm: signer.algorithm,
    keyVersion: signer.keyVersion,
    publicKeyHex: signer.publicKeyHex(),
  };
}

/**
 * Returns the Ed25519 public key hex for the current key version.
 * Returns null if only HMAC fallback is available.
 */
export function getSigningPublicKeyHex(): string | null {
  return getActiveDigestSigner().publicKeyHex();
}

/**
 * Returns the current key version identifier from ACP_KEY_VERSION env var.
 */
export function getKeyVersion(): string {
  return process.env.ACP_KEY_VERSION ?? "v1";
}

/**
 * Sign a digest string.
 */
export function signDigest(digest: string): string {
  return getActiveDigestSigner().sign(digest);
}

/**
 * Verify a signature produced by signDigest().
 * Supports both `ed25519:<keyVersion>:<hex>` and legacy `hmac:<hex>` formats.
 * For Ed25519 signatures the caller must supply the matching `publicKeyHex`.
 */
export function verifyDigestSignature(
  digest: string,
  signature: string,
  publicKeyHex?: string,
): boolean {
  if (signature.startsWith("ed25519:")) {
    const parts = signature.split(":");
    const sigHex = parts[2];
    if (parts.length !== 3 || !sigHex || !publicKeyHex) return false;
    const sigBytes = Buffer.from(sigHex, "hex");
    const publicKeyBytes = Buffer.from(publicKeyHex, "hex");
    try {
      return ed25519.verify(sigBytes, Buffer.from(digest, "utf8"), publicKeyBytes);
    } catch {
      return false;
    }
  }

  if (signature.startsWith("hmac:")) {
    const expected = createHmac("sha256", getHmacSigningSecret()).update(digest).digest("hex");
    return `hmac:${expected}` === signature;
  }

  const expected = createHmac("sha256", getHmacSigningSecret()).update(digest).digest("hex");
  return expected === signature;
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createAgentAdvanceDigest(input: {
  runId: string;
  nonce: string;
  signedAt: string;
  outputSummary?: string | null;
  status?: "succeeded" | "failed";
}): string {
  return sha256Hex(
    canonicalizeJson({
      runId: input.runId,
      nonce: input.nonce,
      signedAt: input.signedAt,
      outputSummary: input.outputSummary ?? null,
      status: input.status ?? "succeeded",
    }),
  );
}

export function createEventPayloadDigest(payload: unknown): string {
  return sha256Hex(canonicalizeJson(payload ?? null));
}

export function createEventHash(input: {
  workspaceId: string;
  projectId: string | null;
  sequenceNo: number | null;
  entityType: string;
  entityId: string;
  eventType: string;
  actorType: string;
  actorId: string;
  traceId: string;
  occurredAtIso: string;
  payloadDigest: string | null;
  prevEventHash: string | null;
}): string {
  return sha256Hex(
    canonicalizeJson({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      sequenceNo: input.sequenceNo,
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: input.eventType,
      actorType: input.actorType,
      actorId: input.actorId,
      traceId: input.traceId,
      occurredAtIso: input.occurredAtIso,
      payloadDigest: input.payloadDigest,
      prevEventHash: input.prevEventHash,
    }),
  );
}

export function createVerificationCode(projectCode: string, version: number): string {
  const slug = projectCode.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return `ACP-${slug}-${version.toString().padStart(2, "0")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((accumulator, [key, nestedValue]) => {
        accumulator[key] = sortValue(nestedValue);
        return accumulator;
      }, {});
  }

  return value;
}
