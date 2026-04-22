import type { IntegrationConfigView } from "@agent-control-plane/domain";
import { updateIntegrationConfigAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function IntegrationSettingsForm({ config }: { config: IntegrationConfigView }) {
  return (
    <form action={updateIntegrationConfigAction} className="form-stack">
      <input type="hidden" name="returnPath" value="/settings/integrations" />

      <label className="field-label">
        默认执行器
        <select className="field-control" name="defaultExecutorType" defaultValue={config.defaultExecutorType}>
          <option value="mock">本地模拟执行器</option>
          <option value="openapi">开放接口执行器</option>
        </select>
      </label>

      <label className="field-label">
        产物存储
        <select className="field-control" name="objectStorageProvider" defaultValue={config.objectStorageProvider}>
          <option value="local-file">本地文件存储</option>
          <option value="s3-compatible">S3 兼容对象存储</option>
        </select>
      </label>

      <label className="field-label">
        通知通道
        <select className="field-control" name="notificationChannel" defaultValue={config.notificationChannel}>
          <option value="none">暂不通知</option>
          <option value="wechat">微信通知</option>
          <option value="feishu">飞书通知</option>
          <option value="wecom">企微通知</option>
        </select>
      </label>

      <label className="field-label">
        审批模式
        <select className="field-control" name="approvalMode" defaultValue={config.approvalMode}>
          <option value="manual">人工审批</option>
          <option value="assisted">辅助审批</option>
        </select>
      </label>

      <label className="field-label">
        执行代理接入地址
        <input className="field-control" name="agentEndpoint" defaultValue={config.agentEndpoint ?? ""} />
      </label>

      <label className="field-label">
        回调基础地址
        <input className="field-control" name="callbackBaseUrl" defaultValue={config.callbackBaseUrl ?? ""} />
      </label>

      <SubmitButton pendingLabel="正在保存..." className="action-button">
        保存接入配置
      </SubmitButton>
    </form>
  );
}
