import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ArtifactStoragePort, ExecutionArtifactDraft, StoredArtifact } from "@agent-control-plane/domain";

function resolveArtifactDirectory() {
  if (process.env.ACP_DATA_DIR) {
    return path.resolve(process.cwd(), process.env.ACP_DATA_DIR, "artifacts");
  }

  return path.resolve(process.cwd(), "../../.data/artifacts");
}

export class LocalArtifactStorage implements ArtifactStoragePort {
  async persistArtifact(input: ExecutionArtifactDraft & { runId: string }): Promise<StoredArtifact> {
    const directory = resolveArtifactDirectory();
    await mkdir(directory, { recursive: true });

    const extension = input.mimeType === "application/json" ? "json" : "md";
    const filePath = path.join(directory, `${input.runId}-${slugify(input.title)}.${extension}`);
    await writeFile(filePath, input.contents, "utf8");

    const sha256Digest = createHash("sha256").update(input.contents).digest("hex");

    return {
      title: input.title,
      artifactType: input.artifactType,
      storageUri: filePath,
      mimeType: input.mimeType,
      sha256Digest,
      byteLength: Buffer.byteLength(input.contents, "utf8"),
      metadata: input.metadata
    };
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

