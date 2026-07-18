# Themed Crossword

Generate and play crossword puzzles themed to any topic — books, films, industries, languages, or cultures.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Vercel AI SDK → NVIDIA NIM (`minimaxai/minimax-m3` by default)
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
# Optional override (default is minimaxai/minimax-m3)
NVIDIA_MODEL=deepseek-ai/deepseek-v4-flash
```

## Repo

https://github.com/Jerry-Chibuife/themed-crossword

## Deploy

Production: https://themed-crossword.vercel.app

Vercel is linked to this GitHub repo: pushes to `main` deploy production; other branches get previews.

Add env vars in the Vercel project settings (Production + Preview):

- `NVIDIA_API_KEY` — required for live LLM clue generation
- `NVIDIA_MODEL` — optional (`minimaxai/minimax-m3` default; e.g. `deepseek-ai/deepseek-v4-flash`)

Until `NVIDIA_API_KEY` is set, the deployed app uses the fixture clue bank.

## Scripts

- `npm run dev` — local server
- `npm run build` / `npm start` — production
- `npm test` — packer + normalize tests

## Flow

1. Enter a topic (+ optional notes)
2. `POST /api/clues` — MiniMax streams a clue batch (partial OK on timeout)
3. If under 15 unique clues, the UI calls `/api/clues` again (up to 2 top-ups), excluding answers already collected — each call gets its own time budget
4. `POST /api/pack` — packer places interlocking answers on a grid
5. Solve in the browser (check / reveal / resume)
