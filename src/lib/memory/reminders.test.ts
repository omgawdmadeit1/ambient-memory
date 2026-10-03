import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dismissReminderToast,
  formatReminderBody,
  mergeReminderToasts,
} from "./reminders.ts";

describe("mergeReminderToasts", () => {
  it("keeps every same-minute reminder instead of overwriting the last body", () => {
    const antibiotic = {
      id: "abx",
      body: formatReminderBody("take the antibiotic", "20:00", "take the antibiotic at 8pm"),
    };
    const vitamin = {
      id: "vit",
      body: formatReminderBody("take vitamin D every evening", "20:00", "vitamin D every evening"),
    };

    // Old ReminderEngine did setToast(body) in a loop — only the last string survived.
    let overwritten: string | null = null;
    for (const toast of [antibiotic, vitamin]) overwritten = toast.body;
    assert.equal(overwritten, vitamin.body);
    assert.notEqual(overwritten, antibiotic.body);

    const queued = mergeReminderToasts([], [antibiotic, vitamin]);
    assert.equal(queued.length, 2);
    assert.deepEqual(
      queued.map((t) => t.id),
      ["abx", "vit"],
    );
    assert.match(queued[0]!.body, /antibiotic/i);
    assert.match(queued[1]!.body, /vitamin/i);
  });

  it("does not duplicate a reminder that is already on screen", () => {
    const existing = [{ id: "abx", body: "Take the antibiotic. 8:00 PM" }];
    const merged = mergeReminderToasts(existing, [
      { id: "abx", body: "Take the antibiotic. 8:00 PM" },
      { id: "vit", body: "Take vitamin D. 8:00 PM" },
    ]);
    assert.equal(merged.length, 2);
    assert.equal(merged.filter((t) => t.id === "abx").length, 1);
  });

  it("dismisses one reminder without dropping the others", () => {
    const queued = mergeReminderToasts(
      [],
      [
        { id: "abx", body: "Take the antibiotic. 8:00 PM" },
        { id: "vit", body: "Take vitamin D. 8:00 PM" },
      ],
    );
    const left = dismissReminderToast(queued, "abx");
    assert.equal(left.length, 1);
    assert.equal(left[0]!.id, "vit");
  });
});
