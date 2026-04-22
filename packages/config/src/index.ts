import { DEMO_IDS } from "@agent-control-plane/domain";

export const appPorts = {
  web: Number(process.env.WEB_PORT ?? 3000),
  api: Number(process.env.API_PORT ?? 3101)
} as const;

export const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 1500);

export const bootstrapContext = {
  workspaceId: DEMO_IDS.workspaceId,
  ownerMemberId: DEMO_IDS.ownerMemberId,
  approverMemberId: DEMO_IDS.approverMemberId,
  workflowTemplateId: DEMO_IDS.workflowTemplateId
} as const;

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${appPorts.api}`;
}

