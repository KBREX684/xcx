import {
  agentInstructionStatusSchema,
  inboxItemKindSchema,
  messageEditInputSchema,
  taskMessageInputSchema,
} from "./schemas";

describe("agent management linear schemas", () => {
  it("accepts up to 10 mentioned agents", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `agent-${i}`);
    const result = taskMessageInputSchema.safeParse({ body: "hello", mentionAgentIds: ids });
    expect(result.success).toBe(true);
  });

  it("rejects more than 10 mentioned agents", () => {
    const ids = Array.from({ length: 11 }, (_, i) => `agent-${i}`);
    const result = taskMessageInputSchema.safeParse({ body: "hello", mentionAgentIds: ids });
    expect(result.success).toBe(false);
  });

  it("requires non-empty body for edit input", () => {
    expect(messageEditInputSchema.safeParse({ body: "" }).success).toBe(false);
    expect(messageEditInputSchema.safeParse({ body: "  " }).success).toBe(false);
    expect(messageEditInputSchema.safeParse({ body: "updated" }).success).toBe(true);
  });

  it("rejects edit body over 2000 chars", () => {
    const body = "a".repeat(2001);
    expect(messageEditInputSchema.safeParse({ body }).success).toBe(false);
  });

  it("includes awaiting_input as a valid agent instruction status", () => {
    expect(agentInstructionStatusSchema.safeParse("awaiting_input").success).toBe(true);
    expect(agentInstructionStatusSchema.safeParse("active").success).toBe(true);
    expect(agentInstructionStatusSchema.safeParse("nope").success).toBe(false);
  });

  it("includes awaiting_input in inbox item kinds", () => {
    expect(inboxItemKindSchema.safeParse("awaiting_input").success).toBe(true);
    expect(inboxItemKindSchema.safeParse("assignment").success).toBe(true);
    expect(inboxItemKindSchema.safeParse("invalid").success).toBe(false);
  });
});
