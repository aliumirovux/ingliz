import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  clip,
  cors,
  enText,
  hasCronOrAgentAuth,
  safeEq,
  tashkentDay,
  uzText,
} from "../supabase/functions/_shared/common.ts";

const require = createRequire(import.meta.url);
const { fixState, merge, dayDiff, addTo, weekOf } = require("../js/state.js");
const FSRS = require("../js/fsrs.js");
const MASTERY = require("../js/mastery.js");
const PRONOUNCE = require("../js/pronounce.js");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const APP_JS = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8");

test("Edge Functions _shared/common.ts: safeEq and hasCronOrAgentAuth", () => {
  assert.equal(safeEq("abc123", "abc123"), true);
  assert.equal(safeEq("abc123", "abc124"), false);
  assert.equal(safeEq("abc", "abcd"), false);
  assert.equal(safeEq("", ""), false);

  const prevCron = process.env.CRON_KEY;
  const prevAgent = process.env.AGENT_KEY;
  try {
    process.env.CRON_KEY = "cron-secret-xyz";
    process.env.AGENT_KEY = "agent-secret-abc";

    const okCron = new Request("https://example.com", { headers: { "x-cron-key": "cron-secret-xyz" } });
    const okAgent = new Request("https://example.com", { headers: { "x-agent-key": "agent-secret-abc" } });
    const bad = new Request("https://example.com", { headers: { "x-cron-key": "wrong" } });
    const empty = new Request("https://example.com");

    assert.equal(hasCronOrAgentAuth(okCron), true);
    assert.equal(hasCronOrAgentAuth(okAgent), true);
    assert.equal(hasCronOrAgentAuth(bad), false);
    assert.equal(hasCronOrAgentAuth(empty), false);
  } finally {
    if (prevCron === undefined) delete process.env.CRON_KEY; else process.env.CRON_KEY = prevCron;
    if (prevAgent === undefined) delete process.env.AGENT_KEY; else process.env.AGENT_KEY = prevAgent;
  }
});

test("Edge Functions _shared/common.ts: cors, clip, enText, uzText, tashkentDay", () => {
  assert.equal(cors("https://easywords.uz")["Access-Control-Allow-Origin"], "https://easywords.uz");
  assert.equal(cors("https://evil.example")["Access-Control-Allow-Origin"], "https://easywords.uz");
  assert.equal(clip("  hello   world  ", 10), "hello worl");
  assert.equal(enText("Hello world", 50), "Hello world");
  assert.equal(enText("Привет", 50), "");
  assert.equal(uzText("Salom, yaxshimisiz?", 50), "Salom, yaxshimisiz?");
  assert.equal(uzText("Салом", 50), "");
  assert.match(tashkentDay(), /^\d{4}-\d{2}-\d{2}$/);
});

test("js/state.js fixState() & date helpers: sanitizes corrupt state and preserves FSRS fields", () => {
  assert.equal(dayDiff("2026-11-20", "2026-11-23"), 3);
  assert.equal(addTo("2026-11-23", 7), "2026-11-30");
  assert.equal(weekOf("2026-11-23"), "2026-11-23");

  const clean = fixState({
    srs: {
      "1|hello": { b: 99, due: "2026-11-23", ok: 3, bad: -5, fs: 12.345, fd: 4.567 },
      "1|badfs": { b: 1, due: "2026-11-23", ok: 1, bad: 0, fs: -2, fd: 99 },
      broken: null,
    },
    pat: { p1: 4, bad: "x" },
    streak: { last: "not-a-date", n: -3, best: 7 },
    vb: { lvl: "unknown", goal: 999, known: { apple: "2026-11-20" }, learn: ["apple", "book", "book"] },
  });
  assert.equal(clean.srs["1|hello"].b, 5);
  assert.equal(clean.srs["1|hello"].bad, 0);
  assert.equal(clean.srs["1|hello"].fs, 12.35);
  assert.equal(clean.srs["1|hello"].fd, 4.57);
  assert.equal("fs" in clean.srs["1|badfs"], false);
  assert.equal("fd" in clean.srs["1|badfs"], false);
  assert.equal("broken" in clean.srs, false);
  assert.equal(clean.vb.goal, 10);
  assert.deepEqual(clean.vb.learn, ["book"]);
});

test("js/state.js merge(): merges multi-device progress and tombstone/untomb records", () => {
  const now = Date.now();
  const devA = fixState({
    srs: {
      "1|hello": { b: 2, ok: 3, bad: 0, due: "2026-11-25", ls: "2026-11-22", fs: 4.2, fd: 4.8 },
      "1|city": { b: 1, ok: 1, bad: 0, due: "2026-11-24", ls: "2026-11-22" },
    },
    streak: { last: "2026-11-22", n: 4, best: 4 },
    my: [{ id: "my|coffee", w: "coffee", u: "qahva" }],
    del: { "srs:1|city": now },
  });
  const devB = fixState({
    srs: {
      "1|hello": { b: 3, ok: 4, bad: 1, due: "2026-11-28", ls: "2026-11-23", fs: 9.5, fd: 5.1 },
      "1|city": { b: 1, ok: 1, bad: 0, due: "2026-11-24", ls: "2026-11-22" },
    },
    streak: { last: "2026-11-23", n: 5, best: 5 },
    my: [{ id: "my|tea", w: "tea", u: "choy" }],
    del: {},
  });

  const m = merge(devA, devB);
  assert.equal(m.srs["1|hello"].b, 3);
  assert.equal(m.srs["1|hello"].fs, 9.5);
  assert.equal("1|city" in m.srs, false);
  assert.equal(m.streak.n, 5);
  assert.equal(m.my.length, 2);

  const devC = fixState({
    srs: { "1|city": { b: 1, ok: 1, bad: 0, due: "2026-11-26", ls: "2026-11-23" } },
    del: { "srs:1|city": -(now + 5000) },
  });
  const m2 = merge(m, devC);
  assert.equal("1|city" in m2.srs, true);
});

