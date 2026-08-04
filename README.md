# Ambient Memory

**Zero effort in · useful reminder out**

A daily-life memory layer. You say something once in natural language; the app structures it and brings it back when it matters — no folders, tags, or filing.

## What it does

1. **Capture** — Type one sentence, press Enter. No categories.
2. **Store** — Facts become structured memory (entity, fact, trigger, expiry). Updates supersede older facts when relevant.
3. **Surface** — Ask natural questions in search; time-based items can fire browser + in-app reminders.

### Seed demo (first open)

- Antibiotic at 8pm for 10 days (time-based)
- Kid shoe size 13C (persistent)
- Car last serviced March 12, 2026 (contextual)

Try search: *what size shoes does my kid wear*

## Stack

- TanStack Start (React 19 + Vite)
- TypeScript + Tailwind CSS v4
- Zustand + localStorage (local-first persistence)
- Deterministic NL parser (covers the product test set); optional xAI Grok parse when `XAI_API_KEY` is set
- Browser Notification API for time-based surfaces
- PWA-ready manifest

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

## Capture examples

```
doctor said take the antibiotic at 8pm for 10 days
kid's shoe size is 13C now
the wifi password is blueSky99
shoe size is now 1
take vitamin D every morning
```

## Product principles

- Capture requires ≤1 decision (typing)
- Zero manual filing
- Surface only high-confidence value
- Ambiguity = one binary question max
- Calm microcopy: “Remembered.”

## License

MIT
