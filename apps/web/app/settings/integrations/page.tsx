import { AppShell } from "../../../components/app-shell";
import { IntegrationSettingsForm } from "../../../components/integration-settings-form";
import { WebhookSettingsPanel } from "../../../components/webhook-settings-panel";
import { getIntegrationConfig, getWebhooks } from "../../../lib/api";
import {
  formatDateTime,
  getApprovalModeLabel,
  getExecutorTypeLabel,
  getHealthStatusLabel,
  getNotificationChannelLabel,
  getStorageProviderLabel,
} from "../../../lib/format";

export default async function IntegrationSettingsPage() {
  const [config, webhooks] = await Promise.all([getIntegrationConfig(), getWebhooks()]);

  return (
    <AppShell activeNav="settings" title="接入配置">
      <section className="content-grid settings-integrations-layout">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3 className="panel-title">工作区接入基线</h3>
              </div>
            </div>
            <div className="meta-column">
              <span>默认执行器：{getExecutorTypeLabel(config.defaultExecutorType)}</span>
              <span>产物存储：{getStorageProviderLabel(config.objectStorageProvider)}</span>
              <span>通知通道：{getNotificationChannelLabel(config.notificationChannel)}</span>
              <span>审批模式：{getApprovalModeLabel(config.approvalMode)}</span>
              <span>OpenAPI 健康：{getHealthStatusLabel(config.openapiHealthStatus)}</span>
              <span>MCP Relay 健康：{getHealthStatusLabel(config.mcpRelayHealthStatus)}</span>
              <span>最近更新：{formatDateTime(config.updatedAt)}</span>
            </div>
          </section>
        </div>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">配置表单</p>
                <h3 className="panel-title">更新接入设置</h3>
              </div>
            </div>
            <IntegrationSettingsForm config={config} />
          </section>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow-text">外发 Webhook</p>
            <h3 className="panel-title">事件出站与验签</h3>
          </div>
        </div>
        <WebhookSettingsPanel webhooks={webhooks} />
      </section>
    </AppShell>
  );
}
