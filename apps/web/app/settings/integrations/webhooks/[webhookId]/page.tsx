import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../../../components/app-shell";
import { StatusPill } from "../../../../../components/status-pill";
import { SubmitButton } from "../../../../../components/submit-button";
import { WebhookRetryForm } from "../../../../../components/webhook-retry-form";
import { testWebhookAction } from "../../../../actions";
import { getWebhook } from "../../../../../lib/api";
import { formatDateTime } from "../../../../../lib/format";

type WebhookDetailPageProps = {
  params: Promise<{
    webhookId: string;
  }>;
};

export default async function WebhookDetailPage({ params }: WebhookDetailPageProps) {
  const { webhookId } = await params;
  const webhook = await getWebhook(webhookId).catch(() => null);

  if (!webhook) {
    notFound();
  }

  const returnPath = `/settings/integrations/webhooks/${webhook.id}`;

  return (
    <AppShell
      activeNav="settings"
      title="Webhook 交付"
      description="查看近期出站 Webhook 交付记录，可手动重试失败投递以闭环审计链路。"
      breadcrumbs={[
        { label: "接入配置", href: "/settings/integrations" },
        { label: "Webhook 交付" },
      ]}
    >
      <section className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">Webhook</p>
              <h3 className="panel-title">{webhook.url}</h3>
            </div>
            <span className="status-pill" data-tone={webhook.isActive ? "active" : "inactive"}>
              {webhook.isActive ? "启用中" : "停用"}
            </span>
          </div>
          <div className="meta-column">
            <span>事件：{webhook.events.join("、")}</span>
            <span>密钥：{webhook.secretMasked}</span>
            <span>总投递：{webhook.deliveryCount}</span>
            <span>最近状态：{webhook.lastDeliveryStatus ?? "暂无"}</span>
            <span>更新于：{formatDateTime(webhook.updatedAt)}</span>
          </div>
          <div className="link-row">
            <form action={testWebhookAction}>
              <input type="hidden" name="webhookId" value={webhook.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <SubmitButton pendingLabel="发送中..." className="action-button secondary-action">
                发送测试投递
              </SubmitButton>
            </form>
            <Link href="/settings/integrations" className="inline-link">
              返回接入配置
            </Link>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">最近 50 条投递</p>
              <h3 className="panel-title">交付可观测</h3>
            </div>
          </div>

          {webhook.deliveries.length === 0 ? (
            <div className="empty-state">暂无 Webhook 交付记录。</div>
          ) : (
            <div className="list-stack webhook-delivery-list">
              {webhook.deliveries.map((delivery) => (
                <article key={delivery.id} className="list-card webhook-delivery-card">
                  <div className="list-card-head">
                    <div>
                      <h4 className="list-card-title">{delivery.eventType}</h4>
                      <p className="supporting-text">{delivery.id}</p>
                    </div>
                    <StatusPill status={delivery.status} />
                  </div>
                  <div className="meta-row">
                    <span>尝试 {delivery.attemptCount}</span>
                    <span>响应码 {delivery.responseStatus ?? "无"}</span>
                    <span>耗时 {delivery.durationMs ?? "待定"} ms</span>
                    <span>创建于 {formatDateTime(delivery.createdAt)}</span>
                    <span>下次 {formatDateTime(delivery.nextAttemptAt)}</span>
                  </div>
                  {delivery.sourceEventId ? (
                    <p className="soft-note">源事件：{delivery.sourceEventId}</p>
                  ) : null}
                  {delivery.lastError ? (
                    <p className="soft-note webhook-delivery-error">
                      最近错误：{delivery.lastError}
                    </p>
                  ) : null}
                  {delivery.status === "failed" ? (
                    <WebhookRetryForm
                      webhookId={webhook.id}
                      deliveryId={delivery.id}
                      returnPath={returnPath}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}
