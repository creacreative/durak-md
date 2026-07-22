import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("atacul multiplayer folosește replica de atac existentă și o sincronizează", () => {
  const { createMultiplayerReaction } = require("../multiplayer-reactions.js");
  const reaction = createMultiplayerReaction(2, "attack", () => "Na, apără asta!", () => 1000);

  assert.deepEqual(reaction, {
    id: "2-1000",
    playerId: 2,
    kind: "attack",
    emotion: "laughing",
    phrase: "Na, apără asta!",
    expiresAt: 4000
  });
});

test("apărarea multiplayer folosește replica de râs existentă", () => {
  const { createMultiplayerReaction } = require("../multiplayer-reactions.js");
  const reaction = createMultiplayerReaction(1, "defend", category => {
    assert.equal(category, "laugh");
    return "Hă-hă! Iaca poznă!";
  }, () => 2000);

  assert.equal(reaction.phrase, "Hă-hă! Iaca poznă!");
  assert.equal(reaction.emotion, "laughing");
  assert.equal(reaction.kind, "defend");
});

test("jucătorul care ia masa folosește replica nervoasă existentă", () => {
  const { createMultiplayerReaction } = require("../multiplayer-reactions.js");
  const reaction = createMultiplayerReaction(3, "take", category => {
    assert.equal(category, "angry");
    return "M-ai zăibit, măi!";
  }, () => 3000);

  assert.equal(reaction.phrase, "M-ai zăibit, măi!");
  assert.equal(reaction.emotion, "angry");
});

test("încheierea atacului folosește replica de râs existentă", () => {
  const { createMultiplayerReaction } = require("../multiplayer-reactions.js");
  const reaction = createMultiplayerReaction(0, "finish", () => "Apoi asta-i bună!", () => 4000);

  assert.equal(reaction.phrase, "Apoi asta-i bună!");
  assert.equal(reaction.emotion, "laughing");
  assert.equal(reaction.expiresAt, 7000);
});

test("multiplayerul ia implicit replica din vocabularul moldovenesc comun", () => {
  const vocabulary = require("../moldovan-vocabulary.js");
  globalThis.DurakMoldovanVocabulary = vocabulary;
  const { createMultiplayerReaction } = require("../multiplayer-reactions.js");

  const reaction = createMultiplayerReaction(4, "attack", undefined, () => 5000);

  assert.ok(vocabulary.allPhrases().includes(reaction.phrase));
});

test("emote-urile rapide folosesc aceleași categorii moldovenești", () => {
  const { createMultiplayerReaction } = require("../multiplayer-reactions.js");
  const categories = [];

  const reactions = ["think", "laugh", "angry"].map(kind =>
    createMultiplayerReaction("player", kind, category => {
      categories.push(category);
      return `replică-${category}`;
    }, () => 6000)
  );

  assert.deepEqual(categories, ["think", "laugh", "angry"]);
  assert.deepEqual(reactions.map(reaction => reaction.emotion), ["thinking", "laughing", "angry"]);
});
