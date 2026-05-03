"use client";

import type { ApprovalQueueItem } from "@agent-control-plane/domain";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@agent-control-plane/ui";
import { bulkApprovalAction } from "../app/actions";
import { formatDateTime, shortTrace } from "../lib/format";
import { ApprovalForm } from "./approval-form";
import { StatusPill } from "./status-pill";

export function BulkApprovalPanel({ pending }: { pending: ApprovalQueueItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [pendingDecision, setPendingDecision] = useState<"approve" | "reject" | null>(null);
  const router = useRouter();

  function toggle(runId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === pending.length ? new Set() : new Set(pending.map((item) => item.runId)),
    );
  }

  function handleBulk(decision: "approve" | "reject") {
    if (selected.size === 0) {
      toast.info("请先勾选至少一条记录。");
      return;
    }
    setPendingDecision(decision);
  }

  function executeBulk(decision: "approve" | "reject") {
    const label = decision === "approve" ? "批量通过" : "批量驳回";
    setPendingDecision(null);
    startTransition(async () => {
      const result = await bulkApprovalAction({
        runIds: Array.from(selected),
        decision,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const { succeeded, failed } = result.data ?? { succeeded: [], failed: [] };
      if (failed.length === 0) {
        toast.success(`${label}成功：${succeeded.length} 条`);
      } else if (succeeded.length === 0) {
        toast.error(`${label}失败：${failed.length} 条`);
      } else {
        toast.warning(`部分完成：成功 ${succeeded.length}，失败 ${failed.length}`);
      }

      setSelected(new Set());
      router.refresh();
    });
  }

  const allSelected = pending.length > 0 && selected.size === pending.length;

  return (
    <div className="form-stack">
      <div className="bulk-bar" role="toolbar" aria-label="批量审批">
        <label className="bulk-select">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label={allSelected ? "取消全选" : "全选"}
          />
          <span>全选</span>
        </label>
        <span className="bulk-bar__count">
          已选 {selected.size} / {pending.length}
        </span>
        <div className="bulk-bar__actions">
          <button
            type="button"
            className="action-button"
            disabled={isPending || selected.size === 0}
            onClick={() => handleBulk("approve")}
          >
            {isPending ? "处理中..." : "批量通过"}
          </button>
          <button
            type="button"
            className="bulk-bar__danger"
            disabled={isPending || selected.size === 0}
            onClick={() => handleBulk("reject")}
          >
            批量驳回
          </button>
        </div>
      </div>

      <div className="list-stack">
        {pending.map((item) => (
          <article key={item.runId} className="list-card">
            <div className="list-card-head" style={{ gap: 12 }}>
              <div
                style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1, minWidth: 0 }}
              >
                <span style={{ paddingTop: 2 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(item.runId)}
                    onChange={() => toggle(item.runId)}
                    aria-label={`选择 ${item.taskTitle}`}
                    disabled={isPending}
                  />
                </span>
                <div style={{ minWidth: 0 }}>
                  <h4 className="list-card-title">{item.taskTitle}</h4>
                  <p className="supporting-text">
                    {item.projectName} 由 {item.agentName} 负责推进
                  </p>
                </div>
              </div>
              <StatusPill status="waiting_approval" />
            </div>
            <div className="meta-row">
              <span>项目编号 {item.projectCode}</span>
              <span>追踪标识 {shortTrace(item.traceId, 10)}</span>
              <span>{formatDateTime(item.requestedAt)}</span>
            </div>
            <p className="soft-note">
              {item.outputSummary ?? "当前没有补充输出摘要，可进入执行详情页查看原始内容。"}
            </p>
            <div className="link-row">
              <Link href={`/runs/${item.runId}`} className="inline-link">
                查看执行详情
              </Link>
              <Link href={`/projects/${item.projectId}`} className="inline-link">
                打开项目工作台
              </Link>
            </div>
            <div className="embedded-form">
              <ApprovalForm projectId={item.projectId} runId={item.runId} returnPath="/approvals" />
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={pendingDecision !== null}
        onClose={() => setPendingDecision(null)}
        title={pendingDecision === "reject" ? "确认批量驳回" : "确认批量通过"}
        description={
          pendingDecision === "reject"
            ? `即将驳回已选中的 ${selected.size} 条审批，操作不可撤销。`
            : `即将批准已选中的 ${selected.size} 条审批，确认后立即生效。`
        }
        footer={
          <>
            <button
              type="button"
              className="action-button action-button--ghost"
              onClick={() => setPendingDecision(null)}
              disabled={isPending}
            >
              取消
            </button>
            <button
              type="button"
              className={
                pendingDecision === "reject" ? "bulk-bar__danger" : "action-button"
              }
              onClick={() => pendingDecision && executeBulk(pendingDecision)}
              disabled={isPending}
              autoFocus
            >
              {isPending
                ? "处理中..."
                : pendingDecision === "reject"
                  ? "确认驳回"
                  : "确认通过"}
            </button>
          </>
        }
      >
        <p className="supporting-text">
          影响 <strong>{selected.size}</strong> 条任务，覆盖项目数量{" "}
          <strong>
            {new Set(pending.filter((p) => selected.has(p.runId)).map((p) => p.projectId)).size}
          </strong>
          。
        </p>
      </Modal>
    </div>
  );
}
