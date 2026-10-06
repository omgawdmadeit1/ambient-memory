import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clockHHMM, isMemoryDue, localCalendarDate } from "./due.ts";
import { parseLocally } from "./parser.ts";
import type { Memory } from "./types.ts";

function memory(partial: Partial<Memory> & Pick<Memory, "trigger_type" | "trigger_time">): Memory {
  return {
    id: partial.id ?? "m1",
    raw_text: partial.raw_text ?? "remind me",
    entity: partial.entity ?? "dentist",
    fact: partial.fact ?? "call",
    trigger_type: partial.trigger_type,
    trigger_time: partial.trigger_time,
    recurrence_rule: partial.recurrence_rule ?? null,
    expiry_date: partial.expiry_date ?? null,
    superseded_by: partial.superseded_by ?? null,
    parse_status: "success",
    created_at: "2026-10-06T12:00:00.000Z",
    updated_at: "2026-10-06T12:00:00.000Z",
    last_notified_date: partial.last_notified_date ?? null,
  };
}

describe("isMemoryDue", () => {
  it("does not fire a next-weekday one-shot on earlier days at the same clock time", () => {
    // Captured mid-week: "remind me to take meds next Monday at 8:00 AM"
    const m = memory({
      trigger_type: "time",
      trigger_time: "08:00",
      recurrence_rule: null,
      expiry_date: "2026-10-12", // Monday
    });
    const sundayMorning = new Date(2026, 9, 11, 8, 0, 0); // local Sunday Oct 11
    assert.equal(localCalendarDate(sundayMorning), "2026-10-11");
    assert.equal(clockHHMM(sundayMorning), "08:00");
    assert.equal(isMemoryDue(m, sundayMorning, "2026-10-11"), false);
  });

  it("fires a next-weekday one-shot on the scheduled local day", () => {
    const m = memory({
      trigger_type: "time",
      trigger_time: "08:00",
      recurrence_rule: null,
      expiry_date: "2026-10-12",
    });
    const mondayMorning = new Date(2026, 9, 12, 8, 0, 0);
    assert.equal(localCalendarDate(mondayMorning), "2026-10-12");
    assert.equal(isMemoryDue(m, mondayMorning, "2026-10-12"), true);
  });

  it("still fires daily medication courses on days before expiry", () => {
    const m = memory({
      trigger_type: "time",
      trigger_time: "20:00",
      recurrence_rule: "daily for 10 days",
      expiry_date: "2026-10-16",
      entity: "antibiotic",
    });
    const tonight = new Date(2026, 9, 6, 20, 0, 0);
    assert.equal(isMemoryDue(m, tonight, "2026-10-06"), true);
  });

  it("does not fire after last_notified_date matches today", () => {
    const m = memory({
      trigger_type: "time",
      trigger_time: "08:00",
      recurrence_rule: null,
      expiry_date: "2026-10-12",
      last_notified_date: "2026-10-12",
    });
    const mondayMorning = new Date(2026, 9, 12, 8, 0, 0);
    assert.equal(isMemoryDue(m, mondayMorning, "2026-10-12"), false);
  });

  it("does not fire at the wrong clock time", () => {
    const m = memory({
      trigger_type: "time",
      trigger_time: "08:00",
      recurrence_rule: null,
      expiry_date: "2026-10-12",
    });
    const mondayNoon = new Date(2026, 9, 12, 12, 0, 0);
    assert.equal(isMemoryDue(m, mondayNoon, "2026-10-12"), false);
  });
});

function nextMondayIso() {
  const now = new Date();
  const delta = (1 - now.getDay() + 7) % 7 || 7;
  const d = new Date(now);
  d.setDate(now.getDate() + delta);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

describe("parseLocally weekday one-shots", () => {
  it("keeps dentist-style next-weekday reminders as a single scheduled day", () => {
    const p = parseLocally("Remind me to call dentist next Monday at 10:00 AM");
    assert.equal(p.trigger_type, "time");
    assert.equal(p.trigger_time, "10:00");
    assert.equal(p.recurrence_rule, null);
    assert.equal(p.expiry_date, nextMondayIso());
  });

  it("does not turn take-meds-next-Monday into a 10-day daily course", () => {
    const p = parseLocally("Remind me to take meds next Monday at 8:00 AM");
    assert.equal(p.trigger_type, "time");
    assert.equal(p.trigger_time, "08:00");
    assert.equal(p.recurrence_rule, null);
    assert.equal(p.expiry_date, nextMondayIso());
  });

  it("still parses explicit multi-day antibiotic courses as daily", () => {
    const p = parseLocally("Doctor said take the antibiotic at 8pm for the next 10 days");
    assert.equal(p.trigger_time, "20:00");
    assert.equal(p.recurrence_rule, "daily for 10 days");
  });
});
