"use client";

import {
  type AssignableAgentOption,
  type ConversationThread,
  type TaskAssignment,
  getStatusLabel,
} from "@agent-control-plane/domain";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  assignTaskAction,
  editMessageAction,
  postTaskMessageAction,
  replyMessageAction,
  resolveThreadAction,
} from "../app/actions";
import type { ActionResult } from "../lib/action-result";
import { formatDateTime, formatRelativeTime, getExecutorTypeLabel } from "../lib/format";
import { CommentComposer } from "./comment-composer";

const AGENT_SESSION_LABELS: Record<string, string> = {
  queued: "排队中",
  running: "运行中",
  active: "进行中",
  awaiting_input: "等待输入",
  completed: "已完成",
  failed: "已失败",
  cancelled: "已取消",
  stale: "已过期",
};

type TaskCollaborationPanelProps = {
  projectId: string;
  taskId: string;
  returnPath: string;
  delegateAgentId: string | null;
  delegateAgentName: string | null;
  recentAssignment: TaskAssignment | null;
  availableAgents: AssignableAgentOption[];
  thread: ConversationThread;
  teamGuidance?: string | null;
};

type CollaborationAction = (formData: FormData) => Promise<ActionResult | void>;

export function TaskCollaborationPanel({
  projectId,
  taskId,
  returnPath,
  delegateAgentId,
  delegateAgentName,
  recentAssignment,
  availableAgents,
  thread,
  teamGuidance,
}: TaskCollaborationPanelProps) {
  const mentionNameById = new Map(availableAgents.map((agent) => [agent.id, agent.name]));
  const latestMessageId = thread.messages.at(-1)?.id ?? null;
  const [isPending, startTransition] = useTransition();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  function submit(
    action: CollaborationAction,
    formData: FormData,
    validate?: (formData: FormData) => boolean,
  ) {
    if (validate && !validate(formData)) {
      return;
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result?.ok === false) {
        toast.error(result.error);
      }
    });
  }

  function validateAssignment(formData: FormData) {
    const agentId = String(formData.get("agentId") ?? "").trim();
    if (!agentId) {
      toast.error("请选择要派遣的智能体。");
      return false;
    }
    return true;
  }

  function validateMessage(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (!body) {
      toast.error("请输入评论内容。");
      return false;
    }
    if (body.length > 2000) {
      toast.error("评论内容不能超过 2000 个字。");
      return false;
    }
    return true;
  }

  return (
    <div className="stack-panel">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow-text">任务派遣</p>
            <h3 className="panel-title">当前派遣状态</h3>
          </div>
        </div>

        {teamGuidance ? (
          <div className="soft-note" role="note" aria-label="团队 Agent 派遣建议">
            <strong>团队建议：</strong>
            {teamGuidance}
          </div>
        ) : null}

        <div className="meta-column">
          <span>当前派遣：{delegateAgentName ?? "暂未派遣智能体"}</span>
          {recentAssignment ? (
            <span suppressHydrationWarning>
              最近派遣：{recentAssignment.agentName} · {recentAssignment.assignedByName} ·{" "}
              {formatRelativeTime(recentAssignment.assignedAt)}
            </span>
          ) : (
            <span>还没有正式派遣记录。</span>
          )}
        </div>

        <form
          action={(formData) => submit(assignTaskAction, formData, validateAssignment)}
          className="inline-form stack-gap-sm"
        >
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="returnPath" value={returnPath} />

          <label className="field-group">
            <span className="field-label">派遣智能体</span>
            <select name="agentId" className="field-control" defaultValue={delegateAgentId ?? ""}>
              <option value="">请选择团队内智能体</option>
              {availableAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} · {agent.roleName} · {getExecutorTypeLabel(agent.transport)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span className="field-label">派遣说明</span>
            <textarea
              name="note"
              className="field-control field-control-textarea"
              rows={3}
              placeholder="例如：先补齐验收说明，再整理本次交付摘要。"
            />
          </label>

          <button type="submit" className="action-button secondary-action" disabled={isPending}>
            {isPending ? "提交中..." : "派遣给智能体"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow-text">任务线程</p>
            <h3 className="panel-title">评论、@智能体 与回复</h3>
          </div>
          {latestMessageId ? (
            <form action={(formData) => submit(resolveThreadAction, formData)}>
              <input type="hidden" name="messageId" value={latestMessageId} />
              <input type="hidden" name="taskId" value={taskId} />
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <input
                type="hidden"
                name="resolved"
                value={thread.status === "resolved" ? "false" : "true"}
              />
              <button type="submit" className="ghost-button" disabled={isPending}>
                {isPending
                  ? "处理中..."
                  : thread.status === "resolved"
                    ? "重新打开线程"
                    : "标记为已处理"}
              </button>
            </form>
          ) : null}
        </div>

        <div className="meta-column">
          <span>线程状态：{thread.status === "resolved" ? "已处理" : "进行中"}</span>
          <span suppressHydrationWarning>最近更新：{formatRelativeTime(thread.updatedAt)}</span>
          {thread.resolvedAt ? <span>处理时间：{formatDateTime(thread.resolvedAt)}</span> : null}
          {thread.resolvedByName ? <span>处理人：{thread.resolvedByName}</span> : null}
        </div>

        {thread.pendingInstructions.length > 0 ? (
          <div className="agent-activity" aria-label="智能体活动">
            <p className="eyebrow-text">智能体活动</p>
            <ul className="agent-activity-list">
              {thread.pendingInstructions.map((instruction) => {
                const stateLabel =
                  AGENT_SESSION_LABELS[instruction.status] ?? getStatusLabel(instruction.status);
                const lastTouch =
                  instruction.lastActivityAt ?? instruction.completedAt ?? instruction.createdAt;
                return (
                  <li key={instruction.id} className="agent-activity-item">
                    <div className="agent-activity-row">
                      <span className="agent-activity-name">{instruction.agentName}</span>
                      <span className="agent-activity-state" data-state={instruction.status}>
                        {stateLabel}
                      </span>
                      <span className="agent-activity-time" suppressHydrationWarning>
                        {formatRelativeTime(lastTouch)}
                      </span>
                    </div>
                    {instruction.status === "awaiting_input" && instruction.awaitingInputReason ? (
                      <p className="agent-activity-detail">
                        等待输入：{instruction.awaitingInputReason}
                      </p>
                    ) : null}
                    {instruction.activitySummary ? (
                      <p className="agent-activity-detail">{instruction.activitySummary}</p>
                    ) : null}
                    {instruction.responseSummary ? (
                      <p className="agent-activity-detail muted">{instruction.responseSummary}</p>
                    ) : null}
                    {instruction.runId ? (
                      <a href={`/runs/${instruction.runId}`} className="agent-activity-evidence">
                        查看证据
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <form
          action={(formData) => submit(postTaskMessageAction, formData, validateMessage)}
          className="inline-form stack-gap-sm thread-composer"
        >
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="returnPath" value={returnPath} />

          <label className="field-group">
            <span className="field-label">新增评论</span>
            <CommentComposer
              agents={availableAgents}
              placeholder="输入任务进展，或选择智能体直接安排下一步动作。"
            />
          </label>

          <button type="submit" className="action-button" disabled={isPending}>
            {isPending ? "发送中..." : "发送到任务线程"}
          </button>
        </form>

        {thread.messages.length === 0 ? (
          <div className="empty-state">
            当前还没有评论线程。你可以先补充一条任务说明，或直接 @智能体安排执行。
          </div>
        ) : (
          <div className="thread-stack">
            {thread.messages.map((message) => (
              <article key={message.id} className="thread-message">
                <div className="thread-message-head">
                  <div>
                    <strong>{message.authorName}</strong>
                    <p className="supporting-text">
                      {formatDateTime(message.createdAt)}
                      {message.replyToMessageId ? " · 回复上文" : ""}
                      {message.editedAt ? ` · 已编辑 ${formatRelativeTime(message.editedAt)}` : ""}
                    </p>
                  </div>
                  <div className="thread-message-actions">
                    <Link href={`/messages/${message.id}`} className="ghost-button">
                      查看详情
                    </Link>
                    {message.authorType === "member" ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          setEditingMessageId((current) =>
                            current === message.id ? null : message.id,
                          )
                        }
                      >
                        {editingMessageId === message.id ? "取消编辑" : "编辑"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {editingMessageId === message.id ? (
                  <form
                    action={(formData) => {
                      submit(editMessageAction, formData, (fd) => {
                        const value = String(fd.get("body") ?? "").trim();
                        if (!value) {
                          toast.error("评论内容不能为空。");
                          return false;
                        }
                        return true;
                      });
                      setEditingMessageId(null);
                    }}
                    className="inline-form stack-gap-sm"
                  >
                    <input type="hidden" name="messageId" value={message.id} />
                    <input type="hidden" name="taskId" value={taskId} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <textarea
                      name="body"
                      className="field-control field-control-textarea"
                      rows={3}
                      defaultValue={message.body}
                      maxLength={2000}
                    />
                    <button
                      type="submit"
                      className="action-button secondary-action"
                      disabled={isPending}
                    >
                      {isPending ? "保存中..." : "保存修改"}
                    </button>
                  </form>
                ) : (
                  <p className="thread-message-body">{message.body}</p>
                )}

                {message.mentionAgentIds.length > 0 ? (
                  <div className="tag-row">
                    {message.mentionAgentIds.map((agentId) => (
                      <span key={agentId} className="tag-chip">
                        @{mentionNameById.get(agentId) ?? agentId}
                      </span>
                    ))}
                  </div>
                ) : null}

                <details className="inline-disclosure inline-disclosure-compact">
                  <summary className="inline-disclosure-trigger">回复此条</summary>
                  <div className="inline-disclosure-body">
                    <form
                      action={(formData) => submit(replyMessageAction, formData, validateMessage)}
                      className="inline-form stack-gap-sm"
                    >
                      <input type="hidden" name="messageId" value={message.id} />
                      <input type="hidden" name="taskId" value={taskId} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <CommentComposer
                        agents={availableAgents}
                        rows={3}
                        placeholder="补充回复，或再次选择智能体继续推进。"
                      />
                      <button
                        type="submit"
                        className="action-button secondary-action"
                        disabled={isPending}
                      >
                        {isPending ? "提交中..." : "提交回复"}
                      </button>
                    </form>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
