import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../../../components/app-shell";
import { StatusPill } from "../../../../../components/status-pill";
import { getProject, getTask } from "../../../../../lib/api";
import { formatDateTime, shortTrace } from "../../../../../lib/format";

type TaskDetailPageProps = {
  params: Promise<{
    projectId: string;
    taskId: string;
  }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { projectId, taskId } = await params;
  const [project, task] = await Promise.all([
    getProject(projectId).catch(() => null),
    getTask(taskId).catch(() => null)
  ]);

  if (!project || !task) {
    notFound();
  }

  return (
    <AppShell
      activeNav="projects"
      title={task.title}
      description="任务详情页，查看任务描述、来源模板以及关联执行记录。"
      breadcrumbs={[
        { label: "项目", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
        { label: task.title }
      ]}
    >
      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">任务概览</p>
                <h3 className="panel-title">当前任务状态</h3>
              </div>
              <StatusPill status={task.currentRunStatus ?? task.status} />
            </div>
            <p className="supporting-text">{task.description}</p>
            <div className="meta-column">
              <span>所属项目：{project.name}</span>
              <span>负责人：{task.ownerLabel}</span>
              <span>优先级：{task.priority}</span>
              <span>来源模板：{task.sourceTemplateName ?? "人工创建"}</span>
              <span>创建时间：{formatDateTime(task.createdAt)}</span>
              <span>最近更新：{formatDateTime(task.updatedAt)}</span>
            </div>
            {task.blockedReason ? <div className="soft-note">阻塞原因：{task.blockedReason}</div> : null}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">执行记录</p>
                <h3 className="panel-title">这项任务经历了哪些推进</h3>
              </div>
            </div>
            {task.runs.length === 0 ? (
              <div className="empty-state">当前任务还没有执行记录，说明它还未被真正推进。</div>
            ) : (
              <div className="list-stack">
                {task.runs.map((run) => (
                  <article key={run.id} className="list-card">
                    <div className="list-card-head">
                      <div>
                        <h4 className="list-card-title">{run.agentName}</h4>
                        <p className="supporting-text">{run.outputSummary ?? "当前没有输出摘要。"}</p>
                      </div>
                      <StatusPill status={run.status} />
                    </div>
                    <div className="meta-row">
                      <span>追踪标识 {shortTrace(run.traceId, 10)}</span>
                      <span>开始 {formatDateTime(run.startedAt ?? run.createdAt)}</span>
                      <span>结束 {formatDateTime(run.finishedAt)}</span>
                    </div>
                    <div className="link-row">
                      <Link href={`/runs/${run.id}`} className="inline-link">
                        查看执行详情
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
                <p className="eyebrow-text">快捷操作</p>
                <h3 className="panel-title">继续回到项目推进</h3>
              </div>
            </div>
            <div className="link-row">
              <Link href={`/projects/${project.id}`} className="action-button">
                返回项目指挥台
              </Link>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
