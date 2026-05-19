import { ChatPanel } from "@/components/assistant/chat-panel";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { chatMessages, promptSuggestions } from "@/lib/mock-data";

export default function AssistantPage() {
  return (
    <DashboardShell title="Assistant">
      <ChatPanel initialMessages={chatMessages} suggestions={promptSuggestions} />
    </DashboardShell>
  );
}
