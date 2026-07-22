(() => {
  const nicknameInput = document.getElementById("lobbyNickname");
  const playerList = document.getElementById("lobbyPlayers");
  const onlineName = document.getElementById("onlineName");
  if (!nicknameInput || !playerList) return;

  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const showPlayer = value => {
    const nickname = value.trim().slice(0, 16) || "Jucător";
    const initial = nickname.charAt(0).toUpperCase();
    nicknameInput.value = nickname;
    if (onlineName) onlineName.value = nickname;
    playerList.innerHTML = `<div class="lobby-player-row"><span class="lobby-player-avatar">${escapeHtml(initial)}</span><b>${escapeHtml(nickname)}</b><small>TU</small></div>`;
    return nickname;
  };

  showPlayer(localStorage.getItem("durak_nickname") || nicknameInput.value);
  nicknameInput.addEventListener("input", () => {
    const nickname = showPlayer(nicknameInput.value);
    localStorage.setItem("durak_nickname", nickname);
  });
})();
