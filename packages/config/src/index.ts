import { DEMO_IDS } from "@agent-control-plane/domain";

export * from "./env";

export const appPorts = {
  web: Number(process.env.WEB_PORT ?? 3000),
  api: Number(process.env.API_PORT ?? 3101),
  openapiAdapter: Number(process.env.OPENAPI_ADAPTER_PORT ?? 3102),
  mcpRelay: Number(process.env.MCP_RELAY_PORT ?? 3103),
} as const;

export const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 1500);

/**
 * Demo / seed bootstrap context.
 * IMPORTANT: These are hardcoded IDs for the initial seed dataset only.
 * They map to the workspace and members created by `prisma/seed.ts`.
 * Do NOT use these IDs as real multi-tenant identifiers.
 * In a production multi-tenant setup, workspace context must be derived
 * from the authenticated JWT payload (req.user.workspaceId).
 */
export const bootstrapContext = {
  workspaceId: DEMO_IDS.workspaceId,
  ownerMemberId: DEMO_IDS.projectManagerMemberId,
  developerMemberId: DEMO_IDS.developerMemberId,
  approverMemberId: DEMO_IDS.approverMemberId,
  customerMemberId: DEMO_IDS.customerMemberId,
  deliveryTeamId: DEMO_IDS.deliveryTeamId,
  workflowTemplateId: DEMO_IDS.workflowTemplateId,
} as const;

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${appPorts.api}`;
}

export function getOpenapiAdapterBaseUrl(): string {
  return process.env.OPENAPI_ADAPTER_URL ?? `http://localhost:${appPorts.openapiAdapter}`;
}

export function getMcpRelayBaseUrl(): string {
  return process.env.MCP_RELAY_URL ?? `http://localhost:${appPorts.mcpRelay}`;
}
