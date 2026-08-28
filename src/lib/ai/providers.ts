import type { AIProvider, AIChatResult, AIMessageInput } from "./types";
import { ProviderNotConfiguredError } from "./types";

// Fetch-based adapters — no SDK dependencies. Credentials in env.

abstract class FetchProvider implements AIProvider {
  abstract readonly key: string;

  protected abstract endpoint(): { url: string; headers: Record<string, string>; model: string };

  protected abstract bodyOf(messages: AIMessageInput[], options: { temperature?: number; maxTokens?: number }): Record<string, unknown>;

  protected abstract extract(data: Record<string, unknown>): string;

  async chat(messages: AIMessageInput[], options?: { temperature?: number; maxTokens?: number }): Promise<AIChatResult> {
    const cfg = this.endpoint();
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify(this.bodyOf(messages, options ?? {})),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(`${this.key} API error (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
    }
    return { content: this.extract(data), provider: this.key };
  }

  async complete(prompt: string, options?: { temperature?: number; json?: boolean }): Promise<string> {
    const result = await this.chat(
      [{ role: "user", content: prompt }],
      { temperature: options?.temperature ?? 0.3 },
    );
    return result.content;
  }
}

export class OpenAIProvider extends FetchProvider {
  readonly key = "openai";

  protected endpoint() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new ProviderNotConfiguredError("OpenAI", "Set OPENAI_API_KEY.");
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    };
  }

  protected bodyOf(messages: AIMessageInput[], options: { temperature?: number; maxTokens?: number }) {
    return {
      model: this.endpoint().model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens,
    };
  }

  protected extract(data: Record<string, unknown>): string {
    const choices = data.choices as { message?: { content?: string } }[] | undefined;
    return choices?.[0]?.message?.content ?? "";
  }
}

export class AnthropicProvider extends FetchProvider {
  readonly key = "anthropic";

  protected endpoint() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new ProviderNotConfiguredError("Anthropic", "Set ANTHROPIC_API_KEY.");
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
    };
  }

  protected bodyOf(messages: AIMessageInput[], options: { temperature?: number; maxTokens?: number }) {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const rest = messages.filter((m) => m.role !== "system");
    return {
      model: this.endpoint().model,
      system: system || undefined,
      messages: rest,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.4,
    };
  }

  protected extract(data: Record<string, unknown>): string {
    const content = data.content as { type?: string; text?: string }[] | undefined;
    return content?.map((c) => c.text ?? "").join("") ?? "";
  }
}

export class GatewayProvider extends FetchProvider {
  readonly key = "gateway";

  protected endpoint() {
    const url = process.env.AI_GATEWAY_URL;
    if (!url) throw new ProviderNotConfiguredError("AI Gateway", "Set AI_GATEWAY_URL.");
    return {
      url,
      headers: { "Content-Type": "application/json" },
      model: process.env.AI_GATEWAY_MODEL ?? "anthropic/claude-sonnet-5",
    };
  }

  protected bodyOf(messages: AIMessageInput[], options: { temperature?: number; maxTokens?: number }) {
    return {
      model: this.endpoint().model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens,
    };
  }

  protected extract(data: Record<string, unknown>): string {
    const choices = data.choices as { message?: { content?: string } }[] | undefined;
    return choices?.[0]?.message?.content ?? "";
  }
}
