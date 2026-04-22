import Link from "next/link";
import { getStatusLabel, projectStatuses } from "@agent-control-plane/domain";
import { AppShell } from "../../components/app-shell";
import { CreateProjectForm } from "../../components/create-project-form";
import { StatusPill } from "../../components/status-pill";
import { getFilteredProjects } from "../../lib/api";
import { formatDate } from "../../lib/format";

type ProjectsPageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
  }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const status = typeof resolved.status === "string" ? resolved.status : "";
  const q = typeof resolved.q === "string" ? resolved.q : "";
  const projects = await getFilteredProjects({
    status: status || undefined,
    q: q || undefined
  });

  return (
    <AppShell
      activeNav="projects"
      title="项目总览"
      description="按状态、关键词和交付节奏查看所有项目，并从这里进入项目 cockpit。"
      breadcrumbs={[{ label: "项目" }]}
    >
      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">过滤条件</p>
                <h3 className="panel-title">快速收拢视图</h3>
              </div>
              <Link href="/projects" className="ghost-link">
                清空筛选
              </Link>
            </div>
            <form action="/projects" className="filters-row">
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
                  placeholder="输入项目名称、编号或客户名称"
                />
              </label>
              <button type="submit" className="action-button">
                应用筛选
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">项目列表</p>
                <h3 className="panel-title">当前项目视图</h3>
              </div>
            </div>
            {projects.length === 0 ? (
              <div className="empty-state">当前筛选条件下没有项目，可以尝试清空条件或直接创建一个新项目。</div>
            ) : (
              <div className="cards-grid">
                {projects.map((project) => (
                  <article key={project.id} className="card-panel">
                    <div className="list-card-head">
                      <div>
                        <p className="eyebrow-text">{project.projectCode}</p>
                        <h4 className="list-card-title">{project.name}</h4>
                      </div>
                      <StatusPill status={project.latestRunStatus ?? project.status} />
                    </div>
                    <p className="supporting-text">客户：{project.customerName}</p>
                    <div className="meta-row">
                      <span>任务 {project.taskCount}</span>
                      <span>完成 {project.completedTaskCount}</span>
                      <span>待审批 {project.pendingApprovalCount}</span>
                    </div>
                    <div className="meta-row">
                      <span>目标交付 {formatDate(project.targetDeliveryAt)}</span>
                      <span>最近动态 {formatDate(project.lastEventAt)}</span>
                    </div>
                    <div className="link-row">
                      <Link href={`/projects/${project.id}`} className="inline-link">
                        进入项目指挥台
                      </Link>
                      <Link href={`/projects/${project.id}/settings`} className="inline-link">
                        项目设置
                      </Link>
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
                <p className="eyebrow-text">新建项目</p>
                <h3 className="panel-title">创建新的交付条目</h3>
              </div>
            </div>
            <CreateProjectForm />
          </section>
        </div>
      </section>
    </AppShell>
  );
}
