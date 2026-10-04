import type { Memory, TriggerType } from "./types";

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type DueMemory = Pick<
  Memory,
  "trigger_type" | "trigger_time" | "last_notified_date" | "expiry_date" | "superseded_by"
>;

/** Minutes from midnight for a 24h HH:MM clock, or null if the value is not a clock. */
export function clockMinutes(hhmm: string): number | null {
  const m = CLOCK.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * A time/recurring memory is due once its clock has been reached today
 * and it has not already been notified. Opening the app after the minute
 * (or missing a 15s poll while the tab is backgrounded) still fires.
 */
export function isMemoryDue(m: DueMemory, now: Date, today: string): boolean {
  if (m.superseded_by) return false;
  if (m.expiry_date && m.expiry_date < today) return false;
  if (!isTimedTrigger(m.trigger_type) || !m.trigger_time) return false;
  if (m.last_notified_date === today) return false;
  const dueMin = clockMinutes(m.trigger_time);
  if (dueMin === null) return false;
  return dueMin <= now.getHours() * 60 + now.getMinutes();
}

function isTimedTrigger(type: TriggerType): boolean {
  return type === "time" || type === "recurring";
}
