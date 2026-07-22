import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("vizitatorul intră direct în lobby și își poate seta nickname-ul", () => {
  assert.match(page, /id="mainMenu"(?![^>]*\bhidden\b)/);
  assert.match(page, /id="lobbyNickname"[^>]*placeholder="Nickname"/);
  assert.match(page, /id="lobbyPlayers"/);
  assert.doesNotMatch(page, /id="authModal"/);
});
