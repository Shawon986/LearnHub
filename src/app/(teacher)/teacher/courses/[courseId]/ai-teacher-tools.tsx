"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { generateCourseContent } from "@/lib/actions/ai";
import { safeJsonParse } from "@/lib/utils";

type Kind = "description" | "outline" | "quiz";

export function AiTeacherTools({ courseTitle }: { courseTitle: string }) {
  const [tab, setTab] = useState<Kind>("description");
  const [topic, setTopic] = useState(courseTitle);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  function generate(kind: Kind) {
    setResult(null);
    startTransition(async () => {
      const r = await generateCourseContent(kind, topic);
      if (r.ok) setResult(r.content);
      else toast({ title: r.error ?? "Generation failed.", variant: "error" });
    });
  }

  function copy() {
    navigator.clipboard?.writeText(renderText(result));
    toast({ title: "Copied to clipboard", variant: "success" });
  }

  /** Render JSON results as human-readable text for copying. */
  function renderText(raw: string | null): string {
    if (!raw) return "";
    const data = safeJsonParse<Record<string, unknown>>(raw, {});
    if (tab === "description") {
      const d = data as { subtitle?: string; description?: string; outcomes?: string[] };
      return [d.subtitle, "", d.description, "", ...(d.outcomes?.map((o) => `• ${o}`) ?? [])].join("\n");
    }
    if (tab === "outline") {
      const d = data as { modules?: { title: string; lessons: string[] }[] };
      return (d.modules ?? []).map((m) => `## ${m.title}\n${m.lessons.map((l) => `- ${l}`).join("\n")}`).join("\n\n");
    }
    const d = data as { questions?: { text: string; options: string[]; correctIndex: number }[] };
    return (d.questions ?? [])
      .map((q, i) => `${i + 1}. ${q.text}\n   ${q.options.map((o, oi) => `${String.fromCharCode(65 + oi)}) ${o}`).join("\n   ")}\n   Answer: ${String.fromCharCode(65 + q.correctIndex)}`)
      .join("\n\n");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-fg" /> AI Teacher Assistant
        </CardTitle>
        <CardDescription>
          Generate course content from a topic — works offline with the dev provider, or with your AI
          provider when configured.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Python for Absolute Beginners" />
          <Button size="lg" loading={pending} leftIcon={<Sparkles className="h-4 w-4" />} onClick={() => generate(tab)}>
            Generate
          </Button>
        </div>

        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v as Kind);
            setResult(null);
          }}
          variant="segmented"
          tabs={[
            { value: "description", label: "Description" },
            { value: "outline", label: "Outline" },
            { value: "quiz", label: "Quiz questions" },
          ]}
        />

        {pending && (
          <div className="flex items-center gap-2 py-4 text-[12px] text-faint-fg">
            <Loader2 className="h-4 w-4 animate-spin" /> Generating…
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-card-2 p-4 font-sans text-[13px] leading-relaxed text-foreground">
              {renderText(result)}
            </pre>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={copy}>
                Copy
              </Button>
              {tab === "quiz" && (
                <p className="text-[11px] font-semibold text-faint-fg">
                  Paste these into the quiz editor — the format matches the question form.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
