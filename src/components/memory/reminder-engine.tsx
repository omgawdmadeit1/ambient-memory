import { useEffect, useRef, useState } from "react";
import { useMemoryStore } from "@/lib/memory/store";
import {
  dismissReminderToast,
  formatReminderBody,
  mergeReminderToasts,
  type ReminderToast,
} from "@/lib/memory/reminders";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReminderEngine() {
  const dueForNotification = useMemoryStore((s) => s.dueForNotification);
  const markNotified = useMemoryStore((s) => s.markNotified);
  const [toasts, setToasts] = useState<ReminderToast[]>([]);
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
      if (due.length === 0) return;
      const incoming: ReminderToast[] = due.map((m) => ({
        id: m.id,
        body: formatReminderBody(m.fact, m.trigger_time, m.raw_text),
      }));
      for (const toast of incoming) {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("Ambient Memory", { body: toast.body, tag: toast.id });
          } catch {
            // ignore
          }
        }
        markNotified(toast.id);
      }
      setToasts((prev) => mergeReminderToasts(prev, incoming));
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
    const demo = { id: "demo-med", body: "Take the antibiotic. 8:00 PM" };
    setToasts((prev) => mergeReminderToasts(prev, [demo]));
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Ambient Memory", { body: demo.body, tag: demo.id });
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

      {toasts.length > 0 ? (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md flex-col gap-2 sm:inset-x-auto sm:right-6 sm:left-auto sm:bottom-6">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className="rounded-xl border border-border bg-surface p-4 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-subtle">Reminder</p>
                  <p className="mt-0.5 text-sm text-fg">{toast.body}</p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1 text-subtle hover:bg-surface-2 hover:text-fg"
                  onClick={() => setToasts((prev) => dismissReminderToast(prev, toast.id))}
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
