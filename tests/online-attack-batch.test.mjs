import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function fakeElement(value = "") {
  return {
    value,
    hidden: false,
    textContent: "",
    className: "",
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    querySelectorAll() { return []; }
  };
}

async function createOnlineHarness(initialGuestName = "Prieten", options = {}) {
  const source = await readFile(new URL("../online.js", import.meta.url), "utf8");
  const elements = new Map();
  let visiblePlayerCards = [];
  let visibleKickButtons = [];
  let peerInstance;
  let outboundConnection;
  let outboundPeerId;

  const element = id => {
    if (!elements.has(id)) elements.set(id, fakeElement());
    return elements.get(id);
  };
  const playerHand = element("playerHand");
  Object.defineProperty(playerHand, "innerHTML", {
    get() { return this.html || ""; },
    set(html) {
      this.html = html;
      visiblePlayerCards = [...html.matchAll(/<div class="([^"]*player-card[^"]*)" data-id="([^"]+)"/g)].map(match => ({
        className: match[1],
        dataset: { id: match[2] },
        onclick: null
      }));
    }
  });
  const onlinePlayers = element("onlinePlayers");
  Object.defineProperty(onlinePlayers, "innerHTML", {
    get() { return this.html || ""; },
    set(html) {
      this.html = html;
      visibleKickButtons = [...html.matchAll(/<button[^>]*data-kick="([^"]+)"[^>]*>([^<]+)<\/button>/g)].map(match => ({
        dataset: { kick: match[1] },
        textContent: match[2],
        onclick: null
      }));
    }
  });
  onlinePlayers.querySelectorAll = selector => selector === "button[data-kick]" ? visibleKickButtons : [];

  class FakePeer {
    constructor() { this.handlers = {}; peerInstance = this; }
    on(type, handler) { this.handlers[type] = handler; }
    emit(type, value) { this.handlers[type]?.(value); }
    connect(id) {
      outboundPeerId = id;
      outboundConnection = new FakeConnection(false);
      return outboundConnection;
    }
    destroy() {}
  }
  class FakeConnection {
    constructor(open = true) { this.handlers = {}; this.open = open; this.sent = []; }
    on(type, handler) { this.handlers[type] = handler; }
    emit(type, value) { this.handlers[type]?.(value); }
    send(value) { this.sent.push(value); }
    close() { this.closed = true; this.open = false; this.emit("close"); }
  }

  const context = {
    window: null,
    document: {
      body: fakeElement(),
      getElementById: element,
      querySelector: selector => selector === ".you" ? element("you") : fakeElement(),
      querySelectorAll: selector => selector === ".player-card" ? visiblePlayerCards : []
    },
    navigator: { clipboard: { writeText: async () => {} } },
    Peer: FakePeer,
    setTimeout,
    clearTimeout,
    avatarHTML: player => `<div class="avatar-line">${player.openingLine || ""}</div>`,
    botCardHTML: () => '<div class="card back"></div>',
    cardHTML: (card, className = "") => `<div class="card ${className}" data-id="${card.id}"></div>`,
    setStatus: (message, action, handler) => {
      element("status").textContent = message;
      element("actionBtn").textContent = action || "";
      element("actionBtn").onclick = handler || null;
    }
  };
  context.window = context;
  context.__DURAK_SKIP_ONLINE_OPENING = options.opening !== true;
  context.__DURAK_SKIP_READY_CHECK = true;
  context.__DURAK_RECONNECT_WINDOW_MS = options.reconnectWindowMs || 20;
  context.__DURAK_OPENING_SPEED = options.opening ? 0 : 1;
  context.__DURAK_DISABLE_TURN_TIMER = !options.turnTimeoutMs;
  if (options.turnTimeoutMs) context.__DURAK_TURN_TIMEOUT_MS = options.turnTimeoutMs;
  if (options.joinTimeoutMs) context.__DURAK_JOIN_TIMEOUT_MS = options.joinTimeoutMs;
  const multiplayerSession = require("../multiplayer-session.js");
  context.DurakMultiplayerSession = options.startState
    ? { ...multiplayerSession, startGame: () => structuredClone(options.startState) }
    : multiplayerSession;
  context.DurakMultiplayerReactions = options.reactions
    ? {
        createMultiplayerReaction: (playerId, kind) => ({
          id: `${playerId}-${kind}`,
          playerId,
          kind,
          emotion: kind === "take" ? "angry" : "laughing",
          phrase: `SINCRON-${kind}`,
          expiresAt: Date.now() + 30
        })
      }
    : { createMultiplayerReaction: () => null };
  context.DurakRoundTable = {
    createTableLayout: ids => ids.map(playerId => ({ playerId })),
    seatStyle: () => ""
  };
  context.DurakOpening = require("../opening-sequence.js");
  context.DurakMoldovanVocabulary = { say: kind => `OPEN-${kind}` };
  context.DurakAvatarArrival = {
    chairHTML: () => "",
    arrivalClass: state => `arrival-${state}`
  };
  context.DurakAuth = { closeRoom() {} };

  vm.runInNewContext(source, context);
  if (options.guestMode) {
    element("onlineName").value = initialGuestName;
    element("roomCode").value = options.roomCode || "ABC123";
    element("joinRoom").onclick();
    peerInstance.emit("open");
    return {
      element,
      outboundConnection: () => outboundConnection,
      outboundPeerId: () => outboundPeerId
    };
  }
  element("onlineName").value = "Gazda";
  element("hostRoom").onclick();
  peerInstance.emit("open");
  const connectGuest = name => {
    const connection = new FakeConnection();
    peerInstance.emit("connection", connection);
    connection.emit("data", { type: "join", name, token: `session-${name}` });
    return connection;
  };
  const guest = connectGuest(initialGuestName);

  return {
    element,
    guest,
    connectGuest,
    start(randomValue = 0.1) {
      const originalRandom = Math.random;
      Math.random = () => randomValue;
      try { element("startOnline").onclick(); }
      finally { Math.random = originalRandom; }
    },
    playerCards: () => visiblePlayerCards
  };
}

