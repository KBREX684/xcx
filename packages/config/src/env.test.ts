import { afterEach, describe, expect, it } from "vitest";
import { _resetEnvCache, validateEnv } from "./env";

const baseProductionEnv = {
  NODE_ENV: "production",
  DATABASE_PROVIDER: "postgresql",
  DATABASE_URL: "postgresql://acp:acp@localhost:5432/acp",
  ACP_JWT_SECRET: "prod-secret-minimum-32-characters-long",
  ACP_SIGNER_PROVIDER: "env-ed25519",
  ACP_ED25519_PRIVATE_KEY_HEX: "a".repeat(64),
  ACP_KEY_VERSION: "v1",
  WECHAT_MINIAPP_APP_ID: "wx1234567890abcdef",
  WECHAT_MINIAPP_APP_SECRET: "prod-wechat-secret-realistic-32chars",
  NEXT_PUBLIC_API_URL: "https://api.fengjuhe.com",
};

describe("environment validation", () => {
  afterEach(() => {
    _resetEnvCache();
  });

  it("accepts explicit production postgres and env-ed25519 signing", () => {
    expect(validateEnv(baseProductionEnv).DATABASE_PROVIDER).toBe("postgresql");
  });

  it("rejects sqlite production database configuration", () => {
    expect(() =>
      validateEnv({
        ...baseProductionEnv,
        DATABASE_PROVIDER: "sqlite",
        DATABASE_URL: "file:./prod.db",
      }),
    ).toThrow(/DATABASE_PROVIDER/);
  });

  it("rejects production sqlite URLs even when provider is wrong by omission", () => {
    const envWithoutProvider: Record<string, string> = { ...baseProductionEnv };
    delete envWithoutProvider.DATABASE_PROVIDER;
    expect(() =>
      validateEnv({
        ...envWithoutProvider,
        DATABASE_URL: "file:./prod.db",
      }),
    ).toThrow(/DATABASE_PROVIDER|DATABASE_URL/);
  });

  it("rejects implicit production signer provider", () => {
    const envWithoutSigner: Record<string, string> = { ...baseProductionEnv };
    delete envWithoutSigner.ACP_SIGNER_PROVIDER;
    expect(() => validateEnv(envWithoutSigner)).toThrow(/ACP_SIGNER_PROVIDER/);
  });

  it("rejects dev-hmac in production", () => {
    expect(() =>
      validateEnv({
        ...baseProductionEnv,
        ACP_SIGNER_PROVIDER: "dev-hmac",
      }),
    ).toThrow(/ACP_SIGNER_PROVIDER=dev-hmac/);
  });

  it("rejects placeholder production frontend API URLs", () => {
    expect(() =>
      validateEnv({
        ...baseProductionEnv,
        NEXT_PUBLIC_API_URL: "https://api.example.com",
      }),
    ).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});
