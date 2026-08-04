# Ambient Memory

**Zero effort in · useful reminder out**

A daily-life memory layer. You say something once in natural language; the app structures it and brings it back when it matters — no folders, tags, or filing.

## Live demo

- **GitHub Pages:** https://omgawdmadeit1.github.io/ambient-memory/
- **Source:** https://github.com/omgawdmadeit1/ambient-memory

## What it does

1. **Capture** — Type one sentence, press Enter. No categories.
2. **Store** — Facts become structured memory (entity, fact, trigger, expiry). Updates supersede older facts when relevant.
3. **Surface** — Ask natural questions in search; time-based items can fire browser + in-app reminders.

### Seed demo (first open)

- Antibiotic at 8pm for 10 days (time-based)
- Kid shoe size 13C (persistent)
- Car last serviced March 12, 2026 (contextual)

Try search: *what size shoes does my kid wear*

## Stack (full source)

- TanStack Start (React 19 + Vite)
- TypeScript + Tailwind CSS v4
- Zustand + localStorage (local-first)
- Deterministic NL parser (+ optional xAI Grok when `XAI_API_KEY` is set)
- Browser Notification API

The GitHub Pages deploy is a lightweight static build of the same capture/store/surface loop.

## Local development

```bash
npm install
npm run dev
```

App binds to `0.0.0.0:8080`.

```bash
npm run typecheck
npm run build
```

## License

MIT
