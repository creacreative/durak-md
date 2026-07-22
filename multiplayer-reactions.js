(function exposeMultiplayerReactions(root) {
  function createMultiplayerReaction(playerId, kind, phraseFor, now = Date.now) {
    const reactionTypes = {
      attack: { phraseKind: "attack", emotion: "laughing" },
      defend: { phraseKind: "laugh", emotion: "laughing" },
      take: { phraseKind: "angry", emotion: "angry" },
      finish: { phraseKind: "laugh", emotion: "laughing" }
    };
    const type = reactionTypes[kind];
    if (!type) return null;
    const speaker = phraseFor || root.DurakMoldovanVocabulary?.say;
    if (!speaker) return null;
    const createdAt = now();
    return {
      id: `${playerId}-${createdAt}`,
      playerId,
      kind,
      emotion: type.emotion,
      phrase: speaker(type.phraseKind),
      expiresAt: createdAt + 3000
    };
  }

  const api = { createMultiplayerReaction };
  root.DurakMultiplayerReactions = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
