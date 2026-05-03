import { z } from "zod";
import { certificateStatuses, evidenceEntityTypes, evidenceTrustStates, runStatuses } from "../status";

export const miniappEvidenceEventSchema = z.object({
  id: z.string().min(1),
  sequenceNo: z.number().int().nullable(),
  eventType: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  actorType: z.string(),
  actorId: z.string(),
  traceId: z.string(),
  payloadDigest: z.string().nullable(),
  prevEventHash: z.string().nullable(),
  eventHash: z.string().nullable(),
  occurredAt: z.string(),
});

export const miniappEvidenceRunSchema = z.object({
  id: z.string().min(1),
  taskId: z.string(),
  taskTitle: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  status: z.enum(runStatuses),
  traceId: z.string(),
  agentSignature: z.string().nullable(),
  nonce: z.string().nullable(),
  signedAt: z.string().nullable(),
  nonceLedgerFound: z.boolean(),
});

export const miniappEvidenceCertificateSchema = z.object({
  id: z.string().min(1),
  certificateNo: z.string(),
  status: z.enum(certificateStatuses),
  digestSha256: z.string(),
  signature: z.string(),
  chainHeadHash: z.string(),
  verificationUrl: z.string(),
  issuedAt: z.string(),
});

export const miniappEvidenceSummarySchema = z.object({
  entityType: z.enum(evidenceEntityTypes),
  entityId: z.string().min(1),
  trustState: z.enum(evidenceTrustStates),
  events: z.array(miniappEvidenceEventSchema),
  runs: z.array(miniappEvidenceRunSchema),
  certificates: z.array(miniappEvidenceCertificateSchema),
});

export type MiniappEvidenceSummary = z.infer<typeof miniappEvidenceSummarySchema>;
