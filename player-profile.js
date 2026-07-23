(function exposeDurakProfile(root, createProfile) {
  const memoryStorage = (() => {
    const values = new Map();
    return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  })();
  const storage = root.localStorage || memoryStorage;
  const api = createProfile(storage);
  root.DurakProfile = api;
  if (typeof module === "object" && module.exports) {
    module.exports = { ...api, createProfile, COSMETICS: api.cosmetics };
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function createProfile(storage) {
  const KEY = "durak_profile_v1";
  // Garderobă: aspect (avatar), plus categorii separate care nu ating look-ul avatarului -
  // masă, spate de cărți, ramă de avatar și titlu afișat lângă nume.
  const cosmetics = [
    { id: "classic", name: "Clasic", icon: "🙂", price: 0, category: "avatar", look: { accessory: "none", facialHair: "clean-face", tattoo: "none", outfit: "coat" } },
    { id: "kepka", name: "Kepka de mahala", icon: "🧢", price: 70, category: "avatar", look: { accessory: "cap", hairStyle: "buzz-hair", outfit: "sweater", shirt: "#275a76" } },
    { id: "gospodar", name: "Gospodarul", icon: "🐑", price: 120, category: "avatar", look: { accessory: "papakha", facialHair: "beard", outfit: "vest", shirt: "#6b4328" } },
    { id: "punk", name: "Punk de Chișinău", icon: "⚡", price: 170, category: "avatar", look: { accessory: "none", hairStyle: "mohawk-hair", hair: "#8e2525", tattoo: "ink-left", outfit: "sweater", shirt: "#6c4381" } },
    { id: "rege", name: "Regele mesei", icon: "👑", price: 240, category: "avatar", look: { accessory: "crown", facialHair: "mustache", outfit: "coat", shirt: "#7e2940" } },
    { id: "samurai", name: "Samurai de sat", icon: "龍", price: 300, category: "avatar", look: { accessory: "headband", hairStyle: "long-hair", tattoo: "ink-right", outfit: "vest", shirt: "#26364f" } }
  ];
  const tables = [
    { id: "masa-lemn", name: "Masă de lemn", icon: "🪵", price: 0, category: "table", theme: "wood" },
    { id: "masa-rosie", name: "Postav roșu", icon: "🟥", price: 90, category: "table", theme: "red" },
    { id: "masa-albastra", name: "Postav albastru", icon: "🟦", price: 90, category: "table", theme: "blue" },
    { id: "masa-verde", name: "Postav verde de cazino", icon: "🟩", price: 130, category: "table", theme: "casino" }
  ];
  const cardBacks = [
    { id: "spate-clasic", name: "Spate clasic", icon: "🂠", price: 0, category: "cardBack", theme: "classic" },
    { id: "carti-aurii", name: "Cărți aurii", icon: "🎴", price: 150, category: "cardBack", theme: "gold" },
    { id: "carti-argintii", name: "Cărți argintii", icon: "🃏", price: 110, category: "cardBack", theme: "silver" }
  ];
  const frames = [
    { id: "rama-none", name: "Fără ramă", icon: "⬜", price: 0, category: "frame", theme: "none" },
    { id: "rama-argint", name: "Ramă argintie", icon: "🥈", price: 60, category: "frame", theme: "silver" },
    { id: "rama-aur", name: "Ramă aurie", icon: "🥇", price: 160, category: "frame", theme: "gold" }
  ];
  const titles = [
    { id: "titlu-none", name: "Fără titlu", icon: "🚫", price: 0, category: "title", text: "" },
    { id: "titlu-gospodar", name: "„Gospodarul”", icon: "🏷️", price: 100, category: "title", text: "Gospodarul" },
    { id: "titlu-rege", name: "„Regele mesei”", icon: "🏷️", price: 220, category: "title", text: "Regele mesei" }
  ];
  const allCosmetics = [...cosmetics, ...tables, ...cardBacks, ...frames, ...titles];
  const categoryDefaults = { avatar: "classic", table: "masa-lemn", cardBack: "spate-clasic", frame: "rama-none", title: "titlu-none" };
  const allowed = {
    accessory: new Set(["none", "cap", "papakha", "crown", "headband"]),
    hairStyle: new Set(["classic-hair", "buzz-hair", "curly-hair", "mohawk-hair", "long-hair", "bald-hair", "side-hair"]),
    facialHair: new Set(["clean-face", "mustache", "beard", "goatee"]),
    tattoo: new Set(["none", "ink-left", "ink-right"]),
    outfit: new Set(["coat", "sweater", "vest"])
  };
  const defaults = {
    games: 0, victories: 0, first: 0, durak: 0, coins: 60, streak: 0, bestStreak: 0,
    owned: ["classic", "masa-lemn", "spate-clasic", "rama-none", "titlu-none"],
    equipped: { avatar: "classic", table: "masa-lemn", cardBack: "spate-clasic", frame: "rama-none", title: "titlu-none" },
    recorded: []
  };
  let profile = load();
  let cloud = null; // { userId, username } quando conectat la Supabase

  function load() {
    try {
      const saved = JSON.parse(storage.getItem(KEY) || "null");
      if (!saved || typeof saved !== "object") return freshProfile();
      const equipped = normalizeEquipped(saved.equipped);
      return {
        ...defaults,
        ...saved,
        games: Math.max(0, Number(saved.games) || 0),
        victories: Math.max(0, Number(saved.victories) || 0),
        first: Math.max(0, Number(saved.first) || 0),
        durak: Math.max(0, Number(saved.durak) || 0),
        coins: Math.max(0, Number(saved.coins) || 0),
        streak: Math.max(0, Number(saved.streak) || 0),
        bestStreak: Math.max(0, Number(saved.bestStreak) || 0),
        owned: Array.isArray(saved.owned) ? [...new Set([...defaults.owned, ...saved.owned.filter(id => allCosmetics.some(item => item.id === id))])] : [...defaults.owned],
        equipped,
        recorded: Array.isArray(saved.recorded) ? saved.recorded.slice(-60) : []
      };
    } catch {
      return freshProfile();
    }
  }
  function freshProfile() { return { ...defaults, owned: [...defaults.owned], equipped: { ...defaults.equipped }, recorded: [] }; }
  // Compat: profilele vechi aveau `equipped` ca un singur id de avatar (string).
  function normalizeEquipped(value) {
    if (typeof value === "string") return { ...defaults.equipped, avatar: cosmetics.some(c => c.id === value) ? value : "classic" };
    if (value && typeof value === "object") {
      const out = { ...defaults.equipped };
      for (const key of Object.keys(categoryDefaults)) if (typeof value[key] === "string" && itemOf(value[key])) out[key] = value[key];
      return out;
    }
    return { ...defaults.equipped };
  }
  function itemOf(id) { return allCosmetics.find(item => item.id === id); }
  function save() {
    storage.setItem(KEY, JSON.stringify(profile));
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("durak-profile-updated", { detail: snapshot() }));
      render();
    }
    return snapshot();
  }
  function snapshot() { return JSON.parse(JSON.stringify(profile)); }
  function sanitizeLook(look = {}) {
    const clean = {};
    for (const [key, values] of Object.entries(allowed)) if (values.has(look[key])) clean[key] = look[key];
    for (const key of ["shirt", "hair", "skin"]) if (/^#[0-9a-f]{6}$/i.test(look[key] || "")) clean[key] = look[key];
    return clean;
  }
  function publicLook() {
    const cosmetic = cosmetics.find(item => item.id === profile.equipped.avatar) || cosmetics[0];
    const tableItem = itemOf(profile.equipped.table) || tables[0];
    const backItem = itemOf(profile.equipped.cardBack) || cardBacks[0];
    const frameItem = itemOf(profile.equipped.frame) || frames[0];
    const titleItem = itemOf(profile.equipped.title) || titles[0];
    return {
      ...sanitizeLook(cosmetic.look), cosmeticId: cosmetic.id,
      tableTheme: tableItem.theme, cardBackTheme: backItem.theme,
      frameTheme: frameItem.theme, title: titleItem.text || ""
    };
  }
  function recordResult(gameId, place, total) {
    const id = String(gameId || "");
    if (!id || profile.recorded.includes(id)) return snapshot();
    const position = Math.max(1, Math.min(Number(total) || 1, Number(place) || 1));
    const players = Math.max(position, Number(total) || 1);
    profile.recorded = [...profile.recorded, id].slice(-60);
    profile.games += 1;
    if (position < players) profile.victories += 1;
    if (position === 1) profile.first += 1;
    if (position === players) profile.durak += 1;
    profile.coins += position === 1 ? 50 : position === players ? 8 : 25;
    if (position === 1) {
      profile.streak += 1;
      if (profile.streak > profile.bestStreak) profile.bestStreak = profile.streak;
      // Bonus de streak: crește cu fiecare victorie consecutivă, plafonat la +40 monede.
      if (profile.streak >= 2) profile.coins += Math.min(40, (profile.streak - 1) * 10);
    } else {
      profile.streak = 0;
    }
    if (cloud) recordResultCloud(id, position, players);
    return save();
  }
  async function recordResultCloud(gameId, place, total) {
    try {
      const { data, error } = await cloud.client.rpc("record_game_result", { p_game_id: gameId, p_place: place, p_total_players: total });
      if (!error && data && typeof data.coins === "number") { profile.coins = data.coins; save(); }
    } catch { /* rezultatul local rămâne valabil chiar dacă sincronizarea eșuează */ }
  }
  function buy(id) {
    const item = itemOf(id);
    if (!item || profile.owned.includes(id) || profile.coins < item.price) return false;
    profile.coins -= item.price;
    profile.owned.push(id);
    profile.equipped[item.category] = id;
    save();
    if (cloud) buyCloud(id);
    return true;
  }
  async function buyCloud(id) {
    try {
      const { data, error } = await cloud.client.rpc("buy_cosmetic", { p_cosmetic_id: id });
      if (!error && data && typeof data.coins === "number") { profile.coins = data.coins; save(); }
    } catch { /* achiziția locală a avut deja loc; se resincronizează la următoarea autentificare */ }
  }
  function equip(id) {
    const item = itemOf(id);
    if (!item || !profile.owned.includes(id)) return false;
    profile.equipped[item.category] = id;
    save();
    if (cloud) cloud.client.rpc("equip_cosmetic", { p_cosmetic_id: id }).catch(() => {});
    return true;
  }
  function previewHTML(look) {
    return `<div class="bot-avatar ${look.hairStyle || "classic-hair"} ${look.facialHair || "clean-face"}" style="--shirt:${look.shirt || "#7e2940"};--hair:${look.hair || "#251a15"};--skin:${look.skin || "#d9a474"}"><div class="accessory ${look.accessory || "none"}"></div><div class="hair"></div><div class="face"><div class="eye left"><i></i></div><div class="eye right"><i></i></div><div class="nose"></div><div class="mouth"></div><div class="facial-hair"></div><div class="tattoo ${look.tattoo || "none"}">${look.tattoo && look.tattoo !== "none" ? "龍" : ""}</div></div><div class="shoulders ${look.outfit || "coat"}"></div></div>`;
  }

  // ---- Supabase: sincronizare profil, clasament global, istoric ----
  function connectCloud(client, userId, username) { cloud = { client, userId, username }; }
  function disconnectCloud() { cloud = null; }
  async function pullCloudProfile() {
    if (!cloud) return null;
    const { data, error } = await cloud.client.from("profiles").select("coins,owned_cosmetics,equipped_cosmetic,games,wins,losses,first_place,durak_count").eq("id", cloud.userId).maybeSingle();
    if (error || !data) return null;
    profile.coins = Math.max(0, Number(data.coins) || 0);
    profile.games = Math.max(0, Number(data.games) || 0);
    profile.victories = Math.max(0, Number(data.wins) || 0);
    profile.first = Math.max(0, Number(data.first_place) || 0);
    profile.durak = Math.max(0, Number(data.durak_count) || 0);
    if (Array.isArray(data.owned_cosmetics)) profile.owned = [...new Set([...defaults.owned, ...data.owned_cosmetics.filter(id => allCosmetics.some(item => item.id === id))])];
    if (data.equipped_cosmetic && itemOf(data.equipped_cosmetic)) profile.equipped[itemOf(data.equipped_cosmetic).category] = data.equipped_cosmetic;
    save();
    return snapshot();
  }
  async function fetchLeaderboard() {
    if (!cloud) return [];
    const { data, error } = await cloud.client.from("leaderboard").select("username,country,wins,games,first_place,durak_count");
    return error ? [] : (data || []);
  }
  async function fetchMyHistory() {
    if (!cloud) return [];
    const { data, error } = await cloud.client.from("game_history").select("game_id,place,total_players,coins_earned,created_at").eq("user_id", cloud.userId).order("created_at", { ascending: false }).limit(20);
    return error ? [] : (data || []);
  }

  function shopSectionHTML(title, items, categoryLabel) {
    const rows = items.map(item => {
      const owned = profile.owned.includes(item.id), equipped = profile.equipped[item.category] === item.id;
      return `<button class="shop-item ${equipped ? "equipped" : ""}" data-cosmetic="${item.id}" title="${categoryLabel}"><span>${item.icon}</span><b>${item.name}</b><small>${equipped ? "Echipat" : owned ? "Echipează" : `${item.price} 🪙`}</small></button>`;
    }).join("");
    return `<h3>${title}</h3><div class="shop-items">${rows}</div>`;
  }

  function render() {
    if (typeof document === "undefined") return;
    const coins = document.getElementById("profileCoins");
    if (coins) coins.textContent = profile.coins;
    const stats = document.getElementById("profileStats");
    if (stats) stats.innerHTML = `<span><b>${profile.games}</b> partide</span><span><b>${profile.victories}</b> victorii</span><span><b>${profile.first}</b> locul 1</span><span><b>${profile.durak}</b> Durak</span><span><b>${profile.streak}</b> serie curentă</span><span><b>${profile.bestStreak}</b> cea mai bună serie</span>`;
    const preview = document.getElementById("profilePreview");
    if (preview) preview.innerHTML = previewHTML(publicLook());
    const shop = document.getElementById("shopItems");
    if (shop) {
      shop.innerHTML = shopSectionHTML("Avatar", cosmetics, "Aspect avatar")
        + shopSectionHTML("Masă de joc", tables, "Culoare masă")
        + shopSectionHTML("Spate de cărți", cardBacks, "Model spate cărți")
        + shopSectionHTML("Ramă avatar", frames, "Ramă avatar")
        + shopSectionHTML("Titlu", titles, "Titlu afișat lângă nume");
      shop.querySelectorAll("[data-cosmetic]").forEach(button => button.onclick = () => profile.owned.includes(button.dataset.cosmetic) ? equip(button.dataset.cosmetic) : buy(button.dataset.cosmetic));
    }
  }
  function countryFlag(code) {
    const flags = { MD: "🇲🇩", RO: "🇷🇴", IT: "🇮🇹", UA: "🇺🇦", DE: "🇩🇪", GB: "🇬🇧", US: "🇺🇸" };
    return flags[code] || "🏳️";
  }
  async function renderLeaderboard() {
    const hint = document.getElementById("leaderboardHint"), list = document.getElementById("leaderboardList");
    if (!hint || !list) return;
    if (!cloud) { hint.textContent = "Intră în cont pentru a vedea clasamentul global."; list.innerHTML = ""; return; }
    hint.textContent = "Se încarcă…"; list.innerHTML = "";
    const rows = await fetchLeaderboard();
    hint.textContent = rows.length ? "Primii 50 jucători după victorii." : "Clasamentul e gol deocamdată — joacă o partidă!";
    list.innerHTML = rows.map((row, index) => `<div class="leaderboard-row ${row.username === cloud.username ? "me" : ""}"><span class="rank">${index + 1}</span><span class="flag">${countryFlag(row.country)}</span><b>${row.username}</b><span class="lb-stat">${row.wins} victorii</span><span class="lb-stat">${row.games} partide</span></div>`).join("");
  }
  async function renderHistory() {
    const hint = document.getElementById("historyHint"), list = document.getElementById("historyList2");
    if (!hint || !list) return;
    if (!cloud) { hint.textContent = "Intră în cont pentru a-ți vedea istoricul de partide."; list.innerHTML = ""; return; }
    hint.textContent = "Se încarcă…"; list.innerHTML = "";
    const rows = await fetchMyHistory();
    hint.textContent = rows.length ? "Ultimele tale partide." : "N-ai nicio partidă înregistrată încă.";
    list.innerHTML = rows.map(row => `<div class="history-row"><span>${row.place === 1 ? "🥇" : row.place === row.total_players ? "💀" : "▪️"}</span><b>Locul ${row.place}/${row.total_players}</b><span class="lb-stat">+${row.coins_earned} 🪙</span><small>${new Date(row.created_at).toLocaleDateString("ro-RO")}</small></div>`).join("");
  }
  if (typeof document !== "undefined") {
    document.getElementById("profileButton")?.addEventListener("click", () => { document.getElementById("profileModal").hidden = false; render(); });
    document.getElementById("closeProfile")?.addEventListener("click", () => { document.getElementById("profileModal").hidden = true; });
    document.querySelectorAll(".profile-tab").forEach(tab => tab.addEventListener("click", () => {
      document.querySelectorAll(".profile-tab").forEach(other => other.classList.toggle("active", other === tab));
      document.getElementById("shopTab").hidden = tab.dataset.tab !== "shop";
      document.getElementById("leaderboardTab").hidden = tab.dataset.tab !== "leaderboard";
      document.getElementById("historyTab").hidden = tab.dataset.tab !== "history";
      if (tab.dataset.tab === "leaderboard") renderLeaderboard();
      if (tab.dataset.tab === "history") renderHistory();
    }));
    render();
  }
  return {
    cosmetics: allCosmetics, avatarCosmetics: cosmetics, tables, cardBacks, frames, titles,
    snapshot, publicLook, sanitizeLook, recordResult, buy, equip, render,
    connectCloud, disconnectCloud, pullCloudProfile, fetchLeaderboard, fetchMyHistory,
    get isCloudConnected() { return !!cloud; }
  };
});
