import { Clock, Hash, RefreshCw, Layers } from "lucide-react";
import type { Memory } from "@/lib/memory/types";
import { cn } from "@/lib/utils";

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

const triggerIcon = {
  time: Clock,
  recurring: RefreshCw,
  contextual: Layers,
  none: Hash,
} as const;

export function MemoryCard({
  memory,
  highlight,
  className,
}: {
  memory: Memory;
  highlight?: boolean;
  className?: string;
}) {
  const Icon = triggerIcon[memory.trigger_type] || Hash;
  const timeLabel = formatTime(memory.trigger_time);

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-surface p-4 transition-colors",
        highlight && "border-accent/40 ring-1 ring-accent/20",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          {memory.entity ? (
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">{memory.entity}</p>
          ) : null}
          <p className="mt-0.5 text-[15px] leading-snug text-fg">
            {memory.fact || memory.raw_text}
          </p>
          <p className="mt-1.5 text-xs text-subtle line-clamp-1">{memory.raw_text}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
            {timeLabel ? <span className="rounded-md bg-surface-2 px-2 py-0.5">{timeLabel}</span> : null}
            {memory.recurrence_rule ? (
              <span className="rounded-md bg-surface-2 px-2 py-0.5">{memory.recurrence_rule}</span>
            ) : null}
            {memory.expiry_date ? (
              <span className="rounded-md bg-surface-2 px-2 py-0.5">until {memory.expiry_date}</span>
            ) : null}
            {memory.parse_status === "failed" ? (
              <span className="rounded-md bg-danger/10 px-2 py-0.5 text-danger">unstructured</span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
