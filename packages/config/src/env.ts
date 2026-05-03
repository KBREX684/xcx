/**
 * Environment variable schema validation.
 * Called once at startup to fail fast on misconfiguration.
 */
import { z } from "zod";

const DEFAULT_JWT_SECRET = "acp-local-dev-jwt-secret-change-me-in-production!!";
const PLACEHOLDER_WECHAT_APP_IDS = new Set(["wx0000000000000000", "replace-with-wechat-app-id"]);
const PLACEHOLDER_WECHAT_SECRETS = new Set([
  "replace-with-wechat-app-secret",
  "change-me",
  "prod-wechat-secret-placeholder-length-ok",
]);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_PROVIDER: z.enum(["sqlite", "postgresql"]).optional().default("sqlite"),

  // Ports (optional, have defaults)
  API_PORT: z.coerce.number().int().positive().optional(),
  WEB_PORT: z.coerce.number().int().positive().optional(),
  OPENAPI_ADAPTER_PORT: z.coerce.number().int().positive().optional(),
  MCP_RELAY_PORT: z.coerce.number().int().positive().optional(),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().optional(),

  // Auth — required in production, defaults acceptable in development
  ACP_JWT_SECRET: z
    .string()
    .min(32, "ACP_JWT_SECRET must be at least 32 characters")
    .optional()
    .default(DEFAULT_JWT_SECRET),

  // Cryptographic signing
  ACP_SIGNER_PROVIDER: z.enum(["env-ed25519", "vault-transit", "dev-hmac"]).optional(),

  // Ed25519 private key as 32-byte hex (64 hex chars). Used for provenance signatures.
  // If absent, falls back to HMAC with ACP_SIGNING_SECRET (dev-only, logged warning).
  ACP_ED25519_PRIVATE_KEY_HEX: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      "ACP_ED25519_PRIVATE_KEY_HEX must be a 64-character hex string (32 bytes)",
    )
    .optional(),

  // Key version identifier — increment when rotating keys
  ACP_KEY_VERSION: z.string().min(1).optional().default("v1"),

  // Legacy HMAC fallback secret (dev only)
  ACP_SIGNING_SECRET: z.string().optional(),

  // Vault Transit KMS (required when ACP_SIGNER_PROVIDER=vault-transit)
  VAULT_ADDR: z.string().url().optional(),
  VAULT_TOKEN: z.string().optional(),
  VAULT_TRANSIT_KEY_NAME: z.string().optional(),

  // Frontend
  NEXT_PUBLIC_API_URL: z.string().url().optional(),

  // WeChat Mini Program
  WECHAT_MINIAPP_APP_ID: z.string().optional(),
  WECHAT_MINIAPP_APP_SECRET: z.string().optional(),
  TARO_APP_API_BASE: z.string().url().optional(),

  // External integrations (optional)
  OPENAPI_ADAPTER_URL: z.string().url().optional(),
  MCP_RELAY_URL: z.string().url().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let _validatedEnv: AppEnv | null = null;

