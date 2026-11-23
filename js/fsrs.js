/* FSRS-4.5 (Free Spaced Repetition Scheduler) — easywords.uz uchun yengil, kutubxonasiz modul.
   Har bir so'z uchun stability (fs, kunlarda) va difficulty (fd, 1..10) saqlanadi;
   eski Leitner (b: 0..5) yozuvlari bilan to'liq mos (widget, repetitor va UI uchun b avtomatik yangilanadi). */
(function (root) {
  "use strict";

  const FACTOR = 19 / 81;
  const DECAY = -0.5;
  const INIT_S = { 1: 0.4, 2: 1.0, 3: 2.4, 4: 5.8 };
  const LEGACY_S = [0.5, 1.2, 3.2, 7.5, 15, 32];
  const MAX_IV = 120;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round2 = (v) => Math.round(v * 100) / 100;

  function retrievability(elapsedDays, stability) {
    const s = Math.max(0.2, +stability || 0.4);
    const t = Math.max(0, +elapsedDays || 0);
    return Math.pow(1 + (FACTOR * t) / s, DECAY);
  }

  function stabilityToBox(stability) {
    const s = +stability || 0;
    if (s < 1) return 0;
    if (s < 3) return 1;
    if (s < 7) return 2;
    if (s < 14) return 3;
    if (s < 30) return 4;
    return 5;
  }

  function initFromLegacy(rec) {
    const b = clamp(Math.round(+rec.b || 0), 0, 5);
    const ok = Math.max(0, +rec.ok || 0);
    const bad = Math.max(0, +rec.bad || 0);
    const fs = LEGACY_S[b];
    const fd = clamp(5 + (bad - ok * 0.25) * 0.8, 1.5, 9.5);
    return { fs: round2(fs), fd: round2(fd) };
  }

  /**
   * Keyingi FSRS holatini hisoblaydi.
   * @param {object|null} prev - oldingi SRS yozuvi ({ b, ok, bad, fs, fd })
   * @param {1|2|3|4} rating - 1: Again (xato), 2: Hard (yordam bilan), 3: Good, 4: Easy
   * @param {number} elapsedDays - oxirgi takrorlashdan beri o'tgan kunlar (>=0)
   * @param {object} [opts] - { capUnspelled?: boolean, hinted?: boolean }
   */
  function schedule(prev, rating, elapsedDays, opts) {
    opts = opts || {};
    const r = clamp(Math.round(rating), 1, 4);
    const t = Math.max(0, +elapsedDays || 0);
    const isNew = !prev || ((!prev.ok && !prev.bad) && !prev.fs);

    let fs, fd;
    if (isNew) {
      fs = INIT_S[r];
      fd = clamp(5.0 - (r - 3) * 1.1, 1, 10);
    } else {
      const base = prev.fs > 0 && prev.fd > 0
        ? { fs: +prev.fs, fd: +prev.fd }
        : initFromLegacy(prev);
      const R = retrievability(t, base.fs);
      // Difficulty: mean reversion toward 5.0
      const dRaw = clamp(base.fd - 0.6 * (r - 3), 1, 10);
      fd = clamp(0.05 * 5.0 + 0.95 * dRaw, 1, 10);

      if (r === 1) {
        // Lapse (xato): barqarorlik pasayadi, lekin nolga tushib ketmaydi
        const lapseS = 2.0 * Math.pow(fd, -0.35) * Math.pow(base.fs + 1, 0.2) * Math.exp(0.5 * (1 - R));
        fs = clamp(Math.min(base.fs * 0.35, lapseS), 0.4, Math.max(0.4, base.fs * 0.5));
      } else {
        const hardPen = r === 2 ? 0.65 : 1;
        const easyBon = r === 4 ? 1.3 : 1;
        const inc = Math.exp(1.8) * (11 - fd) * Math.pow(base.fs, -0.18) * (Math.exp(0.9 * (1 - R)) - 1) * hardPen * easyBon;
        // Bir kunda takrorlansa (t=0) ham ozgina o'sish, keyingi kunlarda esa to'liq FSRS o'sishi
        const minStep = t >= 1 ? (r === 2 ? 0.3 : 0.6) : 0.15;
        fs = clamp(base.fs * (1 + Math.max(inc, minStep / Math.max(base.fs, 0.5))), 0.4, MAX_IV);
      }
    }

    if (opts.capUnspelled && r >= 2) {
      fs = Math.min(fs, 5.0);
    }
    if (opts.hinted && r >= 2) {
      fs = Math.min(fs, 2.0);
    }

    const interval = r === 1 ? 1 : clamp(Math.round(fs), 1, MAX_IV);
    let box = r === 1 ? 0 : stabilityToBox(fs);
    if (opts.capUnspelled && r >= 2) box = Math.min(box, 2);
    if (opts.hinted && r >= 2) box = Math.min(box, 1);

    return {
      fs: round2(fs),
      fd: round2(fd),
      interval,
      b: box,
    };
  }

  const api = { FACTOR, DECAY, retrievability, stabilityToBox, initFromLegacy, schedule };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.FSRS = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
