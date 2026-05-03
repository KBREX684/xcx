"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type {
  AgentCapabilityAuthorizationSummary,
  AgentSigningKeySummary,
} from "@agent-control-plane/domain";
import {
  grantAgentCapabilityAction,
  revokeAgentCapabilityAction,
  rotateAgentKeyAction,
} from "../app/actions";
import type { ActionResult } from "../lib/action-result";
import { formatDateTime, formatRelativeTime } from "../lib/format";

type AnyAction = (formData: FormData) => Promise<ActionResult | void>;

export function AgentCapabilityPanel({
  agentId,
  authorizations,
  signingKey,
  returnPath,
}: {
  agentId: string;
  authorizations: AgentCapabilityAuthorizationSummary[];
  signingKey: AgentSigningKeySummary | null;
  returnPath: string;
}) {
  const [isPending, startTransition] = useTransition();

  function submit(action: AnyAction, formData: FormData) {
    startTransition(async () => {
      const result = await action(formData);
      if (result?.ok === false) {
        toast.error(result.error);
      } else {
        toast.success("已提交。");
      }
    });
  }

  const active = authorizations.filter((a) => !a.revokedAt);
  const revoked = authorizations.filter((a) => a.revokedAt);

  return (
    <section className="panel" aria-label="能力授权">
      <div className="panel-heading">
        <div>
          <p className="eyebrow-text">安全治理</p>
          <h3 className="panel-title">能力授权与密钥</h3>
        </div>
      </div>

      <div className="meta-column">
        {signingKey ? (
          <span>
            当前签名密钥：v{signingKey.keyVersion} · {signingKey.algorithm} · 创建{" "}
            {formatRelativeTime(signingKey.createdAt)}
          </span>
        ) : (
          <span>当前签名密钥：未设置（请先轮换公钥）。</span>
        )}
      </div>

      <details className="inline-disclosure">
        <summary className="inline-disclosure-trigger">轮换 / 设置公钥</summary>
        <form
          className="inline-form stack-gap-sm"
          action={(formData) => submit(rotateAgentKeyAction, formData)}
        >
          <input type="hidden" name="agentId" value={agentId} />
          <input type="hidden" name="returnPath" value={returnPath} />
          <label className="field-group">
            <span className="field-label">公钥（hex，64 字符 Ed25519）</span>
            <input
              name="publicKeyHex"
              className="field-control"
              placeholder="粘贴 64 位十六进制公钥"
              required
              minLength={64}
              maxLength={64}
              pattern="[0-9a-fA-F]{64}"
            />
          </label>
          <label className="field-group">
            <span className="field-label">密钥版本（可选）</span>
            <input name="keyVersion" className="field-control" placeholder="留空自动生成" />
          </label>
          <button type="submit" className="action-button" disabled={isPending}>
            {isPending ? "提交中..." : "轮换密钥"}
          </button>
        </form>
      </details>

      <details className="inline-disclosure">
        <summary className="inline-disclosure-trigger">授予新能力</summary>
        <form
          className="inline-form stack-gap-sm"
          action={(formData) => submit(grantAgentCapabilityAction, formData)}
        >
          <input type="hidden" name="agentId" value={agentId} />
          <input type="hidden" name="returnPath" value={returnPath} />
          <label className="field-group">
            <span className="field-label">能力码</span>
            <input
              name="capabilityCode"
              className="field-control"
              placeholder="例如 delivery-intake"
              required
              minLength={1}
              maxLength={120}
            />
          </label>
          <label className="field-group">
            <span className="field-label">作用域 JSON（可选）</span>
            <textarea
              name="scopeJson"
              className="field-control field-control-textarea"
              rows={3}
              placeholder='例如 {"projectId": "<项目编号>"}'
            />
          </label>
          <label className="field-group">
            <span className="field-label">有效期（可选 ISO 时间）</span>
            <input name="validUntil" className="field-control" placeholder="2026-12-31T23:59:59Z" />
          </label>
          <button type="submit" className="action-button" disabled={isPending}>
            {isPending ? "提交中..." : "授予能力"}
          </button>
        </form>
      </details>

      <div className="capability-list" aria-label="当前授权">
        <p className="eyebrow-text">当前授权</p>
        {active.length === 0 ? (
          <div className="empty-state">尚未授予任何能力。</div>
        ) : (
          <ul className="agent-activity-list">
            {active.map((auth) => (
              <li key={auth.id} className="agent-activity-item">
                <div className="agent-activity-row">
                  <span className="agent-activity-name">{auth.capabilityCode}</span>
                  <span className="agent-activity-state" data-state="completed">
                    生效中
                  </span>
                  <span className="agent-activity-time" suppressHydrationWarning>
                    {formatRelativeTime(auth.createdAt)}
                  </span>
                </div>
                <p className="agent-activity-detail muted">
                  签发：{auth.issuedByMemberName ?? auth.issuedByMemberId} · keyVersion v
                  {auth.keyVersion} · signature {auth.signaturePrefix}…
                </p>
                <p className="agent-activity-detail muted">
                  有效期：{auth.validUntil ? formatDateTime(auth.validUntil) : "无固定结束日期"} ·
                  nonce {auth.nonce.slice(0, 8)}…
                </p>
                {auth.scopeJson ? (
                  <p className="agent-activity-detail muted">scope：{auth.scopeJson}</p>
                ) : null}
                <form
                  action={(formData) => submit(revokeAgentCapabilityAction, formData)}
                  className="inline-form"
                >
                  <input type="hidden" name="agentId" value={agentId} />
                  <input type="hidden" name="authorizationId" value={auth.id} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input
                    name="reason"
                    className="field-control"
                    placeholder="撤销原因（可选）"
                    aria-label="撤销原因"
                  />
                  <button type="submit" className="ghost-button" disabled={isPending}>
                    {isPending ? "提交中..." : "撤销"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {revoked.length > 0 ? (
        <details className="inline-disclosure inline-disclosure-compact">
          <summary className="inline-disclosure-trigger">已撤销 ({revoked.length})</summary>
          <ul className="agent-activity-list">
            {revoked.map((auth) => (
              <li key={auth.id} className="agent-activity-item">
                <div className="agent-activity-row">
                  <span className="agent-activity-name">{auth.capabilityCode}</span>
                  <span className="agent-activity-state" data-state="failed">
                    已撤销
                  </span>
                  <span className="agent-activity-time" suppressHydrationWarning>
                    {auth.revokedAt ? formatRelativeTime(auth.revokedAt) : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
