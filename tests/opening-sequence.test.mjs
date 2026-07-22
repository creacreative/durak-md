import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createOpeningTimeline } = require("../opening-sequence.js");

test("jucătorii intră pe rând la masă înainte de împărțirea cărților", async () => {
  const events = createOpeningTimeline([
    { id: 0, name: "Tu" },
    { id: 1, name: "Boris" },
    { id: 2, name: "Misha" }
  ]);

  assert.deepEqual(
    events.filter(event => event.type === "player-enter"),
    [
      { type: "player-enter", playerId: 0, order: 0, duration: 900 },
      { type: "player-enter", playerId: 1, order: 1, duration: 900 },
      { type: "player-enter", playerId: 2, order: 2, duration: 900 }
    ]
  );
});

test("fiecare jucător reacționează după ce ajunge la masă", async () => {
  const players = [{ id: 0 }, { id: 1 }, { id: 2 }];
  const reactions = ["happy", "angry", "neutral"];
  const events = createOpeningTimeline(players, {
    reactionFor: (_player, index) => reactions[index]
  });

  assert.deepEqual(
    events.filter(event => event.type === "player-reaction"),
    [
      { type: "player-reaction", playerId: 0, emotion: "happy" },
      { type: "player-reaction", playerId: 1, emotion: "angry" },
      { type: "player-reaction", playerId: 2, emotion: "neutral" }
    ]
  );
});

test("cărțile sunt împărțite vizibil, câte una fiecărui jucător", async () => {
  const events = createOpeningTimeline([{ id: 0 }, { id: 1 }], {
    handSize: 2,
    reactionFor: () => "neutral"
  });

  assert.deepEqual(
    events.filter(event => event.type === "deal-card"),
    [
      { type: "deal-card", playerId: 0, cardNumber: 1 },
      { type: "deal-card", playerId: 1, cardNumber: 1 },
      { type: "deal-card", playerId: 0, cardNumber: 2 },
      { type: "deal-card", playerId: 1, cardNumber: 2 }
    ]
  );
});

test("jocul se deblochează numai după ultima carte împărțită", async () => {
  const events = createOpeningTimeline([{ id: 0 }, { id: 1 }], {
    handSize: 1,
    reactionFor: () => "neutral"
  });

  assert.equal(events[0].type, "opening-start");
  assert.deepEqual(events.at(-1), { type: "opening-complete" });
  assert.equal(events.slice(1, -1).some(event => event.type === "opening-complete"), false);
});

test("fiecare adversar trage scaunul și se așază înainte să reacționeze", async () => {
  const events = createOpeningTimeline([{ id: 1 }], {
    handSize: 0,
    reactionFor: () => "neutral"
  });

  assert.deepEqual(events.slice(1, -1), [
    { type: "player-enter", playerId: 1, order: 0, duration: 900 },
    { type: "chair-pull", playerId: 1, duration: 450 },
    { type: "player-sit", playerId: 1, duration: 500 },
    { type: "player-reaction", playerId: 1, emotion: "neutral" }
  ]);
});
