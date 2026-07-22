import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
const gameSource = await readFile(new URL("../game.js", import.meta.url), "utf8");
const onlineSource = await readFile(new URL("../online.js", import.meta.url), "utf8");

test("dicționarul public conține toate cele 248 de expresii moldovenești, fără traduceri", () => {
  const { allPhrases } = require("../moldovan-vocabulary.js");
  const phrases = allPhrases();

  assert.equal(phrases.length, 248);
  assert.equal(new Set(phrases).size, 248);
  assert.ok(phrases.includes("A zamuti şeva"));
  assert.ok(phrases.includes("şi blea ţ-o ahuit cabina? = şi ti vîibeşti?"));
  assert.ok(phrases.includes("Zvuk"));
  assert.ok(!phrases.includes("a face ceva"));
  assert.ok(!phrases.includes("sunet"));
});

test("selectorul nu repetă aceeași expresie de două ori la rând", () => {
  const { createPhrasePicker } = require("../moldovan-vocabulary.js");
  const nextPhrase = createPhrasePicker(["Aha", "Blea", "Dapu kaneşna"], () => 0);

  assert.deepEqual([nextPhrase(), nextPhrase(), nextPhrase()], ["Aha", "Blea", "Aha"]);
});

test("dialogul alege expresii moldovenești potrivite reacției", () => {
  const { createDialogue } = require("../moldovan-vocabulary.js");
  const say = createDialogue(() => 0);

  assert.equal(say("attack"), "Amuş îţi dau o uşiganie că o să te intorşi cu pidalili în sus");
  assert.equal(say("angry"), "A te zaibi");
  assert.equal(say("laugh"), "Ai da?");
  assert.equal(say("think"), "A zamuti şeva");
});

test("sursa comună de dialog întoarce numai expresii din dicționar", () => {
  const vocabulary = require("../moldovan-vocabulary.js");

  assert.ok(vocabulary.allPhrases().includes(vocabulary.say("attack")));
  assert.ok(vocabulary.allPhrases().includes(vocabulary.say("laugh")));
});

test("pagina încarcă vocabularul comun înaintea jocului și a multiplayerului", () => {
  const vocabularyIndex = page.indexOf('src="moldovan-vocabulary.js');
  const reactionsIndex = page.indexOf('src="multiplayer-reactions.js');
  const gameIndex = page.indexOf('src="game.js');

  assert.ok(vocabularyIndex >= 0);
  assert.ok(vocabularyIndex < reactionsIndex);
  assert.ok(vocabularyIndex < gameIndex);
});

test("singleplayerul și multiplayerul sunt legate direct la aceeași sursă moldovenească", () => {
  assert.match(gameSource, /function say\(kind\)\{return window\.DurakMoldovanVocabulary\.say\(kind\)\}/);
  assert.match(onlineSource, /createMultiplayerReaction\(playerId,kind\)/);
  assert.doesNotMatch(onlineSource, /createMultiplayerReaction\(playerId,kind,say\)/);
});

test("o replică veche este înlocuită înainte să apară în bula personajului", () => {
  const { sanitizePhrase } = require("../moldovan-vocabulary.js");

  assert.equal(sanitizePhrase("Te-am prins!", "laugh", () => "Ai da?"), "Ai da?");
  assert.equal(sanitizePhrase("Blea", "angry", () => "A te zaibi"), "Blea");
});
