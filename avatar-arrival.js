(function exposeAvatarArrival(root) {
  function walkingBodyHTML() {
    return `<div class="walking-body" aria-hidden="true">
      <div class="walking-shadow"></div>
      <div class="walking-torso"></div>
      <div class="walking-arm left"></div><div class="walking-arm right"></div>
      <div class="walking-leg left"><i></i></div><div class="walking-leg right"><i></i></div>
    </div>`;
  }

  function chairHTML() {
    return `<div class="avatar-chair" aria-hidden="true">
      <div class="chair-back"></div><div class="chair-seat"></div>
      <i class="chair-leg back-left"></i><i class="chair-leg back-right"></i>
      <i class="chair-leg front-left"></i><i class="chair-leg front-right"></i>
    </div>`;
  }

  function outfitStyle(outfit) {
    return outfit === "sweater"
      ? "background:repeating-linear-gradient(90deg,transparent 0 8px,#ffffff2b 8px 12px),var(--shirt)"
      : "";
  }

  function arrivalClass(state) {
    return state === "walking"
      ? "arrival-walking opening-arrived"
      : state === "pulling-chair"
        ? "arrival-pulling-chair opening-arrived"
        : state === "sitting"
          ? "arrival-sitting opening-arrived"
      : state === "seated"
        ? "arrival-seated opening-arrived"
        : state === "ready"
          ? "arrival-ready opening-arrived"
        : "arrival-waiting";
  }

  function seatRoleClass(turn, playerId, attacker, defender, battleActive) {
    if (turn === "opening") return "";
    if (playerId === attacker) return "attacker";
    if (battleActive && playerId === defender) return "defender";
    return "";
  }

  const api = { walkingBodyHTML, chairHTML, outfitStyle, arrivalClass, seatRoleClass };
  root.DurakAvatarArrival = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
