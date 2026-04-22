import type { ProjectDetail } from "@agent-control-plane/domain";
import { updateProjectSettingsAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function ProjectSettingsForm({ project }: { project: ProjectDetail }) {
  return (
    <form action={updateProjectSettingsAction} className="form-stack">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="returnPath" value={`/projects/${project.id}/settings`} />

      <label className="field-label">
        项目名称
        <input className="field-control" name="name" defaultValue={project.name} required />
      </label>

      <label className="field-label">
        客户名称
        <input className="field-control" name="customerName" defaultValue={project.customerName} required />
      </label>

      <label className="field-label">
        目标交付日期
        <input
          className="field-control"
          type="date"
          name="targetDeliveryAt"
          defaultValue={project.targetDeliveryAt ? project.targetDeliveryAt.slice(0, 10) : ""}
        />
      </label>

      <label className="field-label">
        项目状态
        <select className="field-control" name="status" defaultValue={project.status}>
          <option value="draft">草稿</option>
          <option value="active">进行中</option>
          <option value="paused">暂停</option>
          <option value="delivered">已交付</option>
          <option value="archived">归档</option>
        </select>
      </label>

      <SubmitButton pendingLabel="正在保存..." className="action-button">
        保存项目设置
      </SubmitButton>
    </form>
  );
}
