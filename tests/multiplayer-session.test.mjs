import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);

test("la doi jucători gazda poate porni, iar invitatul așteaptă gazda", () => {
  const { lobbyStatusFor } = require("../multiplayer-session.js");

  assert.deepEqual(lobbyStatusFor(2, true), {
    canStart: true,
    message: "2/6 conectați. Toți sunt gata."
  });
  assert.deepEqual(lobbyStatusFor(2, false), {
    canStart: false,
    message: "2/6 conectați. Toți sunt gata; așteaptă gazda."
  });
});

test("partida nu poate porni până nu confirmă toți jucătorii", () => {
  const { lobbyStatusFor } = require("../multiplayer-session.js");

  assert.deepEqual(lobbyStatusFor(3, true, 2), {
    canStart: false,
    message: "2/3 pregătiți. Așteaptă confirmarea tuturor."
  });
});

test("pornirea partidei împarte fiecărui jucător șase cărți distincte", () => {
  const { startGame } = require("../multiplayer-session.js");
  const state = startGame([
    { id: "host", name: "Ion" },
    { id: "guest", name: "Vasile" }
  ], () => 0.5);

  assert.equal(state.players[0].hand.length, 6);
  assert.equal(state.players[1].hand.length, 6);
  const dealtIds = state.players.flatMap(player => player.hand.map(card => card.id));
  assert.equal(new Set(dealtIds).size, 12);
  assert.notDeepEqual(
    state.players[0].hand.map(card => card.id),
    state.players[1].hand.map(card => card.id)
  );
});

test("fiecare jucător primește numai propria mână, nu cărțile adversarului", () => {
  const { startGame, viewForPlayer } = require("../multiplayer-session.js");
  const state = startGame([
    { id: "host", name: "Ion" },
    { id: "guest", name: "Vasile" }
  ], () => 0.25);

  const guestView = viewForPlayer(state, "guest");
  const guest = guestView.players.find(player => player.id === "guest");
  const host = guestView.players.find(player => player.id === "host");

  assert.deepEqual(guest.hand, state.players[1].hand);
  assert.equal(host.hand, undefined);
  assert.equal(host.handCount, 6);
  assert.equal(guestView.deck, undefined);
  assert.equal(guestView.deckCount, 24);
  assert.deepEqual(guestView.trumpCard, state.deck[0]);
});

test("pagina încarcă protocolul sesiunii înainte de multiplayer", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const sessionPosition = html.indexOf('src="multiplayer-session.js');
  const onlinePosition = html.indexOf('src="online.js');

  assert.ok(sessionPosition >= 0);
  assert.ok(sessionPosition < onlinePosition);
});

test("replica rămâne vizibilă aceeași durată chiar dacă dispozitivele au ore diferite", () => {
  const { localizeReactionForClient } = require("../multiplayer-session.js");
  const hostView = {
    sentAt: 10_000,
    reaction: { phrase: "iobanii v rot", expiresAt: 13_000 }
  };

  const clientView = localizeReactionForClient(hostView, 500_000);

  assert.equal(clientView.reaction.expiresAt, 503_000);
  assert.equal(clientView.reaction.phrase, "iobanii v rot");
});

test("timerul turei arată aceeași durată pe dispozitive cu ore diferite", () => {
  const { localizeReactionForClient } = require("../multiplayer-session.js");
  const hostView = { sentAt: 10_000, turnDeadline: 40_000 };

  const clientView = localizeReactionForClient(hostView, 500_000);

  assert.equal(clientView.turnDeadline, 530_000);
});