function card(id, rank, suit = "♣") {
  return { id, rank, suit };
}

function threePlayerState(hands) {
  return {
    players: [
      { id: "player-0", name: "Gazda", hand: hands[0], out: false },
      { id: "player-1", name: "Avion", hand: hands[1], out: false },
      { id: "player-2", name: "Misha", hand: hands[2], out: false }
    ],
    deck: [card("deck-6", "6", "♦")],
    trump: "♠",
    battle: [],
    attacker: "player-0",
    defender: "player-1",
    phase: "attack",
    limit: 6,
    winner: []
  };
}

test("gazda poate arunca două cărți de aceeași valoare înainte de apărare", async () => {
  const game = await createOnlineHarness();
  game.start();

  game.playerCards().find(card => card.dataset.id.endsWith("-9")).onclick();
  game.playerCards().find(card => card.dataset.id.endsWith("-9")).onclick();

  assert.equal(game.element("playerCount").textContent, "4 cărți");
  assert.equal((game.element("battlefield").innerHTML.match(/class="pair"/g) || []).length, 2);
});

test("multiplayerul pornește cu aceeași ceremonie și aceleași reacții pentru toți", async () => {
  const game = await createOnlineHarness("Avion", { opening: true });
  game.start();

  const openingState = game.guest.sent.findLast(message => message.type === "state").state;
  assert.ok(openingState.opening?.id);
  assert.equal(openingState.opening.reactions.length, openingState.players.length);
  assert.ok(openingState.opening.reactions.every(reaction => reaction.phrase));
});

test("succesorul gazdei primește copia completă necesară continuării", async () => {
  const game = await createOnlineHarness();
  game.start();

  const backup = game.guest.sent.findLast(message => message.type === "hostBackup")?.backup;
  assert.ok(backup);
  assert.equal(backup.state.hostSuccessor, "player-1");
  assert.ok(Array.isArray(backup.state.deck));
  assert.ok(backup.state.players.every(player => Array.isArray(player.hand)));
  assert.ok(backup.sessions.some(([, playerId]) => playerId === "player-1"));
});

