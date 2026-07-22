import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { normalizeVersion, isVersionNewer } = require("../version-check.js");

test("detectează corect o versiune mai nouă", () => {
  assert.equal(isVersionNewer("1.0.1", "1.0.0"), true);
  assert.equal(isVersionNewer("1.1.0", "1.0.9"), true);
  assert.equal(isVersionNewer("2.0.0", "1.99.99"), true);
  assert.equal(isVersionNewer("1.0.0", "1.0.0"), false);
  assert.equal(isVersionNewer("0.9.9", "1.0.0"), false);
});

test("acceptă versiuni scrise și cu prefixul v", () => {
  assert.equal(normalizeVersion(" v1.2.3 "), "1.2.3");
});

test("pagina marchează versiunea curentă și încarcă verificarea de update", async () => {
  const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(page, /id="versionBadge"/);
  assert.match(page, /id="updateNotice"/);
  assert.match(page, /version-check\.js\?v=2\.0\.0" data-version="2\.0\.0"/);
});
