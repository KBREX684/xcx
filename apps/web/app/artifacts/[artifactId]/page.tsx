import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { StatusPill } from "../../../components/status-pill";
import { getArtifact, getRun } from "../../../lib/api";
import { formatDateTime } from "../../../lib/format";

type ArtifactDetailPageProps = {
  params: Promise<{
    artifactId: string;
  }>;
};

export default async function ArtifactDetailPage({ params }: ArtifactDetailPageProps) {
  const { artifactId } = await params;
  const artifact = await getArtifact(artifactId).catch(() => null);

  if (!artifact) {
    notFound();
  }

  const run = await getRun(artifact.runId).catch(() => null);

  return (
    <AppShell
      activeNav="projects"
      title={artifact.title}
      description="查看产物来源、摘要哈希、结构化元数据以及所属执行记录。"
      breadcrumbs={[
        { label: "项目", href: "/projects" },
        { label: artifact.projectName, href: `/projects/${artifact.projectId}` },
        { label: "产物详情" },
      ]}
    >
      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">产物概览</p>
                <h3 className="panel-title">文件与来源</h3>
              </div>
              {artifact.runStatus ? <StatusPill status={artifact.runStatus} /> : null}
            </div>
            <div className="meta-column">
              <span>所属项目：{artifact.projectName}</span>
              <span>产物类型：{artifact.artifactType}</span>
              <span>存储路径：{artifact.storageUri}</span>
              <span>MIME 类型：{artifact.mimeType}</span>
              <span>创建时间：{formatDateTime(artifact.createdAt)}</span>
            </div>
            <div className="soft-note">摘要哈希：{artifact.sha256Digest}</div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">执行上下文</p>
                <h3 className="panel-title">它来自哪一次执行</h3>
              </div>
            </div>
            {run ? (
              <div className="compact-stack">
                <p className="supporting-text">
                  该产物来自任务《{run.taskTitle}》，由 {run.agentName} 在节点 {run.nodeKey}{" "}
                  中产出。
                </p>
                <div className="link-row">
                  <Link href={`/runs/${run.id}`} className="inline-link">
                    查看执行记录
                  </Link>
                  <Link href={`/projects/${artifact.projectId}`} className="inline-link">
                    返回项目工作台
                  </Link>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                当前无法加载关联执行记录，但产物本身已经保留在系统中。
              </div>
            )}
          </section>
        </div>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">输出摘要</p>
                <h3 className="panel-title">产物生成背景</h3>
              </div>
            </div>
            <div className="detail-block">
              <p>{artifact.outputSummary ?? "当前没有附带的输出摘要。"}</p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">结构化元数据</p>
                <h3 className="panel-title">用于后续证明与追溯</h3>
              </div>
            </div>
            <pre className="code-block">{JSON.stringify(artifact.metadata ?? {}, null, 2)}</pre>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
