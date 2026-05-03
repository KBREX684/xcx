import { cookies } from "next/headers";
import { AppShell } from "../../components/app-shell";
import { MessagesDashboard } from "../../components/messages-dashboard";
import { getDashboardSummary, getInbox } from "../../lib/api";

const INBOX_LAST_SEEN_COOKIE = "acp_inbox_last_seen";

export default async function MessagesPage() {
  const cookieStore = await cookies();
  const lastSeenAt = cookieStore.get(INBOX_LAST_SEEN_COOKIE)?.value ?? null;
  const [dashboard, inbox, archivedInbox] = await Promise.all([
    getDashboardSummary(),
    getInbox({ lastSeenAt, archived: false }),
    getInbox({ lastSeenAt, archived: true }),
  ]);

  return (
    <AppShell
      activeNav="messages"
      navBadges={{ messages: dashboard.pendingApprovalCount }}
      title="收件箱"
    >
      <MessagesDashboard items={inbox} archivedItems={archivedInbox} lastSeenAt={lastSeenAt} />
    </AppShell>
  );
}
