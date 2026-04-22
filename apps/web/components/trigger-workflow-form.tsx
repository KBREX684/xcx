import { triggerWorkflowAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function TriggerWorkflowForm({ projectId }: { projectId: string }) {
  return (
    <form action={triggerWorkflowAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton pendingLabel="正在触发..." className="action-button">
        触发简化交付流程
      </SubmitButton>
    </form>
  );
}

