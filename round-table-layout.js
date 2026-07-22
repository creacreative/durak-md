(function exposeRoundTableLayout(root) {
  const round = value => {
    const result = Math.round(value * 100) / 100;
    return Object.is(result, -0) ? 0 : result;
  };

  function createTableLayout(playerIds, viewerId = playerIds[0]) {
    const ordered = [viewerId, ...playerIds.filter(id => id !== viewerId)];
    return ordered.map((playerId, slot) => {
      const angle = 90 + slot * (360 / ordered.length);
      const radians = angle * Math.PI / 180;
      return {
        playerId,
        slot,
        x: round(50 + Math.cos(radians) * 44),
        y: round(50 + Math.sin(radians) * 44),
        angle: round(angle % 360)
      };
    });
  }

  function chairPullFor(angle, distance = 24) {
    const radians = angle * Math.PI / 180;
    return {
      x: round(Math.cos(radians) * distance),
      y: round(Math.sin(radians) * distance)
    };
  }

  function seatStyle(seat) {
    const pull = chairPullFor(seat.angle);
    const entry = chairPullFor(seat.angle, 144);
    return [
      `--seat-x:${seat.x}%`,
      `--seat-y:${seat.y}%`,
      `--seat-angle:${seat.angle}deg`,
      `--entry-x:${entry.x}px`,
      `--entry-y:${entry.y}px`,
      `--chair-tuck-x:${-pull.x}px`,
      `--chair-tuck-y:${-pull.y}px`
    ].join(";");
  }

  const api = { createTableLayout, chairPullFor, seatStyle };
  root.DurakRoundTable = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
