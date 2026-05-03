import type { EvidenceSummary } from "@agent-control-plane/domain";
import { getStatusLabel } from "@agent-control-plane/domain";
import { StatusPill } from "./status-pill";
import { CopyId } from "./copy-id";

function shortHash(value: string | null) {
  return value ? value.slice(0, 14) : "待形成";
}

function getNonceLabel(found: boolean) {
  return found ? "nonce 已登记" : "nonce 待核验";
}

const TRUST_SUMMARY: Record<string, string> = {
  verified: "本次执行已由签名与 nonce 账本核验，证据链完整。",
  pending: "证据链已产生，但仍有签名或核验项处于待确认状态。",
  failed: "证据链核验失败：存在签名缺失、nonce 异常或证书吊销。",
  unavailable: "尚未生成可核验证据，请先触发执行或补齐签名。",
};

export function EvidenceDrawer({ evidence }: { evidence: EvidenceSummary }) {
  const summary = TRUST_SUMMARY[evidence.trustState] ?? "证据状态未知。";

  return (
    <details className="evidence-drawer">
      <summary>
        <span>证据链路</span>
        <StatusPill status={evidence.trustState} />
      </summary>
      <p className="evidence-summary">{summary}</p>
      <div className="evidence-grid">
        <section>
          <h4>事件哈希链</h4>
          {evidence.events.length === 0 ? <p className="muted-text">暂无事件记录。</p> : null}
          {evidence.events.slice(0, 8).map((event) => (
            <p key={event.id} className="evidence-line">
              <strong>{event.eventType}</strong>
              <span>#{event.sequenceNo ?? "-"}</span>
              {event.eventHash ? (
                <CopyId
                  value={event.eventHash}
                  label="事件哈希"
                  displayText={shortHash(event.eventHash)}
                />
              ) : (
                <code>{shortHash(event.eventHash)}</code>
              )}
            </p>
          ))}
        </section>
        <section>
          <h4>智能体运行</h4>
          {evidence.runs.length === 0 ? <p className="muted-text">暂无运行记录。</p> : null}
          {evidence.runs.slice(0, 8).map((run) => (
            <p key={run.id} className="evidence-line">
              <strong>{run.agentName}</strong>
              <span>{getStatusLabel(run.status)}</span>
              <CopyId
                value={run.traceId}
                label="追踪号"
                displayText={getNonceLabel(run.nonceLedgerFound)}
              />
            </p>
          ))}
        </section>
        <section>
          <h4>证明书</h4>
          {evidence.certificates.length === 0 ? <p className="muted-text">暂无证明书。</p> : null}
          {evidence.certificates.slice(0, 5).map((certificate) => (
            <a
              key={certificate.id}
              className="evidence-line evidence-link"
              href={certificate.verificationUrl}
            >
              <strong>{certificate.certificateNo}</strong>
              <span>{getStatusLabel(certificate.status)}</span>
              <code>{shortHash(certificate.chainHeadHash)}</code>
            </a>
          ))}
        </section>
      </div>
    </details>
  );
}
