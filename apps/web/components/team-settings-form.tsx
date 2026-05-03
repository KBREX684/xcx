import { updateTeamAction } from "../app/actions";
import { SubmitButton } from "./submit-button";

type AgentOption = {
  id: string;
  name: string;
  roleName: string;
};

type TeamSettingsFormProps = {
  teamId: string;
  name: string;
  description: string | null;
  agents: AgentOption[];
  selectedAgentIds: string[];
  triageEnabled?: boolean;
  issueStatuses?: string[];
  agentGuidance?: string | null;
  returnPath?: string;
};

export function TeamSettingsForm({
  teamId,
  name,
  description,
  agents,
  selectedAgentIds,
  triageEnabled = true,
  issueStatuses = [],
  agentGuidance = null,
  returnPath,
}: TeamSettingsFormProps) {
  const selected = new Set(selectedAgentIds);

  return (
    <form action={updateTeamAction} className="form-stack embedded-form">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="returnPath" value={returnPath ?? `/team/${teamId}`} />

      <label className="field-label">
        团队名称
        <input className="field-control" name="name" defaultValue={name} required />
      </label>

      <label className="field-label">
        团队说明
        <textarea
          className="field-control field-textarea"
          name="description"
          defaultValue={description ?? ""}
          rows={4}
        />
      </label>

      <input type="hidden" name="triageEnabled" value="false" />
      <label className="checkbox-row">
        <input type="checkbox" name="triageEnabled" value="true" defaultChecked={triageEnabled} />
        <span>启用事项分拣</span>
      </label>

      <label className="field-label">
        事项状态
        <input
          className="field-control"
          name="issueStatuses"
          defaultValue={issueStatuses.join(", ")}
        />
      </label>

      <label className="field-label">
        智能体指引
        <textarea
          className="field-control field-textarea"
          name="agentGuidance"
          defaultValue={agentGuidance ?? ""}
          rows={4}
        />
      </label>

      <fieldset className="field-group">
        <legend className="field-label">绑定智能体</legend>
        <div className="checkbox-stack">
          {agents.map((agent) => (
            <label key={agent.id} className="agent-checkbox-row">
              <span className="agent-checkbox-copy">
                <strong>{agent.name}</strong>
                <span className="checkbox-note">{agent.roleName}</span>
              </span>
              <input
                type="checkbox"
                name="agentIds"
                value={agent.id}
                defaultChecked={selected.has(agent.id)}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <SubmitButton pendingLabel="正在保存团队..." className="action-button">
        保存团队配置
      </SubmitButton>
    </form>
  );
}
