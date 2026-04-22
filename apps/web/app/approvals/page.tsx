import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { ApprovalForm } from "../../components/approval-form";
import { StatusPill } from "../../components/status-pill";
import { getApprovals } from "../../lib/api";
import { formatDateTime, shortTrace } from "../../lib/format";

export default async function ApprovalsPage() {
  const approvals = await getApprovals();

  return (
    <AppShell
      activeNav="approvals"
      title="审批中心"
      description="集中处理待审批执行记录，并保留每一次通过或驳回的历史轨迹。"
      breadcrumbs={[{ label: "审批" }]}
    >
      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">待审批队列</p>
                <h3 className="panel-title">需要你做决定的执行项</h3>
              </div>
            </div>
            {approvals.pending.length === 0 ? (
              <div className="empty-state">当前没有待审批执行记录，系统里没有被卡在人工决策点的任务。</div>
            ) : (
              <div className="list-stack">
                {approvals.pending.map((item) => (
                  <article key={item.runId} className="list-card">
                    <div className="list-card-head">
                      <div>
                        <h4 className="list-card-title">{item.taskTitle}</h4>
                        <p className="supporting-text">
                          {item.projectName} · 由 {item.agentName} 负责推进
                        </p>
                      </div>
                      <StatusPill status="waiting_approval" />
                    </div>
                    <div className="meta-row">
                      <span>项目编号 {item.projectCode}</span>
                      <span>追踪标识 {shortTrace(item.traceId, 10)}</span>
                      <span>{formatDateTime(item.requestedAt)}</span>
                    </div>
                    <p className="soft-note">{item.outputSummary ?? "当前没有补充输出摘要，可进入执行详情页查看原始内容。"}</p>
                    <div className="link-row">
                      <Link href={`/runs/${item.runId}`} className="inline-link">
                        查看执行详情
                      </Link>
                      <Link href={`/projects/${item.projectId}`} className="inline-link">
                        打开项目指挥台
                      </Link>
                    </div>
                    <div className="embedded-form">
                      <ApprovalForm projectId={item.projectId} runId={item.runId} returnPath="/approvals" />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">审批历史</p>
                <h3 className="panel-title">最近完成的决策</h3>
              </div>
            </div>
            {approvals.history.length === 0 ? (
              <div className="empty-state">还没有审批历史。首次通过或驳回之后，这里就会开始沉淀记录。</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>项目</th>
                      <th>任务</th>
                      <th>结果</th>
                      <th>审批人</th>
                      <th>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.history.map((item) => (
                      <tr key={`${item.runId}-${item.decidedAt}`}>
                        <td>
                          <Link href={`/projects/${item.projectId}`} className="table-link">
                            {item.projectName}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/runs/${item.runId}`} className="table-link">
                            {item.taskTitle}
                          </Link>
                        </td>
                        <td>
                          <StatusPill status={item.decision} />
                        </td>
                        <td>{item.approverName}</td>
                        <td>{formatDateTime(item.decidedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </AppShell>
  );
}
