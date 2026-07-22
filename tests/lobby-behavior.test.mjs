import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

function element(value = "") {
  const handlers = {};
  return {
    value,
    innerHTML: "",
    selectionStart: value.length,
    selectionEnd: value.length,
    addEventListener(type, handler) { handlers[type] = handler; },
    setRangeText(text, start, end) {
      this.value = this.value.slice(0, start) + text + this.value.slice(end);
      this.selectionStart = this.selectionEnd = start + text.length;
    },
    dispatch(type, event = { target: this }) { handlers[type]?.(event); }
  };
}

test("nickname-ul salvat apare în listă și poate fi schimbat", async () => {
  const source = await readFile(new URL("../lobby.js", import.meta.url), "utf8");
  const nickname = element("Jucător"), players = element(), onlineName = element();
  const values = new Map([["durak_nickname", "Mihai"]]);
  const context = {
    document: { getElementById: id => ({ lobbyNickname: nickname, lobbyPlayers: players, onlineName })[id] ?? null },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  };

  vm.runInNewContext(source, context);
  assert.equal(nickname.value, "Mihai");
  assert.match(players.innerHTML, />Mihai</);

  nickname.value = "Ion";
  nickname.dispatch("input");
  assert.equal(values.get("durak_nickname"), "Ion");
  assert.match(players.innerHTML, />Ion</);
  assert.equal(onlineName.value, "Ion");

  onlineName.value = "Avion";
  onlineName.dispatch("input");
  assert.equal(values.get("durak_nickname"), "Avion");
  assert.equal(nickname.value, "Avion");
  assert.match(players.innerHTML, />Avion</);

  onlineName.value = "Ion ";
  onlineName.dispatch("input");
  assert.equal(onlineName.value, "Ion ");
  onlineName.value += "Vasile";
  onlineName.dispatch("input");
  assert.equal(values.get("durak_nickname"), "Ion Vasile");

  onlineName.value = "";
  onlineName.dispatch("input");
  assert.equal(onlineName.value, "");
  onlineName.value = "Nume Nou";
  onlineName.dispatch("input");
  assert.equal(onlineName.value, "Nume Nou");
  assert.equal(values.get("durak_nickname"), "Nume Nou");

  nickname.value = "alio";
  nickname.selectionStart = nickname.selectionEnd = nickname.value.length;
  let prevented = false;
  nickname.dispatch("keydown", { key: " ", code: "Space", preventDefault() { prevented = true; } });
  nickname.value += "na";
  nickname.dispatch("input");
  assert.equal(prevented, true);
  assert.equal(nickname.value, "alio na");
  assert.equal(values.get("durak_nickname"), "alio na");
});
