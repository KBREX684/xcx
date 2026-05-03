import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { BulkApprovalPanel } from "../../components/bulk-approval-panel";
import { StatusPill } from "../../components/status-pill";
import { getApprovals } from "../../lib/api";
import { formatDateTime } from "../../lib/format";

const approvalPageSize = 10;

type ApprovalsPageProps = {
  searchParams?: Promise<{
    pendingPage?: string;
    historyPage?: string;
  }>;
};

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildApprovalsHref(next: { pendingPage?: number; historyPage?: number }) {
  const query = new URLSearchParams();
  if (next.pendingPage && next.pendingPage > 1) query.set("pendingPage", String(next.pendingPage));
  if (next.historyPage && next.historyPage > 1) query.set("historyPage", String(next.historyPage));
  const suffix = query.toString();
  return suffix ? `/approvals?${suffix}` : "/approvals";
}

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const approvals = await getApprovals();
  const pendingPage = parsePage(resolved.pendingPage);
  const historyPage = parsePage(resolved.historyPage);
  const pendingPageCount = Math.max(1, Math.ceil(approvals.pending.length / approvalPageSize));
  const historyPageCount = Math.max(1, Math.ceil(approvals.history.length / approvalPageSize));
  const currentPendingPage = Math.min(pendingPage, pendingPageCount);
  const currentHistoryPage = Math.min(historyPage, historyPageCount);
  const visiblePending = approvals.pending.slice(
    (currentPendingPage - 1) * approvalPageSize,
    currentPendingPage * approvalPageSize,
  );
  const visibleHistory = approvals.history.slice(
    (currentHistoryPage - 1) * approvalPageSize,
    currentHistoryPage * approvalPageSize,
  );

  return (
    <AppShell
      activeNav="approvals"
      title="审批中心"
      description="集中处理待审批执行记录，并保留每一次通过或驳回的历史轨迹。"
      breadcrumbs={[{ label: "审批中心" }]}
    >
      <section className="stack-panel approvals-stack">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">待审批队列</p>
              <h3 className="panel-title">需要你做决定的执行项</h3>
            </div>
          </div>
          {approvals.pending.length === 0 ? (
            <div className="empty-state">
              当前没有待审批执行记录，系统里没有卡在人为决策点的任务。
            </div>
          ) : (
            <>
              <BulkApprovalPanel pending={visiblePending} />
              {approvals.pending.length > approvalPageSize ? (
                <div className="pagination-bar" aria-label="待审批队列分页">
                  <span>
                    第 {currentPendingPage} / {pendingPageCount} 页，共 {approvals.pending.length}{" "}
                    条
                  </span>
                  <div className="pagination-actions">
                    <Link
                      href={buildApprovalsHref({
                        pendingPage: Math.max(1, currentPendingPage - 1),
                        historyPage: currentHistoryPage,
                      })}
                      className={`secondary-action${currentPendingPage <= 1 ? " is-disabled" : ""}`}
                      aria-disabled={currentPendingPage <= 1}
                    >
                      上一页
                    </Link>
                    <Link
                      href={buildApprovalsHref({
                        pendingPage: Math.min(pendingPageCount, currentPendingPage + 1),
                        historyPage: currentHistoryPage,
                      })}
                      className={`secondary-action${currentPendingPage >= pendingPageCount ? " is-disabled" : ""}`}
                      aria-disabled={currentPendingPage >= pendingPageCount}
                    >
                      下一页
                    </Link>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">审批历史</p>
              <h3 className="panel-title">最近完成的决策</h3>
            </div>
          </div>
          {approvals.history.length === 0 ? (
            <div className="empty-state">
              还没有审批历史。首次通过或驳回之后，这里会开始沉淀记录。
            </div>
          ) : (
            <>
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
                    {visibleHistory.map((item) => (
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
              {approvals.history.length > approvalPageSize ? (
                <div className="pagination-bar" aria-label="审批历史分页">
                  <span>
                    第 {currentHistoryPage} / {historyPageCount} 页，共 {approvals.history.length}{" "}
                    条
                  </span>
                  <div className="pagination-actions">
                    <Link
                      href={buildApprovalsHref({
                        pendingPage: currentPendingPage,
                        historyPage: Math.max(1, currentHistoryPage - 1),
                      })}
                      className={`secondary-action${currentHistoryPage <= 1 ? " is-disabled" : ""}`}
                      aria-disabled={currentHistoryPage <= 1}
                    >
                      上一页
                    </Link>
                    <Link
                      href={buildApprovalsHref({
                        pendingPage: currentPendingPage,
                        historyPage: Math.min(historyPageCount, currentHistoryPage + 1),
                      })}
                      className={`secondary-action${currentHistoryPage >= historyPageCount ? " is-disabled" : ""}`}
                      aria-disabled={currentHistoryPage >= historyPageCount}
                    >
                      下一页
                    </Link>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      </section>
    </AppShell>
  );
}
