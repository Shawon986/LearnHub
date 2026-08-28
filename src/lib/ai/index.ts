import { env } from "@/lib/env";
import type { AIProvider } from "./types";
import { DevAIProvider } from "./dev";
import { AnthropicProvider, GatewayProvider, OpenAIProvider } from "./providers";

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;
  switch (env.AI_PROVIDER) {
    case "openai":
      cached = new OpenAIProvider();
      break;
    case "anthropic":
      cached = new AnthropicProvider();
      break;
    case "gateway":
      cached = new GatewayProvider();
      break;
    case "dev":
    default:
      cached = new DevAIProvider();
  }
  return cached;
}

export function isDevAI(): boolean {
  return getAIProvider().key === "dev";
}
