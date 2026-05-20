import { requireUser } from "@/lib/auth";
import { ChatPanel } from "@/components/assistant/chat-panel";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { chatMessages, promptSuggestions } from "@/lib/mock-data";

export default async function AssistantPage() {
  await requireUser();

  return (
    <DashboardShell title="Assistant">
      <ChatPanel initialMessages={chatMessages} suggestions={promptSuggestions} />
    </DashboardShell>
  );
}
