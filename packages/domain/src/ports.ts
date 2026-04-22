export interface ExecutionRequest {
  runId: string;
  projectId: string;
  taskId: string;
  traceId: string;
  prompt: string;
}

export interface ExecutionArtifactDraft {
  title: string;
  artifactType: string;
  mimeType: string;
  contents: string;
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
  byteLength: number;
  metadata?: Record<string, unknown>;
}

export interface ArtifactStoragePort {
  persistArtifact(input: ExecutionArtifactDraft & { runId: string }): Promise<StoredArtifact>;
}

export interface ClaimedRun {
  runId: string;
  projectId: string;
  taskId: string;
  traceId: string;
  prompt: string;
}

export interface TaskDispatcherPort {
  claimNextRun(): Promise<ClaimedRun | null>;
  markWaitingApproval(input: {
    runId: string;
    taskId: string;
    outputSummary: string;
    artifacts: StoredArtifact[];
  }): Promise<void>;
  markFailed(runId: string, taskId: string, message: string): Promise<void>;
}
