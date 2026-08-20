<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Single Next.js 16 (App Router) service. Standard commands live in `package.json` and `README.md`; run `npm run dev` (port 3000), `npm run build`, `npm test` (vitest), `npm run lint`.

Non-obvious notes:

- No secrets are required to run the app. Without `NVIDIA_API_KEY`, `/api/clues` and `/api/generate` fall back to a hard-coded Stormlight Archive fixture word bank (`src/lib/crossword/fixtures.ts`). The topic you type only sets the puzzle heading; the clues/answers stay Stormlight-themed until a real key is set in `.env.local`. This is expected, not a bug.
- `npm run lint` currently exits non-zero with 2 pre-existing `react-hooks/set-state-in-effect` errors in `src/components/CrosswordPlayer.tsx` plus 1 warning. These are unrelated to environment setup.
- Play state is persisted in browser `localStorage`, so reloading `/` resumes the last puzzle instead of showing the topic form; use the "New puzzle" button (or clear site data) to get back to the form.
