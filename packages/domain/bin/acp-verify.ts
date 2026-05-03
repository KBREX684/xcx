#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * acp-verify — offline verifier for Agent Control Plane Certificate Envelopes (v1).
 *
 * Usage:
 *   node bin/acp-verify.mjs <envelope.json> [--keys <keys.json>] [--remote <baseUrl>]
 *
 *   --keys <file>     Local key set (acp-signing-keys.json shape) used for verification.
 *   --remote <url>    Fetch /.well-known/acp-signing-keys.json from a base URL.
 *   --revocations <file>
 *                    Local acp-revocations.json shape used to reject revoked certificates.
 *   --max-age <ms>    Reject envelopes whose issuedAt is older than this window.
 *
 * Exits 0 on valid, 1 otherwise. Prints a structured JSON result to stdout
 * and a human-readable summary to stderr so the command stays scriptable.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyCertificateEnvelope, type SigningKeySet } from "../src/certificate-envelope";

interface ParsedArgs {
  _: string[];
  keys?: string;
  remote?: string;
  revocations?: string;
  "max-age"?: string;
}

interface JwkKeyDocument {
  keys?: Array<{ kid: string; publicKeyHex: string }>;
}

interface RevocationDocument {
  revoked?: Array<{ verificationCode?: string }>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (
      token === "--keys" ||
      token === "--remote" ||
      token === "--revocations" ||
      token === "--max-age"
    ) {
      (args as Record<string, string>)[token.slice(2)] = argv[++i];
    } else if (token.startsWith("--")) {
      console.error(`Unknown flag: ${token}`);
      process.exit(2);
    } else {
      args._.push(token);
    }
  }
  return args;
}

function toKeySet(doc: JwkKeyDocument | SigningKeySet): SigningKeySet {
  // Accept either the .well-known shape ({keys:[{kid,publicKeyHex}]}) or
  // a flat {kid: hex} record (matches the in-process SigningKeySet type).
  if (doc && typeof doc === "object" && Array.isArray((doc as JwkKeyDocument).keys)) {
    const set: SigningKeySet = {};
    for (const entry of (doc as JwkKeyDocument).keys ?? []) {
      if (entry?.kid && entry?.publicKeyHex) {
        set[entry.kid] = entry.publicKeyHex;
      }
    }
    return set;
  }
  return doc as SigningKeySet;
}

async function loadKeySet(args: ParsedArgs): Promise<SigningKeySet> {
  if (args.keys) {
    const raw = readFileSync(resolve(process.cwd(), args.keys), "utf8");
    return toKeySet(JSON.parse(raw));
  }
  if (args.remote) {
    const url = `${args.remote.replace(/\/$/, "")}/.well-known/acp-signing-keys.json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    return toKeySet((await res.json()) as JwkKeyDocument);
  }
  throw new Error("Either --keys <file> or --remote <baseUrl> is required");
}

function toRevokedCodes(doc: RevocationDocument): string[] {
  return (doc.revoked ?? [])
    .map((entry) => entry.verificationCode)
    .filter((code): code is string => Boolean(code));
}

async function loadRevokedCodes(args: ParsedArgs): Promise<string[]> {
  if (args.revocations) {
    const raw = readFileSync(resolve(process.cwd(), args.revocations), "utf8");
    return toRevokedCodes(JSON.parse(raw) as RevocationDocument);
  }
  if (args.remote) {
    const url = `${args.remote.replace(/\/$/, "")}/.well-known/acp-revocations.json`;
    const res = await fetch(url);
    if (res.ok) {
      return toRevokedCodes((await res.json()) as RevocationDocument);
    }
  }
  return [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file) {
    console.error("Usage: acp-verify <envelope.json> [--keys <file> | --remote <baseUrl>]");
    process.exit(2);
  }

  const envelope = JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8"));
  const keySet = await loadKeySet(args);
  const revokedVerificationCodes = await loadRevokedCodes(args);
  const maxAgeMs = args["max-age"] ? Number(args["max-age"]) : undefined;

  const result = verifyCertificateEnvelope(envelope, keySet, {
    maxAgeMs,
    revokedVerificationCodes,
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.ok) {
    console.error(`\u2713 envelope valid (kid=${result.keyId ?? "?"}, alg=${result.algorithm})`);
    process.exit(0);
  }
  console.error(`\u2717 envelope invalid: ${result.reason} — ${result.message}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
});
