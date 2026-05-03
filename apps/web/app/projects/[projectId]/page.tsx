import Link from "next/link";
import { notFound } from "next/navigation";
import { generateCertificateAction } from "../../actions";
import { AppShell } from "../../../components/app-shell";
import { CopyId } from "../../../components/copy-id";
import { DataList, DataListCell } from "../../../components/data-list";
import { EvidenceDrawer } from "../../../components/evidence-drawer";
import { InspectorPane } from "../../../components/inspector-pane";
import { StatusPill } from "../../../components/status-pill";
import { TaskCreateForm } from "../../../components/task-create-form";
import { TriggerWorkflowForm } from "../../../components/trigger-workflow-form";
import { ViewHeader } from "../../../components/view-header";
import { WorkspaceFrame } from "../../../components/workspace-frame";
import { getEvidence, getProjectCockpit } from "../../../lib/api";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getPriorityLabel,
  getProjectHealthLabel,
  shortTrace,
} from "../../../lib/format";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
};

type ProjectTab = "overview" | "tasks" | "proof" | "activity";

const PROJECT_TABS: Array<{ key: ProjectTab; label: string }> = [
  { key: "overview", label: "概览" },
  { key: "tasks", label: "事项" },
  { key: "proof", label: "产物与证书" },
  { key: "activity", label: "动态" },
];

function getProjectTab(tab: string | string[] | undefined): ProjectTab {
  const value = Array.isArray(tab) ? tab[0] : tab;
  return PROJECT_TABS.some((item) => item.key === value) ? (value as ProjectTab) : "overview";
}

