import {
  applyApprovalDecision,
  isApprovalPending,
  isRunTerminal,
  taskStatusOnApprovalRequested,
} from "./transitions";

describe("P1 status transitions", () => {
  it("moves task to waiting approval when run reaches approval gate", () => {
    expect(taskStatusOnApprovalRequested()).toBe("waiting_approval");
  });

  it("completes run and task when approval passes", () => {
    expect(applyApprovalDecision("approved")).toEqual({
      nextRunStatus: "succeeded",
      nextTaskStatus: "completed",
      terminal: true,
    });
  });

  it("reopens task and fails run when approval rejects", () => {
    expect(applyApprovalDecision("rejected")).toEqual({
      nextRunStatus: "failed",
      nextTaskStatus: "in_progress",
      terminal: true,
    });
  });

  it("identifies approval and terminal states correctly", () => {
    expect(isApprovalPending("waiting_approval")).toBe(true);
    expect(isApprovalPending("running")).toBe(false);
    expect(isRunTerminal("succeeded")).toBe(true);
    expect(isRunTerminal("waiting_approval")).toBe(false);
  });
});
