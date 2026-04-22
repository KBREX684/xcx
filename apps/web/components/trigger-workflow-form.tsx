import { triggerWorkflowAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function TriggerWorkflowForm({
  projectId,
  returnPath,
  label = "触发简化交付流程"
}: {
  projectId: string;
  returnPath?: string;
  label?: string;
}) {
  return (
    <form action={triggerWorkflowAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="returnPath" value={returnPath ?? `/projects/${projectId}`} />
      <SubmitButton pendingLabel="正在触发..." className="action-button">
        {label}
      </SubmitButton>
    </form>
  );
}
