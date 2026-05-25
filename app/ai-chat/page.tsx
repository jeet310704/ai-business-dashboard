import { requireUser } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import AiChatClient from "@/components/ai-chat/AiChatClient";

export default async function AiChatPage() {
  await requireUser();

  return (
    <DashboardShell title="AI Chat">
      <AiChatClient />
    </DashboardShell>
  );
}
