import type { ProjectDetail, TeamSummary } from "@agent-control-plane/domain";
import { updateProjectSettingsAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function ProjectSettingsForm({
  project,
  teams,
}: {
  project: ProjectDetail;
  teams: TeamSummary[];
}) {
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
        <input
          className="field-control"
          name="customerName"
          defaultValue={project.customerName}
          required
        />
      </label>

      <label className="field-label">
        所属团队
        <select
          className="field-control"
          name="teamId"
          defaultValue={project.teamId ?? ""}
          required
        >
          <option value="">选择团队</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field-label">
        项目描述
        <textarea
          className="field-control field-textarea"
          name="description"
          defaultValue={project.description ?? ""}
          rows={3}
        />
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
          <option value="paused">已暂停</option>
          <option value="delivered">已交付</option>
          <option value="archived">已归档</option>
        </select>
      </label>

      <div className="grid-two">
        <label className="field-label">
          健康状态
          <select className="field-control" name="health" defaultValue={project.health}>
            <option value="on_track">正常</option>
            <option value="at_risk">有风险</option>
            <option value="blocked">受阻</option>
          </select>
        </label>
        <label className="field-label">
          优先级
          <select className="field-control" name="priority" defaultValue={project.priority}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
            <option value="urgent">紧急</option>
          </select>
        </label>
      </div>

      <SubmitButton pendingLabel="正在保存..." className="action-button">
        保存项目设置
      </SubmitButton>
    </form>
  );
}
