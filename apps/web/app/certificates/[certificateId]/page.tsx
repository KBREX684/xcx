import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { CopyId } from "../../../components/copy-id";
import { StatusPill } from "../../../components/status-pill";
import {
  CertificateAcceptForm,
  CertificateRevokeForm,
} from "../../../components/certificate-action-forms";
import { CertificateQrPanel } from "../../../components/certificate-qr-panel";
import { getCertificate } from "../../../lib/api";
import { formatDateTime, shortTrace } from "../../../lib/format";

const verificationOutcomeLabels: Record<string, string> = {
  valid: "有效",
  revoked: "已撤销",
  tampered: "内容异常",
  not_found: "未找到",
  signature_mismatch: "签名不匹配",
};

type CertificateDetailPageProps = {
  params: Promise<{
    certificateId: string;
  }>;
};

export default async function CertificateDetailPage({ params }: CertificateDetailPageProps) {
  const { certificateId } = await params;
  const certificate = await getCertificate(certificateId).catch(() => null);

  if (!certificate) {
    notFound();
  }

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const verificationUrl = `${proto}://${host}/certificates/verify/${certificate.verificationCode}`;
  const isAccepted = Boolean(certificate.acceptedAt);

  return (
    <AppShell
      activeNav="certificates"
      title={certificate.title}
      description="查看签发摘要、摘要哈希、版本关系、客户确认与本地落盘位置。"
      breadcrumbs={[{ label: "证明书中心", href: "/certificates" }, { label: certificate.title }]}
    >
      <section className="hero-grid">
        <article className="hero-panel">
          <div className="hero-kicker">{certificate.certificateNo}</div>
          <div className="list-card-head">
            <div>
              <h2 className="hero-title">{certificate.projectName}</h2>
              <p className="hero-copy">
                该证明书记录了项目交付过程中的任务、执行记录、审批、产物摘要与事件链头部哈希。
              </p>
            </div>
            <StatusPill status={certificate.status} />
          </div>
          <div className="hero-rail">
            <div className="hero-stat">
              <div className="hero-stat-label">版本</div>
              <div className="hero-stat-value">v{certificate.version}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">核验码</div>
              <div className="hero-stat-value hero-stat-text">
                <CopyId
                  value={certificate.verificationCode}
                  label="核验码"
                  displayText={certificate.verificationCode}
                />
              </div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">签发时间</div>
              <div className="hero-stat-value hero-stat-text">
                {formatDateTime(certificate.issuedAt)}
              </div>
            </div>
          </div>
          <div className="link-row">
            <Link
              href={`/certificates/verify/${certificate.verificationCode}`}
              className="inline-link"
            >
              打开公开验证页
            </Link>
            <Link href={`/projects/${certificate.projectId}`} className="inline-link">
              返回项目工作台
            </Link>
          </div>
        </article>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">扫码核验</p>
                <h3 className="panel-title">客户端一键验证</h3>
              </div>
            </div>
            <CertificateQrPanel
              verificationUrl={verificationUrl}
              verificationCode={certificate.verificationCode}
            />
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">签发状态</p>
                <h3 className="panel-title">客户确认与版本关系</h3>
              </div>
            </div>
            <div className="compact-stack">
              <div className="meta-column">
                <span>
                  客户确认：
                  {certificate.acceptedAt ? formatDateTime(certificate.acceptedAt) : "尚未确认"}
                </span>
                <span>确认说明：{certificate.acceptanceComment ?? "暂无"}</span>
                <span>撤销时间：{formatDateTime(certificate.revokedAt)}</span>
                <span>替代版本：{certificate.replacedByCertificateId ?? "无"}</span>
              </div>

              {certificate.status === "issued" ? (
                <>
                  {isAccepted ? (
                    <div className="soft-note">
                      客户确认已记录，无需重复提交。
                    </div>
                  ) : (
                    <CertificateAcceptForm
                      certificateId={certificate.id}
                      returnPath={`/certificates/${certificate.id}`}
                      comment="客户已在项目验收会中确认收到交付过程证明。"
                      buttonLabel="记录客户确认"
                      className="action-button secondary-action"
                    />
                  )}

                  <CertificateRevokeForm
                    certificateId={certificate.id}
                    projectId={certificate.projectId}
                    returnPath={`/certificates/${certificate.id}`}
                    buttonLabel="撤销当前版本"
                    className="action-button ghost-button"
                  />
                </>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">落盘信息</p>
                <h3 className="panel-title">本地文件路径</h3>
              </div>
            </div>
            <dl className="tech-kv-list">
              <div className="tech-kv-row">
                <dt>JSON</dt>
                <dd>
                  <CopyId
                    value={certificate.jsonStorageUri}
                    label="JSON 落盘路径"
                    displayText={certificate.jsonStorageUri}
                  />
                </dd>
              </div>
              <div className="tech-kv-row">
                <dt>HTML</dt>
                <dd>
                  <CopyId
                    value={certificate.htmlStorageUri}
                    label="HTML 落盘路径"
                    displayText={certificate.htmlStorageUri}
                  />
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </section>

      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">可信摘要</p>
                <h3 className="panel-title">哈希与签名</h3>
              </div>
            </div>
            <dl className="tech-kv-list">
              <div className="tech-kv-row">
                <dt>摘要哈希</dt>
                <dd>
                  <CopyId
                    value={certificate.digestSha256}
                    label="摘要哈希"
                    displayText={shortTrace(certificate.digestSha256, 16) + "…"}
                  />
                </dd>
              </div>
              <div className="tech-kv-row">
                <dt>事件链头</dt>
                <dd>
                  <CopyId
                    value={certificate.chainHeadHash}
                    label="事件链头"
                    displayText={shortTrace(certificate.chainHeadHash, 16) + "…"}
                  />
                </dd>
              </div>
              <div className="tech-kv-row">
                <dt>签名</dt>
                <dd>
                  <CopyId
                    value={certificate.signature}
                    label="签名"
                    displayText={shortTrace(certificate.signature, 16) + "…"}
                  />
                </dd>
              </div>
              <div className="tech-kv-row">
                <dt>验证地址</dt>
                <dd>
                  <a
                    href={certificate.verificationUrl}
                    className="inline-link tech-kv-mono"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {certificate.verificationUrl}
                  </a>
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">核验审计</p>
                <h3 className="panel-title">最近 10 次公开核验</h3>
              </div>
            </div>
            {certificate.verificationRecords.length === 0 ? (
              <div className="empty-state">当前还没有公开核验记录。</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>结果</th>
                      <th>核验时间</th>
                      <th>追踪标识</th>
                      <th>来源</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificate.verificationRecords.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <span className="status-pill" data-tone={record.outcome}>
                            {verificationOutcomeLabels[record.outcome] ?? record.outcome}
                          </span>
                        </td>
                        <td>{formatDateTime(record.verifiedAt)}</td>
                        <td>
                          <CopyId
                            value={record.traceId}
                            label="追踪标识"
                            displayText={shortTrace(record.traceId, 10)}
                          />
                        </td>
                        <td>{record.verifierIp ?? "未记录"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">结构化内容</p>
                <h3 className="panel-title">签发摘要 JSON</h3>
              </div>
            </div>
            <pre className="code-block">{JSON.stringify(certificate.summary ?? {}, null, 2)}</pre>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
