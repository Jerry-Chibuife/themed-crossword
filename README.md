# Themed Crossword

Generate and play crossword puzzles themed to any topic — books, films, industries, languages, or cultures.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Vercel AI SDK → NVIDIA NIM (`nvidia/nemotron-3-nano-30b-a3b` by default)
- In-repo crossword packer (backtracking)
- `localStorage` resume (no accounts)

## Setup

```bash
npm install
cp .env.example .env.local
# Add NVIDIA_API_KEY from https://build.nvidia.com
npm run dev
```

Without `NVIDIA_API_KEY`, `/api/generate` falls back to a Stormlight-themed fixture word bank so you can still exercise packing and play UX.

Optional:

```bash
# Optional override (default is nvidia/nemotron-3-nano-30b-a3b)
# NVIDIA_MODEL is inlined at Next.js build time — change it, then redeploy.
# deepseek-ai/deepseek-v4-flash is retired (HTTP 410 Gone) and will fail generation.
NVIDIA_MODEL=nvidia/nemotron-3-nano-30b-a3b
```

## Repo

https://github.com/Jerry-Chibuife/themed-crossword

## Deploy

Production: https://themed-crossword.vercel.app

Vercel is linked to this GitHub repo: pushes to `main` deploy production; other branches get previews.

Add env vars in the Vercel project settings (Production + Preview):

- `NVIDIA_API_KEY` — required for live LLM clue generation
- `NVIDIA_MODEL` — optional (`nvidia/nemotron-3-nano-30b-a3b` default). Leave unset unless you need a different NIM id. A retired id such as `deepseek-ai/deepseek-v4-flash` returns HTTP 410 and blocks clue generation even if the code default has moved on. Changing this on Vercel requires a **redeploy**.

Until `NVIDIA_API_KEY` is set, the deployed app uses the fixture clue bank.

## Scripts

- `npm run dev` — local server
- `npm run build` / `npm start` — production
- `npm test` — packer + normalize tests

## Flow

1. Enter a topic (+ optional notes)
2. `POST /api/clues` — NVIDIA NIM returns a clue batch
3. If under 24 unique clues, the UI may call `/api/clues` once more (one top-up), excluding answers already collected
4. `POST /api/pack` — packer places interlocking answers on a grid
5. Solve in the browser (check / reveal / resume)
