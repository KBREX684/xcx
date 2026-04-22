import { notFound } from "next/navigation";
import { ApprovalForm } from "../../../components/approval-form";
import { StatusPill } from "../../../components/status-pill";
import { TaskCreateForm } from "../../../components/task-create-form";
import { TriggerWorkflowForm } from "../../../components/trigger-workflow-form";
import { getProjectCockpit } from "../../../lib/api";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const cockpit = await getProjectCockpit(projectId);

  if (!cockpit) {
    notFound();
  }

  const { project, currentRun, tasks, artifacts, events, template } = cockpit;

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <a href="/" className="workspace-mark">
          返回工作区
        </a>
        <div className="workspace-mark">Template · {template.name}</div>
      </header>

      <section className="cockpit-grid">
        <div className="cockpit-lead">
          <div className="hero-panel cockpit-ribbon">
            <div className="cockpit-ribbon-head">
              <div>
                <div className="workspace-kicker">{project.projectCode}</div>
                <h1 className="cockpit-title">{project.name}</h1>
                <p className="cockpit-copy">
                  当前对接客户为 {project.customerName}。P1 cockpit 聚焦于流程触发、审批决策与证据沉淀，让你能在一个页面里看到执行链路的主干。
                </p>
              </div>
              <StatusPill status={currentRun?.status ?? project.status} />
            </div>

            <div className="cockpit-metrics">
              <div className="cockpit-metric">
                <span className="metric-label">任务总数</span>
                <div className="metric-value">{project.taskCount}</div>
              </div>
              <div className="cockpit-metric">
                <span className="metric-label">待审批</span>
                <div className="metric-value">{project.pendingApprovalCount}</div>
              </div>
              <div className="cockpit-metric">
                <span className="metric-label">最新 Run</span>
                <div className="metric-value">{project.latestRunStatus ?? "暂无"}</div>
              </div>
              <div className="cockpit-metric">
                <span className="metric-label">产物数量</span>
                <div className="metric-value">{artifacts.length}</div>
              </div>
            </div>
          </div>

          <section className="section-panel">
            <div className="section-header">
              <div>
                <div className="workspace-kicker">Task Board</div>
                <h2 className="section-title">当前任务</h2>
              </div>
              <div className="section-meta">任务会自然暴露出 Run 的状态，而不是把两者切开看。</div>
            </div>
            <div className="task-list">
              {tasks.length === 0 ? (
                <div className="empty-state">当前还没有任务。你可以先触发流程，也可以直接补一个人工任务。</div>
              ) : (
                tasks.map((task) => (
                  <article key={task.id} className="task-item">
                    <div className="task-head">
                      <div>
                        <h3 className="task-title">{task.title}</h3>
                        <p>{task.description}</p>
                      </div>
                      <StatusPill status={task.currentRunStatus ?? task.status} />
                    </div>
                    <div className="task-meta">
                      OWNER {task.ownerLabel} · PRIORITY {task.priority} · RUN {task.currentRunId ?? "pending"}
                    </div>
                    {task.latestOutputSummary ? <p style={{ marginTop: 12 }}>{task.latestOutputSummary}</p> : null}
                    {task.blockedReason ? <p style={{ marginTop: 12 }}>阻塞原因：{task.blockedReason}</p> : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="section-panel">
            <div className="section-header">
              <div>
                <div className="workspace-kicker">Event Timeline</div>
                <h2 className="section-title">执行时间线</h2>
              </div>
              <div className="section-meta">所有关键状态变化都会落到事件流里，P1 先把这个骨架钉牢。</div>
            </div>
            <div className="timeline-list">
              {events.map((event) => (
                <article key={event.id} className="timeline-item">
                  <strong>{event.summary}</strong>
                  <p>{event.eventType}</p>
                  <div className="timeline-meta">
                    TRACE {event.traceId.slice(0, 8)} · {new Date(event.occurredAt).toLocaleString("zh-CN")}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="edge-panel">
          <div>
            <div className="workspace-kicker">Run Control</div>
            <h2 className="section-title">控制面</h2>
          </div>

          <div className="stack-item">
            <strong>触发流程</strong>
            <p>当前 P1 只内置一个简化模板，用于演示从执行到审批的最小闭环。</p>
            <div style={{ marginTop: 14 }}>
              <TriggerWorkflowForm projectId={project.id} />
            </div>
          </div>

          <div className="stack-item">
            <strong>审批面板</strong>
            <p>如果当前 Run 已经推进到待审批，这里会显示操作入口；否则保持空闲态。</p>
            <div style={{ marginTop: 14 }}>
              {currentRun?.status === "waiting_approval" ? (
                <ApprovalForm projectId={project.id} runId={currentRun.id} />
              ) : (
                <div className="empty-state">当前没有待审批 Run。先触发流程，或者等待 worker 把 Run 推到审批关口。</div>
              )}
            </div>
          </div>

          <div className="stack-item">
            <strong>当前 Run</strong>
            {currentRun ? (
              <>
                <p>{currentRun.outputSummary ?? "当前还没有输出摘要。"}</p>
                <div className="artifact-meta" style={{ marginTop: 12 }}>
                  NODE {currentRun.nodeKey} · TRACE {currentRun.traceId.slice(0, 8)} · AGENT {currentRun.agentName}
                </div>
                {currentRun.approval ? (
                  <p style={{ marginTop: 12 }}>
                    最后审批：{currentRun.approval.approverName} / {currentRun.approval.decision} / {currentRun.approval.comment}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="empty-state">还没有 Run。当前 cockpit 只展示项目骨架与模板入口。</div>
            )}
          </div>

          <div className="stack-item">
            <strong>追加人工任务</strong>
            <TaskCreateForm projectId={project.id} />
          </div>

          <div className="stack-item">
            <strong>产物列表</strong>
            <div className="artifact-list" style={{ marginTop: 14 }}>
              {artifacts.length === 0 ? (
                <div className="empty-state">当前还没有 Artifact。worker 执行后会把摘要文件写入本地并登记到这里。</div>
              ) : (
                artifacts.map((artifact) => (
                  <article key={artifact.id} className="artifact-item">
                    <div className="artifact-head">
                      <div>
                        <h3 className="artifact-title">{artifact.title}</h3>
                        <p>{artifact.artifactType}</p>
                      </div>
                      <StatusPill status={currentRun?.status ?? project.status} />
                    </div>
                    <div className="artifact-meta">{artifact.storageUri}</div>
                    <div className="artifact-meta" style={{ marginTop: 8 }}>
                      SHA256 {artifact.sha256Digest.slice(0, 16)}...
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