function getProjectProgress(taskCount: number, completedTaskCount: number, status: string) {
  if (status === "delivered" || status === "completed") {
    return 100;
  }
  if (taskCount <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round((completedTaskCount / taskCount) * 100)));
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = getProjectTab(resolvedSearchParams.tab);
  const [cockpit, evidence] = await Promise.all([
    getProjectCockpit(projectId).catch(() => null),
    getEvidence("project", projectId).catch(() => null),
  ]);

  if (!cockpit) {
    notFound();
  }

  const { project, tasks, artifacts, events, template } = cockpit;
  const returnPath = `/projects/${project.id}`;
  const progress = getProjectProgress(
    project.taskCount,
    project.completedTaskCount,
    project.status,
  );

  return (
    <AppShell
      activeNav="projects"
      title="项目"
      breadcrumbs={[{ label: "项目", href: "/projects" }, { label: project.name }]}
    >
      <WorkspaceFrame>
        <ViewHeader
          eyebrow={project.projectCode}
          title={project.name}
          description={
            project.description ?? `${project.customerName} · ${project.teamName ?? "未绑定团队"}`
          }
          tabs={PROJECT_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            href:
              tab.key === "overview"
                ? `/projects/${project.id}`
                : `/projects/${project.id}?tab=${tab.key}`,
            active: activeTab === tab.key,
          }))}
          actions={
            <>
              <Link href="/projects" className="ghost-button">
                返回项目列表
              </Link>
              <Link href={`/projects/${project.id}/settings`} className="ghost-button">
                项目设置
              </Link>
            </>
          }
        />

        {activeTab === "overview" ? (
          <div className="linear-workbench-grid project-tab-shell">
            <section className="stack-panel">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow-text">总览</p>
                    <h3 className="panel-title">项目摘要</h3>
                  </div>
                  <StatusPill status={project.status} />
                </div>
                <div className="meta-row project-summary-row">
                  <span>客户：{project.customerName}</span>
                  <span>负责人：{project.ownerName}</span>
                  <span>团队：{project.teamName ?? "未绑定"}</span>
                  <span>目标日期：{formatDate(project.targetDeliveryAt)}</span>
                  <span>进度：{progress}%</span>
                </div>
                <div className="progress-track" aria-label="项目进度">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </section>
              <section className="panel project-focus-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow-text">下一步</p>
                    <h3 className="panel-title">当前最适合处理的事项</h3>
                  </div>
                </div>
                {tasks.length === 0 ? (
                  <div className="empty-state">
                    当前项目还没有事项。可以先触发流程，或补充人工任务。
                  </div>
                ) : (
                  <div className="list-stack">
                    {tasks.slice(0, 4).map((task) => (
                      <Link
                        key={task.id}
                        href={`/projects/${project.id}/tasks/${task.id}`}
                        className="list-card list-card-link"
                      >
                        <strong>{task.title}</strong>
                        <p className="supporting-text">
                          {task.delegateAgentName ?? task.ownerLabel} ·{" "}
                          {formatRelativeTime(task.lastConversationAt ?? task.assignedAt)}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </section>

            <InspectorPane title="操作与状态">
              <section className="panel compact-panel">
                <div className="panel-heading">
                  <h3 className="panel-title">流程操作</h3>
                </div>
                <div className="project-action-stack">
                  <TriggerWorkflowForm
                    projectId={project.id}
                    templateId={template.id}
                    returnPath={returnPath}
                    label={`触发 ${template.name}`}
                  />
                  <Link href={`/projects/${project.id}/settings`} className="ghost-button">
                    项目设置
                  </Link>
                </div>
              </section>
              <div className="meta-column">
                <span>健康：{getProjectHealthLabel(project.health)}</span>
                <span>优先级：{getPriorityLabel(project.priority)}</span>
                <span>证明链：{project.hashChainHealthy ? "完整" : "需要复核"}</span>
              </div>
            </InspectorPane>
          </div>
        ) : null}

        {activeTab === "tasks" ? (
          <div className="linear-workbench-grid project-tab-shell">
            <section>
              <DataList columns={["事项", "状态", "智能体", "更新", "证明", "打开"]}>
                {tasks.length === 0 ? (
                  <div className="empty-state">
                    当前项目还没有事项。可以先触发流程，或补充人工任务。
                  </div>
                ) : (
                  tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${project.id}/tasks/${task.id}`}
                      className="data-list-link"
                    >
                      <div
                        className="data-list-row"
                        style={{ paddingLeft: `${14 + task.depth * 16}px` }}
                      >
                        <DataListCell tone="primary">{task.title}</DataListCell>
                        <DataListCell>
                          <StatusPill status={task.currentRunStatus ?? task.status} />
                        </DataListCell>
                        <DataListCell>{task.delegateAgentName ?? task.ownerLabel}</DataListCell>
                        <DataListCell>
                          {formatRelativeTime(task.lastConversationAt ?? task.assignedAt)}
                        </DataListCell>
                        <DataListCell tone="proof">
                          {task.currentRunId ? "可查" : "待形成"}
                        </DataListCell>
                        <DataListCell>打开</DataListCell>
                      </div>
                    </Link>
                  ))
                )}
              </DataList>
            </section>
            <InspectorPane title="新建人工事项">
              <TaskCreateForm
                projectId={project.id}
                returnPath={returnPath}
                parentOptions={tasks}
              />
            </InspectorPane>
          </div>
        ) : null}

        {activeTab === "proof" ? (
          <div className="linear-workbench-grid project-tab-shell">
            <section className="stack-panel">
              <section className="panel proof-callout">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow-text">证明</p>
                    <h3 className="panel-title">当前证明书</h3>
                  </div>
                  <span
                    className="status-pill"
                    data-tone={project.hashChainHealthy ? "success" : "warning"}
                  >
                    {project.hashChainHealthy ? "链路完整" : "需要复核"}
                  </span>
                </div>
                <dl className="proof-meta">
                  <div>
                    <dt>证明书</dt>
                    <dd>
                      {project.latestCertificate ? (
                        <Link
                          href={`/certificates/${project.latestCertificate.id}`}
                          className="inline-link"
                        >
                          {project.latestCertificate.certificateNo}
                        </Link>
                      ) : (
                        <span className="muted-text">暂未签发</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>链头哈希</dt>
                    <dd>
                      {project.chainHeadHash ? (
                        <CopyId
                          value={project.chainHeadHash}
                          label="链头哈希"
                          displayText={shortTrace(project.chainHeadHash, 12)}
                        />
                      ) : (
                        <span className="muted-text">暂无</span>
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="proof-actions">
                  <form action={generateCertificateAction}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <button type="submit" className="action-button secondary-action">
                      手动签发证明书
                    </button>
                  </form>
                  {project.latestCertificate ? (
                    <Link
                      href={`/certificates/${project.latestCertificate.id}`}
                      className="ghost-button"
                    >
                      去验证
                    </Link>
                  ) : null}
                </div>
              </section>

              {evidence ? <EvidenceDrawer evidence={evidence} /> : null}
            </section>

            <InspectorPane title="交付产物">
              {artifacts.length === 0 ? (
                <div className="empty-state">暂无产物。</div>
              ) : (
                <div className="list-stack">
                  {artifacts.slice(0, 8).map((artifact) => (
                    <Link
                      key={artifact.id}
                      href={`/artifacts/${artifact.id}`}
                      className="list-card list-card-link"
                    >
                      <strong>{artifact.title}</strong>
                      <p className="supporting-text">
                        {artifact.artifactType} ·{" "}
                        {artifact.includedInCertificate ? "已纳入证明" : "未纳入证明"}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </InspectorPane>
          </div>
        ) : null}

        {activeTab === "activity" ? (
          <section className="project-activity-panel">
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow-text">动态</p>
                  <h3 className="panel-title">最近事件</h3>
                </div>
              </div>
              {events.length === 0 ? (
                <div className="empty-state">当前还没有项目事件。</div>
              ) : (
                <div className="timeline-list">
                  {events.map((event) => (
                    <article key={event.id} className="timeline-item">
                      <strong>{event.summary}</strong>
                      <div className="timeline-meta">
                        <span>{event.eventType}</span>
                        <span>{shortTrace(event.traceId, 10)}</span>
                        <span>{formatDateTime(event.occurredAt)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}
      </WorkspaceFrame>
    </AppShell>
  );
}
