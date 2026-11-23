/* Xatolar davrasi (mistake round) of the sentence exercise — pure helpers, shared with the tests.
   The app keeps one job per wrong answer: the AI checks it in the background, and the round
   after the last sentence shows the reason and one new question on the same mistake. */
(function (root) {
  "use strict";

  const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const str = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
  // English to compare or build from: the model may wrap it in «» like it does inside an explanation.
  const eng = (v, n) => str(String(v == null ? "" : v).replace(/[«»“”"]/g, ""), n);

  // Words that open a time or place phrase — the part English may put first or last ("Yesterday I went…", "…every day").
  const ADV = new Set(["yesterday", "today", "tomorrow", "tonight", "now", "then", "usually", "sometimes", "often", "every", "last", "next", "this", "in", "on", "at", "after", "before"]);

  // Same words, with one time or place phrase moved to the start or to the end ("Yesterday I went…" / "…I went yesterday").
  // Such an answer may be a correct alternative, so the app shows it as "being checked" instead of "wrong".
  // Any other reordering — verb at the end, "Am I…" for "I am…" — stays a plain mistake with an instant verdict.
  // got, want: arrays of normalised words.
  function moved(got, want) {
    const n = want.length;
    if (n < 3 || got.length !== n || eq(got, want)) return false;
    if (!eq(got.slice().sort(), want.slice().sort())) return false;
    for (let i = 0; i < n; i++) for (let j = i + 1; j <= n; j++) {
      if (j - i === n || !ADV.has(want[i])) continue;
      const blk = want.slice(i, j), rest = want.slice(0, i).concat(want.slice(j));
      if (eq(blk.concat(rest), got) || eq(rest.concat(blk), got)) return true;
    }
    return false;
  }

  // Sanitises the AI reply for one mistake; null when it cannot be used.
  // { togri, izoh, juft: {xato, togri} | null, savol: {uz, en, alt[], chalg[]} | null }
  function clean(d) {
    if (!d || typeof d !== "object" || typeof d.togri !== "boolean") return null;      // no verdict (e.g. an older server) → unusable
    const izoh = str(d.izoh, 400);
    if (!izoh) return null;
    const out = { togri: d.togri === true, izoh, juft: null, savol: null };
    if (out.togri) return out;
    const jf = d.juft, sv = d.savol;
    if (jf && typeof jf === "object") {
      const x = eng(jf.xato, 80), t = eng(jf.togri, 80);
      if (x && t && x.toLowerCase() !== t.toLowerCase()) out.juft = { xato: x, togri: t };
    }
    if (sv && typeof sv === "object" && str(sv.uz, 200) && /[A-Za-z]/.test(eng(sv.en, 200))) {
      const list = (a, n, one) => (Array.isArray(a) ? a : []).map(x => eng(x, n)).filter(x => x && (!one || !/\s/.test(x))).slice(0, 3);
      out.savol = { uz: str(sv.uz, 200), en: eng(sv.en, 200), alt: list(sv.alt, 200), chalg: list(sv.chalg, 30, true) };
    }
    return out;
  }

  // Which card the round shows next: a ready answer first (in the order of the mistakes),
  // otherwise it waits for the ones still being checked, otherwise it reports the failed ones.
  // jobs: [{ st: "wait" | "ok" | "fail", seen, d }]
  function next(jobs) {
    const left = jobs.filter(j => !j.seen);
    if (!left.length) return { state: "end", job: null, left };
    const ready = left.find(j => j.st === "ok" && j.d);
    if (ready) return { state: ready.d.togri ? "alt" : "why", job: ready, left };
    if (left.some(j => j.st === "wait")) return { state: "wait", job: null, left };
    return { state: "fail", job: null, left };
  }

  const api = { moved, clean, next };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DAVRA = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
