/* Yutuqlar — chosen variant "B · Yutuqlar": a short daily summary after the day counts, a page with
   every day (12-week map + journal + day sheet) and medals in four categories. Pure helpers are shared
   with the tests; the DOM part receives the app's helpers and data as `d` (see yuDeps in app.js). */
(function (root) {
  "use strict";

  const OY = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  const OYQ = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
  const WD = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
  const WDS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
  const dOf = k => new Date(k + "T12:00:00");
  const kOf = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addTo = (k, n) => { const d = dOf(k); d.setDate(d.getDate() + n); return kOf(d); };
  const mondayOf = k => addTo(k, -((dOf(k).getDay() + 6) % 7));
  const dayTitle = k => { const d = dOf(k); return `${WD[d.getDay()]}, ${d.getDate()}-${OY[d.getMonth()]}`; };
  const shortDate = k => { const d = dOf(k); return `${d.getDate()}-${OY[d.getMonth()]}`; };

  // One day: practised (with numbers), rest day, missed, future or before the history started.
  function day(k, log, rest, today, first) {
    const L = log && log[k], on = !!(L && L.a), rs = !on && (rest || []).includes(k);
    const st = k > today ? "fut" : on ? "on" : rs ? "rest" : first && k < first ? "pre" : "miss";
    return { k, st, a: on ? L.a : 0, pct: on ? Math.round((L.ok || 0) / L.a * 100) : 0, min: on ? Math.max(1, Math.round((L.t || 0) / 60)) : 0 };
  }
  const firstDay = log => Object.keys(log || {}).filter(k => log[k] && log[k].a).sort()[0] || "";

  // n weeks (Monday first) ending with the week that holds `end`; oldest week first.
  function weeks(end, n) {
    const m = mondayOf(end), out = [];
    for (let w = n - 1; w >= 0; w--) { const s = addTo(m, -7 * w); out.push(Array.from({ length: 7 }, (_, i) => addTo(s, i))); }
    return out;
  }

  // Journal: newest week first, each with its days newest first (only up to today, not before the history).
  function journal(today, n, log, rest) {
    const first = firstDay(log);
    return weeks(today, n).reverse().map((wk, i) => {
      const days = wk.filter(k => k <= today && (!first || k >= first)).reverse().map(k => day(k, log, rest, today, first));
      const lab = i === 0 ? "Shu hafta" : i === 1 ? "O'tgan hafta" : weekLabel(wk[0], wk[6]);
      return { lab, days, on: days.filter(x => x.st === "on").length, min: days.reduce((a, x) => a + x.min, 0) };
    }).filter(w => w.days.length);
  }
  function weekLabel(a, b) { const x = dOf(a), y = dOf(b); return x.getMonth() === y.getMonth() ? `${x.getDate()}–${y.getDate()}-${OY[y.getMonth()]}` : `${x.getDate()}-${OY[x.getMonth()]} – ${y.getDate()}-${OY[y.getMonth()]}`; }

  // Which day of the streak `k` was: practice days counted back until a day that is neither practice nor rest.
  function streakDay(k, log, rest) {
    const rs = new Set(rest || []); let n = 0, cur = k;
    for (let g = 0; g < 800; g++) { const L = log && log[cur]; if (L && L.a) n++; else if (!rs.has(cur)) break; cur = addTo(cur, -1); }
    return n;
  }

  const CATS = [
    { id: "seriya", t: "Seriya", ms: [7, 14, 30, 60, 100, 150, 200, 365], lab: m => `${m} kun`, full: m => `${m} kunlik seriya`, ring: m => `${m} KUN KETMA-KET` },
    { id: "soz", t: "So'zlar", ms: [50, 100, 200, 400, 800, 1500], lab: m => `${m} ta so'z`, full: m => `${m} ta mustahkam so'z`, ring: m => `${m} MUSTAHKAM SO'Z` },
    { id: "unit", t: "Unitlar", ms: [1, 3, 6, 9, 12], lab: m => `${m} ta unit`, full: m => `${m} ta unit o'tildi`, ring: m => `${m} UNIT O'TILDI` },
    { id: "fel", t: "Fe'llar", ms: [10, 25, 50, 100], lab: m => `${m} ta fe'l`, full: m => `${m} ta mustahkam fe'l`, ring: m => `${m} MUSTAHKAM FE'L` }
  ];
  // Milestones per category for the current counts; a category's ceiling (all words, all units) closes its list.
  function medals(counts, max) {
    return CATS.map(c => {
      const top = max && max[c.id];
      let ms = c.ms.filter(m => !top || m <= top);
      if (top && (!ms.length || ms[ms.length - 1] < top) && top <= c.ms[c.ms.length - 1] * 2) ms = ms.concat(top);
      const have = counts[c.id] || 0, items = ms.map(m => ({ m, got: have >= m }));
      const next = items.find(x => !x.got);
      return Object.assign({}, c, { have, items, got: items.filter(x => x.got).length, next: next ? next.m : 0, left: next ? next.m - have : 0 });
    });
  }

  const core = { dayTitle, shortDate, day, weeks, journal, streakDay, medals, CATS, addTo, firstDay };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.YUTUQ_CORE = core;
  if (typeof document === "undefined") return;

  /* ---------------- browser part ---------------- */
  const SEEN = "ingliz-yutuq", DAILY = "ingliz-kun";
  const ld = (k, f) => { try { return JSON.parse(localStorage.getItem(k) || "null") || f; } catch (e) { return f; } };
  const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const UNITS_IC = SVG('<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2Z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/><path d="M9 7h7"/>');
  const icon = (d, id) => id === "seriya" ? d.ICON.flame : id === "soz" ? d.ICON.book : id === "unit" ? UNITS_IC : (d.ICON.verb || d.ICON.pen);

  // "New" = earned since the medals tab was last opened on this device (first visit starts from the current counts).
  function newCounts(M) {
    let seen = ld(SEEN, null);
    if (!seen) { seen = {}; M.forEach(c => { seen[c.id] = c.got; }); sv(SEEN, seen); }
    const o = {}; M.forEach(c => { o[c.id] = Math.max(0, c.got - (seen[c.id] || 0)); }); return o;
  }
  const markSeen = M => { const s = {}; M.forEach(c => { s[c.id] = c.got; }); sv(SEEN, s); };

  const coin = (d, c, it, cls = "") => {
    const w4 = String(it.m).length > 3 ? " w4" : "";
    if (it.got) return `<span class="yu-cn ${cls}" aria-hidden="true"><span class="ci">${icon(d, c.id)}</span><span class="cv${w4}">${it.m}</span></span>`;
    const p = Math.max(0, Math.min(1, c.have / it.m)), r = 28, L = 2 * Math.PI * r;
    return `<span class="yu-cn lk ${cls}" aria-hidden="true"><svg class="arc" viewBox="0 0 64 64"><circle class="p" cx="32" cy="32" r="${r}" stroke-dasharray="${(L * p).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 32 32)"/></svg><span class="ci">${icon(d, c.id)}</span><span class="cv${w4}">${it.m}</span></span>`;
  };

  /* ---- Bugun: the entry row ---- */
  function rowHTML(d) {
    if (root.MEDAL) MEDAL.defs();
    const M = medals(d.counts, d.max), total = M.reduce((a, c) => a + c.got, 0), nw = newCounts(M), nn = Object.values(nw).reduce((a, b) => a + b, 0);
    const last = M.map(c => { const g = c.items.filter(x => x.got); return g.length ? { c, it: g[g.length - 1] } : null; }).filter(Boolean).slice(0, 3);
    const stk = last.length ? `<span class="stk">${last.map(x => coin(d, x.c, x.it)).join("")}</span>` : `<span class="stk empty">${d.ICON.flame}</span>`;
    return `<a class="yu-row" href="#yutuqlar" aria-label="Yutuqlar: ${total} ta medal${nn ? ", " + nn + " ta yangi" : ""}. Kunlar va medallar">${stk}<span class="tx"><b>Yutuqlar</b><span>${total ? total + " ta medal · kunlar tarixi" : "Kunlar tarixi va medallar"}</span></span>${nn ? `<span class="new">${nn} yangi</span>` : ""}<span class="chev">${d.ICON.chev}</span></a>`;
  }

  /* ---- Bugun: the daily summary, once a day after the day counts; never blocks the page ---- */
  let dailyT = 0;
  function daily(d) {
    const L = d.log[d.today];
    if (!L || !L.a || ld(DAILY, "") === d.today || document.querySelector(".yu-dsum")) return false;
    sv(DAILY, d.today);
    const pct = Math.round((L.ok || 0) / L.a * 100), min = Math.max(1, Math.round((L.t || 0) / 60));
    const el = document.createElement("div");
    el.className = "yu-dsum"; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Bugungi xulosa");
    el.innerHTML = `<span class="dfl">${d.ICON.flame}</span><span class="dtx"><b>${d.streak}-kun hisoblandi</b><span>${L.a} javob · ${pct}% · ${min} daq</span></span><a class="dgo" href="#yutuqlar-kunlar-${d.today}" aria-label="Bugungi kunni ko'rish">Ko'rish</a><button class="dx" type="button" aria-label="Yopish">${d.ICON.x}</button><span class="dtime" aria-hidden="true"><i></i></span><span class="sr-only" aria-live="polite"></span>`;
    document.body.appendChild(el);
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches, DUR = 5000;
    let left = DUR, t0 = 0, held = false;
    const hide = () => { clearTimeout(dailyT); el.classList.remove("on"); setTimeout(() => el.remove(), rm ? 0 : 450); removeEventListener("hashchange", hide); };
    const run = () => { t0 = performance.now(); clearTimeout(dailyT); dailyT = setTimeout(hide, left); el.classList.add("run"); el.classList.remove("hold"); };
    const hold = () => { if (held) return; held = true; left = Math.max(800, left - (performance.now() - t0)); clearTimeout(dailyT); el.classList.add("hold"); };
    const go = () => { if (!held) return; held = false; run(); };
    el.style.setProperty("--dur", DUR + "ms");
    el.addEventListener("pointerenter", hold); el.addEventListener("pointerleave", go);
    el.addEventListener("focusin", hold); el.addEventListener("focusout", e => { if (!el.contains(e.relatedTarget)) go(); });
    el.querySelector(".dx").onclick = hide; el.querySelector(".dgo").addEventListener("click", hide);
    addEventListener("hashchange", hide);
    requestAnimationFrame(() => { el.classList.add("on"); run(); });
    setTimeout(() => { el.querySelector("[aria-live]").textContent = `Bugungi kun hisoblandi: ${d.streak} kun ketma-ket. ${L.a} javob, ${pct} foiz to'g'ri, ${min} daqiqa.`; }, 400);
    return true;
  }

  /* ---- the page ---- */
  function page(d, tab, openDay) {
    if (root.MEDAL) MEDAL.defs();
    const app = d.app, today = d.today, log = d.log, rest = d.rest, first = firstDay(log) || today;
    const M = medals(d.counts, d.max), total = M.reduce((a, c) => a + c.got, 0), nw = newCounts(M);
    let shown = 4, cur = tab === "medallar" ? "medallar" : "kunlar";

    /* 12-week map */
    const W = weeks(today, 12), cells = [], mlab = [];
    W.forEach((wk, i) => { const m0 = dOf(wk[0]).getMonth(); if (i === 0 || dOf(W[i - 1][0]).getMonth() !== m0) mlab.push(`<span class="ml" style="grid-column:${i + 2}">${OYQ[m0]}</span>`); });
    for (let r = 0; r < 7; r++) {
      cells.push(`<span class="wl" style="grid-row:${r + 2}">${r % 2 ? "" : WDS[r]}</span>`);
      W.forEach((wk, c) => {
        const x = day(wk[r], log, rest, today, first), a = x.st === "on" ? (.28 + Math.min(1, x.min / 20) * .44).toFixed(2) : "";
        const lab = x.st === "on" ? `${dayTitle(x.k)}: ${x.min} daqiqa, ${x.a} javob` : x.st === "rest" ? `${dayTitle(x.k)}: dam olish kuni` : x.st === "miss" ? `${dayTitle(x.k)}: mashq qilinmagan` : "";
        const tag = x.st === "fut" || x.st === "pre" ? "span" : "button";
        cells.push(`<${tag} class="yu-hc ${x.st}${x.k === today ? " today" : ""}" style="grid-row:${r + 2};grid-column:${c + 2}${a ? ";--a:" + a : ""}"${tag === "button" ? ` type="button" tabindex="-1" data-k="${x.k}" aria-label="${lab}"` : ' aria-hidden="true"'}>${x.st === "rest" ? d.ICON.moon : ""}</${tag}>`);
      });
    }
    const span = W.flat().filter(k => k <= today && k >= first).map(k => day(k, log, rest, today, first));
    const sumOn = span.filter(x => x.st === "on").length, sumMin = span.reduce((a, x) => a + x.min, 0);
    const hrs = sumMin >= 60 ? `${Math.floor(sumMin / 60)} soat ${sumMin % 60} daq` : `${sumMin} daq`;

    const J = journal(today, 12, log, rest);
    const jRow = x => {
      const dd = dOf(x.k), wd = WDS[(dd.getDay() + 6) % 7];
      const mid = x.st === "on" ? `<b>${WD[dd.getDay()]}${x.k === today ? '<span class="tg">Bugun</span>' : ""}</b><span>${x.a} javob · ${x.pct}%</span>`
        : x.st === "rest" ? `<b>${WD[dd.getDay()]}</b><span>${d.ICON.moon}Dam olish kuni</span>` : `<b>${WD[dd.getDay()]}</b><span>Mashq qilinmagan</span>`;
      const mn = x.st === "on" ? `<span class="mn">${x.min} daq<span class="yu-bar"><i style="width:${Math.min(100, x.min / 25 * 100).toFixed(0)}%"></i></span></span>` : `<span class="mn"></span>`;
      return `<button class="yu-jr ${x.st}" type="button" data-k="${x.k}"><span class="dn"><b>${dd.getDate()}</b><small>${wd}</small></span><span class="mid">${mid}</span>${mn}<span class="chev">${d.ICON.chev}</span></button>`;
    };
    const jHTML = () => J.slice(0, shown).map(w => `<div class="yu-wk"><h3>${w.lab}</h3><span>${w.on} kun · ${w.min} daq</span></div><div class="yu-jl">${w.days.map(jRow).join("")}</div>`).join("")
      + (J.length > shown ? `<button class="yu-more" type="button" id="yumore">Yana ${Math.min(4, J.length - shown)} hafta ko'rsatish</button>` : "");

    /* medals */
    const close = M.filter(c => c.next).sort((a, b) => a.left / a.next - b.left / b.next)[0];
    const tile = (c, it) => `<button class="yu-mt${it.got ? "" : " lk"}" type="button" data-c="${c.id}" data-m="${it.m}" aria-label="${c.full(it.m)}${it.got ? ", olingan" : `, yopiq: ${c.have} / ${it.m}`}">${coin(d, c, it)}<b>${c.lab(it.m)}</b>${it.got && nw[c.id] && c.items.filter(x => x.got).slice(-nw[c.id]).includes(it) ? '<small class="nw">Yangi</small>' : `<small>${it.got ? "Olingan" : `${c.have} / ${it.m}`}</small>`}</button>`;
    const mHTML = `<section class="yu-card yu-mhero"><span class="bn"><b class="big">${total}</b><small>medal</small></span><p>${close ? `Eng yaqini: <b>${close.full(close.next)}</b> — yana ${close.left} ${close.id === "seriya" ? "kun" : "ta"}.` : "Hamma marralarga yetdingiz."}${d.streak ? ` Hozir ${d.streak} kun ketma-ket.` : ""}</p></section>`
      + M.map(c => `<div class="yu-mcat"><h3>${icon(d, c.id)}${c.t}</h3><span>${c.got} / ${c.items.length}</span></div><div class="yu-mg">${c.items.map(it => tile(c, it)).join("")}</div>`).join("");

    app.innerHTML = `${d.nav("#", "Bugun", "Yutuqlar")}
      <div class="yu-seg" role="tablist" aria-label="Yutuqlar bo'limlari"><button type="button" role="tab" id="yut-k" aria-controls="yup-k">Kunlar</button><button type="button" role="tab" id="yut-m" aria-controls="yup-m">Medallar</button></div>
      <div class="yu-pane" id="yup-k" role="tabpanel" aria-labelledby="yut-k">
        <section class="yu-card"><div class="hd"><h2>So'nggi 12 hafta</h2><span>${sumOn} kun · ${hrs}</span></div>
          <div class="yu-hm" role="group" aria-label="12 haftalik xarita: kunni tanlash uchun strelkalar, ochish uchun Enter">${mlab.join("")}${cells.join("")}</div>
          <div class="yu-lgd" aria-hidden="true">Kam<i style="background:rgba(226,122,78,.3)"></i><i style="background:rgba(226,122,78,.5)"></i><i style="background:rgba(226,122,78,.72)"></i>Ko'p<span class="sp"></span>${d.ICON.moon}dam olish</div></section>
        <div id="yujl">${jHTML()}</div>
      </div>
      <div class="yu-pane" id="yup-m" role="tabpanel" aria-labelledby="yut-m">${mHTML}</div>`;

    const tabs = [app.querySelector("#yut-k"), app.querySelector("#yut-m")];
    const setTab = (t, focus) => {
      cur = t; const k = t === "kunlar";
      tabs[0].setAttribute("aria-selected", k); tabs[1].setAttribute("aria-selected", !k); tabs[0].tabIndex = k ? 0 : -1; tabs[1].tabIndex = k ? -1 : 0;
      app.querySelector("#yup-k").hidden = !k; app.querySelector("#yup-m").hidden = k;
      try { history.replaceState(null, "", "#yutuqlar-" + t); } catch (e) {}
      if (!k) markSeen(M);
      if (focus) tabs[k ? 0 : 1].focus();
    };
    tabs.forEach((b, i) => { b.onclick = () => setTab(i ? "medallar" : "kunlar"); b.onkeydown = e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); setTab(cur === "kunlar" ? "medallar" : "kunlar", true); } }; });
    setTab(cur);

    /* map: one tab stop, arrows move by day and week */
    const hcs = [...app.querySelectorAll(".yu-hc[data-k]")], at = k => hcs.find(b => b.dataset.k === k);
    let foc = at(today) || hcs[hcs.length - 1]; if (foc) foc.tabIndex = 0;
    app.querySelector(".yu-hm").addEventListener("keydown", e => {
      const b = e.target.closest(".yu-hc[data-k]"); if (!b) return;
      const step = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[e.key]; if (!step) return;
      e.preventDefault(); let k = b.dataset.k, nb = null;
      for (let i = 0; i < 90 && !nb; i++) { k = addTo(k, step); if (k > today || k < addTo(W[0][0], 0)) break; nb = at(k); }
      if (nb) { b.tabIndex = -1; nb.tabIndex = 0; nb.focus(); foc = nb; }
    });
    app.addEventListener("click", e => {
      const k = e.target.closest("[data-k]"); if (k && app.contains(k)) { daySheet(d, k.dataset.k, k); return; }
      const t = e.target.closest(".yu-mt"); if (t) { const c = M.find(x => x.id === t.dataset.c), it = c.items.find(x => x.m === +t.dataset.m); it.got ? openMedal(d, c, it, t.querySelector(".yu-cn")) : lockSheet(d, c, it, t); return; }
      if (e.target.closest("#yumore")) { shown = Math.min(J.length, shown + 4); app.querySelector("#yujl").innerHTML = jHTML(); const r = app.querySelectorAll(".yu-jl")[shown - 4]; const f = r && r.querySelector("button"); if (f) f.focus(); }
    });
    if (openDay && openDay <= today) setTimeout(() => daySheet(d, openDay, at(openDay) || app.querySelector(`.yu-jr[data-k="${openDay}"]`)), 120);
  }

  /* ---- sheets: the site's own bottom sheet (.qsheet / .qs) ---- */
  function sheet(id, title, body, back, opts) {
    const old = document.getElementById(id); if (old) old.remove();
    const wrap = document.createElement("div"); wrap.id = id; wrap.className = "qsheet ksheet yu-sheet";
    wrap.innerHTML = `<div class="qs-bd" data-x></div><div class="qs ks" role="dialog" aria-modal="true" aria-labelledby="${id}-h"><div class="ks-top"><span class="qs-grab" aria-hidden="true"></span><div class="ks-h"><h2 id="${id}-h" tabindex="-1">${title}</h2><button class="ks-x" type="button" data-x aria-label="Yopish">${SVG('<path d="M18 6 6 18M6 6l12 12"/>')}</button></div></div><div class="ks-body">${body}</div></div>`;
    document.body.appendChild(wrap); if (!opts || !opts.instant) requestAnimationFrame(() => wrap.classList.add("on"));
    const close = () => { wrap.classList.remove("on"); document.removeEventListener("keydown", key, true); setTimeout(() => wrap.remove(), 280); if (back && back.isConnected) back.focus({ preventScroll: true }); };
    const destroy = () => { document.removeEventListener("keydown", key, true); wrap.remove(); };
    const key = e => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const f = [...wrap.querySelectorAll("button:not([disabled]),a[href]")].filter(x => x.offsetParent !== null), i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener("keydown", key, true);
    wrap.querySelectorAll("[data-x]").forEach(x => { x.onclick = close; });
    if (!opts || !opts.instant) setTimeout(() => { const h = wrap.querySelector("h2"); if (h) h.focus({ preventScroll: true }); }, 60);
    else wrap.classList.add("on");
    return { wrap, close, destroy };
  }

  function daySheet(d, k, back, dir) {
    const today = d.today, first = firstDay(d.log) || today, x = day(k, d.log, d.rest, today, first);
    const sk = x.st === "on" || x.st === "rest" ? streakDay(k, d.log, d.rest) : 0;
    const wk = mondayOf(k), restUsed = (d.rest || []).filter(r => mondayOf(r) === wk).length;
    let body = "";
    if (x.st === "on") {
      const ws = d.words(k);
      body = `<p class="yu-sub">${sk ? `Seriyaning ${sk}-kuni` : "Mashq qilingan kun"}</p>
        <div class="yu-st3"><div><b>${x.a}</b><span><i style="background:#E27A4E"></i>javob</span></div><div><b>${x.pct}%</b><span><i style="background:var(--ok-strong,#5FA85A)"></i>to'g'ri</span></div><div><b>${x.min}</b><span><i style="background:#F2B08F"></i>daqiqa</span></div></div>
        ${ws.length ? `<p class="yu-l">O'rganilgan so'zlar · ${ws.length}</p><div class="yu-chips">${ws.slice(0, 18).map(w => `<span title="${d.esc(w.u || "")}" lang="en">${d.esc(w.w)}</span>`).join("")}${ws.length > 18 ? `<span>+${ws.length - 18}</span>` : ""}</div>` : `<p class="yu-note">Bu kuni yangi so'z o'rganilmagan: takrorlash va mashqlar.</p>`}`;
    } else if (x.st === "rest") body = `<p class="yu-sub">Seriyaning ${sk}-kuni oralig'ida</p><p class="yu-note">${d.ICON.moon}<span>Dam olish kuni — seriya uzilmadi. Shu haftada ${restUsed} ta dam olish kuni ishlatilgan (haftasiga 2 ta).</span></p>`;
    else body = `<p class="yu-note">${d.ICON.info || ""}<span>Bu kuni mashq qilinmagan.</span></p>`;
    const prev = addTo(k, -1), next = addTo(k, 1), hasPrev = prev >= first, hasNext = next <= today;
    body += `<div class="yu-pn"><button type="button" data-go="${prev}" data-dir="-1"${hasPrev ? "" : " disabled"}>${d.ICON.back}Oldingi</button><button type="button" data-go="${next}" data-dir="1"${hasNext ? "" : " disabled"}>Keyingi${d.ICON.chev}</button></div>`;
    const s = sheet("yuday", dayTitle(k), body, back, { instant: !!dir });
    s.wrap.querySelectorAll("[data-go]").forEach(b => { b.onclick = () => { const nk = b.dataset.go, cell = (back && back.classList.contains("yu-jr") && document.querySelector(`.yu-jr[data-k="${nk}"]`)) || document.querySelector(`.yu-hc[data-k="${nk}"]`) || document.querySelector(`.yu-jr[data-k="${nk}"]`) || back; s.destroy(); daySheet(d, nk, cell, b.dataset.dir); }; });
    if (dir) { const same = s.wrap.querySelector(`[data-dir="${dir}"]`); (same && !same.disabled ? same : s.wrap.querySelector("h2")).focus({ preventScroll: true }); }
  }

  function lockSheet(d, c, it, back) {
    const left = it.m - c.have, pct = Math.min(100, Math.round(c.have / it.m * 100));
    const how = c.id === "seriya" ? `Har kuni davom etsangiz, ${shortDate(addTo(d.today, left))}da ochiladi. Haftasiga 2 tagacha dam olish kuni seriyani uzmaydi.`
      : c.id === "soz" ? "So'z yozib berilib, uzoq muddatli xotiraga o'tganda mustahkam hisoblanadi." : c.id === "unit" ? "Unit 85% dan oshganda o'tilgan hisoblanadi: so'zlar, grammatika va gap tuzish."
      : "Fe'lning uch shaklini bir necha marta xatosiz yozsangiz, mustahkam bo'ladi.";
    const act = c.id === "soz" ? `<a class="yu-bp" href="#xotira">Xotirani ochish</a>` : c.id === "unit" ? `<a class="yu-bp" href="#unitlar">Unitlarga o'tish</a>` : "";
    const body = `<p class="yu-sub">Hali yopiq</p><div class="yu-lkh">${coin(d, c, it)}<div class="pg"><b>${c.have} / ${it.m}</b><span class="yu-pb"><i style="width:${pct}%"></i></span><span>yana ${left} ${c.id === "seriya" ? "kun" : "ta"}</span></div></div><p class="yu-note">${how}</p>${act}`;
    const s = sheet("yulock", c.full(it.m), body, back);
    s.wrap.querySelectorAll("a[href]").forEach(a => a.addEventListener("click", () => s.wrap.remove()));
  }

  function openMedal(d, c, it, from) {
    if (!root.MEDAL) return;
    const nxt = c.next ? `Keyingisi: <b>${c.full(c.next)}</b> — yana ${c.left} ${c.id === "seriya" ? "kun" : "ta"}` : "Bu toifadagi hamma medallar olindi";
    const lead = c.id === "seriya" ? undefined : c.id === "soz" ? "Uzoq muddatli xotiraga o'tgan, yozib berilgan so'zlar." : c.id === "unit" ? "Unitlar 85% dan oshib o'tildi: so'zlar, grammatika va gap tuzish." : "Noto'g'ri fe'llarning uch shaklini xatosiz yozasiz.";
    MEDAL.open(c.id === "seriya" ? { n: it.m, streak: d.streak, story: false, primary: "Yopish", from, log: d.log, rest: d.rest, today: d.today, onShare: d.share }
      : { n: it.m, streak: d.streak, story: false, primary: "Yopish", from, log: d.log, rest: d.rest, today: d.today, onShare: d.share, emblem: icon(d, c.id), ring: c.ring(it.m), title: c.full(it.m), lead,
        back: `<div class="mdl-bn">${it.m}</div><div class="mdl-bk">${c.t.toUpperCase()}</div><hr><div class="mdl-bs">Hozir: ${c.have} ${c.id === "unit" ? "unit" : "ta"}</div>`, nextHTML: `<p class="mdl-next">${nxt}.</p>`,
        shareText: `Easy English'da yangi medal: ${c.full(it.m)}!` });
  }

  root.YUTUQ = Object.assign({}, core, { rowHTML, daily, page });
})(typeof globalThis !== "undefined" ? globalThis : window);
