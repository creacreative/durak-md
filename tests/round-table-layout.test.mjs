import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("la doi jucători, fiecare se vede jos și adversarul sus", () => {
  const { createTableLayout } = require("../round-table-layout.js");

  assert.deepEqual(createTableLayout([0, 1], 0), [
    { playerId: 0, slot: 0, x: 50, y: 94, angle: 90 },
    { playerId: 1, slot: 1, x: 50, y: 6, angle: 270 }
  ]);
  assert.deepEqual(createTableLayout([0, 1], 1), [
    { playerId: 1, slot: 0, x: 50, y: 94, angle: 90 },
    { playerId: 0, slot: 1, x: 50, y: 6, angle: 270 }
  ]);
});

test("scaunul este tras radial în afara mesei", () => {
  const { chairPullFor } = require("../round-table-layout.js");

  assert.deepEqual(chairPullFor(90), { x: 0, y: 24 });
  assert.deepEqual(chairPullFor(180), { x: -24, y: 0 });
  assert.deepEqual(chairPullFor(270), { x: 0, y: -24 });
});

test("un loc la masa rotundă oferă poziția, intrarea și scaunul în aceeași direcție radială", () => {
  const { seatStyle } = require("../round-table-layout.js");

  assert.equal(
    seatStyle({ playerId: 2, slot: 1, x: 6, y: 50, angle: 180 }),
    "--seat-x:6%;--seat-y:50%;--seat-angle:180deg;--entry-x:-144px;--entry-y:0px;--chair-tuck-x:24px;--chair-tuck-y:0px"
  );
});
