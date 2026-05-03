import { z } from "zod";

export const miniappClientRequestIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, "clientRequestId contains unsupported characters");

export const miniappClientRequestInputSchema = z.object({
  clientRequestId: miniappClientRequestIdSchema.optional(),
});

export type MiniappClientRequestInput = z.infer<typeof miniappClientRequestInputSchema>;

/**
 * 生成幂等请求标识。优先使用 Web Crypto / Node crypto 提供的 CSPRNG，
 * 在不支持的运行时（部分老版微信基础库）回退到 Math.random，确保始终可用。
 *
 * 字符集与 miniappClientRequestIdSchema 的 regex (`[A-Za-z0-9._:-]`) 完全兼容。
 */
export function createMiniappClientRequestId(prefix = "mp"): string {
  const safePrefix = prefix.replace(/[^A-Za-z0-9._:-]/g, "").slice(0, 16) || "mp";
  const ts = Date.now().toString(36);
  return `${safePrefix}:${ts}:${randomSuffix(10)}`;
}

function randomSuffix(length: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const out: string[] = [];
  try {
    const cryptoLike = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } })
      .crypto;
    if (cryptoLike?.getRandomValues) {
      const bytes = new Uint8Array(length);
      cryptoLike.getRandomValues(bytes);
      for (let i = 0; i < length; i += 1) {
        const byte = bytes[i] ?? 0;
        const ch = alphabet[byte % alphabet.length] ?? "0";
        out.push(ch);
      }
      return out.join("");
    }
  } catch {
    // ignore and fall through
  }
  // 兜底：Math.random（仅在 Web Crypto 不可用时）。
  for (let i = 0; i < length; i += 1) {
    const ch = alphabet[Math.floor(Math.random() * alphabet.length)] ?? "0";
    out.push(ch);
  }
  return out.join("");
}

export function optionalIsoDate(label: string) {
  return z
    .string()
    .datetime({ message: `${label} must be an ISO8601 datetime` })
    .nullable()
    .optional();
}
