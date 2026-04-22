import { approveRunAction, rejectRunAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function ApprovalForm({ projectId, runId }: { projectId: string; runId: string }) {
  return (
    <div className="form-stack">
      <form action={approveRunAction} className="form-stack">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="runId" value={runId} />
        <input type="hidden" name="comment" value="审批通过，进入完成态。" />
        <SubmitButton pendingLabel="审批中...">批准当前 Run</SubmitButton>
      </form>

      <form action={rejectRunAction} className="form-stack">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="runId" value={runId} />
        <label className="field-label">
          驳回说明
          <textarea name="comment" rows={4} defaultValue="需要补充回归说明后再提交。" />
        </label>
        <SubmitButton pendingLabel="提交中..." className="action-button ghost-button">
          驳回并退回任务
        </SubmitButton>
      </form>
    </div>
  );
}

