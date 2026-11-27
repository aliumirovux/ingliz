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
const DAVRA = require("../js/davra.js");
const MEDAL = require("../js/medal.js");
const YUTUQ = require("../js/yutuq.js");

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

test("js/medal.js: milestones, path and the calendar span of a streak", () => {
  assert.equal(MEDAL.isMilestone(30), true);
  assert.equal(MEDAL.isMilestone(31), false);
  assert.equal(MEDAL.lastMilestone(6), 0);
  assert.equal(MEDAL.lastMilestone(45), 30);
  assert.equal(MEDAL.nextMilestone(30), 60);
  assert.equal(MEDAL.nextMilestone(400), 0);
  assert.deepEqual(MEDAL.pathAround(30), [7, 14, 30, 60, 100]);
  assert.deepEqual(MEDAL.pathAround(7), [7, 14, 30, 60, 100]);
  assert.deepEqual(MEDAL.pathAround(365), [60, 100, 150, 200, 365]);
  assert.equal(MEDAL.uzDate("2026-10-30"), "30-oktabr");
  // 30 practice days ending 28 Nov with one rest day (26 Nov) inside: the span starts on 29 Oct.
  const log = {};
  for (let i = 0; i < 31; i++) { const k = MEDAL.addTo("2026-11-28", -i); if (k !== "2026-11-26") log[k] = { a: 5, t: 600 }; }
  const w = MEDAL.streakWindow(30, "2026-11-28", log, ["2026-11-26"]);
  assert.equal(w.practice, 30);
  assert.equal(w.rest, 1);
  assert.equal(w.start, "2026-10-29");
  assert.equal(w.days.length, 31);
  assert.equal(w.days[w.days.length - 1].min, 10);
  // A gap with no practice and no rest ends the span.
  const short = MEDAL.streakWindow(7, "2026-11-28", { "2026-11-28": { a: 1 }, "2026-11-27": { a: 1 } }, []);
  assert.equal(short.practice, 2);
  assert.equal(short.start, "2026-11-27");
});

test("js/yutuq.js: weeks, journal, streak day and medal categories", () => {
  const W = YUTUQ.weeks("2026-11-28", 12);
  assert.equal(W.length, 12);
  assert.equal(W[11][0], "2026-11-23");              // the last column is the week of 28 Nov, Monday first
  assert.equal(W[11][6], "2026-11-29");
  assert.equal(W[0][0], "2026-09-07");
  const log = { "2026-11-28": { a: 40, ok: 36, t: 840 }, "2026-11-27": { a: 20, ok: 10, t: 300 }, "2026-11-25": { a: 5, ok: 5, t: 30 } };
  const rest = ["2026-11-26"];
  assert.deepEqual(YUTUQ.day("2026-11-28", log, rest, "2026-11-28", "2026-11-25"), { k: "2026-11-28", st: "on", a: 40, pct: 90, min: 14 });
  assert.equal(YUTUQ.day("2026-11-26", log, rest, "2026-11-28", "2026-11-25").st, "rest");
  assert.equal(YUTUQ.day("2026-11-24", log, rest, "2026-11-28", "2026-11-25").st, "pre");
  assert.equal(YUTUQ.day("2026-11-29", log, rest, "2026-11-28", "2026-11-25").st, "fut");
  const J = YUTUQ.journal("2026-11-28", 12, log, rest);
  assert.equal(J.length, 1);                            // nothing before the first practised day
  assert.equal(J[0].lab, "Shu hafta");
  assert.deepEqual(J[0].days.map(x => x.k), ["2026-11-28", "2026-11-27", "2026-11-26", "2026-11-25"]);
  assert.equal(J[0].on, 3);
  assert.equal(YUTUQ.streakDay("2026-11-28", log, rest), 3);   // the rest day keeps the chain but does not count
  assert.equal(YUTUQ.dayTitle("2026-11-27"), "Juma, 27-noyabr");
  const M = YUTUQ.medals({ seriya: 30, soz: 400, unit: 9, fel: 31 }, { soz: 2304, unit: 10, fel: 120 });
  const by = Object.fromEntries(M.map(c => [c.id, c]));
  assert.equal(by.seriya.got, 3); assert.equal(by.seriya.next, 60); assert.equal(by.seriya.left, 30);
  assert.equal(by.soz.got, 4); assert.equal(by.soz.next, 800);
  assert.deepEqual(by.unit.items.map(x => x.m), [1, 3, 6, 9, 10]);   // the level's last unit closes the list
  assert.equal(by.unit.next, 10);
  assert.equal(by.fel.next, 50); assert.equal(by.fel.left, 19);
});

