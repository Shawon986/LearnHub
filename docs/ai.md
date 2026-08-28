# AI Architecture

All AI features go through `AIProvider` (`src/lib/ai/`) — one interface,
swappable providers, no SDK dependencies.

| Provider | Use | Credentials |
|---|---|---|
| `dev` (default) | Offline development — deterministic template responses and keyword matching. Everything works end-to-end with no keys, and is clearly labeled `provider: dev` in persisted conversations. | none |
| `openai` | GPT models via REST | `OPENAI_API_KEY`, optional `OPENAI_MODEL` |
| `anthropic` | Claude via REST | `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` |
| `gateway` | Vercel AI Gateway (`"provider/model"` strings) | `AI_GATEWAY_URL`, optional `AI_GATEWAY_MODEL` |

Set `AI_PROVIDER` to switch. `isDevAI()` lets features behave honestly in dev
(template generation, keyword matching) vs production (LLM calls).

## Features

1. **Study assistant** — floating tutor in the lesson viewer. Persisted in
   `AIConversation`/`AIMessage`, context-aware (course + lesson + article
   excerpt). With a production provider: full LLM tutoring.
2. **Teacher matching** — keyword skill extraction (offline) merged with
   LLM JSON extraction (production), scored against real teacher skills,
   headlines and ratings. Verified: "Python" → the ML/Python teacher.
3. **Course recommendations** — category affinity from enrollments +
   interest overlap + popularity, each with a human-readable reason.
4. **Teacher assistant** — description/outline/quiz generation in the course
   builder. Dev provider generates usable templates; production provider
   returns structured JSON via the prompts in `src/lib/ai/prompts.ts`.

## Safety notes

- AI conversations are user-scoped; assistant history is capped (8 messages).
- The dev provider never pretends to be a model — its responses are
  templates, and conversations record `provider: "dev"` for auditing.
- All AI content is teacher-reviewed before publishing (courses still go
  through the admin review flow).
