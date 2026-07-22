import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("avatarul care vine la masă are corp întreg", () => {
  const { walkingBodyHTML } = require("../avatar-arrival.js");
  const body = walkingBodyHTML();

  assert.match(body, /class="walking-torso"/);
  assert.equal((body.match(/class="walking-arm /g) ?? []).length, 2);
  assert.equal((body.match(/class="walking-leg /g) ?? []).length, 2);
});

test("personajul full-size are o umbră neutră sub picioare în locul bustului", () => {
  const { walkingBodyHTML } = require("../avatar-arrival.js");
  const html = walkingBodyHTML();

  assert.match(html, /class="walking-shadow"/);
});

test("tricoul cu dungi are un strat de bază opac", () => {
  const { outfitStyle } = require("../avatar-arrival.js");

  assert.equal(
    outfitStyle("sweater"),
    "background:repeating-linear-gradient(90deg,transparent 0 8px,#ffffff2b 8px 12px),var(--shirt)"
  );
});

test("avatarul merge spre locul lui și apoi se așază", () => {
  const { arrivalClass } = require("../avatar-arrival.js");

  assert.equal(arrivalClass("waiting"), "arrival-waiting");
  assert.equal(arrivalClass("walking"), "arrival-walking opening-arrived");
  assert.equal(arrivalClass("pulling-chair"), "arrival-pulling-chair opening-arrived");
  assert.equal(arrivalClass("sitting"), "arrival-sitting opening-arrived");
  assert.equal(arrivalClass("seated"), "arrival-seated opening-arrived");
  assert.equal(arrivalClass("ready"), "arrival-ready opening-arrived");
});

test("scaunul are spătar, șezut și patru picioare", () => {
  const { chairHTML } = require("../avatar-arrival.js");
  const chair = chairHTML();

  assert.match(chair, /class="chair-back"/);
  assert.match(chair, /class="chair-seat"/);
  assert.equal((chair.match(/class="chair-leg /g) ?? []).length, 4);
});

test("rolurile atacă și apără rămân ascunse în timpul ceremoniei", () => {
  const { seatRoleClass } = require("../avatar-arrival.js");

  assert.equal(seatRoleClass("opening", 1, 1, 2, false), "");
  assert.equal(seatRoleClass("humanAttack", 1, 1, 2, false), "attacker");
  assert.equal(seatRoleClass("humanDefend", 2, 1, 2, true), "defender");
});
