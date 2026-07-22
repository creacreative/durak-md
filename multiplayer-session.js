(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DurakMultiplayerSession = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ranks = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const suits = ["♠", "♥", "♦", "♣"];

  function lobbyStatusFor(playerCount, isHost) {
    if (playerCount < 2) {
      return {
        canStart: false,
        message: "Așteaptă cel puțin un prieten."
      };
    }

    return isHost
      ? { canStart: true, message: `${playerCount}/6 conectați. Poți porni partida.` }
      : { canStart: false, message: `${playerCount}/6 conectați. Așteaptă gazda să pornească.` };
  }

  function shuffledDeck(random = Math.random) {
    const deck = suits.flatMap(suit => ranks.map(rank => ({
      suit,
      rank,
      id: `${suit}-${rank}`
    })));
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }
    return deck;
  }

  function nextPlayerId(players, playerId) {
    const index = players.findIndex(player => player.id === playerId);
    return players[(index + 1) % players.length].id;
  }

  function startGame(lobby, random = Math.random) {
    const deck = shuffledDeck(random);
    const players = lobby.map((player, index) => ({
      id: player.id,
      name: player.name,
      hand: [],
      out: false,
      skin: ["#f1c49b", "#bd7b52", "#8b543b", "#5d392d"][index % 4],
      shirt: ["#7e2940", "#275a76", "#56713b", "#6c4381"][index % 4],
      hair: "#251a15",
      hairStyle: "classic-hair",
      eyeStyle: "round-eyes",
      facialHair: "clean-face",
      tattoo: "none",
      outfit: "coat"
    }));
    let lastCard = null;
    for (let round = 0; round < 6; round += 1) {
      players.forEach(player => {
        lastCard = deck.pop();
        player.hand.push(lastCard);
      });
    }
    const trump = (deck[0] || lastCard).suit;
    let attacker = players[0].id;
    let lowestTrump = Infinity;
    players.forEach(player => player.hand.forEach(card => {
      const value = ranks.indexOf(card.rank);
      if (card.suit === trump && value < lowestTrump) {
        lowestTrump = value;
        attacker = player.id;
      }
    }));
    const defender = nextPlayerId(players, attacker);

    return {
      players,
      deck,
      trump,
      battle: [],
      attacker,
      defender,
      phase: "attack",
      limit: Math.min(6, players.find(player => player.id === defender).hand.length),
      winner: []
    };
  }

  function viewForPlayer(state, playerId, now = Date.now) {
    const { deck, ...publicState } = state;
    return {
      ...publicState,
      sentAt: now(),
      players: state.players.map(player => {
        if (player.id === playerId) return { ...player, hand: [...player.hand] };
        const { hand, ...opponent } = player;
        return { ...opponent, handCount: hand.length };
      }),
      deckCount: deck.length,
      trumpCard: deck[0] || null
    };
  }

  function localizeReactionForClient(view, receivedAt = Date.now()) {
    if (!view || !Number.isFinite(view.sentAt)) return view;
    const localized = { ...view };
    if (Number.isFinite(view.turnDeadline)) {
      localized.turnDeadline = receivedAt + Math.max(0, view.turnDeadline - view.sentAt);
    }
    if (view.reaction && Number.isFinite(view.reaction.expiresAt)) {
      localized.reaction = {
        ...view.reaction,
        expiresAt: receivedAt + Math.max(0, view.reaction.expiresAt - view.sentAt)
      };
    }
    return localized;
  }

  return { lobbyStatusFor, startGame, viewForPlayer, localizeReactionForClient };
});
