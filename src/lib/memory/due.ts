import type { Memory } from "./types";

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/** Local calendar date for `now` (YYYY-MM-DD). Used for one-shot scheduled days. */
export function localCalendarDate(now: Date): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function clockHHMM(now: Date): string {
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

/**
 * Whether a memory should fire a reminder at `now`.
 * `todayUtc` is the existing UTC calendar day used for last_notified / expiry.
 *
 * One-shot time reminders (no recurrence_rule) only fire on their scheduled
 * local date (`expiry_date`). Daily courses keep firing until expiry.
 */
export function isMemoryDue(m: Memory, now: Date, todayUtc: string): boolean {
  if (m.superseded_by) return false;
  if (m.trigger_type !== "time" && m.trigger_type !== "recurring") return false;
  if (!m.trigger_time) return false;
  if (m.trigger_time !== clockHHMM(now)) return false;
  if (m.last_notified_date === todayUtc) return false;
  if (m.expiry_date && m.expiry_date < todayUtc) return false;
  if (!m.recurrence_rule && m.expiry_date && m.expiry_date !== localCalendarDate(now)) {
    return false;
  }
  return true;
}
