import { triggerWorkflowAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function TriggerWorkflowForm({
  projectId,
  templateId,
  returnPath,
  label = "触发交付流程",
}: {
  projectId: string;
  templateId?: string;
  returnPath?: string;
  label?: string;
}) {
  return (
    <form action={triggerWorkflowAction}>
      <input type="hidden" name="projectId" value={projectId} />
      {templateId ? <input type="hidden" name="templateId" value={templateId} /> : null}
      <input type="hidden" name="returnPath" value={returnPath ?? `/projects/${projectId}`} />
      <SubmitButton pendingLabel="正在触发..." className="action-button">
        {label}
      </SubmitButton>
    </form>
  );
}
