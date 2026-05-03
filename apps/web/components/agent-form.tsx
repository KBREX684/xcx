import type { AgentDetail, AgentSummary, TeamSummary } from "@agent-control-plane/domain";
import { createAgentAction, updateAgentAction } from "../app/actions";

export function AgentForm({
  agent,
  teams,
}: {
  agent?: AgentDetail | AgentSummary;
  teams: TeamSummary[];
}) {
  const isEdit = Boolean(agent);
  const detail = agent as AgentDetail | undefined;

  return (
    <form action={isEdit ? updateAgentAction : createAgentAction} className="agent-form-grid">
      {agent ? <input type="hidden" name="agentId" value={agent.id} /> : null}
      <label className="field-group">
        <span className="field-label">名称</span>
        <input name="name" className="field-control" defaultValue={agent?.name ?? ""} required />
      </label>
      <label className="field-group">
        <span className="field-label">角色</span>
        <input
          name="roleName"
          className="field-control"
          defaultValue={agent?.roleName ?? ""}
          required
        />
      </label>
      <label className="field-group">
        <span className="field-label">说明</span>
        <textarea
          name="description"
          className="field-control field-control-textarea"
          rows={3}
          defaultValue={agent?.description ?? ""}
          required
        />
      </label>
      <label className="field-group">
        <span className="field-label">传输方式</span>
        <select
          name="transport"
          className="field-control"
          defaultValue={agent?.transport ?? "openapi"}
        >
          <option value="openapi">OpenAPI</option>
          <option value="mcp-relay">MCP Relay</option>
          <option value="mock">本地模拟</option>
        </select>
      </label>
      {isEdit ? (
        <label className="field-group">
          <span className="field-label">状态</span>
          <select name="status" className="field-control" defaultValue={agent?.status ?? "active"}>
            <option value="active">可用</option>
            <option value="inactive">停用</option>
            <option value="maintenance">维护中</option>
            <option value="error">异常</option>
          </select>
        </label>
      ) : null}
      <label className="field-group">
        <span className="field-label">能力</span>
        <input
          name="capabilities"
          className="field-control"
          defaultValue={agent?.capabilities.join(", ") ?? "delivery-intake"}
        />
      </label>
      <label className="field-group">
        <span className="field-label">标签</span>
        <input name="tags" className="field-control" defaultValue={detail?.tags.join(", ") ?? ""} />
      </label>
      {isEdit ? (
        <fieldset className="field-group">
          <legend className="field-label">团队访问</legend>
          {teams.map((team) => (
            <label key={team.id} className="checkbox-row">
              <input
                type="checkbox"
                name="teamIds"
                value={team.id}
                defaultChecked={detail?.boundTeams.some((bound) => bound.id === team.id)}
              />
              <span>{team.name}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      <button type="submit" className="action-button">
        {isEdit ? "更新智能体" : "创建智能体"}
      </button>
    </form>
  );
}
