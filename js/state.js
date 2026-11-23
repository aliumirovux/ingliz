/* State sanitization, multi-device merge engine, and calendar date helpers. */
(function (root) {
  "use strict";

  const dOf = k => new Date(k + "T12:00:00");
  const kOf = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const dayDiff = (a, b) => Math.round((dOf(b) - dOf(a)) / 864e5);
  const addTo = (k, n) => { const d = dOf(k); d.setDate(d.getDate() + n); return kOf(d); };
  const weekOf = k => { const d = dOf(k); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return kOf(d); };

  function fixState(o) {
    const obj = v => v && typeof v === "object" && !Array.isArray(v) ? v : {}, arr = v => Array.isArray(v) ? v : [];
    const num = v => Number.isFinite(+v) && +v >= 0 ? +v : 0, day = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
    o = obj(o); const s = Object.assign({}, o);
    s.srs = {}; Object.entries(obj(o.srs)).forEach(([k, r]) => {
      if (r && typeof r === "object") {
        const clean = Object.assign({}, r, { b: Math.min(5, Math.round(num(r.b))), due: day(r.due) ? r.due : "", ok: num(r.ok), bad: num(r.bad), sp: num(r.sp) });
        if (r.fs != null) { const fs = +r.fs; if (Number.isFinite(fs) && fs > 0) clean.fs = Math.min(180, Math.round(fs * 100) / 100); else delete clean.fs; }
        if (r.fd != null) { const fd = +r.fd; if (Number.isFinite(fd) && fd >= 1 && fd <= 10) clean.fd = Math.round(fd * 100) / 100; else delete clean.fd; }
        s.srs[k] = clean;
      }
    });
    s.pat = {}; Object.entries(obj(o.pat)).forEach(([k, v]) => { if (v != null && Number.isFinite(+v)) s.pat[k] = Math.max(0, +v); });
    s.gr = {}; Object.entries(obj(o.gr)).forEach(([k, r]) => { if (r && typeof r === "object") s.gr[k] = { b: Math.min(5, Math.round(num(r.b))), due: day(r.due) ? r.due : "" }; });
    s.log = {}; Object.entries(obj(o.log)).forEach(([k, r]) => { if (day(k) && r && typeof r === "object") s.log[k] = r; });
    s.mis = {}; Object.entries(obj(o.mis)).forEach(([k, v]) => { if (day(v)) s.mis[k] = v; });
    s.conf = {}; Object.entries(obj(o.conf)).forEach(([k, v]) => { if (v && typeof v === "object" && typeof v.a === "string" && typeof v.b === "string") s.conf[k] = Object.assign({}, v, { n: Math.round(num(v.n)) || 1, d: day(v.d) ? v.d : "" }); });
    s.hook = {}; Object.entries(obj(o.hook)).forEach(([k, v]) => { if (typeof v === "string" && v.trim()) s.hook[k] = v; });
    s.story = obj(o.story);
    s.read = {}; Object.entries(obj(o.read)).forEach(([k, v]) => { if (v && typeof v === "object") s.read[k] = { p: Math.round(num(v.p)), done: day(v.done) ? v.done : "" }; });
    s.guide = {}; Object.entries(obj(o.guide)).forEach(([k, v]) => { if (day(v)) s.guide[k] = v; });
    s.my = arr(o.my).filter(m => m && typeof m.w === "string" && m.w.trim() && typeof m.u === "string").map(m => Object.assign({}, m, { id: typeof m.id === "string" && m.id ? m.id : "my|" + m.w.trim().toLowerCase() }));
    const st = obj(o.streak); s.streak = { last: day(st.last) ? st.last : "", n: Math.round(num(st.n)), best: Math.round(num(st.best)) };
    s.rest = arr(o.rest).filter(day);
    if (o.cls !== undefined) s.cls = arr(o.cls).filter(n => Number.isInteger(n) && n >= 0 && n < 7);
    s.course = Number.isInteger(o.course) && o.course > 0 ? o.course : 0;
    s.level = typeof o.level === "string" ? o.level : "";
    { const v = obj(o.vb), kn = {}; Object.entries(obj(v.known)).forEach(([k, d]) => { if (typeof k === "string" && k && day(d)) kn[k] = d; });
      const dd = obj(v.day);
      s.vb = { lvl: ["easy", "mid", "hard"].includes(v.lvl) ? v.lvl : "", goal: [5, 10, 15, 25, 50].includes(+v.goal) ? +v.goal : 10, known: kn,
        learn: [...new Set(arr(v.learn).filter(x => typeof x === "string" && x && !kn[x]))], day: day(dd.d) ? { d: dd.d, n: Math.round(num(dd.n)) } : { d: "", n: 0 } }; }
    s.ms = num(o.ms);
    { const lim = Date.now() - 200 * 864e5; s.del = Object.fromEntries(Object.entries(obj(o.del)).filter(([k, v]) => k.includes(":") && Number.isFinite(v) && v !== 0 && Math.abs(v) > lim).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 800)); }
    if (o.lost && (typeof o.lost !== "object" || !day(o.lost.d))) delete s.lost;
    return s;
  }

  function merge(a, b) {
    const out = { srs: {}, pat: {}, streak: { last: "", n: 0 } };
    const as = a.srs || {}, bs = b.srs || {}, nx = r => (r.ok || 0) + (r.bad || 0);
    new Set(Object.keys(as).concat(Object.keys(bs))).forEach(id => {
      const x = as[id], y = bs[id];
  
      out.srs[id] = !x ? y : !y ? x : nx(y) !== nx(x) ? (nx(y) > nx(x) ? y : x) : ((y.ls || "") > (x.ls || "") ? y : x);
    });
    const ap = a.pat || {}, bp = b.pat || {};
    new Set(Object.keys(ap).concat(Object.keys(bp))).forEach(k => { out.pat[k] = Math.max(ap[k] || 0, bp[k] || 0); });
    const sa = a.streak || {}, sb = b.streak || {};
    out.streak = (sb.last || "") > (sa.last || "") ? sb : (sa.last ? sa : out.streak);
    out.course = Math.max(a.course || 0, b.course || 0);
    out.rest = [...new Set((a.rest || []).concat(b.rest || []))].sort().slice(-40);
    out.story = Object.assign({}, a.story || {}, b.story || {});
    { const ra = a.read || {}, rb = b.read || {}; out.read = {}; new Set(Object.keys(ra).concat(Object.keys(rb))).forEach(k => { const x = ra[k] || {}, y = rb[k] || {}; out.read[k] = { p: Math.max(x.p || 0, y.p || 0), done: x.done || y.done || "" }; }); }
    { const ta = a.tl || {}, tb = b.tl || {}; out.tl = {};
      new Set(Object.keys(ta).concat(Object.keys(tb))).forEach(k => { const x = ta[k] || {}, y = tb[k] || {};
        const w = [...new Set((x.w || []).concat(y.w || []))], px = x.pass || 1, py = y.pass || 1;
        if (px !== py) { out.tl[k] = Object.assign({}, px > py ? x : y, { w }); return; }
        const nw = (y.at || 0) >= (x.at || 0) ? y : x;
        out.tl[k] = Object.assign({}, x, y, { i: Math.max(x.i || 0, y.i || 0), done: !!(x.done || y.done), at: Math.max(x.at || 0, y.at || 0), w, r: nw.r, pct: nw.pct != null ? nw.pct : (x.pct != null ? x.pct : y.pct) }); }); }
    out.guide = Object.assign({}, a.guide || {}, b.guide || {});
    out.cls = b.cls || a.cls; out.ms = Math.max(a.ms || 0, b.ms || 0);
  
    { const mx = (x, y) => ((x || "") > (y || "") ? x : y) || undefined; out.clsAsk = mx(a.clsAsk, b.clsAsk); out.wkSum = mx(a.wkSum, b.wkSum); }
    out.lvc = Object.assign({}, b.lvc || {}, a.lvc || {});
    out.level = b.level || a.level || "";
    if (a.lost) out.lost = a.lost;
    const ag = a.gr || {}, bg = b.gr || {}; out.gr = {};
    new Set(Object.keys(ag).concat(Object.keys(bg))).forEach(k => { const x = ag[k], y = bg[k]; out.gr[k] = !x ? y : !y ? x : (y.due > x.due ? y : x); });
    out.mis = Object.assign({}, a.mis || {}, b.mis || {});
    out.hook = Object.assign({}, a.hook || {}, b.hook || {});
  
    { const ga = a.goal, gb = b.goal; let g = !ga ? gb : !gb ? ga : (gb.up || 0) >= (ga.up || 0) ? gb : ga;
      if (ga && gb && ga.id === gb.id && ga.at === gb.at) g = Object.assign({}, g, { days: [...new Set((ga.days || []).concat(gb.days || []))].sort().slice(-14) });
      if (g) out.goal = g;
      const h = {}; (a.goalH || []).concat(b.goalH || []).forEach(x => { h[x.id + "|" + x.at] = x; }); out.goalH = Object.values(h).sort((x, y) => (x.at < y.at ? -1 : 1)).slice(-12); }
    { const ia = a.irr || {}, ib = b.irr || {}; out.irr = { best: Math.max(+ia.best || 0, +ib.best || 0), sp: (ia.sp || "") > (ib.sp || "") ? ia.sp || "" : ib.sp || "" }; }
    { const ca = a.conf || {}, cb = b.conf || {}; out.conf = {}; new Set(Object.keys(ca).concat(Object.keys(cb))).forEach(k => { const x = ca[k], y = cb[k]; out.conf[k] = !x ? y : !y ? x : ((y.n || 0) > (x.n || 0) || ((y.n || 0) === (x.n || 0) && (y.d || "") > (x.d || "")) ? y : x); }); }
    const my = new Map(); (a.my || []).concat(b.my || []).forEach(m => my.set(m.id, m)); out.my = [...my.values()];
    { const va = a.vb || {}, vb = b.vb || {}, kn = Object.assign({}, va.known || {}, vb.known || {});
      out.vb = { lvl: vb.lvl || va.lvl || "", goal: vb.goal || va.goal || 10, known: kn, learn: [...new Set((va.learn || []).concat(vb.learn || []))], day: (vb.day && va.day && (vb.day.d || "") >= (va.day.d || "")) ? vb.day : va.day || vb.day }; }
    const al = a.log || {}, bl = b.log || {}; out.log = {};
    new Set(Object.keys(al).concat(Object.keys(bl))).forEach(k => { const x = al[k], y = bl[k]; out.log[k] = !x ? y : !y ? x : (y.a > x.a ? y : x); });
  
    const ad = a.del || {}, bd = b.del || {}; out.del = {};
    new Set(Object.keys(ad).concat(Object.keys(bd))).forEach(k => { const x = ad[k] || 0, y = bd[k] || 0; out.del[k] = Math.abs(y) > Math.abs(x) ? y : x; });
    Object.entries(out.del).forEach(([k, v]) => {
      if (!(v > 0)) return;
      const i = k.indexOf(":"), ns = k.slice(0, i), id = k.slice(i + 1);
      if (ns === "mis") delete out.mis[id];
      else if (ns === "hook") delete out.hook[id];
      else if (ns === "srs") delete out.srs[id];
      else if (ns === "my") out.my = out.my.filter(m => m.id !== id);
      else if (ns === "vbk") delete out.vb.known[id];
    });
    out.vb.learn = out.vb.learn.filter(x => !out.vb.known[x]);
    return out;
  }

  const api = { dOf, kOf, dayDiff, addTo, weekOf, fixState, merge };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.EE_STATE = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
