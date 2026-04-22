import { createProjectAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

export function CreateProjectForm() {
  return (
    <form action={createProjectAction} className="form-stack">
      <label className="field-label">
        项目名称
        <input className="field-control" name="name" placeholder="例如：新零售小程序二期" required />
      </label>
      <label className="field-label">
        客户名称
        <input className="field-control" name="customerName" placeholder="例如：星河商业" required />
      </label>
      <SubmitButton pendingLabel="正在创建项目..." className="action-button">
        创建项目并进入项目总览
      </SubmitButton>
    </form>
  );
}
