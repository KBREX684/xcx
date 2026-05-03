import { IssueWorkspace } from "../../../../components/issue-workspace";
import { getAgents, getIssues, getProjects, getTeam, getTeams } from "../../../../lib/api";

type TeamActivePageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamActivePage({ params }: TeamActivePageProps) {
  const { teamId } = await params;
  const [team, result, projects, teams, agents] = await Promise.all([
    getTeam(teamId),
    getIssues({ teamId, statusGroup: "active" }),
    getProjects(),
    getTeams(),
    getAgents(),
  ]);

  return (
    <IssueWorkspace
      title={`${team.name} 进行中`}
      eyebrow="团队进行中"
      result={result}
      projects={projects.filter((project) => project.teamId === teamId)}
      teams={teams}
      agents={agents.map((agent) => ({ ...agent, teamId: null, teamName: null }))}
      activeTab="active"
      filters={{ teamId, statusGroup: "active" }}
    />
  );
}
