import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createProfile } = require("../player-profile.js");

function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}

test("rezultatul oferă monede o singură dată și salvează statisticile", () => {
  const profile = createProfile(storage());
  profile.recordResult("joc-1", 1, 4);
  profile.recordResult("joc-1", 1, 4);

  assert.equal(profile.snapshot().games, 1);
  assert.equal(profile.snapshot().first, 1);
  assert.equal(profile.snapshot().coins, 110);
});

test("un obiect cumpărat poate fi echipat și devine aspect public", () => {
  const profile = createProfile(storage());
  profile.recordResult("a", 1, 2);
  assert.equal(profile.buy("kepka"), true);

  assert.equal(profile.snapshot().equipped, "kepka");
  assert.equal(profile.publicLook().accessory, "cap");
});
