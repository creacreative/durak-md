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
  const cosmetics = [
    { id: "classic", name: "Clasic", icon: "🙂", price: 0, look: { accessory: "none", facialHair: "clean-face", tattoo: "none", outfit: "coat" } },
    { id: "kepka", name: "Kepka de mahala", icon: "🧢", price: 70, look: { accessory: "cap", hairStyle: "buzz-hair", outfit: "sweater", shirt: "#275a76" } },
    { id: "gospodar", name: "Gospodarul", icon: "🐑", price: 120, look: { accessory: "papakha", facialHair: "beard", outfit: "vest", shirt: "#6b4328" } },
    { id: "punk", name: "Punk de Chișinău", icon: "⚡", price: 170, look: { accessory: "none", hairStyle: "mohawk-hair", hair: "#8e2525", tattoo: "ink-left", outfit: "sweater", shirt: "#6c4381" } },
    { id: "rege", name: "Regele mesei", icon: "👑", price: 240, look: { accessory: "crown", facialHair: "mustache", outfit: "coat", shirt: "#7e2940" } },
    { id: "samurai", name: "Samurai de sat", icon: "龍", price: 300, look: { accessory: "headband", hairStyle: "long-hair", tattoo: "ink-right", outfit: "vest", shirt: "#26364f" } }
  ];
  const allowed = {
    accessory: new Set(["none", "cap", "papakha", "crown", "headband"]),
    hairStyle: new Set(["classic-hair", "buzz-hair", "curly-hair", "mohawk-hair", "long-hair", "bald-hair", "side-hair"]),
    facialHair: new Set(["clean-face", "mustache", "beard", "goatee"]),
    tattoo: new Set(["none", "ink-left", "ink-right"]),
    outfit: new Set(["coat", "sweater", "vest"])
  };
  const defaults = { games: 0, victories: 0, first: 0, durak: 0, coins: 60, owned: ["classic"], equipped: "classic", recorded: [] };
  let profile = load();

  function load() {
    try {
      const saved = JSON.parse(storage.getItem(KEY) || "null");
      if (!saved || typeof saved !== "object") return { ...defaults, owned: [...defaults.owned], recorded: [] };
      return {
        ...defaults,
        ...saved,
        games: Math.max(0, Number(saved.games) || 0),
        victories: Math.max(0, Number(saved.victories) || 0),
        first: Math.max(0, Number(saved.first) || 0),
        durak: Math.max(0, Number(saved.durak) || 0),
        coins: Math.max(0, Number(saved.coins) || 0),
        owned: Array.isArray(saved.owned) ? [...new Set(["classic", ...saved.owned.filter(id => cosmetics.some(item => item.id === id))])] : ["classic"],
        equipped: cosmetics.some(item => item.id === saved.equipped) ? saved.equipped : "classic",
        recorded: Array.isArray(saved.recorded) ? saved.recorded.slice(-60) : []
      };
    } catch {
      return { ...defaults, owned: [...defaults.owned], recorded: [] };
    }
  }
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
    const cosmetic = cosmetics.find(item => item.id === profile.equipped) || cosmetics[0];
    return { ...sanitizeLook(cosmetic.look), cosmeticId: cosmetic.id };
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
    return save();
  }
  function buy(id) {
    const item = cosmetics.find(cosmetic => cosmetic.id === id);
    if (!item || profile.owned.includes(id) || profile.coins < item.price) return false;
    profile.coins -= item.price;
    profile.owned.push(id);
    profile.equipped = id;
    save();
    return true;
  }
  function equip(id) {
    if (!profile.owned.includes(id) || !cosmetics.some(item => item.id === id)) return false;
    profile.equipped = id;
    save();
    return true;
  }
  function previewHTML(look) {
    return `<div class="bot-avatar ${look.hairStyle || "classic-hair"} ${look.facialHair || "clean-face"}" style="--shirt:${look.shirt || "#7e2940"};--hair:${look.hair || "#251a15"};--skin:${look.skin || "#d9a474"}"><div class="accessory ${look.accessory || "none"}"></div><div class="hair"></div><div class="face"><div class="eye left"><i></i></div><div class="eye right"><i></i></div><div class="nose"></div><div class="mouth"></div><div class="facial-hair"></div><div class="tattoo ${look.tattoo || "none"}">${look.tattoo && look.tattoo !== "none" ? "龍" : ""}</div></div><div class="shoulders ${look.outfit || "coat"}"></div></div>`;
  }
  function render() {
    if (typeof document === "undefined") return;
    const coins = document.getElementById("profileCoins");
    if (coins) coins.textContent = profile.coins;
    const stats = document.getElementById("profileStats");
    if (stats) stats.innerHTML = `<span><b>${profile.games}</b> partide</span><span><b>${profile.victories}</b> victorii</span><span><b>${profile.first}</b> locul 1</span><span><b>${profile.durak}</b> Durak</span>`;
    const preview = document.getElementById("profilePreview");
    if (preview) preview.innerHTML = previewHTML(publicLook());
    const shop = document.getElementById("shopItems");
    if (shop) {
      shop.innerHTML = cosmetics.map(item => {
        const owned = profile.owned.includes(item.id), equipped = profile.equipped === item.id;
        return `<button class="shop-item ${equipped ? "equipped" : ""}" data-cosmetic="${item.id}"><span>${item.icon}</span><b>${item.name}</b><small>${equipped ? "Echipat" : owned ? "Echipează" : `${item.price} 🪙`}</small></button>`;
      }).join("");
      shop.querySelectorAll("[data-cosmetic]").forEach(button => button.onclick = () => profile.owned.includes(button.dataset.cosmetic) ? equip(button.dataset.cosmetic) : buy(button.dataset.cosmetic));
    }
  }
  if (typeof document !== "undefined") {
    document.getElementById("profileButton")?.addEventListener("click", () => { document.getElementById("profileModal").hidden = false; render(); });
    document.getElementById("closeProfile")?.addEventListener("click", () => { document.getElementById("profileModal").hidden = true; });
    render();
  }
  return { cosmetics, snapshot, publicLook, sanitizeLook, recordResult, buy, equip, render };
});
