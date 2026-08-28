import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { AiMatching } from "./ai-matching";
import { AiRecommendations } from "./ai-recommendations";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "AI Learning Tools",
  description: "AI teacher matching, personalized course recommendations and an AI study assistant.",
};

export default async function AiPage() {
  const user = await getCurrentUser();

  return (
    <div className="bg-brand-surface min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="brand" size="md" className="mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Powered by AI
          </Badge>
          <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Your personal AI learning guide
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-fg">
            Tell the AI what you want to learn — it matches you with the right teachers and courses, and
            answers your questions while you study.
          </p>
        </div>

        <div className="space-y-8">
          <AiMatching hasSession={Boolean(user)} />
          <AiRecommendations hasSession={Boolean(user)} />
        </div>

        <div className="mt-12 rounded-2xl border border-line bg-card p-6 text-center text-[13px] text-muted-fg">
          The study assistant lives inside every lesson — look for the{" "}
          <strong className="text-foreground">“Ask the AI tutor”</strong> button in the course player.
          {!user && " Sign in and open any enrolled course to try it."}
        </div>
      </div>
    </div>
  );
}