/**
 * Validate and return the environment configuration.
 * Throws if required variables are missing or malformed.
 * Results are cached after first call.
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  if (_validatedEnv) return _validatedEnv;
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${errors}\n\nSee .env.example for reference.`);
  }

  const nodeEnv = result.data.NODE_ENV ?? env.NODE_ENV ?? process.env.NODE_ENV;
  const productionIssues: string[] = [];
  if (nodeEnv === "production") {
    if (result.data.DATABASE_PROVIDER !== "postgresql") {
      productionIssues.push("DATABASE_PROVIDER must be postgresql in production.");
    }
    if (result.data.DATABASE_URL.trim().toLowerCase().startsWith("file:")) {
      productionIssues.push("DATABASE_URL must not point at a SQLite file in production.");
    }
    if (result.data.ACP_JWT_SECRET === DEFAULT_JWT_SECRET) {
      productionIssues.push(
        "ACP_JWT_SECRET must not use the local development default in production.",
      );
    }
    if (!result.data.ACP_SIGNER_PROVIDER) {
      productionIssues.push("ACP_SIGNER_PROVIDER must be explicitly configured in production.");
    }
    if (result.data.ACP_SIGNER_PROVIDER === "dev-hmac") {
      productionIssues.push("ACP_SIGNER_PROVIDER=dev-hmac is not allowed in production.");
    }
    if (
      result.data.ACP_SIGNER_PROVIDER === "env-ed25519" &&
      !result.data.ACP_ED25519_PRIVATE_KEY_HEX
    ) {
      productionIssues.push(
        "ACP_ED25519_PRIVATE_KEY_HEX is required when ACP_SIGNER_PROVIDER=env-ed25519 in production.",
      );
    }
    if (result.data.ACP_SIGNER_PROVIDER === "vault-transit") {
      if (!result.data.VAULT_ADDR) {
        productionIssues.push("VAULT_ADDR is required when ACP_SIGNER_PROVIDER=vault-transit.");
      }
      if (!result.data.VAULT_TOKEN) {
        productionIssues.push("VAULT_TOKEN is required when ACP_SIGNER_PROVIDER=vault-transit.");
      }
      if (!result.data.VAULT_TRANSIT_KEY_NAME) {
        productionIssues.push(
          "VAULT_TRANSIT_KEY_NAME is required when ACP_SIGNER_PROVIDER=vault-transit.",
        );
      }
    }
    if (
      !result.data.ACP_SIGNER_PROVIDER &&
      !result.data.ACP_ED25519_PRIVATE_KEY_HEX
    ) {
      productionIssues.push("ACP_ED25519_PRIVATE_KEY_HEX is required in production.");
    }
    if (
      !result.data.WECHAT_MINIAPP_APP_ID ||
      PLACEHOLDER_WECHAT_APP_IDS.has(result.data.WECHAT_MINIAPP_APP_ID)
    ) {
      productionIssues.push(
        "WECHAT_MINIAPP_APP_ID must be configured with a real app id in production.",
      );
    }
    if (
      !result.data.WECHAT_MINIAPP_APP_SECRET ||
      PLACEHOLDER_WECHAT_SECRETS.has(result.data.WECHAT_MINIAPP_APP_SECRET)
    ) {
      productionIssues.push(
        "WECHAT_MINIAPP_APP_SECRET must be configured with a real secret in production.",
      );
    }
    if (!result.data.NEXT_PUBLIC_API_URL) {
      productionIssues.push("NEXT_PUBLIC_API_URL must be configured in production.");
    } else {
      try {
        const apiUrl = new URL(result.data.NEXT_PUBLIC_API_URL);
        if (apiUrl.protocol !== "https:") {
          productionIssues.push("NEXT_PUBLIC_API_URL must use https in production.");
        }
        if (["api.example.com", "localhost", "127.0.0.1"].includes(apiUrl.hostname)) {
          productionIssues.push("NEXT_PUBLIC_API_URL must not use example or localhost hosts.");
        }
      } catch {
        productionIssues.push("NEXT_PUBLIC_API_URL must be a valid production URL.");
      }
    }
  }

  if (productionIssues.length > 0) {
    throw new Error(
      `Production environment validation failed:\n${productionIssues.map((issue) => `  - ${issue}`).join("\n")}`,
    );
  }

  // Warn about insecure defaults in non-test environments
  if (nodeEnv !== "test") {
    if (!result.data.ACP_ED25519_PRIVATE_KEY_HEX) {
      console.warn(
        "[ACP SECURITY WARNING] ACP_ED25519_PRIVATE_KEY_HEX is not set. " +
          "Falling back to HMAC signing — NOT suitable for production. " +
          "Run `npm run keys:generate` to create a keypair.",
      );
    }
    if (result.data.ACP_JWT_SECRET === DEFAULT_JWT_SECRET) {
      console.warn(
        "[ACP SECURITY WARNING] Using default ACP_JWT_SECRET. " +
          "Set a strong secret in production.",
      );
    }
  }

  _validatedEnv = result.data;
  return _validatedEnv;
}

/** Reset cache (for testing only). */
export function _resetEnvCache(): void {
  _validatedEnv = null;
}
