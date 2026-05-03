import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import QRCode from "qrcode";
import { getCertificateProof, verifyCertificate } from "../../../../lib/api";
import { getSessionToken } from "../../../../lib/auth";
import { CopyId } from "../../../../components/copy-id";
import { StatusPill } from "../../../../components/status-pill";
import { formatDateTime, shortTrace } from "../../../../lib/format";
import { CertificateAcceptForm } from "../../../../components/certificate-action-forms";

type VerifyPageProps = {
  params: Promise<{
    verificationCode: string;
  }>;
};

const getVerificationResult = cache(async (verificationCode: string) => {
  return verifyCertificate(verificationCode).catch(() => null);
});

const getProof = cache(async (verificationCode: string) => {
  return getCertificateProof(verificationCode).catch(() => null);
});

const getVerificationQrPng = cache(async (verificationUrl: string) => {
  // 使用 PNG dataURL + <img> 渲染，避免 dangerouslySetInnerHTML 安全 sink。
  return QRCode.toDataURL(verificationUrl, {
    margin: 1,
    width: 192,
    errorCorrectionLevel: "M",
  }).catch(() => null);
});

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { verificationCode } = await params;
  const result = await getVerificationResult(verificationCode);

  if (!result) {
    notFound();
  }

  return {
    title: `${result.certificateNo} 核验`,
  };
}

