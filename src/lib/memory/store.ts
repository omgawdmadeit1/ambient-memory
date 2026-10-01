import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CaptureResult, Memory, ParsedMemory } from "./types";
import { isMemoryActive, parseLocally, todayIso } from "./parser";

const SEED_RAW = [
  "Doctor said take the antibiotic at 8pm for the next 10 days",
  "Kid's shoe size is 13C",
  "Car was last serviced on March 12, 2026 — next due around 5,000 miles or 6 months",
] as const;

const STOP = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "what",
  "whats",
  "what's",
  "who",
  "when",
  "where",
  "how",
  "does",
  "do",
  "did",
  "my",
  "our",
  "me",
  "i",
  "to",
  "for",
  "of",
  "in",
  "on",
  "at",
  "and",
  "or",
  "about",
  "tell",
  "show",
  "find",
  "remember",
  "please",
]);

function uid() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function todayDate(now: Date = new Date()) {
  return todayIso(now);
}

function entityKey(entity: string | null | undefined) {
  return (entity || "").trim().toLowerCase();
}

function similarEntity(a: string | null, b: string | null) {
  const ka = entityKey(a);
  const kb = entityKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.includes(kb) || kb.includes(ka)) return true;
  if (ka.includes("shoe") && kb.includes("shoe")) return true;
  return false;
}

function buildMemory(raw: string, parsed: ParsedMemory, id?: string): Memory {
  const t = nowIso();
  return {
    id: id || uid(),
    raw_text: raw.trim(),
    entity: parsed.entity,
    fact: parsed.fact,
    trigger_type: parsed.trigger_type,
    trigger_time: parsed.trigger_time,
    recurrence_rule: parsed.recurrence_rule,
    expiry_date: parsed.expiry_date,
    superseded_by: null,
    parse_status:
      parsed.confidence < 0.5 || (!parsed.entity && !parsed.fact) ? "failed" : "success",
    created_at: t,
    updated_at: t,
    last_notified_date: null,
  };
}

export interface MemoryState {
  memories: Memory[];
  onboarded: boolean;
  hydrated: boolean;
  seedIfEmpty: () => void;
  capture: (text: string, parsed?: ParsedMemory) => CaptureResult;
  resolveClarification: (
    candidateId: string,
    update: boolean,
    pendingRaw: string,
    pendingParsed: ParsedMemory,
  ) => Memory;
  search: (q: string) => Memory[];
  activeMemories: () => Memory[];
  markNotified: (id: string) => void;
  remove: (id: string) => void;
  dueForNotification: (now?: Date) => Memory[];
  resetDemo: () => void;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],
      onboarded: false,
      hydrated: false,

      seedIfEmpty: () => {
        const { memories } = get();
        if (memories.length > 0) {
          set({ onboarded: true });
          return;
        }
        const seeds = SEED_RAW.map((raw) => buildMemory(raw, parseLocally(raw)));
        set({ memories: seeds, onboarded: true });
      },

      capture: (text, parsedIn) => {
        const raw = text.trim();
        if (!raw) {
          return { memory: null, needs_clarification: false, message: "Nothing found." };
        }
        const parsed = parsedIn ?? parseLocally(raw);
        if (parsed.skip) {
          return { memory: null, needs_clarification: false, message: "Nothing to remember." };
        }

        const active = get().activeMemories();
        const existing = active.find(
          (m) =>
            similarEntity(m.entity, parsed.entity) ||
            (parsed.supersedes_hint && similarEntity(m.entity, parsed.supersedes_hint)),
        );

        if (existing) {
          const highConf =
            (parsed.confidence >= 0.7 && !!parsed.supersedes_hint) ||
            (parsed.confidence >= 0.85 && similarEntity(existing.entity, parsed.entity));

          if (highConf) {
            const neu = buildMemory(raw, parsed);
            set((s) => ({
              memories: [
                ...s.memories.map((m) =>
                  m.id === existing.id
                    ? { ...m, superseded_by: neu.id, updated_at: nowIso() }
                    : m,
                ),
                neu,
              ],
            }));
            return { memory: neu, needs_clarification: false, message: "Remembered." };
          }

          return {
            memory: null,
            needs_clarification: true,
            clarification_entity: existing.entity || "that note",
            candidate_id: existing.id,
            message: `Update the existing note about ${existing.entity || "that"}?`,
          };
        }

        const neu = buildMemory(raw, parsed);
        set((s) => ({ memories: [neu, ...s.memories] }));
        return {
          memory: neu,
          needs_clarification: false,
          message:
            neu.parse_status === "failed"
              ? "I saved the note but couldn’t structure it."
              : "Remembered.",
        };
      },

      resolveClarification: (candidateId, update, pendingRaw, pendingParsed) => {
        const neu = buildMemory(pendingRaw, pendingParsed);
        if (update) {
          set((s) => ({
            memories: [
              ...s.memories.map((m) =>
                m.id === candidateId
                  ? { ...m, superseded_by: neu.id, updated_at: nowIso() }
                  : m,
              ),
              neu,
            ],
          }));
        } else {
          set((s) => ({ memories: [neu, ...s.memories] }));
        }
        return neu;
      },

      search: (q) => {
        const query = q.trim().toLowerCase();
        if (!query) return get().activeMemories();
        const tokens = query
          .split(/\s+/)
          .map((t) => t.replace(/[^\w'-]/g, ""))
          .filter((t) => t.length > 1 && !STOP.has(t));
        const active = get().activeMemories();
        if (tokens.length === 0) return active;
        const scored = active
          .map((m) => {
            const hay = `${m.raw_text} ${m.entity || ""} ${m.fact || ""}`.toLowerCase();
            let score = 0;
            for (const t of tokens) {
              if (hay.includes(t)) score += 2;
              if ((m.entity || "").toLowerCase().includes(t)) score += 4;
              if ((m.fact || "").toLowerCase().includes(t)) score += 3;
            }
            score += new Date(m.created_at).getTime() / 1e15;
            return { m, score };
          })
          .filter((x) => x.score >= 2)
          .sort((a, b) => b.score - a.score);
        return scored.map((x) => x.m);
      },

      activeMemories: () => {
        return get()
          .memories.filter((m) => isMemoryActive(m))
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      },

      markNotified: (id) => {
        const d = todayDate();
        set((s) => ({
          memories: s.memories.map((m) =>
            m.id === id ? { ...m, last_notified_date: d } : m,
          ),
        }));
      },

      remove: (id) => {
        set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }));
      },

      dueForNotification: (now = new Date()) => {
        const hh = now.getHours().toString().padStart(2, "0");
        const mm = now.getMinutes().toString().padStart(2, "0");
        const current = `${hh}:${mm}`;
        const d = todayDate(now);
        return get()
          .memories.filter((m) => isMemoryActive(m, now))
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .filter((m) => {
            if (m.trigger_type !== "time" && m.trigger_type !== "recurring") return false;
            if (!m.trigger_time) return false;
            if (m.trigger_time !== current) return false;
            if (m.last_notified_date === d) return false;
            return true;
          });
      },

      resetDemo: () => {
        set({ memories: [], onboarded: false });
        get().seedIfEmpty();
      },
    }),
    {
      name: "ambient-memory-v1",
      partialize: (s) => ({ memories: s.memories, onboarded: s.onboarded }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          if (!state.memories?.length) {
            queueMicrotask(() => useMemoryStore.getState().seedIfEmpty());
          }
        }
      },
    },
  ),
);

export interface PendingCapture {
  raw: string;
  parsed: ParsedMemory;
  candidateId: string;
  entityLabel: string;
}
