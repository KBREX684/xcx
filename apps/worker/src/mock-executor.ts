import type { ExecutionRequest, ExecutionResult, ExecutorPort } from "@agent-control-plane/domain";

export class MockExecutor implements ExecutorPort {
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    await new Promise((resolve) => setTimeout(resolve, 180));

    const summary = [
      "已生成本次小程序交付的实现摘要。",
      "包含页面实现范围、剩余风险与建议审批意见。",
      "适合直接进入人工审核。"
    ].join("");

    const markdown = [
      `# 交付摘要`,
      ``,
      `- Run：${request.runId}`,
      `- Trace：${request.traceId}`,
      `- 项目：${request.projectId}`,
      `- 任务：${request.taskId}`,
      ``,
      `## 本次输出`,
      `- 已完成核心页面骨架与交互说明`,
      `- 已整理待验收项与后续建议`,
      ``,
      `## 审批建议`,
      `建议先通过当前摘要版本进入人工确认，确认后再推进下一轮测试与交付包装。`
    ].join("\n");

    return {
      outputSummary: summary,
      artifacts: [
        {
          title: "delivery-brief",
          artifactType: "markdown",
          mimeType: "text/markdown",
          contents: markdown,
          metadata: {
            generatedBy: "mock-executor",
            prompt: request.prompt
          }
        }
      ]
    };
  }
}

