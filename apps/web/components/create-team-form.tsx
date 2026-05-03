import { createTeamAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

type AgentOption = {
  id: string;
  name: string;
  roleName: string;
};

type CreateTeamFormProps = {
  agents: AgentOption[];
};

export function CreateTeamForm({ agents }: CreateTeamFormProps) {
  return (
    <form action={createTeamAction} className="form-stack create-team-form">
      <label className="field-label create-team-name">
        团队名称
        <input className="field-control" name="name" placeholder="例如：交付指挥组" required />
      </label>

      <label className="field-label create-team-description">
        团队说明
        <textarea
          className="field-textarea"
          name="description"
          rows={4}
          placeholder="说明这个团队负责的交付阶段、协作边界和默认 Agent 组合。"
        />
      </label>

      <fieldset className="field-group create-team-agents">
        <legend className="field-label">绑定 Agent</legend>
        <div className="checkbox-stack create-team-agent-grid">
          {agents.map((agent) => (
            <label key={agent.id} className="checkbox-row create-team-agent-option">
              <span>
                <strong>{agent.name}</strong>
                <span className="checkbox-note">{agent.roleName}</span>
              </span>
              <input type="checkbox" name="agentIds" value={agent.id} />
            </label>
          ))}
        </div>
      </fieldset>

      <SubmitButton pendingLabel="正在创建团队..." className="action-button create-team-submit">
        创建团队并进入详情
      </SubmitButton>
    </form>
  );
}
