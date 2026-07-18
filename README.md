# Themed Crossword

Generate and play crossword puzzles themed to any topic — books, films, industries, languages, or cultures.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Vercel AI SDK → NVIDIA NIM (`deepseek-ai/deepseek-v4-flash` by default)
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
NVIDIA_MODEL=minimaxai/minimax-m3
```

## Repo

https://github.com/Jerry-Chibuife/themed-crossword

## Deploy

Production: https://themed-crossword.vercel.app

Vercel is linked to this GitHub repo: pushes to `main` deploy production; other branches get previews.

Add env vars in the Vercel project settings (Production + Preview):

- `NVIDIA_API_KEY` — required for live LLM clue generation
- `NVIDIA_MODEL` — optional (`deepseek-ai/deepseek-v4-flash` default, or `minimaxai/minimax-m3`)

Until `NVIDIA_API_KEY` is set, the deployed app uses the fixture clue bank.

## Scripts

- `npm run dev` — local server
- `npm run build` / `npm start` — production
- `npm test` — packer + normalize tests

## Flow

1. Enter a topic (+ optional notes)
2. LLM builds a clue bank via NVIDIA
3. Packer places interlocking answers on a grid
4. Solve in the browser (check / reveal / resume)
