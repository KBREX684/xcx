import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { ApprovalForm } from "../../../components/approval-form";
import { StatusPill } from "../../../components/status-pill";
import { TaskCreateForm } from "../../../components/task-create-form";
import { TriggerWorkflowForm } from "../../../components/trigger-workflow-form";
import { getProjectCockpit } from "../../../lib/api";
import { formatDate, formatDateTime, shortTrace } from "../../../lib/format";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const cockpit = await getProjectCockpit(projectId).catch(() => null);

  if (!cockpit) {
    notFound();
  }

  const { project, currentRun, tasks, artifacts, events, template } = cockpit;
  const returnPath = `/projects/${project.id}`;

  return (
    <AppShell
      activeNav="projects"
      title={project.name}
      description={`面向 ${project.customerName} 的项目指挥台，聚合任务、执行记录、审批与交付产物。`}
      breadcrumbs={[
        { label: "项目", href: "/projects" },
        { label: project.name }
      ]}
    >
      <section className="hero-grid">
        <article className="hero-panel">
          <div className="hero-kicker">{project.projectCode}</div>
          <div className="list-card-head">
            <div>
              <h2 className="hero-title">{project.name}</h2>
              <p className="hero-copy">
                这是项目的总览 cockpit。你可以在这里掌握当前任务推进、执行记录状态、审批入口、交付产物与事件时间线，
                不再需要在多个页面之间来回切换。
              </p>
            </div>
            <StatusPill status={currentRun?.status ?? project.latestRunStatus ?? project.status} />
          </div>
          <div className="hero-rail">
            <div className="hero-stat">
              <div className="hero-stat-label">任务总数</div>
              <div className="hero-stat-value">{project.taskCount}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">待审批</div>
              <div className="hero-stat-value">{project.pendingApprovalCount}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">交付产物</div>
              <div className="hero-stat-value">{artifacts.length}</div>
            </div>
          </div>
          <div className="meta-row">
            <span>客户：{project.customerName}</span>
            <span>负责人：{project.ownerName}</span>
            <span>目标交付：{formatDate(project.targetDeliveryAt)}</span>
          </div>
          {project.latestCertificate ? (
            <div className="soft-note">
              最近证明书：{project.latestCertificate.title} · 核验码 {project.latestCertificate.verificationCode}
            </div>
          ) : (
            <div className="soft-note">当前还没有生成证明书，流程跑通后会逐步沉淀为项目证明摘要。</div>
          )}
        </article>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">流程入口</p>
                <h3 className="panel-title">触发交付流程</h3>
              </div>
            </div>
            <p className="supporting-text">
              当前模板为《{template.name}》，它会走过需求实现、人工审批和完成三个最小闭环节点。
            </p>
            <TriggerWorkflowForm projectId={project.id} returnPath={returnPath} />
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">审批入口</p>
                <h3 className="panel-title">当前决策关口</h3>
              </div>
            </div>
            {currentRun?.status === "waiting_approval" ? (
              <ApprovalForm projectId={project.id} runId={currentRun.id} returnPath={returnPath} />
            ) : (
              <div className="empty-state">当前没有待审批执行记录，触发流程后 worker 会把结果推进到这里。</div>
            )}
          </section>
        </div>
      </section>

      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">任务摘要</p>
                <h3 className="panel-title">当前任务板</h3>
              </div>
              <Link href={`/projects/${project.id}/settings`} className="ghost-link">
                调整项目设置
              </Link>
            </div>
            {tasks.length === 0 ? (
              <div className="empty-state">当前还没有任务。你可以触发流程，也可以先手动补一个任务。</div>
            ) : (
              <div className="list-stack">
                {tasks.map((task) => (
                  <article key={task.id} className="list-card">
                    <div className="list-card-head">
                      <div>
                        <h4 className="list-card-title">{task.title}</h4>
                        <p className="supporting-text">{task.description}</p>
                      </div>
                      <StatusPill status={task.currentRunStatus ?? task.status} />
                    </div>
                    <div className="meta-row">
                      <span>负责人：{task.ownerLabel}</span>
                      <span>优先级：{task.priority}</span>
                      <span>到期：{formatDate(task.dueAt)}</span>
                    </div>
                    {task.latestOutputSummary ? <p className="soft-note">{task.latestOutputSummary}</p> : null}
                    {task.blockedReason ? <p className="soft-note">阻塞原因：{task.blockedReason}</p> : null}
                    <div className="link-row">
                      <Link href={`/projects/${project.id}/tasks/${task.id}`} className="inline-link">
                        查看任务详情
                      </Link>
                      {task.currentRunId ? (
                        <Link href={`/runs/${task.currentRunId}`} className="inline-link">
                          查看执行记录
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">事件时间线</p>
                <h3 className="panel-title">项目发生了什么</h3>
              </div>
            </div>
            {events.length === 0 ? (
              <div className="empty-state">项目还没有事件记录，流程触发和审批行为都会同步展示在这里。</div>
            ) : (
              <div className="timeline-list">
                {events.map((event) => (
                  <article key={event.id} className="timeline-item">
                    <strong>{event.summary}</strong>
                    <div className="timeline-meta">
                      <span>事件类型 {event.eventType}</span>
                      <span>追踪标识 {shortTrace(event.traceId, 10)}</span>
                      <span>{formatDateTime(event.occurredAt)}</span>
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
                <p className="eyebrow-text">当前执行记录</p>
                <h3 className="panel-title">最近一次推进</h3>
              </div>
            </div>
            {currentRun ? (
              <div className="compact-stack">
                <div className="list-card subdued-card">
                  <div className="list-card-head">
                    <h4 className="list-card-title">{currentRun.taskTitle}</h4>
                    <StatusPill status={currentRun.status} />
                  </div>
                  <div className="meta-row">
                    <span>节点：{currentRun.nodeKey}</span>
                    <span>执行代理：{currentRun.agentName}</span>
                    <span>追踪标识：{shortTrace(currentRun.traceId, 10)}</span>
                  </div>
                  <p className="supporting-text">{currentRun.outputSummary ?? "当前还没有生成输出摘要。"}</p>
                  <div className="link-row">
                    <Link href={`/runs/${currentRun.id}`} className="inline-link">
                      查看执行详情
                    </Link>
                  </div>
                </div>
                {currentRun.approval ? (
                  <div className="soft-note">
                    最近审批：{currentRun.approval.approverName} · {currentRun.approval.comment ?? "无附加说明"} ·{" "}
                    {formatDateTime(currentRun.approval.decidedAt)}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="empty-state">还没有执行记录。触发一次流程后，这里会显示最新的执行状态与输出摘要。</div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">交付产物</p>
                <h3 className="panel-title">已沉淀内容</h3>
              </div>
            </div>
            {artifacts.length === 0 ? (
              <div className="empty-state">当前还没有交付产物，worker 生成摘要并落库后会在这里展示。</div>
            ) : (
              <div className="list-stack">
                {artifacts.map((artifact) => (
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

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">人工补单</p>
                <h3 className="panel-title">补充任务</h3>
              </div>
            </div>
            <TaskCreateForm projectId={project.id} returnPath={returnPath} />
          </section>
        </div>
      </section>
    </AppShell>
  );
}
