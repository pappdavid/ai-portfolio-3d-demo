# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js 16 AI portfolio demo featuring a RAG chat assistant backed by Supabase pgvector, streaming via Vercel AI SDK v6, and dynamic Three.js 3D visualizations (globe, neural network, helix) triggered by LLM-generated JSON blocks.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (runs tsc + next build)
npm run lint         # ESLint (next lint)
npm test -- --run --passWithNoTests   # Vitest (no test files yet)
npm run seed         # Seed Supabase with 8 AI project embeddings (requires env vars)
```

Seed requires `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` in `.env.local`. OpenAI account must have billing credits.

## Environment Variables

```
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Vercel env vars are set via `vercel env`. GitHub secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `OPENAI_API_KEY`) power the CI/CD pipeline.

## Architecture

### Request Flow
1. User types in `ChatUI.tsx` → `sendMessage({ text })` via `DefaultChatTransport` → `POST /api/rag-chat`
2. Route embeds query with OpenAI `text-embedding-3-small` → calls `matchDocuments()` Supabase RPC → injects retrieved chunks into system prompt
3. Streams GPT-4o-mini response back using `streamText` + `toUIMessageStreamResponse()`
4. `ChatUI` parses assistant messages for ` ```json ` blocks → renders `ThreeScene` inline if found

### 3D Visualization Trigger
The LLM includes a JSON block in its response when visualization is requested:
```json
{"type":"globe","data":[{"label":"Project","value":95,"color":"#6366f1"}],"title":"My Projects"}
```
`parseSceneConfig()` in `ChatUI.tsx` extracts this block; `stripJsonBlock()` removes it from displayed text. Three scene types: `globe`, `neural`, `helix`.

### SSR Boundary
`page.tsx` (Server Component) → `ChatWrapper.tsx` (`'use client'` boundary) → `dynamic(() => import('./ChatUI'), { ssr: false })` → inside `ChatUI.tsx`: another `dynamic(() => import('./ThreeScene'), { ssr: false })`. Three.js requires double SSR exclusion.

## Critical: AI SDK v6 Patterns

This project uses **AI SDK v6** which has breaking API changes from v4/v5.

### Client (`useChat`)
```typescript
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'

const { messages, sendMessage, status, error } = useChat({
  transport: new DefaultChatTransport({ api: '/api/rag-chat' }),
})

// Messages use parts[], NOT content string
function getMessageText(parts: UIMessage['parts']): string {
  return parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

// Send a message
await sendMessage({ text: 'Hello' })  // NOT append({ role, content })
```

### Server (`streamText`)
```typescript
import { streamText, convertToModelMessages, isTextUIPart, type UIMessage } from 'ai'

const messages: UIMessage[] = body.messages ?? []

// Extract text from last user message
const lastUser = [...messages].reverse().find((m) => m.role === 'user')
const text = lastUser?.parts.filter(isTextUIPart).map((p) => p.text).join('') ?? ''

const result = streamText({
  model: openai('gpt-4o-mini'),
  system: systemPrompt,
  messages: await convertToModelMessages(messages),  // MUST await — it's async
})

return result.toUIMessageStreamResponse()  // NOT toTextStreamResponse()
```

**Common v6 pitfalls:**
- `useChat` no longer accepts `{ api: string }` — must use `transport`
- `UIMessage` has no `content` field — use `parts[]`
- `convertToModelMessages` is async — always `await` it
- Don't call `setState` inside `useEffect` watching chat state — ESLint `react-hooks/set-state-in-effect` will fail; use `chatError` directly from `useChat`

## Supabase / pgvector

Schema: `documents(id, content, metadata jsonb, embedding vector(1536))`
RPC: `match_documents(query_embedding, match_count)` — cosine similarity search

`src/lib/supabase.ts` exports `matchDocuments(embedding: number[], count: number)` which calls the RPC. Client uses `SUPABASE_URL` + `SUPABASE_ANON_KEY` (server-side; not `NEXT_PUBLIC_` prefixed for the route).

## ESLint Rules (React Compiler)

This project uses Next.js with the React Compiler ESLint plugin. Two rules that have bitten us:

- **`react-hooks/preserve-manual-memoization`**: Variables used inside `useMemo` must be either defined inside the callback or listed in deps. Don't define derived arrays outside `useMemo` and reference them inside.
- **`react-hooks/set-state-in-effect`**: Don't call `setState` in a `useEffect` body in response to other state/prop changes.

## CI/CD

`.github/workflows/deploy.yml`: lint → typecheck (`tsc --noEmit`) → test (`--passWithNoTests`) → Vercel deploy (production, `amondnet/vercel-action@v25`). Only deploys on `main` branch push. Requires `npm install --legacy-peer-deps` (set in `vercel.json`).
