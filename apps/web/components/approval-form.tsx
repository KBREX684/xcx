"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { approveRunAction, rejectRunAction } from "../app/actions";

export function ApprovalForm({
  projectId,
  runId,
  returnPath,
}: {
  projectId: string;
  runId: string;
  returnPath?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function submit(action: typeof approveRunAction, formData: FormData) {
    startTransition(async () => {
      const result = await action(formData);
      if (result?.ok === false) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="form-stack">
      <form action={(formData) => submit(approveRunAction, formData)} className="form-stack">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="runId" value={runId} />
        <input type="hidden" name="returnPath" value={returnPath ?? `/projects/${projectId}`} />
        <input type="hidden" name="comment" value="审批通过，进入签发与交付阶段。" />
        <button type="submit" className="action-button" disabled={isPending}>
          {isPending ? "审批中..." : "通过并进入交付"}
        </button>
      </form>

      <form action={(formData) => submit(rejectRunAction, formData)} className="form-stack">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="runId" value={runId} />
        <input type="hidden" name="returnPath" value={returnPath ?? `/projects/${projectId}`} />
        <label className="field-label">
          驳回说明
          <textarea
            className="field-control field-textarea"
            name="comment"
            rows={4}
            defaultValue="需要补充回归说明后再提交。"
          />
        </label>
        <button type="submit" className="action-button ghost-button" disabled={isPending}>
          {isPending ? "提交中..." : "驳回并退回执行"}
        </button>
      </form>
    </div>
  );
}
