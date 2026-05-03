import type { WebhookSummary } from "@agent-control-plane/domain";
import Link from "next/link";
import { createWebhookAction, testWebhookAction } from "../app/actions";
import { formatDateTime } from "../lib/format";
import { SubmitButton } from "./submit-button";

const DEFAULT_EVENTS =
  "project.created,task.created,run.succeeded,approval.approved,certificate.issued";

export function WebhookSettingsPanel({ webhooks }: { webhooks: WebhookSummary[] }) {
  return (
    <div className="form-stack">
      <form action={createWebhookAction} className="form-stack">
        <input type="hidden" name="returnPath" value="/settings/integrations" />
        <label className="field-label">
          Webhook 地址
          <input
            className="field-control"
            name="url"
            type="url"
            placeholder="https://example.com/acp/webhook"
            required
          />
        </label>
        <label className="field-label">
          订阅事件
          <input className="field-control" name="events" defaultValue={DEFAULT_EVENTS} required />
          <span className="field-error-hint">多个事件类型请用英文逗号分隔。</span>
        </label>
        <label className="field-label">
          签名密钥
          <input
            className="field-control"
            name="secret"
            placeholder="留空则自动生成"
            minLength={12}
          />
        </label>
        <SubmitButton pendingLabel="正在创建 Webhook..." className="action-button">
          创建 Webhook
        </SubmitButton>
      </form>

      {webhooks.length === 0 ? (
        <div className="empty-state">当前还没有配置外发 Webhook。</div>
      ) : (
        <div className="list-stack">
          {webhooks.map((webhook) => (
            <article key={webhook.id} className="list-card">
              <div className="list-card-head">
                <div>
                  <h4 className="list-card-title">{webhook.url}</h4>
                  <p className="supporting-text">{webhook.events.join(", ")}</p>
                </div>
                <span className="status-pill">{webhook.isActive ? "启用中" : "停用"}</span>
              </div>
              <div className="meta-row">
                <span>密钥 {webhook.secretMasked}</span>
                <span>创建人 {webhook.createdByName}</span>
                <span>投递 {webhook.deliveryCount}</span>
                <span>最近状态 {webhook.lastDeliveryStatus ?? "暂无"}</span>
                <span>{formatDateTime(webhook.updatedAt)}</span>
              </div>
              <div className="link-row">
                <form action={testWebhookAction}>
                  <input type="hidden" name="webhookId" value={webhook.id} />
                  <input type="hidden" name="returnPath" value="/settings/integrations" />
                  <SubmitButton pendingLabel="正在测试..." className="ghost-button">
                    测试 Webhook
                  </SubmitButton>
                </form>
                <Link
                  href={`/settings/integrations/webhooks/${webhook.id}`}
                  className="inline-link"
                >
                  查看投递记录
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
