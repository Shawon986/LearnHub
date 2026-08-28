// AI provider abstraction — every AI feature talks to this interface.
// Providers: dev (deterministic, offline), openai, anthropic, gateway
// (Vercel AI Gateway). Configure via AI_PROVIDER.

export interface AIMessageInput {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIChatResult {
  content: string;
  /** Provider + model used (for auditing + UI display). */
  provider: string;
}

export interface AIProvider {
  readonly key: string;
  /** Multi-turn chat completion. */
  chat(messages: AIMessageInput[], options?: { temperature?: number; maxTokens?: number }): Promise<AIChatResult>;
  /** Single-shot completion, optionally expecting JSON. */
  complete(prompt: string, options?: { temperature?: number; json?: boolean }): Promise<string>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string, hint: string) {
    super(`${provider} is not configured. ${hint} See .env.example and docs/ai.md.`);
    this.name = "ProviderNotConfiguredError";
  }
}
