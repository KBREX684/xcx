import Link from "next/link";
import { getStatusLabel, projectStatuses } from "@agent-control-plane/domain";
import { AppShell } from "../../components/app-shell";
import { CreateProjectForm } from "../../components/create-project-form";
import { ArrowRightIcon, FolderIcon } from "../../components/icons";
import { StatusPill } from "../../components/status-pill";
import { getDashboardSummary, getFilteredProjects } from "../../lib/api";
import { formatDate, formatRelativeTime } from "../../lib/format";

type ProjectsPageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
  }>;
};

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

  const [projects, dashboard] = await Promise.all([
    getFilteredProjects({
      status: status || undefined,
      q: q || undefined
    }),
    getDashboardSummary()
  ]);

  return (
    <AppShell
      activeNav="projects"
      navBadges={{ approvals: dashboard.pendingApprovalCount }}
      title="项目"
      description="管理当前交付项目、查看推进状态，并从这里继续进入各个项目空间。"
      breadcrumbs={[{ label: "工作台", href: "/" }, { label: "项目" }]}
    >
      <section className="page-grid page-grid-projects">
        <div className="stack-panel">
          <section className="surface-card surface-card-emphasis">
            <div className="surface-card-head">
              <div>
                <h2 className="surface-card-title">项目列表</h2>
                <p className="surface-card-description">通过状态与关键词筛选快速定位项目，再继续下钻到执行详情。</p>
              </div>
              <span className="list-result-badge">{projects.length} 个结果</span>
            </div>

            <form action="/projects" className="projects-filter-bar">
              <label className="compact-field">
                项目状态
                <select name="status" className="field-control" defaultValue={status}>
                  <option value="">全部状态</option>
                  {projectStatuses.map((item) => (
                    <option key={item} value={item}>
                      {getStatusLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="compact-field compact-field-wide">
                关键词
                <input
                  className="field-control"
                  name="q"
                  defaultValue={q}
                  placeholder="搜索项目名称、编号或客户名称"
                />
              </label>
              <button type="submit" className="ghost-button">
                应用筛选
              </button>
            </form>

            {projects.length === 0 ? (
              <div className="empty-state">当前筛选条件下没有项目，可以清空条件或创建一个新的交付项目。</div>
            ) : (
              <div className="project-record-list">
                {projects.map((project) => {
                  const progress = getProjectProgress(
                    project.taskCount,
                    project.completedTaskCount,
                    project.status
                  );

                  return (
                    <Link key={project.id} href={`/projects/${project.id}`} className="project-record-row">
                      <span className="list-icon-chip" data-tone="indigo">
                        <FolderIcon />
                      </span>

                      <div className="project-record-main">
                        <div className="project-record-head">
                          <div>
                            <h3 className="list-item-title">{project.name}</h3>
                            <p className="list-item-meta">
                              {project.projectCode} · {project.customerName}
                            </p>
                          </div>
                          <StatusPill status={project.latestRunStatus ?? project.status} />
                        </div>

                        <div className="project-record-meta">
                          <span>任务 {project.taskCount}</span>
                          <span>完成 {project.completedTaskCount}</span>
                          <span>待审批 {project.pendingApprovalCount}</span>
                          <span>目标交付 {formatDate(project.targetDeliveryAt)}</span>
                          <span>最近更新 {formatRelativeTime(project.lastEventAt)}</span>
                        </div>

                        <div className="project-feed-progress">
                          <div className="progress-track">
                            <span className="progress-fill" data-tone="indigo" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="progress-value">{progress}%</span>
                        </div>
                      </div>

                      <span className="project-record-arrow">
                        <ArrowRightIcon />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="stack-panel">
          <section className="surface-card">
            <div className="surface-card-head">
              <div>
                <h2 className="surface-card-title">新建项目</h2>
                <p className="surface-card-description">为新的交付需求建立空间，并直接进入项目视图。</p>
              </div>
            </div>
            <CreateProjectForm />
          </section>

          <section className="surface-card">
            <div className="surface-card-head">
              <div>
                <h2 className="surface-card-title">当前提示</h2>
                <p className="surface-card-description">保持项目筛选视图足够干净，帮助团队快速进入正确的上下文。</p>
              </div>
            </div>
            <div className="compact-stack">
              <div className="subtle-note">
                默认优先关注“进行中”“待审批”与最近有动态的项目，避免信息噪音干扰。
              </div>
              <Link href="/" className="quiet-link">
                返回工作台首页
                <ArrowRightIcon />
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}
