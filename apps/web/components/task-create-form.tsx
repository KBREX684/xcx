import { createTaskAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function TaskCreateForm({ projectId, returnPath }: { projectId: string; returnPath?: string }) {
  return (
    <form action={createTaskAction} className="form-stack">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="returnPath" value={returnPath ?? `/projects/${projectId}`} />
      <label className="field-label">
        任务标题
        <input className="field-control" name="title" placeholder="例如：补充回归说明" required />
      </label>
      <label className="field-label">
        任务描述
        <textarea
          className="field-control field-textarea"
          name="description"
          rows={4}
          placeholder="说明这次补充或修复的目标范围"
          required
        />
      </label>
      <SubmitButton pendingLabel="正在创建任务...">追加人工任务</SubmitButton>
    </form>
  );
}
