import Link from "next/link";
import { notFound } from "next/navigation";
import { getStatusLabel } from "@agent-control-plane/domain";
import { updateIssueAction } from "../../../../actions";
import { AppShell } from "../../../../../components/app-shell";
import { DataList, DataListCell } from "../../../../../components/data-list";
import { EvidenceDrawer } from "../../../../../components/evidence-drawer";
import { InspectorPane } from "../../../../../components/inspector-pane";
import { StatusPill } from "../../../../../components/status-pill";
import { TaskCollaborationPanel } from "../../../../../components/task-collaboration-panel";
import { TaskRelationsPanel } from "../../../../../components/task-relations-panel";
import { ViewHeader } from "../../../../../components/view-header";
import { WorkspaceFrame } from "../../../../../components/workspace-frame";
import {
  getEvidence,
  getProject,
  getProjectTasks,
  getTask,
  getTeam,
} from "../../../../../lib/api";
import { formatDateTime, getPriorityLabel } from "../../../../../lib/format";

type TaskTab = "overview" | "relations" | "collaboration";

const TASK_TABS: Array<{ key: TaskTab; label: string }> = [
  { key: "overview", label: "概览与运行" },
  { key: "relations", label: "关系" },
  { key: "collaboration", label: "派遣与线程" },
];

type TaskDetailPageProps = {
  params: Promise<{ projectId: string; taskId: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export default async function TaskDetailPage({
  params,
  searchParams,
}: TaskDetailPageProps) {
  const { projectId, taskId } = await params;
  const sp = (await searchParams) ?? {};
  const requestedTab = (sp.tab ?? "overview") as TaskTab;
  const activeTab: TaskTab = TASK_TABS.some((tab) => tab.key === requestedTab)
    ? requestedTab
    : "overview";

  const [project, task, tasks, evidence] = await Promise.all([
    getProject(projectId).catch(() => null),
    getTask(taskId).catch(() => null),
    getProjectTasks(projectId).catch(() => []),
    getEvidence("task", taskId).catch(() => null),
  ]);

  if (!project || !task) {
    notFound();
  }
  const team = project.teamId ? await getTeam(project.teamId).catch(() => null) : null;

  const returnPath = `/projects/${project.id}/tasks/${task.id}`;
  const buildTabHref = (tab: TaskTab) =>
    tab === "overview" ? returnPath : `${returnPath}?tab=${tab}`;

  const counts: Record<TaskTab, number> = {
    overview: task.runs.length,
    relations: task.relations.length,
    collaboration: task.thread.messages.length,
  };

  return (
    <AppShell
      activeNav="issues"
      title="事项"
      breadcrumbs={[
        { label: "项目", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
        { label: task.title },
      ]}
    >
      <WorkspaceFrame>
        <ViewHeader
          eyebrow="事项"
          title={task.title}
          description={task.description}
          actions={
            <Link href={`/projects/${project.id}`} className="ghost-button">
              返回项目
            </Link>
          }
        />

        <nav className="segmented-control task-detail-tabs" aria-label="事项详情视图">
          {TASK_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={buildTabHref(tab.key)}
              data-active={activeTab === tab.key ? "true" : undefined}
            >
              {tab.label}
              <span className="segmented-count">{counts[tab.key]}</span>
            </Link>
          ))}
        </nav>

        <div className="linear-workbench-grid">
          <section>
            {activeTab === "overview" ? (
              <DataList columns={["运行", "状态", "智能体", "追踪", "开始", "结束"]}>
                {task.runs.length === 0 ? (
                  <div className="empty-state">当前事项还没有运行记录。</div>
                ) : (
                  task.runs.map((run) => (
                    <Link key={run.id} href={`/runs/${run.id}`} className="data-list-link">
                      <div className="data-list-row">
                        <DataListCell tone="primary">{run.taskTitle}</DataListCell>
                        <DataListCell>
                          <StatusPill status={run.status} />
                        </DataListCell>
                        <DataListCell>{run.agentName}</DataListCell>
                        <DataListCell>{run.traceId.slice(0, 10)}</DataListCell>
                        <DataListCell>
                          {formatDateTime(run.startedAt ?? run.createdAt)}
                        </DataListCell>
                        <DataListCell>{formatDateTime(run.finishedAt)}</DataListCell>
                      </div>
                    </Link>
                  ))
                )}
              </DataList>
            ) : null}

            {activeTab === "relations" ? (
              <TaskRelationsPanel
                projectId={project.id}
                task={task}
                taskOptions={tasks}
                returnPath={returnPath}
              />
            ) : null}

            {activeTab === "collaboration" ? (
              <TaskCollaborationPanel
                projectId={project.id}
                taskId={task.id}
                returnPath={returnPath}
                delegateAgentId={task.delegateAgentId}
                delegateAgentName={task.delegateAgentName}
                recentAssignment={task.recentAssignment}
                availableAgents={task.availableAgents}
                thread={task.thread}
                teamGuidance={task.teamGuidance}
              />
            ) : null}
          </section>

          <InspectorPane title="属性与证明">
            <div className="meta-column">
              <span>项目：{project.name}</span>
              <span>负责人（人）：{task.ownerMemberName ?? "未指派"}</span>
              <span>执行智能体：{task.delegateAgentName ?? "暂未委派"}</span>
              {task.recentAssignment ? (
                <span>
                  最近委派：{task.recentAssignment.assignedByName} ·{" "}
                  {formatDateTime(task.recentAssignment.assignedAt)}
                </span>
              ) : null}
              <span>状态：{getStatusLabel(task.status)}</span>
              <span>优先级：{getPriorityLabel(task.priority)}</span>
              <span>创建：{formatDateTime(task.createdAt)}</span>
              <span>更新：{formatDateTime(task.updatedAt)}</span>
            </div>
            {task.parentTask ? (
              <Link
                href={`/projects/${project.id}/tasks/${task.parentTask.id}`}
                className="inline-link"
              >
                父事项：{task.parentTask.title}
              </Link>
            ) : null}
            <form action={updateIssueAction} className="form-stack">
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <label className="field-label">
                状态
                <select className="field-control" name="status" defaultValue={task.status}>
                  {(
                    team?.issueStatuses ?? [
                      "triage",
                      "backlog",
                      "todo",
                      "in_progress",
                      "blocked",
                      "review",
                      "done",
                    ]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                优先级
                <select className="field-control" name="priority" defaultValue={task.priority}>
                  <option value="urgent">紧急</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </label>
              <label className="field-label">
                执行智能体
                <select
                  className="field-control"
                  name="delegateAgentId"
                  defaultValue={task.delegateAgentId ?? ""}
                >
                  <option value="">清除委派</option>
                  {task.availableAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                周期
                <select className="field-control" name="cycleId" defaultValue={task.cycleId ?? ""}>
                  <option value="">不排入周期</option>
                  {(team?.cycles ?? []).map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="secondary-action">
                更新事项
              </button>
            </form>
            {evidence ? <EvidenceDrawer evidence={evidence} /> : null}
          </InspectorPane>
        </div>
      </WorkspaceFrame>
    </AppShell>
  );
}
