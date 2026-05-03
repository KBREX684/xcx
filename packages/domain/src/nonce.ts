/**
 * Nonce utilities for replay-attack protection.
 *
 * Each signed Agent action must include a nonce (one-time token).
 * The server records used nonces in the NonceLedger table and rejects
 * re-submissions within the allowed time window.
 *
 * Format: `<timestamp-ms>.<random-hex-16>` — ensures uniqueness while
 * also encoding a coarse timestamp for quick window filtering.
 */
import { randomBytes } from "node:crypto";

/** Generate a cryptographically random nonce. */
export function generateNonce(): string {
  return `${Date.now()}.${randomBytes(8).toString("hex")}`;
}

/** Parse the timestamp from a nonce string. Returns NaN if malformed. */
export function nonceTimestamp(nonce: string): number {
  const ts = Number(nonce.split(".")[0]);
  return Number.isFinite(ts) ? ts : NaN;
}

/** Default replay window: 5 minutes either side of server time. */
export const NONCE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Check whether a nonce's timestamp is within the acceptable replay window.
 * Does NOT check uniqueness — that requires a NonceLedger DB lookup.
 */
export function isNonceTimestampFresh(nonce: string, windowMs = NONCE_WINDOW_MS): boolean {
  const ts = nonceTimestamp(nonce);
  if (Number.isNaN(ts)) return false;
  const drift = Math.abs(Date.now() - ts);
  return drift <= windowMs;
}
