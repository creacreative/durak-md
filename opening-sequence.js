(function exposeOpeningSequence(root) {
  const emotions = ["happy", "angry", "neutral"];

  function createOpeningTimeline(players, options = {}) {
    const reactionFor = options.reactionFor
      ?? (() => emotions[Math.floor(Math.random() * emotions.length)]);
    const handSize = options.handSize ?? 6;
    const arrivals = players.flatMap((player, order) => [
      { type: "player-enter", playerId: player.id, order, duration: 900 },
      { type: "chair-pull", playerId: player.id, duration: 450 },
      { type: "player-sit", playerId: player.id, duration: 500 },
      { type: "player-reaction", playerId: player.id, emotion: reactionFor(player, order) }
    ]);
    const deals = [];

    for (let cardNumber = 1; cardNumber <= handSize; cardNumber += 1) {
      for (const player of players) {
        deals.push({ type: "deal-card", playerId: player.id, cardNumber });
      }
    }

    return [{ type: "opening-start" }, ...arrivals, ...deals, { type: "opening-complete" }];
  }

  const api = { createOpeningTimeline };
  root.DurakOpening = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
