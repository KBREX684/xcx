import Link from "next/link";
import { getStatusLabel, projectStatuses } from "@agent-control-plane/domain";
import { AppShell } from "../../components/app-shell";
import { CreateProjectForm } from "../../components/create-project-form";
import { ArrowRightIcon, PlusIcon } from "../../components/icons";
import { StatusPill } from "../../components/status-pill";
import { getDashboardSummary, getFilteredProjects, getTeams } from "../../lib/api";
import { formatDate, formatRelativeTime } from "../../lib/format";

type ProjectsPageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
};

const projectsPageSize = 10;

function getProjectProgress(taskCount: number, completedTaskCount: number, status: string) {
  if (status === "delivered" || status === "completed") {
    return 100;
  }

  if (taskCount <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((completedTaskCount / taskCount) * 100)));
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const status = typeof resolved.status === "string" ? resolved.status : "";
  const q = typeof resolved.q === "string" ? resolved.q : "";
  const rawPage = Number.parseInt(typeof resolved.page === "string" ? resolved.page : "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const [projects, dashboard, teams] = await Promise.all([
    getFilteredProjects({
      status: status || undefined,
      q: q || undefined,
    }),
    getDashboardSummary(),
    getTeams(),
  ]);

  const pageCount = Math.max(1, Math.ceil(projects.length / projectsPageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleProjects = projects.slice(
    (currentPage - 1) * projectsPageSize,
    currentPage * projectsPageSize,
  );

  function buildPageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (q) query.set("q", q);
    if (nextPage > 1) query.set("page", String(nextPage));
    const suffix = query.toString();
    return suffix ? `/projects?${suffix}` : "/projects";
  }

  function buildStatusHref(nextStatus: string, keyword: string) {
    const query = new URLSearchParams();
    if (nextStatus) query.set("status", nextStatus);
    if (keyword) query.set("q", keyword);
    const suffix = query.toString();
    return suffix ? `/projects?${suffix}` : "/projects";
  }

  return (
    <AppShell
      activeNav="projects"
      navBadges={{ messages: dashboard.pendingApprovalCount }}
      title="项目"
    >
      <section className="acp-list-shell">
        <header className="acp-list-head">
          <div className="acp-list-head__copy">
            <p className="acp-list-head__kicker">项目</p>
            <h1 className="acp-list-head__title">项目列表</h1>
            <p className="acp-list-head__description">
              所有客户交付项目的状态、进度与最新动态。点击行进入项目驾驶舱处理任务、审批与证明。
            </p>
          </div>

          <div className="acp-list-head__actions">
            <details className="inline-disclosure inline-disclosure-compact">
              <summary className="inline-disclosure-trigger">
                <span className="inline-disclosure-trigger-copy">
                  <PlusIcon />
                  <span>新建项目</span>
                </span>
              </summary>
              <div className="inline-disclosure-body">
                <CreateProjectForm teams={teams} />
              </div>
            </details>
          </div>
        </header>

        <div className="metric-strip" aria-label="项目概览">
          <div className="metric-strip__item">
            <span className="metric-strip__label">全部项目</span>
            <span className="metric-strip__value">
              {dashboard.totalProjectCount ?? projects.length}
            </span>
          </div>
          <div className="metric-strip__item">
            <span className="metric-strip__label">进行中</span>
            <span className="metric-strip__value metric-strip__value--accent">
              {dashboard.activeProjectCount}
            </span>
          </div>
          <div className="metric-strip__item">
            <span className="metric-strip__label">待审批</span>
            <span className="metric-strip__value metric-strip__value--warn">
              {dashboard.pendingApprovalCount}
            </span>
          </div>
          <div className="metric-strip__item">
            <span className="metric-strip__label">运行中任务</span>
            <span className="metric-strip__value">{dashboard.runningExecutionCount}</span>
            <span className="metric-strip__hint">活跃智能体 {dashboard.activeAgentCount}</span>
          </div>
        </div>

        <section className="acp-surface">
          <div className="list-toolbar">
            <div className="list-toolbar__primary">
              <nav className="segmented-control" aria-label="按状态筛选">
                <Link
                  href={buildStatusHref("", q)}
                  data-active={!status ? "true" : undefined}
                  aria-current={!status ? "page" : undefined}
                >
                  全部
                  <span className="segmented-count">{projects.length}</span>
                </Link>
                {projectStatuses.slice(0, 4).map((item) => (
                  <Link
                    key={item}
                    href={buildStatusHref(item, q)}
                    data-active={status === item ? "true" : undefined}
                    aria-current={status === item ? "page" : undefined}
                  >
                    {getStatusLabel(item)}
                  </Link>
                ))}
              </nav>
            </div>

            <form action="/projects" className="list-toolbar__secondary">
              {status ? <input type="hidden" name="status" value={status} /> : null}
              <input
                className="field-control"
                name="q"
                defaultValue={q}
                placeholder="按项目名 / 编号 / 客户搜索"
                style={{ minWidth: 240 }}
              />
              <button type="submit" className="ghost-button">
                筛选
              </button>
              {status || q ? (
                <Link href="/projects" className="ghost-button ghost-button--compact">
                  清除
                </Link>
              ) : null}
            </form>
          </div>

          <div className="projects-table">
            <div className="projects-table-head">
              <span>项目</span>
              <span>状态</span>
              <span>负责人</span>
              <span>目标日期</span>
              <span>最近动态</span>
              <span aria-hidden="true" />
            </div>

            {projects.length === 0 ? (
              <div className="empty-state">
                当前筛选下没有项目。可以清空条件，或点击右上角创建一个新项目。
              </div>
            ) : (
              <div className="projects-table-body">
                {visibleProjects.map((project) => {
                  const progress = getProjectProgress(
                    project.taskCount,
                    project.completedTaskCount,
                    project.status,
                  );
                  const progressTone = progress >= 100 ? "success" : "indigo";
                  const pendingTone =
                    project.pendingApprovalCount > 0 ? "warn" : undefined;

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="projects-row"
                    >
                      <div className="projects-row-main">
                        <div className="projects-row__title-rail">
                          <h3 className="projects-row-title">{project.name}</h3>
                          <span className="projects-row-code">{project.projectCode}</span>
                          <span className="projects-row__customer">
                            · {project.customerName}
                          </span>
                        </div>
                        <p className="projects-row__metrics">
                          <span className="projects-row__metric">
                            <strong>{project.taskCount}</strong>任务
                          </span>
                          <span className="projects-row__metric">
                            <strong>{project.completedTaskCount}</strong>已完成
                          </span>
                          <span
                            className="projects-row__metric"
                            data-tone={pendingTone}
                          >
                            <strong>{project.pendingApprovalCount}</strong>待审批
                          </span>
                        </p>
                        <div className="projects-row-progress">
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              data-tone={progressTone}
                              style={{ width: progress >= 100 ? "100%" : `${progress}%` }}
                            />
                          </div>
                          <span className="progress-value tabular-nums">{progress}%</span>
                        </div>
                      </div>

                      <div className="projects-row-cell">
                        <StatusPill status={project.latestRunStatus ?? project.status} />
                      </div>
                      <div className="projects-row-cell projects-row-secondary">
                        {project.ownerName}
                      </div>
                      <div className="projects-row-cell projects-row-secondary tabular-nums">
                        {formatDate(project.targetDeliveryAt)}
                      </div>
                      <div className="projects-row-cell projects-row-secondary tabular-nums">
                        {formatRelativeTime(project.lastEventAt)}
                      </div>
                      <div className="projects-row-arrow" aria-hidden="true">
                        <ArrowRightIcon />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {projects.length > projectsPageSize ? (
            <div className="pagination-bar" aria-label="项目列表分页">
              <span>
                第 {currentPage} / {pageCount} 页，共 {projects.length} 个项目
              </span>
              <div className="pagination-actions">
                <Link
                  href={buildPageHref(Math.max(1, currentPage - 1))}
                  className={`secondary-action${currentPage <= 1 ? " is-disabled" : ""}`}
                  aria-disabled={currentPage <= 1}
                >
                  上一页
                </Link>
                <Link
                  href={buildPageHref(Math.min(pageCount, currentPage + 1))}
                  className={`secondary-action${currentPage >= pageCount ? " is-disabled" : ""}`}
                  aria-disabled={currentPage >= pageCount}
                >
                  下一页
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </AppShell>
  );
}