test("invitatul poate trimite și el două cărți de aceeași valoare", async () => {
  const game = await createOnlineHarness();
  game.start(0.3);
  const initialState = game.guest.sent.findLast(message => message.type === "state").state;
  const hand = initialState.players.find(player => player.id === "player-1").hand;
  const duplicateRank = hand.find(card => hand.filter(other => other.rank === card.rank).length > 1).rank;
  const pair = hand.filter(card => card.rank === duplicateRank);

  game.guest.emit("data", { type: "action", action: { type: "card", id: pair[0].id } });
  game.guest.emit("data", { type: "action", action: { type: "card", id: pair[1].id } });

  const state = game.guest.sent.findLast(message => message.type === "state").state;
  assert.equal(state.players.find(player => player.id === "player-1").hand.length, 4);
  assert.equal(state.battle.length, 2);
});

test("gazda oprește spamul de comenzi al unui jucător fără să blocheze masa", async () => {
  const game = await createOnlineHarness();
  game.start();

  for (let index = 0; index < 20; index += 1) {
    game.guest.emit("data", { type: "action", action: { type: "card", id: `spam-${index}` } });
  }

  assert.match(
    game.guest.sent.find(message => message.type === "rateLimit")?.message || "",
    /prea multe comenzi|anti-spam/i
  );
});

test("după 30 de secunde gazda joacă automat în locul jucătorului inactiv", async () => {
  const state = threePlayerState([
    [card("host-9", "9")],
    [card("def-10", "10")],
    [card("third-6", "6")]
  ]);
  const game = await createOnlineHarness("Avion", { startState: state, turnTimeoutMs: 20 });
  game.connectGuest("Misha");
  game.start();

  await new Promise(resolve => setTimeout(resolve, 35));

  const view = game.guest.sent.findLast(message => message.type === "state").state;
  assert.equal(view.battle.length, 1);
  assert.equal(view.battle[0].attack.id, "host-9");
  assert.match(view.phase, /attackBatch|defend/);
});

test("atacul inițial în lot respinge o valoare diferită", async () => {
  const game = await createOnlineHarness();
  game.start();
  const firstNine = game.playerCards().find(card => card.dataset.id.endsWith("-9"));
  firstNine.onclick();
  game.playerCards().find(card => !card.dataset.id.endsWith("-9")).onclick();

  assert.equal(game.element("playerCount").textContent, "5 cărți");
  assert.equal((game.element("battlefield").innerHTML.match(/class="pair"/g) || []).length, 1);
});

test("valorile care pot fi adăugate sunt accentuate în mâna jucătorului", async () => {
  const state = threePlayerState([
    [card("host-9a", "9"), card("host-9b", "9", "♥"), card("host-10", "10")],
    [card("def-6", "6")],
    [card("third-7", "7")]
  ]);
  const game = await createOnlineHarness("Avion", { startState: state });
  game.connectGuest("Misha");
  game.start();

  game.playerCards().find(item => item.dataset.id === "host-9a").onclick();

  assert.match(game.playerCards().find(item => item.dataset.id === "host-9b").className, /playable-card/);
  assert.match(game.playerCards().find(item => item.dataset.id === "host-10").className, /not-playable-card/);
});

test("un al treilea jucător poate adăuga o valoare aflată pe masă", async () => {
  const state = threePlayerState([
    [card("host-9", "9")],
    [card("def-10", "10")],
    [card("join-10", "10", "♦")]
  ]);
  const game = await createOnlineHarness("Avion", { startState: state });
  const third = game.connectGuest("Misha");
  game.start();

  game.playerCards()[0].onclick();
  game.element("actionBtn").onclick();
  game.guest.emit("data", { type: "action", action: { type: "card", id: "def-10" } });
  third.emit("data", { type: "action", action: { type: "card", id: "join-10" } });

  const view = third.sent.findLast(message => message.type === "state").state;
  assert.equal(view.battle.length, 2);
  assert.equal(view.players.find(player => player.id === "player-2").hand.length, 0);
});

