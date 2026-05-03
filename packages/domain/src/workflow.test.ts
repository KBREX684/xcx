import { describe, it, expect } from "vitest";
import {
  workflowTemplateNodeInputSchema,
  createWorkflowTemplateInputSchema,
} from "./schemas";

describe("workflowTemplateNodeInputSchema (DAG node types)", () => {
  it("accepts a basic task node", () => {
    const result = workflowTemplateNodeInputSchema.safeParse({
      key: "draft",
      type: "task",
      name: "Draft proposal",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an approval node", () => {
    const result = workflowTemplateNodeInputSchema.safeParse({
      key: "approve",
      type: "approval",
      name: "Manager approval",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a condition node with predicate and branches", () => {
    const result = workflowTemplateNodeInputSchema.safeParse({
      key: "branch_on_amount",
      type: "condition",
      name: "Amount > 10000?",
      predicate: "input.amount > 10000",
      trueBranchKey: "high_value_path",
      falseBranchKey: "standard_path",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a condition node missing predicate", () => {
    const result = workflowTemplateNodeInputSchema.safeParse({
      key: "branch",
      type: "condition",
      name: "Branch",
      trueBranchKey: "a",
      falseBranchKey: "b",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("predicate"))).toBe(true);
    }
  });

  it("rejects a condition node missing branch keys", () => {
    const result = workflowTemplateNodeInputSchema.safeParse({
      key: "branch",
      type: "condition",
      name: "Branch",
      predicate: "x > 0",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a parallel node with branchKeys + joinStrategy", () => {
    const result = workflowTemplateNodeInputSchema.safeParse({
      key: "fanout",
      type: "parallel",
      name: "Run in parallel",
      branchKeys: ["legal_review", "finance_review"],
      joinStrategy: "all",
    });
    expect(result.success).toBe(true);
  });

  it("rejects parallel node with only one branch", () => {
    const result = workflowTemplateNodeInputSchema.safeParse({
      key: "fanout",
      type: "parallel",
      name: "Bad parallel",
      branchKeys: ["only_one"],
      joinStrategy: "all",
    });
    expect(result.success).toBe(false);
  });

  it("rejects parallel node missing joinStrategy", () => {
    const result = workflowTemplateNodeInputSchema.safeParse({
      key: "fanout",
      type: "parallel",
      name: "Bad parallel",
      branchKeys: ["a", "b"],
    });
    expect(result.success).toBe(false);
  });

  it("integrates with createWorkflowTemplateInputSchema", () => {
    const result = createWorkflowTemplateInputSchema.safeParse({
      name: "Conditional Flow",
      scenarioType: "general",
      version: "1.0.0",
      nodes: [
        { key: "start", type: "task", name: "Start" },
        {
          key: "branch",
          type: "condition",
          name: "Check value",
          predicate: "value > 0",
          trueBranchKey: "positive",
          falseBranchKey: "negative",
        },
        { key: "positive", type: "task", name: "Positive path" },
        { key: "negative", type: "task", name: "Negative path" },
        { key: "done", type: "end", name: "End" },
      ],
    });
    expect(result.success).toBe(true);
  });
});
