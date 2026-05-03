import Link from "next/link";
import type { TaskBoardItem, TaskDetail, TaskRelationType } from "@agent-control-plane/domain";
import { createTaskRelationAction, deleteTaskRelationAction } from "../app/actions";
import { formatDateTime } from "../lib/format";
import { SubmitButton } from "./submit-button";

const RELATION_LABELS: Record<TaskRelationType, string> = {
  blocks: "阻塞",
  relates: "关联",
  duplicates: "重复",
};

export function TaskRelationsPanel({
  projectId,
  task,
  taskOptions,
  returnPath,
}: {
  projectId: string;
  task: TaskDetail;
  taskOptions: TaskBoardItem[];
  returnPath: string;
}) {
  const options = taskOptions.filter((item) => item.id !== task.id);

  return (
    <section className="panel task-relations-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow-text">任务关系</p>
          <h3 className="panel-title">阻塞、关联、重复</h3>
        </div>
        <span className="status-pill">{task.relations.length}</span>
      </div>

      <div className="task-relations-panel__body">
          {task.relations.length === 0 ? (
            <div className="empty-state">当前还没有任务关系。</div>
          ) : (
            <div className="list-stack">
              {task.relations.map((relation) => {
                const counterpartId =
                  relation.direction === "outgoing" ? relation.targetTaskId : relation.sourceTaskId;
                const counterpartTitle =
                  relation.direction === "outgoing"
                    ? relation.targetTaskTitle
                    : relation.sourceTaskTitle;
                return (
                  <article key={relation.id} className="list-card">
                    <div className="list-card-head">
                      <div>
                        <h4 className="list-card-title">
                          {relation.direction === "incoming" ? "被动" : "主动"}
                          {RELATION_LABELS[relation.relationType]}
                        </h4>
                        <p className="supporting-text">
                          <Link
                            href={`/projects/${projectId}/tasks/${counterpartId}`}
                            className="inline-link"
                          >
                            {counterpartTitle}
                          </Link>
                        </p>
                      </div>
                      <span className="status-pill">
                        {relation.direction === "incoming" ? "传入" : "传出"}
                      </span>
                    </div>
                    <div className="meta-row">
                      <span>{formatDateTime(relation.createdAt)}</span>
                    </div>
                    <form action={deleteTaskRelationAction} className="link-row">
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="relationId" value={relation.id} />
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <SubmitButton pendingLabel="正在移除..." className="ghost-button">
                        移除关系
                      </SubmitButton>
                    </form>
                  </article>
                );
              })}
            </div>
          )}

          {options.length > 0 ? (
            <form action={createTaskRelationAction} className="workspace-inline-form">
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <label className="field-label">
                关系类型
                <select className="field-control" name="relationType" defaultValue="blocks">
                  <option value="blocks">阻塞</option>
                  <option value="relates">关联</option>
                  <option value="duplicates">重复</option>
                </select>
              </label>
              <label className="field-label">
                目标任务
                <select className="field-control" name="targetTaskId" required>
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {"  ".repeat(option.depth)}
                      {option.title}
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton
                pendingLabel="正在添加关系..."
                className="action-button secondary-action"
              >
                添加关系
              </SubmitButton>
            </form>
          ) : (
            <div className="soft-note">至少再创建一个任务后，才能添加任务关系。</div>
          )}
      </div>
    </section>
  );
}
