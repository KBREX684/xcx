import type { TeamSummary } from "@agent-control-plane/domain";
import { createProjectAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function CreateProjectForm({ teams }: { teams: TeamSummary[] }) {
  return (
    <form action={createProjectAction} className="form-stack" noValidate={false}>
      <label className="field-label">
        项目名称
        <span className="required-mark" aria-hidden="true">
          *
        </span>
        <input
          className="field-control"
          name="name"
          placeholder="例如：活动报名小程序"
          required
          minLength={2}
          maxLength={40}
        />
        <span className="field-error-hint">请填写 2-40 字的项目名称。</span>
      </label>
      <label className="field-label">
        所属团队
        <span className="required-mark" aria-hidden="true">
          *
        </span>
        <select className="field-control" name="teamId" required defaultValue="">
          <option value="">选择团队</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <span className="field-error-hint">事项必须通过项目进入一个团队边界。</span>
      </label>

      <label className="field-label">
        客户名称
        <span className="required-mark" aria-hidden="true">
          *
        </span>
        <input
          className="field-control"
          name="customerName"
          placeholder="例如：海岚会展"
          required
          minLength={2}
          maxLength={30}
        />
        <span className="field-error-hint">请填写 2-30 字的客户名称。</span>
      </label>
      <SubmitButton pendingLabel="正在创建项目..." className="action-button">
        创建项目并进入工作台
      </SubmitButton>
    </form>
  );
}
