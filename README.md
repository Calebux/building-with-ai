# Building With AI — one app, the whole course

A single self-hosted web app that teaches beginners how AI agents actually work,
then lets them **build real apps by chatting with an AI** — with a live preview,
a file tree, and one-click export into a real IDE.

```
ai-course/
├── index.html            The app shell (sidebar, lesson view, Builder view)
├── styles.css            All styling
├── lessons.js            The curriculum — explainers, code samples, exercises
├── lessons-data.js       Generated catalog of reused code samples / exercise cards
├── app.js                App logic: lessons, playground, Builder (chat/preview/files)
├── server.js             Zero-dependency Node server: static files + LLM proxy
├── workshop.html         Redirect stub (the old console URL)
├── course-legacy.html    The original 3-session reading site (kept for reference)
├── INSTRUCTOR-NOTES.md   Private. Timings, talking points, answer keys.
└── labs/                 Optional Python labs for going deeper (loop, RAG, memory, evals)
```

## The learning track

Sidebar order **is** the curriculum:

1. **The Loop** — what a model is, and the ~10-line loop behind every agent
2. **Tools** — how a model gets abilities; descriptions are prompt engineering
3. **Workflows** — recipes vs cooks; chaining and routing; when you *don't* need an agent
4. **Agents** — the 40-line agent, plus context: the window is the model's whole world
5. **Evals** — how you know it works; the score-drop moment; guardrails
6. **The Builder** — chat → real files → live preview → download .zip / open in StackBlitz

Memory, RAG, and structured output are deliberately deferred to **What's Next**.

Every lesson has three layers: **Learn** (plain language), **Code** (annotated,
▶ Run gets an AI walkthrough), **Playground** (guided Goal→Rules→Context→Checks
exercises against a live model). Each lesson ends with a "Try it in the Builder"
mission that pre-loads a build prompt.

## The Builder

Claude-style three-pane surface: chat on the left, Preview / Code / Files tabs on
the right. The model writes files via a `write_file` tool that is **virtual** —
files stream to the browser over SSE and live in `localStorage`, never on the
server's disk. The server stays stateless, so one hosted instance serves a whole
classroom.

Exit ramps: per-file download, **.zip of the whole project** (zero-dependency zip
writer), **Open in IDE** (StackBlitz POST API — full in-browser IDE with the
files pre-loaded, no account needed), and **⬆ Push to GitHub** (creates the repo
if needed and commits changed files; the user's PAT stays in their browser's
localStorage and is sent only to api.github.com).

The Builder handles two project types: self-contained web apps (live preview)
and **Node scripts/bots** (agents, Telegram bots — zero-dep, secrets via env
vars, README included; preview shows a hand-off card instead).

## Run it

```bash
cd ai-course
node server.js            # http://127.0.0.1:8000 — no npm install needed
```

Without a key it runs in **mock mode**: everything works, responses are canned
(the Builder returns a demo project). With a key, real models — the browser
never sees the key:

```bash
export OPENROUTER_API_KEY=sk-or-...
export OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324   # optional override
node server.js
```

## Host it

The server is a single Node file with **zero npm dependencies**, so any Node host
works. Easiest path (Render, free tier):

1. Push this folder to a GitHub repo
2. Render → New → Web Service → connect the repo
3. Root directory: `ai-course` · Build command: *(none)* · Start command: `node server.js`
4. Add env var `OPENROUTER_API_KEY`
5. Done — Render sets `PORT` automatically and the server reads it

Railway and Fly.io work identically. Avoid static-only hosts (Netlify Drop,
GitHub Pages) — the app needs its server for the LLM proxy.

## API surface

| Route | What it does |
|---|---|
| `GET /api/status` | key present? which model? (drives the status dot) |
| `POST /api/run` | Playground job (Goal/Rules/Context/Checks → trace + text) |
| `POST /api/run-code` | lesson code walkthrough/simulation |
| `POST /api/chat` | **Builder** — SSE stream of `status` / `file` / `text` / `done` events |

## Editing the course

All content lives in `lessons.js` — one object per lesson (`explain` HTML,
`code` sample, `examples` cards, `tryIt` mission). No build step; edit and reload.
