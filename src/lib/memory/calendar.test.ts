import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMemoryActive, parseLocally, todayIso } from "./parser.ts";

describe("todayIso uses the local calendar, not UTC", () => {
  it("keeps the last antibiotic dose active after UTC midnight", () => {
    // Oct 11 2026 8:00 PM PDT == Oct 12 2026 03:00 UTC
    const lastDoseLocalEvening = new Date("2026-10-12T03:00:00.000Z");
    const utcStamp = lastDoseLocalEvening.toISOString().slice(0, 10);
    const localStamp = todayIso(lastDoseLocalEvening);

    assert.equal(utcStamp, "2026-10-12");
    assert.equal(localStamp, "2026-10-11");

    const parsed = parseLocally(
      "Doctor said take the antibiotic at 8pm for the next 10 days",
    );
    assert.equal(parsed.trigger_time, "20:00");
    assert.ok(parsed.expiry_date);

    const memory = {
      superseded_by: null,
      expiry_date: "2026-10-11",
    };

    assert.equal(
      isMemoryActive(memory, lastDoseLocalEvening),
      true,
      "last local evening dose must still be active",
    );
    assert.equal(
      memory.expiry_date < utcStamp,
      true,
      "UTC date stamp would have expired the memory a day early",
    );
  });

  it("expires the course the local calendar day after expiry", () => {
    const nextLocalMorning = new Date("2026-10-12T15:00:00.000Z"); // Oct 12 8am PDT
    assert.equal(todayIso(nextLocalMorning), "2026-10-12");
    assert.equal(isMemoryActive({ expiry_date: "2026-10-11" }, nextLocalMorning), false);
  });
});
