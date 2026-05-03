import { IssueWorkspace } from "../../components/issue-workspace";
import { getAgents, getIssues, getProjects, getTeams } from "../../lib/api";
import type { IssueListQuery } from "@agent-control-plane/domain";

type IssuesPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

function parseIssueFilters(params: Record<string, string | undefined> = {}): IssueListQuery {
  return {
    statusGroup: (params.statusGroup ?? "all") as IssueListQuery["statusGroup"],
    status: params.status as IssueListQuery["status"],
    priority: params.priority as IssueListQuery["priority"],
    teamId: params.teamId,
    projectId: params.projectId,
    cycleId: params.cycleId,
    delegateAgentId: params.delegateAgentId,
    q: params.q,
  };
}

export default async function IssuesPage({ searchParams }: IssuesPageProps) {
  const resolved = (await searchParams) ?? {};
  const filters = parseIssueFilters(resolved);
  const layout = resolved.layout === "board" ? "board" : "list";
  const [result, projects, teams, agents] = await Promise.all([
    getIssues(filters),
    getProjects(),
    getTeams(),
    getAgents(),
  ]);

  return (
    <IssueWorkspace
      title="事项"
      eyebrow="工作台"
      result={result}
      projects={projects}
      teams={teams}
      agents={agents.map((agent) => ({ ...agent, teamId: null, teamName: null }))}
      activeTab="all"
      filters={filters}
      layout={layout}
    />
  );
}
