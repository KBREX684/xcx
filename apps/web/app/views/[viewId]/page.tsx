import { notFound } from "next/navigation";
import type { IssueListQuery } from "@agent-control-plane/domain";
import { IssueWorkspace } from "../../../components/issue-workspace";
import { getAgents, getIssues, getProjects, getTeams } from "../../../lib/api";

type SavedViewPageProps = {
  params: Promise<{ viewId: string }>;
  searchParams?: Promise<{ layout?: string }>;
};

export default async function SavedViewPage({ params, searchParams }: SavedViewPageProps) {
  const { viewId } = await params;
  const resolved = (await searchParams) ?? {};
  const [result, projects, teams, agents] = await Promise.all([
    getIssues({ viewId }),
    getProjects(),
    getTeams(),
    getAgents(),
  ]);
  const view = result.views.find((item) => item.id === viewId);
  if (!view) {
    notFound();
  }
  const filters = view.filters as IssueListQuery & { layout?: string };
  const layout = resolved.layout === "board" || filters.layout === "board" ? "board" : "list";

  return (
    <IssueWorkspace
      title={view.name}
      eyebrow="保存视图"
      result={result}
      projects={projects}
      teams={teams}
      agents={agents.map((agent) => ({ ...agent, teamId: null, teamName: null }))}
      activeTab="all"
      filters={filters}
      layout={layout}
      viewId={view.id}
    />
  );
}