test("js/fsrs.js: new word, review growth, lapse, caps, and legacy migration", () => {
  const s1 = FSRS.schedule(null, 3, 0);
  assert.ok(s1.fs >= 2 && s1.interval >= 2);
  assert.equal(s1.b, 1);

  const s2 = FSRS.schedule({ fs: s1.fs, fd: s1.fd, ok: 1, bad: 0, b: s1.b }, 3, 3);
  assert.ok(s2.fs > s1.fs);
  assert.ok(s2.interval > s1.interval);

  const lapse = FSRS.schedule({ fs: 15, fd: 5, ok: 5, bad: 0, b: 4 }, 1, 14);
  assert.equal(lapse.interval, 1);
  assert.equal(lapse.b, 0);
  assert.ok(lapse.fs < 15 && lapse.fs >= 0.4);

  const unsp = FSRS.schedule({ fs: 10, fd: 4, ok: 3, bad: 0, b: 3 }, 3, 10, { capUnspelled: true });
  assert.ok(unsp.b <= 2 && unsp.fs <= 5);
  const hnt = FSRS.schedule({ fs: 10, fd: 4, ok: 3, bad: 0, b: 3 }, 2, 10, { hinted: true });
  assert.ok(hnt.b <= 1 && hnt.fs <= 2);

  const leg = FSRS.schedule({ b: 3, ok: 4, bad: 0 }, 3, 7);
  assert.ok(leg.fs > 7.5 && leg.b >= 3);
});

test("js/mastery.js: marks topic mastered after 2+ clean calls", () => {
  const calls = [
    { id: "c4", day: "2026-11-23", fixes: [{ topic: "art", you: "a apple", fix: "an apple" }], off: [] },
    { id: "c3", day: "2026-11-22", fixes: [{ topic: "past", you: "I go", fix: "I went" }], off: [0] },
    { id: "c2", day: "2026-11-21", fixes: [], off: [] },
    { id: "c1", day: "2026-11-20", fixes: [{ topic: "past", you: "I eat", fix: "I ate" }], off: [] },
  ];
  const res = MASTERY.computeMastery(calls, 2);
  assert.equal(res.mastered.length, 1);
  assert.equal(res.mastered[0].topic, "past");
  assert.equal(res.mastered[0].cleanStreak, 3);
  assert.equal(res.active.length, 1);
  assert.equal(res.active[0].topic, "art");
  assert.equal(res.active[0].cleanStreak, 0);
});

test("js/pronounce.js: packs structure and speech evaluation (target vs confusable pair)", () => {
  assert.equal(PRONOUNCE.PACKS.length, 4);
  for (const p of PRONOUNCE.PACKS) {
    assert.ok(p.items.length >= 6, `${p.id} should have at least 6 items`);
  }
  assert.deepEqual(PRONOUNCE.evaluate("I think so", "think", "sink"), { ok: true, confused: false, heard: "i think so" });
  assert.deepEqual(PRONOUNCE.evaluate("sink", "think", "sink"), { ok: false, confused: true, heard: "sink" });
  assert.deepEqual(PRONOUNCE.evaluate("hello", "think", "sink"), { ok: false, confused: false, heard: "hello" });
});

test("All versioned assets (?v=HASH) in index.html and js/app.js exist and match SHA-1", () => {
  const pat = /["']((?:data|styles|js)\/[^"'?]+\.(?:js|css))\?v=([0-9a-f]+)["']/g;
  const all = [...HTML.matchAll(pat), ...APP_JS.matchAll(pat)];
  assert.ok(all.length >= 16, "Expected at least 16 versioned assets (data, styles, js)");
  for (const [, asset, hash] of all) {
    const filePath = path.join(ROOT, asset);
    assert.ok(fs.existsSync(filePath), `${asset} not found`);
    const actual = crypto.createHash("sha1").update(fs.readFileSync(filePath)).digest("hex").slice(0, 8);
    assert.equal(actual, hash, `${asset} hash mismatch (run python3 tools/versiya.py)`);
  }
});

test("All JS files parse without syntax errors", () => {
  for (const rel of ["data/stories.js", "data/pictures.js", "js/state.js", "js/fsrs.js", "js/mastery.js", "js/pronounce.js", "js/app.js", "sw.js"]) {
    const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.doesNotThrow(() => new Function(code), `Syntax error in ${rel}`);
  }
});
