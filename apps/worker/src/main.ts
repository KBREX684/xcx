import { pollIntervalMs } from "@agent-control-plane/config";
import { PrismaClient } from "@prisma/client";
import { DatabaseTaskDispatcher } from "./database-task-dispatcher";
import { LocalArtifactStorage } from "./local-artifact-storage";
import { MockExecutor } from "./mock-executor";

const prisma = new PrismaClient();
const dispatcher = new DatabaseTaskDispatcher(prisma);
const storage = new LocalArtifactStorage();
const executor = new MockExecutor();

let isTicking = false;

async function tick() {
  if (isTicking) {
    return;
  }

  isTicking = true;
  let activeClaim: Awaited<ReturnType<typeof dispatcher.claimNextRun>> = null;

  try {
    const claimed = await dispatcher.claimNextRun();
    if (!claimed) {
      return;
    }
    activeClaim = claimed;

    const execution = await executor.execute(claimed);
    const storedArtifacts = await Promise.all(
      execution.artifacts.map((artifact) =>
        storage.persistArtifact({
          ...artifact,
          runId: claimed.runId
        })
      )
    );

    await dispatcher.markWaitingApproval({
      runId: claimed.runId,
      taskId: claimed.taskId,
      outputSummary: execution.outputSummary,
      artifacts: storedArtifacts
    });

    console.log(`[worker] run ${claimed.runId} is now waiting approval`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown worker error";
    console.error("[worker] execution failed", error);
    if (activeClaim) {
      await dispatcher.markFailed(activeClaim.runId, activeClaim.taskId, message);
    }
  } finally {
    isTicking = false;
  }
}

async function main() {
  console.log(`[worker] polling every ${pollIntervalMs}ms`);
  setInterval(() => {
    void tick();
  }, pollIntervalMs);
  await tick();
}

main().catch(async (error) => {
  console.error("[worker] failed to start", error);
  await prisma.$disconnect();
  process.exit(1);
});