test("js/davra.js: reordered answers, AI reply cleaning, and the order of the mistake round", () => {
  const w = t => t.toLowerCase().split(" ");
  // A time or place phrase moved to the start or the end may be a correct alternative → shown as "being checked".
  assert.equal(DAVRA.moved(w("yesterday i went to school"), w("i went to school yesterday")), true);
  assert.equal(DAVRA.moved(w("i went to school yesterday"), w("yesterday i went to school")), true);
  assert.equal(DAVRA.moved(w("usually i get up at seven"), w("i usually get up at seven")), true);
  assert.equal(DAVRA.moved(w("every day she drinks tea"), w("she drinks tea every day")), true);
  assert.equal(DAVRA.moved(w("in the morning i drink coffee"), w("i drink coffee in the morning")), true);
  // The usual word-order mistakes keep their instant verdict: verb at the end, "Am I…" for "I am…".
  assert.equal(DAVRA.moved(w("i football play"), w("i play football")), false);
  assert.equal(DAVRA.moved(w("he a doctor is"), w("he is a doctor")), false);
  assert.equal(DAVRA.moved(w("am i not on business"), w("i am not on business")), false);
  assert.equal(DAVRA.moved(w("study i am here to"), w("i am here to study")), false);
  // Identical, different words, a swap inside the sentence, too short → plain wrong.
  assert.equal(DAVRA.moved(w("i went to school yesterday"), w("i went to school yesterday")), false);
  assert.equal(DAVRA.moved(w("i go to school yesterday"), w("i went to school yesterday")), false);
  assert.equal(DAVRA.moved(w("where you do live"), w("where do you live")), false);
  assert.equal(DAVRA.moved(w("i never am late"), w("i am never late")), false);
  assert.equal(DAVRA.moved(w("is he"), w("he is")), false);
  assert.equal(DAVRA.moved(w("i went to school"), w("i went to school yesterday")), false);

  assert.equal(DAVRA.clean(null), null);
  assert.equal(DAVRA.clean({ togri: false, izoh: "  " }), null);
  assert.deepEqual(DAVRA.clean({ togri: true, izoh: " Tartib boshqa, ma'no bir xil. ", juft: { xato: "a", togri: "b" }, savol: { uz: "x", en: "y" } }),
    { togri: true, izoh: "Tartib boshqa, ma'no bir xil.", juft: null, savol: null });
  // A reply without a real verdict is unusable: an older server answers this mode with a reason for a mistake that may not exist.
  assert.equal(DAVRA.clean({ izoh: "«works» kerak.", misol: { en: "She reads.", uz: "U o'qiydi." } }), null);
  assert.equal(DAVRA.clean({ togri: "true", izoh: "x" }), null);
  const bad = DAVRA.clean({ togri: false, izoh: "«works» kerak.", juft: { xato: "He work", togri: "He works" },
    savol: { uz: "U tennis o'ynaydi.", en: "She plays tennis.", alt: ["She plays  tennis every day.", "", 7, "a", "b"], chalg: ["play", "two words", "playing", "x", "y"] } });
  assert.deepEqual(bad.juft, { xato: "He work", togri: "He works" });
  assert.deepEqual(bad.savol, { uz: "U tennis o'ynaydi.", en: "She plays tennis.", alt: ["She plays tennis every day.", "7", "a"], chalg: ["play", "playing", "x"] });
  // English the page compares answers with comes without the «» the model uses inside explanations.
  assert.deepEqual(DAVRA.clean({ togri: false, izoh: "«works» kerak.", juft: { xato: "«He work»", togri: "«He works»" }, savol: { uz: "U o'ynaydi.", en: "«She plays tennis.»", alt: ["“She plays tennis”"], chalg: ["«play»"] } }),
    { togri: false, izoh: "«works» kerak.", juft: { xato: "He work", togri: "He works" }, savol: { uz: "U o'ynaydi.", en: "She plays tennis.", alt: ["She plays tennis"], chalg: ["play"] } });
  assert.equal(DAVRA.clean({ togri: false, izoh: "x", juft: { xato: "same", togri: "Same" } }).juft, null);
  assert.equal(DAVRA.clean({ togri: false, izoh: "x", savol: { uz: "Salom", en: "123" } }).savol, null);
  assert.equal(DAVRA.clean({ togri: false, izoh: "x", savol: "She plays" }).savol, null);

  const ok = d => ({ st: "ok", d, seen: false }), wrong = { togri: false, izoh: "x" }, right = { togri: true, izoh: "x" };
  const a = { st: "wait", seen: false }, b = ok(wrong), c = ok(right), f = { st: "fail", seen: false };
  assert.equal(DAVRA.next([]).state, "end");
  assert.deepEqual([DAVRA.next([a, b, c]).state, DAVRA.next([a, b, c]).job], ["why", b], "a ready answer goes before one still being checked");
  b.seen = true;
  assert.deepEqual([DAVRA.next([a, b, c]).state, DAVRA.next([a, b, c]).job], ["alt", c]);
  c.seen = true;
  assert.equal(DAVRA.next([a, b, c, f]).state, "wait");
  a.st = "fail";
  assert.equal(DAVRA.next([a, b, c, f]).state, "fail");
  assert.equal(DAVRA.next([a, b, c, f]).left.length, 2);
  a.seen = f.seen = true;
  assert.equal(DAVRA.next([a, b, c, f]).state, "end");
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
  for (const rel of ["data/stories.js", "data/pictures.js", "js/state.js", "js/fsrs.js", "js/mastery.js", "js/pronounce.js", "js/davra.js", "js/medal.js", "js/yutuq.js", "js/app.js", "sw.js"]) {
    const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.doesNotThrow(() => new Function(code), `Syntax error in ${rel}`);
  }
});
