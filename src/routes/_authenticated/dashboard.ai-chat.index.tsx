import { createFileRoute } from "@tanstack/react-router";
import { AiChatLayout } from "@/components/AiChatLayout";
import { AiChatIndex } from "./dashboard.ai-chat";

export const Route = createFileRoute("/_authenticated/dashboard/ai-chat/")({
  component: Page,
});

function Page() {
  return (
    <AiChatLayout>
      <AiChatIndex />
    </AiChatLayout>
  );
}
