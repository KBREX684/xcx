import { ed25519 } from "@noble/curves/ed25519.js";
import type { SignerJwk, SignerPort } from "./ports";
import { getKeyVersion, signDigest } from "./provenance";

export type SignerProviderType = "env-ed25519" | "vault-transit" | "dev-hmac";

interface VaultTransitSignResponse {
  data: {
    signature: string;
    key_version: number;
  };
}

interface VaultTransitVerifyResponse {
  data: {
    valid: boolean;
  };
}

interface VaultTransitKeyResponse {
  data: {
    keys: Record<
      string,
      {
        public_key: string;
        key_version: number;
      }
    >;
    latest_version: number;
  };
}

interface VaultTransitRotateResponse {
  data: {
    key_version: number;
  };
}

export class EnvEd25519Signer implements SignerPort {
  private readonly privateKey: Uint8Array;
  private readonly defaultKeyVersion: string;

  constructor() {
    const hex = process.env.ACP_ED25519_PRIVATE_KEY_HEX;
    if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new Error(
        "ACP_ED25519_PRIVATE_KEY_HEX must be a 64-character hex string (32 bytes) for env-ed25519 signer.",
      );
    }
    this.privateKey = Buffer.from(hex, "hex");
    this.defaultKeyVersion = process.env.ACP_KEY_VERSION ?? "v1";
  }

  async sign(digest: Buffer, keyVersion: string): Promise<{ signature: Buffer; keyVersion: string }> {
    return {
      signature: Buffer.from(ed25519.sign(digest, this.privateKey)),
      keyVersion: keyVersion || this.defaultKeyVersion,
    };
  }

  async verify(digest: Buffer, signature: Buffer, _keyVersion: string): Promise<boolean> {
    const publicKey = ed25519.getPublicKey(this.privateKey);
    try {
      return ed25519.verify(signature, digest, publicKey);
    } catch {
      return false;
    }
  }

  async rotate(): Promise<{ newKeyVersion: string; publicKeyJwk: SignerJwk }> {
    throw new Error(
      "Key rotation is not supported for env-ed25519 signer. Use vault-transit for production key management.",
    );
  }

  async getPublicKeyJwk(keyVersion: string): Promise<SignerJwk> {
    const publicKey = ed25519.getPublicKey(this.privateKey);
    return {
      kty: "OKP",
      crv: "Ed25519",
      alg: "EdDSA",
      kid: keyVersion || this.defaultKeyVersion,
      x: Buffer.from(publicKey).toString("base64url"),
    };
  }
}

export class VaultTransitSigner implements SignerPort {
  private readonly vaultAddr: string;
  private readonly vaultToken: string;
  private readonly keyName: string;

  constructor() {
    this.vaultAddr = (process.env.VAULT_ADDR ?? "").replace(/\/+$/, "");
    this.vaultToken = process.env.VAULT_TOKEN ?? "";
    this.keyName = process.env.VAULT_TRANSIT_KEY_NAME ?? "";

    if (!this.vaultAddr || !this.vaultToken || !this.keyName) {
      throw new Error(
        "VAULT_ADDR, VAULT_TOKEN, and VAULT_TRANSIT_KEY_NAME are required for vault-transit signer.",
      );
    }
  }

  async sign(digest: Buffer, keyVersion: string): Promise<{ signature: Buffer; keyVersion: string }> {
    const response = await fetch(`${this.vaultAddr}/v1/transit/sign/${this.keyName}`, {
      method: "POST",
      headers: {
        "X-Vault-Token": this.vaultToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: digest.toString("base64") }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vault Transit sign failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as VaultTransitSignResponse;
    const signatureParts = result.data.signature.split(":");
    const vaultKeyVersion = signatureParts[1] ?? `v${result.data.key_version}`;
    const signatureBase64 = signatureParts.slice(2).join(":");

    return {
      signature: Buffer.from(signatureBase64, "base64"),
      keyVersion: keyVersion || vaultKeyVersion,
    };
  }

  async verify(digest: Buffer, signature: Buffer, keyVersion: string): Promise<boolean> {
    const response = await fetch(`${this.vaultAddr}/v1/transit/verify/${this.keyName}`, {
      method: "POST",
      headers: {
        "X-Vault-Token": this.vaultToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: digest.toString("base64"),
        signature: `vault:${keyVersion}:${signature.toString("base64")}`,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as VaultTransitVerifyResponse;
    return result.data.valid;
  }

  async rotate(): Promise<{ newKeyVersion: string; publicKeyJwk: SignerJwk }> {
    const response = await fetch(`${this.vaultAddr}/v1/transit/keys/${this.keyName}/rotate`, {
      method: "POST",
      headers: {
        "X-Vault-Token": this.vaultToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vault Transit rotate failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as VaultTransitRotateResponse;
    const newKeyVersion = `v${result.data.key_version}`;
    return { newKeyVersion, publicKeyJwk: await this.getPublicKeyJwk(newKeyVersion) };
  }

  async getPublicKeyJwk(keyVersion: string): Promise<SignerJwk> {
    const response = await fetch(`${this.vaultAddr}/v1/transit/keys/${this.keyName}`, {
      method: "GET",
      headers: {
        "X-Vault-Token": this.vaultToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vault Transit get key failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as VaultTransitKeyResponse;
    const version = keyVersion.replace(/^v/, "");
    const keyEntry = result.data.keys[version];
    if (!keyEntry) {
      throw new Error(`Vault Transit key version ${keyVersion} not found.`);
    }

    return {
      kty: "OKP",
      crv: "Ed25519",
      alg: "EdDSA",
      kid: keyVersion,
      x: Buffer.from(keyEntry.public_key, "base64").toString("base64url"),
    };
  }
}

export function resolveSignerPortFromEnv(): {
  provider: SignerProviderType;
  signer: SignerPort | null;
} {
  const provider = (process.env.ACP_SIGNER_PROVIDER ?? "") as SignerProviderType;
  switch (provider) {
    case "env-ed25519":
      return { provider, signer: new EnvEd25519Signer() };
    case "vault-transit":
      return { provider, signer: new VaultTransitSigner() };
    default:
      return { provider: provider || "dev-hmac", signer: null };
  }
}

export async function signDigestWithPort(
  digestHex: string,
  signer: SignerPort | null,
): Promise<string> {
  if (!signer) {
    return signDigest(digestHex);
  }

  const keyVersion = getKeyVersion();
  const result = await signer.sign(Buffer.from(digestHex, "utf8"), keyVersion);
  return `ed25519:${result.keyVersion}:${result.signature.toString("hex")}`;
}

export async function getPublicKeyHexFromSigner(
  signer: SignerPort | null,
  keyVersion = getKeyVersion(),
): Promise<string | null> {
  if (!signer) {
    return null;
  }

  const jwk = await signer.getPublicKeyJwk(keyVersion);
  return jwk.x ? Buffer.from(jwk.x, "base64url").toString("hex") : null;
}
