import { describe, expect, it } from "vitest";
import {
  approvalSummarySchema,
  decodeInboxCursor,
  EMPTY_APPROVAL_SUMMARY,
  encodeInboxCursor,
  inboxCursorSchema,
  miniappApprovalDecisionInputSchema,
  miniappEvidenceSummarySchema,
  miniappInboxFilterSchema,
  miniappInboxItemSchema,
  pickLatestCursor,
} from "./index";

describe("miniapp inbox contracts", () => {
  it("encodes and decodes cursors", () => {
    const d = new Date("2026-04-26T10:00:00.000Z");
    expect(encodeInboxCursor(d)).toBe("2026-04-26T10:00:00.000Z");
    expect(decodeInboxCursor("2026-04-26T10:00:00.000Z")).toBeInstanceOf(Date);
    expect(decodeInboxCursor("not iso")).toBeNull();
  });

  it("rejects invalid cursor and accepts known filters", () => {
    expect(inboxCursorSchema.safeParse("a".repeat(41)).success).toBe(false);
    expect(miniappInboxFilterSchema.safeParse("mentions").success).toBe(true);
    expect(miniappInboxFilterSchema.safeParse("random").success).toBe(false);
  });

  it("validates mobile inbox items", () => {
    const parsed = miniappInboxItemSchema.safeParse({
      id: "evt_1",
      kind: "approval",
      title: "待审批 Run",
      subtitle: "需要移动端处理",
      href: "/runs/run_1",
      createdAt: "2026-04-26T10:00:00.000Z",
      status: "waiting_approval",
      unread: true,
      archived: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("picks latest cursor from items", () => {
    expect(
      pickLatestCursor([
        { createdAt: "2026-04-26T08:00:00.000Z" },
        { createdAt: "2026-04-26T10:00:00.000Z" },
      ]),
    ).toBe("2026-04-26T10:00:00.000Z");
  });
});

describe("miniapp approval and evidence contracts", () => {
  it("validates approval summary and idempotency input", () => {
    expect(approvalSummarySchema.safeParse(EMPTY_APPROVAL_SUMMARY).success).toBe(true);
    expect(
      miniappApprovalDecisionInputSchema.safeParse({
        comment: "移动端通过",
        clientRequestId: "approval:m1234567",
      }).success,
    ).toBe(true);
  });

  it("does not allow the miniapp to invent evidence states outside backend enum", () => {
    const parsed = miniappEvidenceSummarySchema.safeParse({
      entityType: "run",
      entityId: "run_1",
      trustState: "verified",
      events: [],
      runs: [],
      certificates: [],
    });
    expect(parsed.success).toBe(true);

    const bad = miniappEvidenceSummarySchema.safeParse({
      entityType: "run",
      entityId: "run_1",
      trustState: "looks-good",
      events: [],
      runs: [],
      certificates: [],
    });
    expect(bad.success).toBe(false);
  });
});
