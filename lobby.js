(() => {
  const nicknameInput = document.getElementById("lobbyNickname");
  const playerList = document.getElementById("lobbyPlayers");
  const onlineName = document.getElementById("onlineName");
  if (!nicknameInput || !playerList) return;

  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const showPlayer = (value, editingInput = null) => {
    const nickname = value.trim().slice(0, 16) || "Jucător";
    const initial = nickname.charAt(0).toUpperCase();
    if (editingInput !== nicknameInput) nicknameInput.value = nickname;
    if (onlineName && editingInput !== onlineName) onlineName.value = nickname;
    playerList.innerHTML = `<div class="lobby-player-row"><span class="lobby-player-avatar">${escapeHtml(initial)}</span><b>${escapeHtml(nickname)}</b><small>TU</small></div>`;
    return nickname;
  };

  showPlayer(localStorage.getItem("durak_nickname") || nicknameInput.value);
  const saveNickname = (value, editingInput) => {
    const nickname = showPlayer(value, editingInput);
    localStorage.setItem("durak_nickname", nickname);
  };
  const guaranteeSpaceKey = input => input?.addEventListener("keydown", event => {
    if (event.key !== " " && event.code !== "Space") return;
    event.preventDefault();
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.setRangeText(" ", start, end, "end");
    saveNickname(input.value, input);
  });
  nicknameInput.addEventListener("input", () => saveNickname(nicknameInput.value, nicknameInput));
  if (onlineName) onlineName.addEventListener("input", () => saveNickname(onlineName.value, onlineName));
  guaranteeSpaceKey(nicknameInput);
  guaranteeSpaceKey(onlineName);
})();
