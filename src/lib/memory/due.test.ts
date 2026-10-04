import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clockMinutes, isMemoryDue, type DueMemory } from "./due.ts";

function mem(partial: Partial<DueMemory>): DueMemory {
  return {
    trigger_type: "time",
    trigger_time: "20:00",
    last_notified_date: null,
    expiry_date: null,
    superseded_by: null,
    ...partial,
  };
}

function at(isoLocal: string): Date {
  // Interpret as a local wall clock so tests match getHours()/getMinutes().
  return new Date(isoLocal);
}

describe("clockMinutes", () => {
  it("parses 24h clocks", () => {
    assert.equal(clockMinutes("00:00"), 0);
    assert.equal(clockMinutes("08:00"), 8 * 60);
    assert.equal(clockMinutes("20:00"), 20 * 60);
    assert.equal(clockMinutes("23:59"), 23 * 60 + 59);
  });

  it("rejects non-clocks", () => {
    assert.equal(clockMinutes("8:00"), null);
    assert.equal(clockMinutes("20:00:00"), null);
    assert.equal(clockMinutes("8pm"), null);
  });
});

describe("isMemoryDue", () => {
  const today = "2026-10-04";

  it("does not fire before the trigger minute", () => {
    assert.equal(isMemoryDue(mem({ trigger_time: "20:00" }), at("2026-10-04T19:59:00"), today), false);
  });

  it("fires on the trigger minute", () => {
    assert.equal(isMemoryDue(mem({ trigger_time: "20:00" }), at("2026-10-04T20:00:00"), today), true);
  });

  it("still fires after the trigger minute if not yet notified", () => {
    assert.equal(isMemoryDue(mem({ trigger_time: "20:00" }), at("2026-10-04T20:05:00"), today), true);
    assert.equal(isMemoryDue(mem({ trigger_time: "20:00" }), at("2026-10-04T23:59:00"), today), true);
  });

  it("does not re-fire after markNotified for today", () => {
    assert.equal(
      isMemoryDue(mem({ trigger_time: "20:00", last_notified_date: today }), at("2026-10-04T20:05:00"), today),
      false,
    );
  });

  it("does not fire expired or superseded memories", () => {
    assert.equal(
      isMemoryDue(mem({ trigger_time: "08:00", expiry_date: "2026-10-03" }), at("2026-10-04T20:00:00"), today),
      false,
    );
    assert.equal(
      isMemoryDue(mem({ trigger_time: "08:00", superseded_by: "other" }), at("2026-10-04T20:00:00"), today),
      false,
    );
  });

  it("ignores unstructured facts", () => {
    assert.equal(
      isMemoryDue(mem({ trigger_type: "none", trigger_time: "20:00" }), at("2026-10-04T20:05:00"), today),
      false,
    );
  });
});
