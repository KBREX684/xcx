import { AppShell } from "../../../components/app-shell";
import { IntegrationSettingsForm } from "../../../components/integration-settings-form";
import { getIntegrationConfig } from "../../../lib/api";
import {
  formatDateTime,
  getApprovalModeLabel,
  getExecutorTypeLabel,
  getNotificationChannelLabel,
  getStorageProviderLabel
} from "../../../lib/format";

export default async function IntegrationSettingsPage() {
  const config = await getIntegrationConfig();

  return (
    <AppShell
      activeNav="settings"
      title="接入配置"
      description="维护执行器、通知通道、对象存储和回调地址，为 P2 后续真实接入留出边界。"
      breadcrumbs={[
        { label: "接入配置" }
      ]}
    >
      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">当前策略</p>
                <h3 className="panel-title">工作区接入基线</h3>
              </div>
            </div>
            <div className="meta-column">
              <span>默认执行器：{getExecutorTypeLabel(config.defaultExecutorType)}</span>
              <span>产物存储：{getStorageProviderLabel(config.objectStorageProvider)}</span>
              <span>通知通道：{getNotificationChannelLabel(config.notificationChannel)}</span>
              <span>审批模式：{getApprovalModeLabel(config.approvalMode)}</span>
              <span>最近更新：{formatDateTime(config.updatedAt)}</span>
            </div>
            <div className="soft-note">
              P2 先维护工作区级配置，真正的密钥托管、权限审批和多环境隔离会放在后续阶段继续深化。
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
    </AppShell>
  );
}
