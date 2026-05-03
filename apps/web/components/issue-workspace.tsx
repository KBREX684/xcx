import Link from "next/link";
import type {
  AssignableAgentOption,
  IssueListResult,
  IssueListQuery,
  ProjectSummary,
  TeamSummary,
} from "@agent-control-plane/domain";
import { getStatusLabel } from "@agent-control-plane/domain";
import { createIssueAction, createSavedViewAction } from "../app/actions";
import { formatRelativeTime } from "../lib/format";
import { AppShell } from "./app-shell";
import { DataList, DataListCell } from "./data-list";
import { InspectorPane } from "./inspector-pane";
import { StatusPill } from "./status-pill";
import { ViewHeader } from "./view-header";
import { WorkspaceFrame } from "./workspace-frame";

export function IssueWorkspace({
  title,
  eyebrow,
  result,
  projects,
  teams,
  agents,
  activeTab,
  filters = {},
  layout = "list",
  viewId,
}: {
  title: string;
  eyebrow: string;
  result: IssueListResult;
  projects: ProjectSummary[];
  teams: TeamSummary[];
  agents: AssignableAgentOption[];
  activeTab: "all" | "my" | "triage" | "active" | "backlog";
  filters?: IssueListQuery;
  layout?: "list" | "board";
  viewId?: string;
}) {
  const primaryTeamHref = teams[0] ? `/team/${teams[0].id}` : "/issues";
  const tabs = [
    { key: "all", label: "全部", href: "/issues", active: activeTab === "all" },
    {
      key: "triage",
      label: "分拣",
      href: `${primaryTeamHref}/triage`,
      active: activeTab === "triage",
    },
    {
      key: "active",
      label: "进行中",
      href: `${primaryTeamHref}/active`,
      active: activeTab === "active",
    },
    {
      key: "backlog",
      label: "待排期",
      href: `${primaryTeamHref}/backlog`,
      active: activeTab === "backlog",
    },
  ].filter((tab): tab is NonNullable<typeof tab> => Boolean(tab));
  const activeTeam = filters.teamId ? teams.find((team) => team.id === filters.teamId) : teams[0];
  const statusFlow = activeTeam?.issueStatuses.length
    ? activeTeam.issueStatuses
    : ["triage", "backlog", "todo", "in_progress", "blocked", "review", "done"];
  const boardColumns = statusFlow.map((status) => ({
    status,
    issues: result.issues.filter((issue) => issue.status === status),
  }));
  const basePath = viewId ? `/views/${viewId}` : "/issues";

  function hrefWith(next: Partial<IssueListQuery & { layout: "list" | "board" }>) {
    const query = new URLSearchParams();
    const merged = { ...filters, layout, ...next };
    Object.entries(merged).forEach(([key, value]) => {
      if (typeof value === "string" && value.length > 0 && value !== "all") {
        query.set(key, value);
      }
    });
    const rendered = query.toString();
    return rendered ? `${basePath}?${rendered}` : basePath;
  }

  return (
    <AppShell activeNav="issues" title={title}>
      <WorkspaceFrame>
        <ViewHeader eyebrow={eyebrow} title={title} tabs={tabs} />
        <div className="linear-workbench-grid">
          <section>
            <form action={basePath} className="issue-filter-bar">
              <select name="status" className="field-control" defaultValue={filters.status ?? ""}>
                <option value="">全部状态</option>
                {statusFlow.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
              <select
                name="priority"
                className="field-control"
                defaultValue={filters.priority ?? ""}
              >
                <option value="">全部优先级</option>
                <option value="urgent">紧急</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
              <select name="teamId" className="field-control" defaultValue={filters.teamId ?? ""}>
                <option value="">全部团队</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <select
                name="projectId"
                className="field-control"
                defaultValue={filters.projectId ?? ""}
              >
                <option value="">全部项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select name="cycleId" className="field-control" defaultValue={filters.cycleId ?? ""}>
                <option value="">全部周期</option>
                {(activeTeam?.cycles ?? []).map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </select>
              <select
                name="delegateAgentId"
                className="field-control"
                defaultValue={filters.delegateAgentId ?? ""}
              >
                <option value="">全部智能体</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <input
                className="field-control"
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="搜索事项、项目或编号"
              />
              <input type="hidden" name="layout" value={layout} />
              <button type="submit" className="ghost-button">
                筛选
              </button>
            </form>

            <div className="issue-view-toolbar">
              <div className="segmented-control" aria-label="事项视图">
                <Link href={hrefWith({ layout: "list" })} data-active={layout === "list"}>
                  列表
                </Link>
                <Link href={hrefWith({ layout: "board" })} data-active={layout === "board"}>
                  看板
                </Link>
              </div>
              <form action={createSavedViewAction} className="saved-view-inline-form">
                <input name="name" className="field-control" placeholder="保存当前筛选为视图" />
                <input type="hidden" name="scope" value={filters.teamId ? "team" : "workspace"} />
                <input type="hidden" name="status" value={filters.status ?? ""} />
                <input type="hidden" name="statusGroup" value={filters.statusGroup ?? "all"} />
                <input type="hidden" name="priority" value={filters.priority ?? ""} />
                <input type="hidden" name="teamId" value={filters.teamId ?? ""} />
                <input type="hidden" name="projectId" value={filters.projectId ?? ""} />
                <input type="hidden" name="cycleId" value={filters.cycleId ?? ""} />
                <input type="hidden" name="delegateAgentId" value={filters.delegateAgentId ?? ""} />
                <input type="hidden" name="q" value={filters.q ?? ""} />
                <input type="hidden" name="layout" value={layout} />
                <button type="submit" className="secondary-action">
                  保存视图
                </button>
              </form>
            </div>

            {layout === "board" ? (
              <div className="issue-board" aria-label="事项看板">
                {boardColumns.map((column) => (
                  <section key={column.status} className="issue-board-column">
                    <header className="issue-board-column-head">
                      <span>{getStatusLabel(column.status)}</span>
                      <strong>{column.issues.length}</strong>
                    </header>
                    <div className="issue-board-column-body">
                      {column.issues.length === 0 ? (
                        <div className="issue-board-empty">暂无事项</div>
                      ) : (
                        column.issues.map((issue) => (
                          <IssueBoardCard key={issue.id} issue={issue} />
                        ))
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <DataList columns={["事项", "状态", "项目", "负责人 / 执行 Agent", "更新", "证明"]}>
                {result.issues.length === 0 ? (
                  <div className="empty-state">当前列表没有事项。</div>
                ) : (
                  result.issues.map((issue) => <IssueListRow key={issue.id} issue={issue} />)
                )}
              </DataList>
            )}
          </section>

          <InspectorPane title="创建事项">
            <form action={createIssueAction} className="issue-create-grid">
              <label className="field-group">
                <span className="field-label">项目</span>
                <select name="projectId" className="field-control" required>
                  <option value="">选择项目</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {project.teamName ? ` · ${project.teamName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group">
                <span className="field-label">标题</span>
                <input name="title" className="field-control" placeholder="新的交付事项" required />
              </label>
              <label className="field-group">
                <span className="field-label">描述</span>
                <textarea
                  name="description"
                  className="field-control field-control-textarea"
                  rows={4}
                  required
                />
              </label>
              <div className="grid-two">
                <label className="field-group">
                  <span className="field-label">状态</span>
                  <select name="status" className="field-control" defaultValue="backlog">
                    <option value="triage">分拣</option>
                    <option value="backlog">待排期</option>
                    <option value="todo">待办</option>
                    <option value="in_progress">进行中</option>
                  </select>
                </label>
                <label className="field-group">
                  <span className="field-label">优先级</span>
                  <select name="priority" className="field-control" defaultValue="medium">
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                    <option value="urgent">紧急</option>
                  </select>
                </label>
              </div>
              <label className="field-group">
                <span className="field-label">派遣智能体</span>
                <select name="delegateAgentId" className="field-control" defaultValue="">
                  <option value="">暂不派遣</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="action-button" type="submit">
                创建事项
              </button>
            </form>
          </InspectorPane>
        </div>
      </WorkspaceFrame>
    </AppShell>
  );
}

function IssueListRow({ issue }: { issue: IssueListResult["issues"][number] }) {
  return (
    <Link href={`/projects/${issue.projectId}/tasks/${issue.id}`} className="data-list-link">
      <div className="data-list-row">
        <DataListCell tone="primary">
          {issue.issueKey} · {issue.title}
        </DataListCell>
        <DataListCell>
          <StatusPill status={issue.status} />
        </DataListCell>
        <DataListCell>{issue.projectName}</DataListCell>
        <DataListCell>
          <div className="dual-track">
            <span className="dual-track-primary">{issue.ownerMemberName ?? "未指派负责人"}</span>
            <span className="dual-track-secondary">
              {issue.delegateAgentName ? `→ ${issue.delegateAgentName}` : "未派遣 Agent"}
            </span>
          </div>
        </DataListCell>
        <DataListCell>
          {formatRelativeTime(issue.lastConversationAt ?? issue.assignedAt ?? issue.dueAt)}
        </DataListCell>
        <DataListCell tone="proof">{issue.currentRunId ? "可查" : "待形成"}</DataListCell>
      </div>
    </Link>
  );
}

function IssueBoardCard({ issue }: { issue: IssueListResult["issues"][number] }) {
  return (
    <Link href={`/projects/${issue.projectId}/tasks/${issue.id}`} className="issue-board-card">
      <strong>{issue.title}</strong>
      <span>{issue.issueKey}</span>
      <p>{issue.projectName}</p>
      <div className="issue-board-card-meta">
        <StatusPill status={issue.priority} />
        <span>{issue.delegateAgentName ?? "未派遣"}</span>
      </div>
    </Link>
  );
}
