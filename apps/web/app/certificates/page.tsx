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
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>项目</th>
                  <th>证明书</th>
                  <th>状态</th>
                  <th>核验码</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((certificate) => (
                  <tr key={certificate.id}>
                    <td>{certificate.projectName}</td>
                    <td>
                      <div className="meta-column">
                        <strong>{certificate.title}</strong>
                        <span>生成于 {formatDateTime(certificate.generatedAt)}</span>
                      </div>
                    </td>
                    <td>
                      <StatusPill status={certificate.status} />
                    </td>
                    <td>{certificate.verificationCode}</td>
                    <td>{formatDateTime(certificate.updatedAt)}</td>
                    <td>
                      <Link href={`/projects/${certificate.projectId}`} className="table-link">
                        打开项目
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
