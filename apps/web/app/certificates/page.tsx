import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { StatusPill } from "../../components/status-pill";
import { CertificateRevokeForm } from "../../components/certificate-action-forms";
import { getCertificates } from "../../lib/api";
import { formatDateTime } from "../../lib/format";

export default async function CertificatesPage() {
  const certificates = await getCertificates();

  return (
    <AppShell
      activeNav="certificates"
      title="证明书中心"
      description="集中查看项目签发记录、核验入口、版本关系与撤销状态。"
      breadcrumbs={[{ label: "证明书中心" }]}
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow-text">签发记录</p>
            <h3 className="panel-title">全部项目证明书</h3>
          </div>
        </div>

        {certificates.length === 0 ? (
          <div className="empty-state">
            当前还没有证明书。项目完成审批并满足签发条件后，会自动或手动生成。
          </div>
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
                        <span>
                          {certificate.certificateNo} · v{certificate.version}
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusPill status={certificate.status} />
                    </td>
                    <td>{certificate.verificationCode}</td>
                    <td>{formatDateTime(certificate.updatedAt)}</td>
                    <td>
                      <div className="link-row">
                        <Link href={`/certificates/${certificate.id}`} className="table-link">
                          查看详情
                        </Link>
                        <Link
                          href={`/certificates/verify/${certificate.verificationCode}`}
                          className="table-link"
                        >
                          公开核验
                        </Link>
                        {certificate.status === "issued" ? (
                          <CertificateRevokeForm
                            certificateId={certificate.id}
                            projectId={certificate.projectId}
                            returnPath="/certificates"
                          />
                        ) : null}
                      </div>
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
