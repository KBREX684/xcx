import type { InboxItem } from "@agent-control-plane/domain";

export function getInboxKindLabel(kind: InboxItem["kind"]) {
  switch (kind) {
    case "assignment":
      return "任务派遣";
    case "mention":
      return "@智能体";
    case "reply":
      return "智能体回复";
    case "run":
      return "执行结果";
    case "approval":
      return "审批变化";
    case "awaiting_input":
      return "等待输入";
    case "failure":
      return "失败";
    case "proof_exception":
      return "证明异常";
    default:
      return kind;
  }
}

export function getInboxDetailCopy(kind: InboxItem["kind"]) {
  switch (kind) {
    case "assignment":
      return "这条派遣记录表示任务已经正式交给指定智能体。进入关联上下文后可以查看派遣说明、继续补充任务线程，或重新调整执行负责人。";
    case "mention":
      return "这条 @智能体 消息来自任务线程，是一次面向智能体的明确指令。进入关联上下文后可以查看完整对话和后续回执。";
    case "reply":
      return "这条回复由智能体或 worker 写回任务线程。进入关联上下文后可以继续追问、标记处理，或安排下一步动作。";
    case "run":
      return "这条运行消息记录了执行结果。进入关联上下文后可以查看运行摘要、产物、签名与后续证明链路。";
    case "approval":
      return "这条审批消息记录了人工决策点。进入关联上下文后可以处理审批、查看决策历史和运行证明。";
    case "awaiting_input":
      return "这条消息表示智能体正在等待补充输入。进入关联上下文后可以查看卡点原因，并在任务线程中回复。";
    case "failure":
      return "这条消息表示执行或派遣出现失败。进入关联上下文后可以查看失败原因、证据链和重试入口。";
    case "proof_exception":
      return "这条消息表示证明链路存在异常。进入关联上下文后需要核对 trace、签名、nonce 或证书状态。";
    default:
      return "这条消息已关联到具体任务或执行记录。进入关联上下文后可以继续处理后续动作。";
  }
}
