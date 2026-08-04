import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { CaptureInput } from "./capture-input";
import { SearchBar } from "./search-bar";
import { MemoryCard } from "./memory-card";
import { ClarifyDialog } from "./clarify-dialog";
import { ReminderEngine } from "./reminder-engine";
import { useMemoryStore, type PendingCapture } from "@/lib/memory/store";
import { parseMemoryFn } from "@/lib/memory/parse-server";
import { parseLocally } from "@/lib/memory/parser";
import type { ParsedMemory } from "@/lib/memory/types";
import { Brain, RotateCcw } from "lucide-react";

export function AppShell() {
  const seedIfEmpty = useMemoryStore((s) => s.seedIfEmpty);
  const capture = useMemoryStore((s) => s.capture);
  const resolveClarification = useMemoryStore((s) => s.resolveClarification);
  const search = useMemoryStore((s) => s.search);
  const activeMemories = useMemoryStore((s) => s.activeMemories);
  const resetDemo = useMemoryStore((s) => s.resetDemo);
  const memories = useMemoryStore((s) => s.memories);
  const hydrated = useMemoryStore((s) => s.hydrated);

  const [query, setQuery] = useState("what size shoes does my kid wear");
  const [pending, setPending] = useState<PendingCapture | null>(null);
  const [remembering, setRemembering] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Ensure seed after hydration (persist may load async)
    const unsub = useMemoryStore.persist.onFinishHydration(() => {
      useMemoryStore.getState().seedIfEmpty();
      setReady(true);
    });
    if (useMemoryStore.persist.hasHydrated()) {
      seedIfEmpty();
      setReady(true);
    }
    return unsub;
  }, [seedIfEmpty]);

  useEffect(() => {
    if (hydrated) {
      seedIfEmpty();
      setReady(true);
    }
  }, [hydrated, seedIfEmpty]);

  const results = useMemo(() => {
    if (!ready) return [];
    return search(query);
  }, [query, search, ready, memories]);

  const list = useMemo(() => {
    if (!ready) return [];
    if (query.trim()) return results;
    return activeMemories();
  }, [query, results, activeMemories, ready, memories]);

  async function handleCapture(text: string) {
    setRemembering(true);
    toast.message("Remembering…", { id: "cap", duration: 800 });
    let parsed: ParsedMemory;
    try {
      const res = await parseMemoryFn({ data: { text } });
      parsed = res.parsed;
    } catch {
      parsed = parseLocally(text);
    }
    const result = capture(text, parsed);
    setRemembering(false);

    if (result.needs_clarification && result.candidate_id) {
      setPending({
        raw: text,
        parsed,
        candidateId: result.candidate_id,
        entityLabel: result.clarification_entity || "that note",
      });
      return;
    }

    if (result.message === "Nothing to remember.") {
      toast.message(result.message);
      return;
    }
    toast.success(result.message === "Remembered." ? "Remembered." : result.message, {
      id: "cap",
      duration: 1600,
    });
  }

  function finishClarify(update: boolean) {
    if (!pending) return;
    resolveClarification(pending.candidateId, update, pending.raw, pending.parsed);
    setPending(null);
    toast.success("Remembered.", { duration: 1600 });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-6 pt-8 sm:pt-10">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "bg-surface border border-border text-fg shadow-lg",
            title: "text-fg",
            description: "text-muted",
          },
        }}
      />

      <header className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-fg">
              <Brain className="h-4.5 w-4.5 h-4 w-4" aria-hidden />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-fg">Ambient Memory</h1>
              <p className="text-[11px] text-subtle">Zero effort in · useful out</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetDemo();
              setQuery("what size shoes does my kid wear");
              toast.message("Demo reset.");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-subtle hover:bg-surface-2 hover:text-fg"
            title="Reset demo seeds"
            aria-label="Reset demo"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <h2 className="text-xl font-medium tracking-tight text-fg sm:text-2xl">
          I remember things so you don’t have to.
        </h2>
        <p className="mt-1.5 text-sm text-muted">Just tell me once. I’ll bring it back when it matters.</p>
      </header>

      <ReminderEngine />

      <section className="mb-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
          {query.trim() ? "Search" : "Already remembered for you"}
        </p>
        <SearchBar value={query} onChange={setQuery} />
      </section>

      <section className="mb-4 flex-1 space-y-2.5 overflow-y-auto">
        {!ready ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
            {query.trim() ? "Nothing found." : "Nothing stored yet."}
          </p>
        ) : (
          list.map((m) => (
            <MemoryCard
              key={m.id}
              memory={m}
              highlight={!!query.trim() && list[0]?.id === m.id}
            />
          ))
        )}
      </section>

      <div className="sticky bottom-0 safe-pb -mx-4 border-t border-border/60 bg-bg/95 px-4 pt-3 backdrop-blur-md">
        <CaptureInput onSubmit={handleCapture} disabled={remembering} autoFocus />
      </div>

      <ClarifyDialog
        open={!!pending}
        entity={pending?.entityLabel || "that note"}
        onUpdate={() => finishClarify(true)}
        onKeepBoth={() => finishClarify(false)}
      />
    </div>
  );
}
