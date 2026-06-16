import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getMyAccountType } from "@/lib/profile.functions";
import { AssistantFeedbackEvaluation } from "@/components/evaluation/AssistantFeedbackEvaluation";
import { InvestorEvaluation } from "@/components/evaluation/InvestorEvaluation";

export const Route = createFileRoute("/_authenticated/dashboard/evaluation")({
  component: EvaluationPage,
});

function EvaluationPage() {
  const fn = useServerFn(getMyAccountType);
  const q = useQuery({ queryKey: ["my-account-type"], queryFn: () => fn() });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" dir="rtl">
      {q.isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : q.data?.account_type === "investor" ? (
        <InvestorEvaluation />
      ) : (
        <AssistantFeedbackEvaluation />
      )}
    </div>
  );
}
