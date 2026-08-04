import { useEffect, useRef, useState } from "react";
import { useMemoryStore } from "@/lib/memory/store";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatBody(fact: string | null, time: string | null, raw: string) {
  const f = fact || raw;
  if (!time) return f;
  const [h, m] = time.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${f}. ${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

export function ReminderEngine() {
  const dueForNotification = useMemoryStore((s) => s.dueForNotification);
  const markNotified = useMemoryStore((s) => s.markNotified);
  const [toast, setToast] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const asked = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
  }, []);

  useEffect(() => {
    const tick = () => {
      const due = dueForNotification(new Date());
      for (const m of due) {
        const body = formatBody(m.fact, m.trigger_time, m.raw_text);
        setToast(body);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("Ambient Memory", { body, tag: m.id });
          } catch {
            // ignore
          }
        }
        markNotified(m.id);
      }
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [dueForNotification, markNotified]);

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    asked.current = true;
    const p = await Notification.requestPermission();
    setPerm(p);
  }

  // Demo force: allow testing medication reminder without waiting for 8pm
  function forceDemoPing() {
    const body = "Take the antibiotic. 8:00 PM";
    setToast(body);
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Ambient Memory", { body, tag: "demo-med" });
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <>
      {perm === "default" ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Bell className="h-4 w-4 shrink-0" />
            <span>Enable time-based reminders</span>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => void enableNotifications()}>
            Enable
          </Button>
        </div>
      ) : null}

      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={forceDemoPing}
          className="text-[11px] text-subtle underline-offset-2 hover:text-muted hover:underline"
        >
          Demo notification
        </button>
      </div>

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl border border-border bg-surface p-4 shadow-2xl sm:inset-x-auto sm:right-6 sm:left-auto sm:bottom-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-subtle">Reminder</p>
              <p className="mt-0.5 text-sm text-fg">{toast}</p>
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-subtle hover:bg-surface-2 hover:text-fg"
              onClick={() => setToast(null)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