test("apărătorul nu mai poate face perevod cu aceeași valoare", async () => {
  const state = threePlayerState([
    [card("host-9", "9")],
    [card("transfer-9", "9", "♥")],
    [card("next-6", "6"), card("next-7", "7")]
  ]);
  const game = await createOnlineHarness("Avion", { startState: state });
  const third = game.connectGuest("Misha");
  game.start();

  game.playerCards()[0].onclick();
  game.element("actionBtn").onclick();
  game.guest.emit("data", { type: "action", action: { type: "card", id: "transfer-9" } });

  const view = third.sent.findLast(message => message.type === "state").state;
  assert.equal(view.defender, "player-1");
  assert.equal(view.attacker, "player-0");
  assert.equal(view.phase, "defend");
  assert.deepEqual(Array.from(view.battle, pair => pair.attack.rank), ["9"]);
  assert.equal(view.players.find(player => player.id === "player-1").handCount, 1);
});

test("după «iau», ceilalți pot adăuga înainte ca masa să fie ridicată", async () => {
  const state = threePlayerState([
    [card("host-9", "9")],
    [card("def-6", "6", "♦")],
    [card("join-9", "9", "♥")]
  ]);
  const game = await createOnlineHarness("Avion", { startState: state });
  const third = game.connectGuest("Misha");
  game.start();

  game.playerCards()[0].onclick();
  game.element("actionBtn").onclick();
  game.guest.emit("data", { type: "action", action: { type: "take" } });
  third.emit("data", { type: "action", action: { type: "card", id: "join-9" } });

  const view = third.sent.findLast(message => message.type === "state").state;
  assert.equal(view.phase, "taking");
  assert.equal(view.battle.length, 2);
});

test("fraza și emoția unei mutări sunt identice pentru toți jucătorii", async () => {
  const state = threePlayerState([
    [card("host-9", "9")],
    [card("def-10", "10")],
    [card("third-6", "6")]
  ]);
  const game = await createOnlineHarness("Avion", { startState: state, reactions: true });
  const third = game.connectGuest("Misha");
  game.start();

  game.playerCards()[0].onclick();
  game.element("actionBtn").onclick();
  game.guest.emit("data", { type: "action", action: { type: "card", id: "def-10" } });

  const guestReaction = game.guest.sent.findLast(message => message.type === "state").state.reaction;
  const thirdReaction = third.sent.findLast(message => message.type === "state").state.reaction;
  assert.equal(guestReaction.phrase, "SINCRON-defend");
  assert.equal(thirdReaction.phrase, guestReaction.phrase);
  assert.equal(thirdReaction.emotion, guestReaction.emotion);
  assert.match(game.element("opponents").innerHTML, /SINCRON-defend/);
});

test("jucătorul deconectat primește timp să revină înainte să fie scos", async () => {
  const state = threePlayerState([
    [card("host-9", "9")],
    [card("def-10", "10")],
    [card("third-6", "6")]
  ]);
  const game = await createOnlineHarness("Avion", { startState: state });
  const third = game.connectGuest("Misha");
  game.start();

  game.guest.close();

  const view = third.sent.findLast(message => message.type === "state").state;
  const departed = view.players.find(player => player.id === "player-1");
  assert.equal(departed.disconnected, true);
  assert.equal(departed.left, undefined);
  assert.equal(view.defender, "player-1");
  assert.match(game.element("opponents").innerHTML, /reconectare/);
});

