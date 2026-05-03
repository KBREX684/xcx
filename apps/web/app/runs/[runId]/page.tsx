import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelRunAction, rerunAction } from "../../actions";
import { AppShell } from "../../../components/app-shell";
import { ApprovalForm } from "../../../components/approval-form";
import { StatusPill } from "../../../components/status-pill";
import { SubmitButton } from "../../../components/submit-button";
import { getRun } from "../../../lib/api";
import { formatDateTime, formatJsonBlock, shortTrace } from "../../../lib/format";

type RunDetailPageProps = {
  params: Promise<{
    runId: string;
  }>;
};

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { runId } = await params;
  const run = await getRun(runId).catch(() => null);

  if (!run) {
    notFound();
  }

  const nonceFirstSeenAt = run.nonceLedger.nonceFirstSeenAt ?? run.nonceLedger.usedAt;
  const replayDetected = run.nonceLedger.replayDetected;

  return (
    <AppShell
      activeNav="projects"
      title="执行记录详情"
      description="查看当前执行记录的输入、输出、审批结果、产物和追踪标识。"
      breadcrumbs={[
        { label: "项目", href: "/projects" },
        { label: run.projectName, href: `/projects/${run.projectId}` },
        { label: "执行记录详情" },
      ]}
    >
      <section className="hero-grid">
        <article className="hero-panel">
          <div className="hero-kicker">{run.projectCode}</div>
          <div className="list-card-head">
            <div>
              <h2 className="hero-title">{run.taskTitle}</h2>
              <p className="hero-copy">
                当前节点为 {run.nodeKey}，由 {run.agentName}{" "}
                负责执行。这里聚合了输入上下文、输出摘要、审批状态和产物。
              </p>
            </div>
            <StatusPill status={run.status} />
          </div>
          <div className="hero-rail">
            <div className="hero-stat">
              <div className="hero-stat-label">执行智能体</div>
              <div className="hero-stat-value hero-stat-text">{run.agentName}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">追踪标识</div>
              <div className="hero-stat-value hero-stat-text">{shortTrace(run.traceId, 12)}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">交付产物</div>
              <div className="hero-stat-value">{run.artifacts.length}</div>
            </div>
          </div>
          <div className="meta-row">
            <span>开始时间 {formatDateTime(run.startedAt)}</span>
            <span>结束时间 {formatDateTime(run.finishedAt)}</span>
            <span>链头哈希 {run.chainHeadHash ?? "暂无"}</span>
          </div>
        </article>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">审批结果</p>
                <h3 className="panel-title">当前决策状态</h3>
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
              <ApprovalForm
                projectId={run.projectId}
                runId={run.id}
                returnPath={`/runs/${run.id}`}
              />
            ) : (
              <div className="empty-state">
                当前执行记录还没有审批结果，可能仍在执行或尚未进入审批节点。
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">签名与防重放</p>
                <h3 className="panel-title">智能体证明三元组</h3>
              </div>
            </div>
            <div className="meta-column">
              <span>Nonce：{run.nonce ?? "缺失"}</span>
              <span>签名时间：{formatDateTime(run.signedAt)}</span>
              <span>Nonce 台账：{run.nonceLedger.found ? "已命中" : "缺失"}</span>
              <span>台账智能体：{run.nonceLedger.agentId ?? "缺失"}</span>
              <span>台账使用时间：{formatDateTime(run.nonceLedger.usedAt)}</span>
              <span>Nonce 首次出现：{formatDateTime(nonceFirstSeenAt)}</span>
              {replayDetected ? <span className="audit-replay-flag">重放尝试</span> : null}
            </div>
            <details className="soft-note">
              <summary>智能体签名</summary>
              <pre className="code-block">{run.agentSignature ?? "缺失"}</pre>
            </details>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">快捷跳转</p>
                <h3 className="panel-title">关联上下文</h3>
              </div>
            </div>
            <div className="link-row">
              <Link href={`/projects/${run.projectId}`} className="inline-link">
                返回项目工作台
              </Link>
              <Link href={`/projects/${run.projectId}/tasks/${run.taskId}`} className="inline-link">
                打开任务详情
              </Link>
            </div>
            <div className="link-row">
              <form action={rerunAction}>
                <input type="hidden" name="projectId" value={run.projectId} />
                <input type="hidden" name="runId" value={run.id} />
                <input type="hidden" name="returnPath" value={`/runs/${run.id}`} />
                <SubmitButton pendingLabel="重新运行中..." className="secondary-action">
                  重新运行
                </SubmitButton>
              </form>
              <form action={cancelRunAction}>
                <input type="hidden" name="projectId" value={run.projectId} />
                <input type="hidden" name="runId" value={run.id} />
                <input type="hidden" name="returnPath" value={`/runs/${run.id}`} />
                <button type="submit" className="ghost-button">
                  停止执行
                </button>
              </form>
            </div>
          </section>
        </div>
      </section>

      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">输入上下文</p>
                <h3 className="panel-title">执行前接收到的内容</h3>
              </div>
            </div>
            <pre className="code-block">{formatJsonBlock(run.inputPayload)}</pre>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">输出摘要</p>
                <h3 className="panel-title">执行结果</h3>
              </div>
            </div>
            <div className="detail-block">
              <p>{run.outputSummary ?? "当前还没有输出摘要。"}</p>
              {run.errorMessage ? <p className="soft-note">错误信息：{run.errorMessage}</p> : null}
            </div>
          </section>
        </div>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">交付产物</p>
                <h3 className="panel-title">本次执行产出的文件</h3>
              </div>
            </div>
            {run.artifacts.length === 0 ? (
              <div className="empty-state">当前执行记录还没有产物落库。</div>
            ) : (
              <div className="list-stack">
                {run.artifacts.map((artifact) => (
                  <article key={artifact.id} className="list-card">
                    <div className="list-card-head">
                      <h4 className="list-card-title">{artifact.title}</h4>
                      <p className="eyebrow-text">{artifact.artifactType}</p>
                    </div>
                    <p className="supporting-text">{artifact.storageUri}</p>
                    <div className="timeline-meta">
                      <span>摘要指纹 {artifact.sha256Digest.slice(0, 16)}...</span>
                      <span>{formatDateTime(artifact.createdAt)}</span>
                    </div>
                    <div className="link-row">
                      <Link href={`/artifacts/${artifact.id}`} className="inline-link">
                        查看产物详情
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </AppShell>
  );
}
