import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLocally } from "./parser.ts";
import { shouldAutoSupersede, similarEntity } from "./match.ts";

describe("shouldAutoSupersede", () => {
  it("does not silently replace kid shoe size with an adult size update", () => {
    const kid = parseLocally("Kid's shoe size is 13C");
    const adult = parseLocally("shoe size is now 10");
    assert.equal(kid.entity, "kid shoe size");
    assert.equal(adult.entity, "shoe size");
    assert.equal(similarEntity(kid.entity, adult.entity), true);
    assert.equal(shouldAutoSupersede(kid.entity, adult), false);
  });

  it("still auto-updates the same kid shoe-size note", () => {
    const kid = parseLocally("Kid's shoe size is 13C");
    const update = parseLocally("kid's shoe size is now 2Y");
    assert.equal(update.entity, "kid shoe size");
    assert.equal(shouldAutoSupersede(kid.entity, update), true);
  });

  it("still auto-updates a same-entity high-confidence fact", () => {
    const first = parseLocally("passport expires 2028");
    const next = parseLocally("passport expires 2029");
    assert.equal(shouldAutoSupersede(first.entity, next), true);
  });
});
