import { IssueWorkspace } from "../../../../components/issue-workspace";
import { getAgents, getIssues, getProjects, getTeam, getTeams } from "../../../../lib/api";

type TeamIssuesPageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamIssuesPage({ params }: TeamIssuesPageProps) {
  const { teamId } = await params;
  const [team, result, projects, teams, agents] = await Promise.all([
    getTeam(teamId),
    getIssues({ teamId, statusGroup: "all" }),
    getProjects(),
    getTeams(),
    getAgents(),
  ]);

  return (
    <IssueWorkspace
      title={`${team.name} 事项`}
      eyebrow="团队工作"
      result={result}
      projects={projects.filter((project) => project.teamId === teamId)}
      teams={teams}
      agents={agents.map((agent) => ({ ...agent, teamId: null, teamName: null }))}
      activeTab="all"
      filters={{ teamId, statusGroup: "all" }}
    />
  );
}
