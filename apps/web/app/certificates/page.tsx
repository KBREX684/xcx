import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { StatusPill } from "../../components/status-pill";
import { getCertificates } from "../../lib/api";
import { formatDateTime } from "../../lib/format";

export default async function CertificatesPage() {
  const certificates = await getCertificates();

  return (
    <AppShell
      activeNav="certificates"
      title="证明书中心"
      description="集中查看项目过程证明、核验码与最近更新时间，为后续导出和对外展示打基础。"
      breadcrumbs={[{ label: "证明书中心" }]}
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow-text">证明书列表</p>
            <h3 className="panel-title">当前已沉淀的项目证明摘要</h3>
          </div>
        </div>
        {certificates.length === 0 ? (
          <div className="empty-state">还没有证明书摘要。项目完成闭环、沉淀过程材料后就会在这里出现。</div>
        ) : (
          <div className="cards-grid">
            {certificates.map((certificate) => (
              <article key={certificate.id} className="card-panel">
                <div className="list-card-head">
                  <div>
                    <p className="eyebrow-text">{certificate.projectName}</p>
                    <h3 className="list-card-title">{certificate.title}</h3>
                  </div>
                  <StatusPill status={certificate.status} />
                </div>
                <div className="meta-column">
                  <span>核验码：{certificate.verificationCode}</span>
                  <span>生成时间：{formatDateTime(certificate.generatedAt)}</span>
                  <span>最近更新：{formatDateTime(certificate.updatedAt)}</span>
                </div>
                <div className="link-row">
                  <Link href={`/projects/${certificate.projectId}`} className="inline-link">
                    打开所属项目
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
