import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { ApprovalForm } from "../../../components/approval-form";
import { StatusPill } from "../../../components/status-pill";
import { getRun } from "../../../lib/api";
import { formatDateTime, shortTrace } from "../../../lib/format";

type ApprovalDetailPageProps = {
  params: Promise<{
    runId: string;
  }>;
};

export default async function ApprovalDetailPage({ params }: ApprovalDetailPageProps) {
  const { runId } = await params;
  const run = await getRun(runId).catch(() => null);

  if (!run) {
    notFound();
  }

  return (
    <AppShell
      activeNav="approvals"
      title="审批详情"
      description="查看本次待决策执行记录，并在详情页完成通过或驳回。"
      breadcrumbs={[{ label: "审批中心", href: "/approvals" }, { label: "审批详情" }]}
    >
      <section className="content-grid approval-detail-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">{run.projectCode}</p>
              <h3 className="panel-title">{run.taskTitle}</h3>
            </div>
            <StatusPill status={run.status} />
          </div>

          <div className="detail-block">
            <dl className="inbox-detail__meta">
              <div>
                <dt>项目</dt>
                <dd>{run.projectName}</dd>
              </div>
              <div>
                <dt>执行智能体</dt>
                <dd>{run.agentName}</dd>
              </div>
              <div>
                <dt>追踪标识</dt>
                <dd>{shortTrace(run.traceId, 14)}</dd>
              </div>
              <div>
                <dt>请求时间</dt>
                <dd>{formatDateTime(run.startedAt ?? run.finishedAt)}</dd>
              </div>
            </dl>

            <div className="inbox-detail__body">
              <p>
                {run.outputSummary ?? "当前没有补充输出摘要，可结合执行详情查看原始输入与产物。"}
              </p>
            </div>

            <div className="link-row">
              <Link href="/approvals" className="secondary-action">
                返回审批中心
              </Link>
              <Link href={`/runs/${run.id}`} className="inline-link">
                查看执行详情
              </Link>
              <Link href={`/projects/${run.projectId}`} className="inline-link">
                打开项目工作台
              </Link>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">人工决策</p>
              <h3 className="panel-title">通过或驳回</h3>
            </div>
          </div>
          {run.approval ? (
            <div className="compact-stack">
              <StatusPill status={run.approval.decision} />
              <div className="meta-column">
                <span>审批人：{run.approval.approverName}</span>
                <span>审批时间：{formatDateTime(run.approval.decidedAt)}</span>
              </div>
              <p className="soft-note">{run.approval.comment ?? "本次审批没有附加说明。"}</p>
            </div>
          ) : run.status === "waiting_approval" ? (
            <ApprovalForm projectId={run.projectId} runId={run.id} returnPath="/approvals" />
          ) : (
            <div className="empty-state">当前执行记录不处于待审批状态。</div>
          )}
        </section>
      </section>
    </AppShell>
  );
}
