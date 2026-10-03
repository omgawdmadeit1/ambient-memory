export type ReminderToast = { id: string; body: string };

export function formatReminderBody(fact: string | null, time: string | null, raw: string) {
  const f = fact || raw;
  if (!time) return f;
  const [h, m] = time.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${f}. ${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

/** Keep every due reminder visible. A single toast overwrite drops the rest after markNotified. */
export function mergeReminderToasts(
  existing: ReminderToast[],
  incoming: ReminderToast[],
): ReminderToast[] {
  const seen = new Set(existing.map((t) => t.id));
  const next = [...existing];
  for (const toast of incoming) {
    if (seen.has(toast.id)) continue;
    seen.add(toast.id);
    next.push(toast);
  }
  return next;
}

export function dismissReminderToast(toasts: ReminderToast[], id: string): ReminderToast[] {
  return toasts.filter((t) => t.id !== id);
}
