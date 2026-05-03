import { IssueWorkspace } from "../../../../components/issue-workspace";
import { getAgents, getIssues, getProjects, getTeam, getTeams } from "../../../../lib/api";

type TeamTriagePageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamTriagePage({ params }: TeamTriagePageProps) {
  const { teamId } = await params;
  const [team, result, projects, teams, agents] = await Promise.all([
    getTeam(teamId),
    getIssues({ teamId, statusGroup: "triage" }),
    getProjects(),
    getTeams(),
    getAgents(),
  ]);

  return (
    <IssueWorkspace
      title={`${team.name} 分拣`}
      eyebrow="团队分拣"
      result={result}
      projects={projects.filter((project) => project.teamId === teamId)}
      teams={teams}
      agents={agents.map((agent) => ({ ...agent, teamId: null, teamName: null }))}
      activeTab="triage"
      filters={{ teamId, statusGroup: "triage" }}
    />
  );
}
