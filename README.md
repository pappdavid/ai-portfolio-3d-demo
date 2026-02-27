# AI Portfolio 3D Demo

An interactive AI portfolio demo that combines **RAG chat**, **Thesys C1 generative UI**, and **Three.js 3D visualizations** — built with Next.js 15, Supabase pgvector, and the Vercel AI SDK.

> **Try asking:** _"Visualize my projects in 3D"_ or _"Show 3D accuracies globe"_

## Live Demo

🚀 [ai-portfolio-3d-demo.vercel.app](https://ai-portfolio-3d-demo.vercel.app)

## What It Does

1. **Chat** — Ask about AI/ML projects in natural language
2. **RAG** — Retrieves relevant project context from Supabase pgvector
3. **3D Viz** — AI generates structured JSON → Three.js renders Globe / Neural Net / Helix scenes
4. **Streaming** — Sub-second response streaming via Vercel AI SDK

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| AI Streaming | Vercel AI SDK + `gpt-4o-mini` |
| Generative UI | Thesys C1 (`@thesysai/genui-sdk`) |
| Vector DB | Supabase pgvector |
| 3D | Three.js + @react-three/fiber + drei |
| Controls | Leva panel + OrbitControls |
| Animations | Framer Motion |
| Deploy | Vercel + GitHub Actions |

## Quick Start

```bash
git clone https://github.com/pappdavid/ai-portfolio-3d-demo
cd ai-portfolio-3d-demo
npm install --legacy-peer-deps
cp .env.example .env.local
# Fill in your API keys
npm run dev
```

## Environment Variables

```env
OPENAI_API_KEY=sk-...
THESYS_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

## Seed Data

After setting up Supabase (run the migration in `supabase/migrations/0001_init.sql`):

```bash
tsx src/lib/seed.ts
```

This loads 8 AI project chunks: Iris 95%, Sentiment 92%, Object Detection 94%, Transformer 93%, NLP Pipeline 91%, Recommender 89%, Time Series 88%, GAN 87%.

## 3D Scenes

The AI generates JSON that triggers three scene types:

```json
{"type":"globe","data":[{"label":"Iris","value":95,"color":"#6366f1"}],"title":"My Projects"}
```

- **Globe** — Metrics as lat/long points on a spinning wireframe globe
- **Neural** — Projects as nodes in a neural network graph
- **Helix** — Projects along a 3D helix timeline

All scenes support **OrbitControls** (drag to rotate) and a **Leva panel** (top-right) for runtime controls.

## CI/CD

GitHub Actions runs on every push:
1. Lint → TypeScript check → Vitest tests
2. Deploy to Vercel production (on `main` branch)
3. PR auto-review with GitHub Copilot

## Performance

- < 1s first token stream
- Mobile orbit controls
- Free tier: Supabase 500MB, Vercel Hobby, Thesys 5M tokens/mo