test("jucătorul revine în aceeași mână cu sesiunea lui locală", async () => {
  const state = threePlayerState([
    [card("host-9", "9")],
    [card("def-10", "10")],
    [card("third-6", "6")]
  ]);
  const game = await createOnlineHarness("Avion", { startState: state, reconnectWindowMs: 100 });
  const third = game.connectGuest("Misha");
  game.start();
  game.guest.close();

  const rejoined = game.connectGuest("Avion");

  const view = rejoined.sent.findLast(message => message.type === "state").state;
  assert.equal(view.players.find(player => player.id === "player-1").disconnected, false);
  assert.equal(view.players.find(player => player.id === "player-1").hand[0].id, "def-10");
  assert.equal(third.sent.findLast(message => message.type === "state").state.players.find(player => player.id === "player-1").disconnected, false);
});

test("mesajul explicit de plecare scoate imediat jucătorul din partidă", async () => {
  const state = threePlayerState([
    [card("host-9", "9")],
    [card("def-10", "10")],
    [card("third-6", "6")]
  ]);
  const game = await createOnlineHarness("Avion", { startState: state });
  const third = game.connectGuest("Misha");
  game.start();

  game.guest.emit("data", { type: "leave" });

  const view = third.sent.findLast(message => message.type === "state").state;
  assert.equal(view.players.find(player => player.id === "player-1").left, true);
  assert.doesNotMatch(game.element("opponents").innerHTML, /Avion/);
});

test("personajul aflat la mutare este accentuat pentru toată masa", async () => {
  const state = threePlayerState([
    [card("host-9", "9")],
    [card("def-10", "10")],
    [card("third-6", "6")]
  ]);
  const game = await createOnlineHarness("Avion", { startState: state });
  game.connectGuest("Misha");
  game.start();

  game.playerCards()[0].onclick();
  game.element("actionBtn").onclick();

  const defenderTag = game.element("opponents").innerHTML.match(/<article data-player-id="player-1"[^>]*>/)?.[0] || "";
  assert.match(defenderTag, /active-turn/);
});

test("același nickname nu poate ocupa două locuri în lobby", async () => {
  const game = await createOnlineHarness("Avion");
  const duplicate = game.connectGuest("Avion");
  const lobby = game.element("onlinePlayers").innerHTML;

  assert.equal((lobby.match(/>Avion</g) || []).length, 1);
  assert.match(
    duplicate.sent.find(message => message.type === "error")?.message || "",
    /deja.*lobby/i
  );
});

test("nickname-urile care diferă doar prin spații și majuscule sunt duplicate", async () => {
  const game = await createOnlineHarness("Avion");
  const duplicate = game.connectGuest("  AVION  ");

  assert.equal((game.element("onlinePlayers").innerHTML.match(/>Avion</g) || []).length, 1);
  assert.match(
    duplicate.sent.find(message => message.type === "error")?.message || "",
    /deja.*lobby/i
  );
});

test("gazda poate da afară un invitat din lobby", async () => {
  const game = await createOnlineHarness("Avion");
  const kickButton = game.element("onlinePlayers").querySelectorAll("button[data-kick]")[0];

  assert.equal(kickButton?.textContent, "Dă afară");
  kickButton.onclick();
  await new Promise(resolve => setTimeout(resolve, 150));

  assert.equal(game.guest.closed, true);
  assert.doesNotMatch(game.element("onlinePlayers").innerHTML, />Avion</);
});

test("codul copiat este curățat înainte de conectare", async () => {
  const game = await createOnlineHarness("Prieten", {
    guestMode: true,
    roomCode: " ab-12 3\n",
    joinTimeoutMs: 20
  });

  assert.equal(game.outboundPeerId(), "durak-ab123");
  assert.equal(game.element("copyCode").textContent, "AB123");
});

test("invitatul primește un diagnostic dacă legătura rămâne blocată", async () => {
  const game = await createOnlineHarness("Prieten", {
    guestMode: true,
    roomCode: "ABC123",
    joinTimeoutMs: 20
  });

  await new Promise(resolve => setTimeout(resolve, 35));

  assert.match(
    game.element("networkStatus").textContent,
    /nu s-a putut face legătura|rețeaua.*WebRTC/i
  );
});