function VerificationItem({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className="workspace-kv-row">
      <span>{label}</span>
      <strong>{valid ? "通过" : "失败"}</strong>
    </div>
  );
}

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { verificationCode } = await params;
  const result = await getVerificationResult(verificationCode);
  const hasSession = Boolean(await getSessionToken());

  if (!result) {
    notFound();
  }

  const [proof, qrPng] = await Promise.all([
    getProof(verificationCode),
    getVerificationQrPng(result.verificationUrl),
  ]);

  const allPassed =
    result.digestValid && result.signatureValid && result.chainValid && result.artifactDigestValid;
  const isAccepted = Boolean(result.acceptedAt);
  const proofBadges = [
    { label: "摘要", valid: result.digestValid },
    { label: "签名", valid: result.signatureValid },
    { label: "事件链", valid: result.chainValid },
    { label: "产物", valid: result.artifactDigestValid },
  ];

  return (
    <main className="verify-page-shell">
      <section className="verify-page-card">
        <div className="verify-page-head">
          <div>
            <p className="eyebrow-text">公开验证页</p>
            <h1 className="page-title">{result.title}</h1>
            <p className="page-description">
              用于客户和交付方共同核验证明书摘要、签名、事件链与交付产物摘要是否一致。
            </p>
          </div>
          <StatusPill status={result.status} />
        </div>

        <div className="project-summary-strip">
          <div className="project-summary-item">
            <span className="project-summary-label">项目</span>
            <strong>{result.projectName}</strong>
          </div>
          <div className="project-summary-item">
            <span className="project-summary-label">证书号</span>
            <strong>{result.certificateNo}</strong>
          </div>
          <div className="project-summary-item">
            <span className="project-summary-label">版本</span>
            <strong>v{result.version}</strong>
          </div>
          <div className="project-summary-item">
            <span className="project-summary-label">总体结果</span>
            <strong>{allPassed ? "核验通过" : "需要复核"}</strong>
          </div>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">验证结果</p>
              <h3 className="panel-title">可信性检查</h3>
            </div>
          </div>
          <div className="verification-badge-rail" aria-label="四重校验状态">
            {proofBadges.map((badge) => (
              <span
                key={badge.label}
                className="verification-badge"
                data-valid={badge.valid ? "true" : "false"}
              >
                {badge.label}
              </span>
            ))}
          </div>
          <div className="workspace-kv-list">
            <VerificationItem label="摘要哈希" valid={result.digestValid} />
            <VerificationItem label="签名校验" valid={result.signatureValid} />
            <VerificationItem label="事件链连续性" valid={result.chainValid} />
            <VerificationItem label="产物摘要一致性" valid={result.artifactDigestValid} />
            <div className="workspace-kv-row">
              <span>客户确认时间</span>
              <strong>{formatDateTime(result.acceptedAt)}</strong>
            </div>
            <div className="workspace-kv-row">
              <span>撤销时间</span>
              <strong>{formatDateTime(result.revokedAt)}</strong>
            </div>
            <div className="workspace-kv-row">
              <span>事件链头</span>
              <strong>
                <CopyId
                  value={result.chainHeadHash}
                  label="事件链头"
                  displayText={shortTrace(result.chainHeadHash, 16) + "…"}
                />
              </strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">客户动作</p>
              <h3 className="panel-title">确认收悉</h3>
            </div>
          </div>
          {isAccepted ? (
            <div className="soft-note">
              客户确认已记录于 {formatDateTime(result.acceptedAt)}，无需重复提交。
            </div>
          ) : hasSession ? (
            <CertificateAcceptForm
              certificateId={result.certificateId}
              returnPath={`/certificates/verify/${result.verificationCode}`}
              comment="客户已核验摘要、签名与事件链，并确认收悉交付过程证明。"
              showFields
            />
          ) : (
            <div className="soft-note">
              客户确认需要登录后提交。当前公开页面仍可用于验明摘要哈希、签名、事件链和产物摘要。
              <div className="link-row">
                <Link
                  href={`/login?next=/certificates/verify/${encodeURIComponent(result.verificationCode)}`}
                  className="inline-link"
                >
                  登录后确认
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">离线核验</p>
              <h3 className="panel-title">扫码 / 下载证明包</h3>
            </div>
          </div>
          <div className="verify-offline-grid">
            {qrPng ? (
              // dataURL 内联二维码图，无需 next/image 优化
              <img
                src={qrPng}
                alt="证书核验二维码"
                width={192}
                height={192}
                className="verify-qr"
              />
            ) : (
              <div className="verify-qr verify-qr--placeholder" aria-hidden="true">
                二维码生成失败
              </div>
            )}
            <div className="verify-offline-meta">
              <p className="page-description">
                客户可扫码访问本页面，或下载完整证明 JSON
                （包含摘要、签名、事件链、签名公钥）以便离线复算。
              </p>
              <div className="link-row">
                <a
                  href={`/certificates/verify/${encodeURIComponent(result.verificationCode)}/proof`}
                  className="inline-link"
                  download
                >
                  下载证明 JSON
                </a>
                <CopyId
                  value={result.verificationUrl}
                  label="验证地址"
                  displayText={result.verificationUrl}
                />
              </div>
            </div>
          </div>
        </section>

        {proof && proof.events.length > 0 ? (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">事件链</p>
                <h3 className="panel-title">完整 hash 链路（共 {proof.events.length} 条）</h3>
              </div>
            </div>
            <details className="verify-event-chain">
              <summary>展开 / 收起事件链</summary>
              <ol className="verify-event-list">
                {proof.events.map((event) => (
                  <li
                    key={`${event.sequenceNo ?? "x"}-${event.eventHash ?? event.eventType}`}
                    className="verify-event-item"
                  >
                    <div className="verify-event-head">
                      <span className="verify-event-seq">#{event.sequenceNo ?? "—"}</span>
                      <strong>{event.eventType}</strong>
                      <span className="text-muted">{formatDateTime(event.occurredAt)}</span>
                    </div>
                    <div className="verify-event-meta">
                      <span>
                        actor：{event.actorType}/{event.actorId}
                      </span>
                      {event.eventHash ? (
                        <code className="verify-event-hash">{event.eventHash}</code>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        ) : null}

        <div className="link-row">
          <Link href={`/certificates/${result.certificateId}`} className="inline-link">
            打开内部详情页
          </Link>
          <Link href={`/projects/${result.projectId}`} className="inline-link">
            返回项目工作台
          </Link>
        </div>
      </section>
    </main>
  );
}
