import type { AIProvider, AIChatResult, AIMessageInput } from "./types";

// Deterministic development provider — no API calls, no keys, and no
// pretending: responses are template-based but genuinely useful. All
// AI surfaces work end-to-end in development with this provider.

const TOPIC_HINTS: Record<string, string> = {
  python: "start with variables and control flow, then practice with small scripts",
  react: "think in components and state — build tiny examples first",
  javascript: "focus on closures and async patterns",
  typescript: "types are documentation — let them guide you",
  "data science": "begin with data cleaning before any modeling",
  "machine learning": "understand the bias-variance tradeoff early",
  sql: "practice joins and aggregations on small datasets",
  design: "iterate with low-fidelity wireframes before polishing",
  figma: "master auto-layout and components for reusable design",
  english: "practice speaking aloud daily — fluency comes from repetition",
  ielts: "time yourself on every practice test",
  accounting: "learn the accounting equation first: assets = liabilities + equity",
  dsa: "draw the problem on paper before writing any code",
  algorithm: "analyze time complexity for every solution you write",
  cpp: "master pointers and STL containers",
  "c++": "master pointers and STL containers",
  git: "commit small and often",
  css: "master the box model and flexbox before grid",
  html: "semantic structure beats clever tricks",
  node: "understand the event loop",
  excel: "pivot tables solve 80% of analysis tasks",
};

function detectTopic(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [key, hint] of Object.entries(TOPIC_HINTS)) {
    if (lower.includes(key)) return hint;
  }
  return null;
}

export class DevAIProvider implements AIProvider {
  readonly key = "dev";

  async chat(messages: AIMessageInput[]): Promise<AIChatResult> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const system = messages.find((m) => m.role === "system")?.content ?? "";

    // Study-assistant style response (deterministic template).
    if (system.includes("tutor") || system.includes("assistant")) {
      const topicHint = detectTopic(lastUser);
      const question = lastUser.length > 120 ? `${lastUser.slice(0, 120)}…` : lastUser;
      const content = [
        `Great question! Let's break down “${question}” step by step:`,
        "",
        `**1. The core idea**`,
        `Start with the fundamental concept and make sure you can explain it in your own words.`,
        topicHint
          ? `**2. How to approach it**\nA practical path here: ${topicHint}.`
          : "**2. How to approach it**\nWork through one small example end-to-end before scaling up.",
        "**3. Common pitfall**",
        "Skipping the fundamentals — take a moment to revisit the previous lesson if this feels abstract.",
        "**4. Your turn**",
        "Try a tiny exercise on this topic, then ask me to check your reasoning.",
        "",
        "Want me to go deeper on any of these steps?",
      ].join("\n");
      return { content, provider: "dev" };
    }

    return {
      content: `Here's a helpful response to: “${lastUser.slice(0, 100)}”. Configure a production AI provider (AI_PROVIDER=openai|anthropic|gateway) for model-generated answers — see docs/ai.md.`,
      provider: "dev",
    };
  }

  async complete(prompt: string, options?: { json?: boolean }): Promise<string> {
    if (options?.json) {
      return JSON.stringify({ result: "dev" });
    }
    return prompt;
  }
}
