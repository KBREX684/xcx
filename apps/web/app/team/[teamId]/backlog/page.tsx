import { IssueWorkspace } from "../../../../components/issue-workspace";
import { getAgents, getIssues, getProjects, getTeam, getTeams } from "../../../../lib/api";

type TeamBacklogPageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamBacklogPage({ params }: TeamBacklogPageProps) {
  const { teamId } = await params;
  const [team, result, projects, teams, agents] = await Promise.all([
    getTeam(teamId),
    getIssues({ teamId, statusGroup: "backlog" }),
    getProjects(),
    getTeams(),
    getAgents(),
  ]);

  return (
    <IssueWorkspace
      title={`${team.name} 待排期`}
      eyebrow="团队待排期"
      result={result}
      projects={projects.filter((project) => project.teamId === teamId)}
      teams={teams}
      agents={agents.map((agent) => ({ ...agent, teamId: null, teamName: null }))}
      activeTab="backlog"
      filters={{ teamId, statusGroup: "backlog" }}
    />
  );
}
