import type { ExecutorType } from "./status";

// ─── Execution Ports ──────────────────────────────────────────────────────────

export interface ExecutionRequest {
  runId: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  customerName: string;
  taskId: string;
  taskTitle: string;
  agentName: string;
  nodeKey: string;
  capabilityCode: string | null;
  traceId: string;
  prompt: string;
  inputPayload: Record<string, unknown> | null;
  executorType: ExecutorType;
  openapiBaseUrl: string | null;
  mcpRelayBaseUrl: string | null;
}

export interface ExecutionArtifactDraft {
  title: string;
  artifactType: string;
  mimeType: string;
  contents: string;
  contentBase64?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionResult {
  outputSummary: string;
  artifacts: ExecutionArtifactDraft[];
}

export interface ExecutorPort {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}

export interface StoredArtifact {
  title: string;
  artifactType: string;
  storageUri: string;
  mimeType: string;
  sha256Digest: string;
  objectStorageBucket?: string | null;
  objectKey?: string | null;
  contentSha256?: string | null;
  byteLength: number;
  metadata?: Record<string, unknown>;
}

export interface ArtifactStoragePort {
  persistArtifact(input: ExecutionArtifactDraft & { runId: string }): Promise<StoredArtifact>;
}

export type ClaimedRun = ExecutionRequest;

export interface TaskDispatcherPort {
  claimNextRun(): Promise<ClaimedRun | null>;
  markRunCompleted(input: {
    runId: string;
    taskId: string;
    outputSummary: string;
    replyBody?: string;
    artifacts: StoredArtifact[];
  }): Promise<void>;
  markFailed(runId: string, taskId: string, message: string): Promise<void>;
}

// ─── Signer Port ──────────────────────────────────────────────────────────────

/** Ed25519 public JWK used by certificate and provenance verification clients. */
export interface SignerJwk {
  kty: "OKP";
  crv: "Ed25519";
  alg: "EdDSA";
  kid: string;
  x: string;
}

export interface SignerPort {
  sign(digest: Buffer, keyVersion: string): Promise<{ signature: Buffer; keyVersion: string }>;
  verify(digest: Buffer, signature: Buffer, keyVersion: string): Promise<boolean>;
  rotate(): Promise<{ newKeyVersion: string; publicKeyJwk: SignerJwk }>;
  getPublicKeyJwk(keyVersion: string): Promise<SignerJwk>;
}

// ─── Anchor Provider Port ─────────────────────────────────────────────────────

export interface AnchorMetadata {
  projectId: string;
  sequenceNo: number;
  anchoredAt: string;
}

export interface AnchorResult {
  providerType: AnchorProviderType;
  externalRef: string;
  proofPayload: string;
  verifiedAt: string | null;
}

export interface AnchorProof {
  providerType: AnchorProviderType;
  externalRef: string;
  proofPayload: string;
}

export interface VerificationResult {
  valid: boolean;
  verifiedAt: string;
  details?: string;
}

export type AnchorProviderType = "internal" | "opentimestamps" | "sigstore-rekor";

export interface AnchorProviderPort {
  anchor(hashChainRoot: string, metadata: AnchorMetadata): Promise<AnchorResult>;
  verify(proof: AnchorProof): Promise<VerificationResult>;
  providerType: AnchorProviderType;
}

// ─── Agent Adapter Port ───────────────────────────────────────────────────────

export interface AdapterTask {
  taskId: string;
  prompt: string;
  inputPayload: Record<string, unknown> | null;
  traceId: string;
}

export interface AdapterConfig {
  baseUrl: string;
  apiKey?: string;
  secretRef?: string;
  extra?: Record<string, unknown>;
}

export interface AdapterResult {
  outputSummary: string;
  status: "succeeded" | "failed" | "awaiting_input";
  artifacts: ExecutionArtifactDraft[];
  errorMessage?: string;
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  details?: string;
}

export type AgentAdapterType = "mcp-sse" | "dify" | "coze" | "fastgpt" | "webhook";

export interface AgentAdapterPort {
  execute(agentId: string, task: AdapterTask, config: AdapterConfig): Promise<AdapterResult>;
  healthCheck(): Promise<HealthStatus>;
  adapterType: AgentAdapterType;
}
