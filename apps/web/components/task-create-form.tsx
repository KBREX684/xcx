import type { TaskBoardItem } from "@agent-control-plane/domain";
import { createTaskAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function TaskCreateForm({
  projectId,
  returnPath,
  parentOptions = [],
}: {
  projectId: string;
  returnPath?: string;
  parentOptions?: TaskBoardItem[];
}) {
  return (
    <form action={createTaskAction} className="form-stack">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="returnPath" value={returnPath ?? `/projects/${projectId}`} />
      <label className="field-label">
        任务标题
        <span className="required-mark" aria-hidden="true">
          *
        </span>
        <input
          className="field-control"
          name="title"
          placeholder="例如：补充验收说明"
          required
          minLength={2}
          maxLength={120}
        />
        <span className="field-error-hint">请填写 2-120 字的任务标题。</span>
      </label>
      <label className="field-label">
        任务描述
        <span className="required-mark" aria-hidden="true">
          *
        </span>
        <textarea
          className="field-control field-textarea"
          name="description"
          rows={4}
          placeholder="说明本次补充、修复或跟进的具体目标。"
          required
          minLength={4}
        />
        <span className="field-error-hint">请至少填写 4 个字的描述。</span>
      </label>
      <label className="field-label">
        父任务
        <select className="field-control" name="parentId" defaultValue="">
          <option value="">无父任务</option>
          {parentOptions
            .filter((task) => task.depth < 2)
            .map((task) => (
              <option key={task.id} value={task.id}>
                {"  ".repeat(task.depth)}
                {task.title}
              </option>
            ))}
        </select>
      </label>
      <SubmitButton pendingLabel="正在创建任务...">追加人工任务</SubmitButton>
    </form>
  );
}
