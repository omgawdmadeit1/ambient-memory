import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeTriggerTime, triggerTimeMatches } from "./parser.ts";

describe("normalizeTriggerTime", () => {
  it("pads unpadded 24h clock values from the model", () => {
    assert.equal(normalizeTriggerTime("8:00"), "08:00");
    assert.equal(normalizeTriggerTime("20:00"), "20:00");
    assert.equal(normalizeTriggerTime(" 9:05 "), "09:05");
  });

  it("converts 12-hour model strings the poller cannot match", () => {
    assert.equal(normalizeTriggerTime("8:00 PM"), "20:00");
    assert.equal(normalizeTriggerTime("8pm"), "20:00");
    assert.equal(normalizeTriggerTime("8:00 AM"), "08:00");
    assert.equal(normalizeTriggerTime("12:00 AM"), "00:00");
    assert.equal(normalizeTriggerTime("12:30 pm"), "12:30");
  });

  it("rejects empty or non-time values", () => {
    assert.equal(normalizeTriggerTime(null), null);
    assert.equal(normalizeTriggerTime(""), null);
    assert.equal(normalizeTriggerTime("tonight"), null);
  });
});

describe("triggerTimeMatches", () => {
  it("fires 8pm meds stored as '8:00 PM' or '8pm'", () => {
    const atEight = new Date(2026, 9, 9, 20, 0, 5);
    assert.equal(triggerTimeMatches("8:00 PM", atEight), true);
    assert.equal(triggerTimeMatches("8pm", atEight), true);
    assert.equal(triggerTimeMatches("20:00", atEight), true);
    assert.equal(triggerTimeMatches("8:00", atEight), false);
  });

  it("does not fire at the wrong minute", () => {
    const atEightOhOne = new Date(2026, 9, 9, 20, 1, 0);
    assert.equal(triggerTimeMatches("8:00 PM", atEightOhOne), false);
    assert.equal(triggerTimeMatches("20:00", atEightOhOne), false);
  });
});
