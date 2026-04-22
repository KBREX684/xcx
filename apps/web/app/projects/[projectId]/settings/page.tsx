import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { ProjectSettingsForm } from "../../../../components/project-settings-form";
import { StatusPill } from "../../../../components/status-pill";
import { getProject } from "../../../../lib/api";
import { formatDate, formatDateTime } from "../../../../lib/format";

type ProjectSettingsPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { projectId } = await params;
  const project = await getProject(projectId).catch(() => null);

  if (!project) {
    notFound();
  }

  return (
    <AppShell
      activeNav="projects"
      title="项目设置"
      description="维护项目名称、客户信息、目标交付日期与项目状态。"
      breadcrumbs={[
        { label: "项目", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
        { label: "项目设置" }
      ]}
    >
      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">项目表单</p>
                <h3 className="panel-title">更新基础信息</h3>
              </div>
            </div>
            <ProjectSettingsForm project={project} />
          </section>
        </div>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">当前摘要</p>
                <h3 className="panel-title">设置以外的关键状态</h3>
              </div>
              <StatusPill status={project.latestRunStatus ?? project.status} />
            </div>
            <div className="meta-column">
              <span>项目编号：{project.projectCode}</span>
              <span>客户名称：{project.customerName}</span>
              <span>负责人：{project.ownerName}</span>
              <span>目标交付：{formatDate(project.targetDeliveryAt)}</span>
              <span>最近事件：{project.latestEventSummary ?? "暂无事件摘要"}</span>
            </div>
            {project.latestCertificate ? (
              <div className="soft-note">
                最近证明书：{project.latestCertificate.title} · 更新于 {formatDateTime(project.latestCertificate.updatedAt)}
              </div>
            ) : (
              <div className="soft-note">当前项目还没有证明书摘要，这属于正常的 P2 阶段状态。</div>
            )}
          </section>
        </div>
      </section>
    </AppShell>
  );
}
