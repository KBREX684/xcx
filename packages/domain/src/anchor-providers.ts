import { createHash, createPublicKey } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519.js";
import type {
  AnchorMetadata,
  AnchorProof,
  AnchorProviderPort,
  AnchorResult,
  VerificationResult,
} from "./ports";

const DEFAULT_OTS_CALENDARS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
];

interface OtsProofPayload {
  version: "ots-calendar-v1";
  hashChainRoot: string;
  metadata: AnchorMetadata;
  calendarUrl: string;
  responseBase64: string;
  responseSha256: string;
  submittedAt: string;
}

interface RekorProofPayload {
  version: "rekor-hashedrekord-v1";
  rekorUrl: string;
  uuid: string;
  logIndex: number | null;
  integratedTime: number | null;
  logId: string | null;
  inclusionProof: unknown;
  signedEntryTimestamp: string | null;
  entry: unknown;
}

export class OpenTimestampsAnchorProvider implements AnchorProviderPort {
  readonly providerType = "opentimestamps" as const;

  async anchor(hashChainRoot: string, metadata: AnchorMetadata): Promise<AnchorResult> {
    const digest = parseSha256Digest(hashChainRoot);
    const calendars = resolveOtsCalendars();
    const errors: string[] = [];

    for (const calendarUrl of calendars) {
      try {
        const response = await fetch(`${calendarUrl.replace(/\/+$/, "")}/digest`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: new Uint8Array(digest),
          signal: createTimeoutSignal(Number(process.env.ACP_OTS_TIMEOUT_MS ?? 8_000)),
        });

        if (!response.ok) {
          errors.push(`${calendarUrl}: HTTP ${response.status}`);
          continue;
        }

        const proofBytes = Buffer.from(await response.arrayBuffer());
        const proofPayload: OtsProofPayload = {
          version: "ots-calendar-v1",
          hashChainRoot,
          metadata,
          calendarUrl,
          responseBase64: proofBytes.toString("base64"),
          responseSha256: createHash("sha256").update(proofBytes).digest("hex"),
          submittedAt: new Date().toISOString(),
        };

        return {
          providerType: this.providerType,
          externalRef: `ots:${calendarUrl}`,
          proofPayload: JSON.stringify(proofPayload),
          verifiedAt: null,
        };
      } catch (error) {
        errors.push(`${calendarUrl}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`OpenTimestamps anchor failed: ${errors.join("; ")}`);
  }

  async verify(proof: AnchorProof): Promise<VerificationResult> {
    if (proof.providerType !== this.providerType) {
      return { valid: false, verifiedAt: new Date().toISOString(), details: "Provider type mismatch" };
    }

    try {
      const parsed = JSON.parse(proof.proofPayload) as OtsProofPayload;
      const proofBytes = Buffer.from(parsed.responseBase64, "base64");
      const responseSha256 = createHash("sha256").update(proofBytes).digest("hex");
      const valid =
        parsed.version === "ots-calendar-v1" &&
        /^[0-9a-fA-F]{64}$/.test(parsed.hashChainRoot) &&
        responseSha256 === parsed.responseSha256 &&
        proof.externalRef === `ots:${parsed.calendarUrl}`;

      return {
        valid,
        verifiedAt: new Date().toISOString(),
        details: valid ? "OTS calendar proof payload is intact" : "Invalid OTS proof payload",
      };
    } catch (error) {
      return {
        valid: false,
        verifiedAt: new Date().toISOString(),
        details: error instanceof Error ? error.message : "Failed to parse OTS proof",
      };
    }
  }
}

export class SigstoreRekorAnchorProvider implements AnchorProviderPort {
  readonly providerType = "sigstore-rekor" as const;
  private readonly rekorUrl: string;

  constructor() {
    this.rekorUrl = (process.env.ACP_REKOR_URL ?? "https://rekor.sigstore.dev").replace(/\/+$/, "");
  }

  async anchor(hashChainRoot: string, metadata: AnchorMetadata): Promise<AnchorResult> {
    const entry = await this.submitToRekor(hashChainRoot, metadata);
    return {
      providerType: this.providerType,
      externalRef: `rekor:${this.rekorUrl}/api/v1/log/entries/${entry.uuid}`,
      proofPayload: JSON.stringify(entry),
      verifiedAt: entry.integratedTime ? new Date(entry.integratedTime * 1000).toISOString() : null,
    };
  }

  async verify(proof: AnchorProof): Promise<VerificationResult> {
    if (proof.providerType !== this.providerType) {
      return { valid: false, verifiedAt: new Date().toISOString(), details: "Provider type mismatch" };
    }

    try {
      const parsed = JSON.parse(proof.proofPayload) as RekorProofPayload;
      const response = await fetch(`${this.rekorUrl}/api/v1/log/entries/${parsed.uuid}`, {
        method: "GET",
        signal: createTimeoutSignal(Number(process.env.ACP_REKOR_TIMEOUT_MS ?? 8_000)),
      });

      if (!response.ok) {
        return {
          valid: false,
          verifiedAt: new Date().toISOString(),
          details: `Rekor entry lookup failed: HTTP ${response.status}`,
        };
      }

      const liveEntry = await response.json();
      const valid = parsed.version === "rekor-hashedrekord-v1" && Boolean(liveEntry);
      return {
        valid,
        verifiedAt: new Date().toISOString(),
        details: valid ? "Rekor entry exists and proof payload is parseable" : "Invalid Rekor proof",
      };
    } catch (error) {
      return {
        valid: false,
        verifiedAt: new Date().toISOString(),
        details: error instanceof Error ? error.message : "Failed to verify Rekor proof",
      };
    }
  }

  private async submitToRekor(
    hashChainRoot: string,
    metadata: AnchorMetadata,
  ): Promise<RekorProofPayload> {
    parseSha256Digest(hashChainRoot);
    const signature = createRekorSignature(hashChainRoot, metadata);
    const requestBody = {
      apiVersion: "0.0.1",
      kind: "hashedrekord",
      spec: {
        data: {
          hash: {
            algorithm: "sha256",
            value: hashChainRoot,
          },
        },
        signature: {
          content: signature.signatureBase64,
          publicKey: {
            content: signature.publicKeyPemBase64,
          },
        },
      },
    };

    const response = await fetch(`${this.rekorUrl}/api/v1/log/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: createTimeoutSignal(Number(process.env.ACP_REKOR_TIMEOUT_MS ?? 8_000)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Rekor anchor failed (${response.status}): ${errorText}`);
    }

    const responseJson = (await response.json()) as Record<string, unknown>;
    const [uuid, entry] = Object.entries(responseJson)[0] ?? [];
    if (!uuid || !entry || typeof entry !== "object") {
      throw new Error("Rekor response did not include an entry UUID.");
    }

    const entryRecord = entry as {
      logIndex?: number;
      integratedTime?: number;
      logID?: string;
      verification?: {
        inclusionProof?: unknown;
        signedEntryTimestamp?: string;
      };
    };

    return {
      version: "rekor-hashedrekord-v1",
      rekorUrl: this.rekorUrl,
      uuid,
      logIndex: entryRecord.logIndex ?? null,
      integratedTime: entryRecord.integratedTime ?? null,
      logId: entryRecord.logID ?? null,
      inclusionProof: entryRecord.verification?.inclusionProof ?? null,
      signedEntryTimestamp: entryRecord.verification?.signedEntryTimestamp ?? null,
      entry,
    };
  }
}

function resolveOtsCalendars(): string[] {
  const configured = process.env.ACP_OTS_CALENDAR_URLS?.split(",")
    .map((value: string) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return configured && configured.length > 0 ? configured : DEFAULT_OTS_CALENDARS;
}

function createTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  const abortSignal = (
    globalThis as {
      AbortSignal?: typeof AbortSignal & { timeout?: (milliseconds: number) => AbortSignal };
    }
  ).AbortSignal;
  return abortSignal?.timeout?.(timeoutMs);
}

function parseSha256Digest(value: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("hashChainRoot must be a 64-character SHA-256 hex digest.");
  }
  return Buffer.from(value, "hex");
}

function createRekorSignature(hashChainRoot: string, metadata: AnchorMetadata) {
  const privateKeyHex = process.env.ACP_ED25519_PRIVATE_KEY_HEX;
  if (!privateKeyHex || !/^[0-9a-fA-F]{64}$/.test(privateKeyHex)) {
    throw new Error("ACP_ED25519_PRIVATE_KEY_HEX is required for Sigstore Rekor anchors.");
  }

  const privateKey = Buffer.from(privateKeyHex, "hex");
  const signingPayload = JSON.stringify({ hashChainRoot, metadata });
  const signature = ed25519.sign(Buffer.from(signingPayload, "utf8"), privateKey);
  const publicKey = ed25519.getPublicKey(privateKey);
  const publicKeyDer = Buffer.concat([
    Buffer.from("302a300506032b6570032100", "hex"),
    Buffer.from(publicKey),
  ]);
  const publicKeyPem = createPublicKey({ key: publicKeyDer, format: "der", type: "spki" }).export({
    format: "pem",
    type: "spki",
  });

  return {
    signatureBase64: Buffer.from(signature).toString("base64"),
    publicKeyPemBase64: Buffer.from(String(publicKeyPem), "utf8").toString("base64"),
  };
}
