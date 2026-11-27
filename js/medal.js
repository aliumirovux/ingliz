/* Seriya medali (streak milestone moment) — chosen variant "B · Yo'l".
   On a milestone day (7, 14, 30, 60, 100 …) the streak's days light up in a small calendar, fold into a
   CSS-3D medal the learner can spin, and the path to the next milestone is shown. Pure helpers are shared
   with the tests; the DOM part runs only in the browser. */
(function (root) {
  "use strict";

  const MS = [7, 14, 30, 60, 100, 150, 200, 365];
  const OY = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  const dOf = k => new Date(k + "T12:00:00");
  const kOf = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addTo = (k, n) => { const d = dOf(k); d.setDate(d.getDate() + n); return kOf(d); };
  const isMilestone = n => MS.includes(n);
  const lastMilestone = n => MS.reduce((m, x) => (x <= n ? x : m), 0);
  const nextMilestone = n => MS.find(x => x > n) || 0;
  // Up to five milestones around n: the two before it, the one reached, the next two.
  const pathAround = n => { const i = Math.max(0, MS.indexOf(lastMilestone(n))), s = Math.max(0, Math.min(i - 2, MS.length - 5)); return MS.slice(s, s + 5); };
  const uzDate = k => { const d = dOf(k); return d.getDate() + "-" + OY[d.getMonth()]; };
  const dotDate = (k, y) => { const d = dOf(k); return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + (y ? "." + d.getFullYear() : ""); };

  // The calendar span of a streak of n practice days ending on `end`: walk back over practice days,
  // stepping over rest days, until n practice days are counted (or the log runs out).
  function streakWindow(n, end, log, rest) {
    const rs = new Set(rest || []), days = [];
    let k = end, on = 0, r = 0;
    for (let guard = 0; guard < n + 60 && on < n; guard++) {
      const L = log && log[k], p = !!(L && L.a), isR = !p && rs.has(k);
      if (!p && !isR && days.length) break;
      days.unshift({ k, on: p, rest: isR, min: p ? Math.round((L.t || 0) / 60) : 0 });
      if (p) on++; else if (isR) r++;
      k = addTo(k, -1);
    }
    while (days.length && !days[0].on) { if (days[0].rest) r--; days.shift(); }
    return { start: days.length ? days[0].k : end, days, practice: on, rest: r };
  }

  const core = { MS, isMilestone, lastMilestone, nextMilestone, pathAround, streakWindow, uzDate, dotDate, addTo };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.MEDAL_CORE = core;
  if (typeof document === "undefined") return;

  /* ---------------- browser part ---------------- */
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const SV = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  // Iconly Light-Outline: cross (from Close Square), Upload, Lock
  const IC = {
    x: '<svg viewBox="6.6 6.6 6.8 6.8" fill="currentColor" aria-hidden="true"><path d="M8.13 7.06 10 8.93l1.86-1.87a.75.75 0 0 1 1.06 1.06L11.06 9.99l1.87 1.87a.75.75 0 0 1-1.06 1.06L10 11.05l-1.87 1.87a.75.75 0 0 1-1.06-1.06l1.87-1.87-1.87-1.87a.75.75 0 0 1 1.06-1.06Z"/></svg>',
    share: '<svg viewBox="0 0 20 20.6" fill="currentColor" aria-hidden="true"><path d="M5.37 6.79a.75.75 0 0 1 0 1.5h-.93A2.94 2.94 0 0 0 1.5 11.23v4.87a2.94 2.94 0 0 0 2.94 2.94h11.13a2.94 2.94 0 0 0 2.93-2.94v-4.88a2.93 2.93 0 0 0-2.92-2.93h-.94a.75.75 0 0 1 0-1.5h.94A4.43 4.43 0 0 1 20 11.22v4.88a4.44 4.44 0 0 1-4.43 4.44H4.44A4.44 4.44 0 0 1 0 16.1v-4.87a4.44 4.44 0 0 1 4.44-4.44h.93Zm5.16-6.57 2.92 2.93a.75.75 0 0 1-1.06 1.06l-1.64-1.64v10.97h-1.5V2.57L7.62 4.21a.75.75 0 0 1-1.06-1.06L9.47.22a.75.75 0 0 1 1.06 0Z"/></svg>',
    lock: '<svg viewBox="0 0 16.8 20" fill="currentColor" aria-hidden="true"><path d="M8.37 0a5.3 5.3 0 0 1 5.3 5.3v1.58a4.55 4.55 0 0 1 3.05 4.29v4.29A4.54 4.54 0 0 1 12.18 20H4.54A4.54 4.54 0 0 1 0 15.46v-4.29a4.55 4.55 0 0 1 3.05-4.29V5.3A5.3 5.3 0 0 1 8.37 0Zm3.81 8.13H4.54A3.04 3.04 0 0 0 1.5 11.17v4.29a3.04 3.04 0 0 0 3.04 3.04h7.64a3.04 3.04 0 0 0 3.05-3.04v-4.29a3.04 3.04 0 0 0-3.05-3.04Zm-3.82 3.33a.75.75 0 0 1 .75.75v2.22a.75.75 0 0 1-1.5 0v-2.22a.75.75 0 0 1 .75-.75Zm0-9.96a3.8 3.8 0 0 0-3.81 3.79v1.34h7.62V5.3A3.8 3.8 0 0 0 8.36 1.5Z"/></svg>',
    spin: SV('<path d="M4 12a8 3.5 0 0 0 15.2 1.5"/><path d="m17 11.2 2.4 2.4 2.1-2.6"/><path d="M12 4v4M12 16v4"/>'),
    moon: SV('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>')
  };

  let defsDone = false;
  function defs() {
    if (defsDone) return; defsDone = true;
    const N = 360, pts = [];
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, r = .468 + .024 * Math.cos(14 * a); pts.push((.5 + r * Math.cos(a)).toFixed(4) + "," + (.5 + r * Math.sin(a)).toFixed(4)); }
    const el = document.createElement("div");
    el.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
      <clipPath id="mdl-rosette" clipPathUnits="objectBoundingBox"><path d="M${pts.join("L")}Z"/></clipPath>
      <linearGradient id="mdl-silv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="#EDE6DA"/><stop offset=".62" stop-color="#B9B0A2"/><stop offset="1" stop-color="#F6F1E8"/></linearGradient>
      <linearGradient id="mdl-silvE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs></svg>`;
    document.body.appendChild(el.firstChild);
  }

  const miniHTML = (n, id) => `<button class="mdl-mini" type="button"${id ? ` id="${id}"` : ""} aria-label="${n} kunlik medalni ko'rish"><span>${n}</span></button>`;

  /* ---- the medal: drawn in CSS, really spins (drag, tap, Enter, arrows) ---- */
  function medal(host, n, size, back, label, emblem, ringTxt) {
    defs();
    let edges = "";
    for (let i = 0; i < 14; i++) edges += `<div class="mdl-edge" style="--z:${(-6.5 + i).toFixed(1)}px"></div>`;
    // ring text as HTML spans: Chrome does not paint SVG <text> inside a 3D-transformed layer
    const rl = ringTxt || `${n} KUN KETMA-KET`, chars = [...`EASY ENGLISH · ${rl} · EASY ENGLISH · ${rl} · `];
    const ring = chars.map((c, i) => `<span style="transform:rotate(${(i / chars.length * 360).toFixed(2)}deg)">${c === " " ? "&nbsp;" : c}</span>`).join("");
    host.innerHTML = `<div class="mdl-medal" role="button" tabindex="-1" style="--ms:${size}px" aria-label="${label}">
      <div class="mdl-shadow"></div><div class="mdl-float"><div class="mdl-m3d">${edges}
        <div class="mdl-face"><div class="mdl-rim"></div><div class="mdl-bevel"></div><div class="mdl-rt" aria-hidden="true">${ring}</div><div class="mdl-enamel"></div>
${emblem ? `<div class="mdl-emi" aria-hidden="true">${emblem}</div><div class="mdl-enm${String(n).length > 3 ? " w4" : ""}" aria-hidden="true">${n}</div>` : `<svg class="mdl-emb" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6c1.1 3.7 5.4 5.9 5.4 10.8a5.4 5.4 0 0 1-10.8.3c0-2.6 1.5-4.1 2.7-5.4.3 1.7 1.1 2.8 2.1 3.3-.2-3.1-1-5.9.6-9Z" fill="rgba(70,20,5,.45)" transform="translate(.25 .45)"/><path d="M12 2.6c1.1 3.7 5.4 5.9 5.4 10.8a5.4 5.4 0 0 1-10.8.3c0-2.6 1.5-4.1 2.7-5.4.3 1.7 1.1 2.8 2.1 3.3-.2-3.1-1-5.9.6-9Z" fill="url(#mdl-silv)" stroke="rgba(120,60,30,.35)" stroke-width=".25"/><path d="M12 3.6c.9 2.6 3.6 4.4 4.4 7.2-1.4-2.4-3.6-3.6-4.4-7.2Z" fill="url(#mdl-silvE)"/></svg>
          <div class="mdl-n${n > 99 ? " w3" : ""}" aria-hidden="true">${n}</div>`}<div class="mdl-glint"></div></div>
        <div class="mdl-face mdl-back"><div class="mdl-rim"></div><div class="mdl-bdisc"></div><div class="mdl-btxt">${back}</div><div class="mdl-glint"></div></div>
      </div></div></div>`;
    const el = host.querySelector(".mdl-medal"), m3d = host.querySelector(".mdl-m3d"), flo = host.querySelector(".mdl-float");
    let ry = 0, rx = 0, vy = 0, vx = 0, target = 0, dragging = false, tween = null, on = false, idle = true, side = 0, raf = 0, last = 0;
    let sx = 0, sy = 0, r0 = 0, lastT = 0, vel = 0, moved = false;
    const t0 = performance.now(), cb = { side() {}, touch() {} };
    function frame(now) {
      const dt = Math.min(40, now - (last || now - 16)) / 16.67; last = now;
      if (tween) {
        const p = Math.min(1, (now - tween.s) / tween.d); ry = tween.from + (tween.to - tween.from) * easeOut(p);
        if (p >= 1) { ry = target = tween.to; vy = 0; const f = tween.done; tween = null; f && f(); }
      } else if (!dragging) {
        vy += (target - ry) * .09 * dt; vy *= Math.pow(.76, dt); ry += vy * dt;
        vx += -rx * .09 * dt; vx *= Math.pow(.76, dt); rx += vx * dt;
        if (Math.abs(target - ry) < .03 && Math.abs(vy) < .03) { ry = target; vy = 0; }
        if (Math.abs(rx) < .03 && Math.abs(vx) < .03) { rx = 0; vx = 0; }
      }
      const t = (now - t0) / 1000;
      flo.style.transform = idle && !reduced() ? `translateY(${(Math.sin(t * 1.5) * 4).toFixed(2)}px) rotateY(${(Math.sin(t * .8) * 8).toFixed(2)}deg) rotateX(${(Math.cos(t * 1.05) * 4).toFixed(2)}deg)` : "";
      const rad = ry * Math.PI / 180;
      m3d.style.setProperty("--ry", ry.toFixed(2) + "deg"); m3d.style.setProperty("--rx", rx.toFixed(2) + "deg");
      el.style.setProperty("--sheen", (ry * 1.4).toFixed(1) + "deg"); el.style.setProperty("--gp", (50 + Math.sin(rad) * 95).toFixed(1) + "%"); el.style.setProperty("--shx", (.5 + .5 * Math.abs(Math.cos(rad))).toFixed(3));
      const s = ((Math.round(target / 180) % 2) + 2) % 2; if (s !== side) { side = s; cb.side(s); }
      raf = el.isConnected ? requestAnimationFrame(frame) : 0;
    }
    raf = requestAnimationFrame(frame);
    const flip = d => { if (!on) return; cb.touch(); target = (Math.round(target / 180) + (d || 1)) * 180; if (reduced()) { ry = target; vy = 0; } };
    el.addEventListener("pointerdown", e => { if (!on || e.button > 0) return; dragging = true; moved = false; tween = null; el.setPointerCapture(e.pointerId); sx = e.clientX; sy = e.clientY; r0 = ry; lastT = performance.now(); vel = 0; cb.touch(); });
    el.addEventListener("pointermove", e => {
      if (!dragging) return; const now = performance.now(), dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      const nr = r0 + dx * .62; vel = (nr - ry) / Math.max(1, now - lastT) * 16.67; ry = nr; rx = Math.max(-22, Math.min(22, -dy * .22)); lastT = now;
    });
    const end = () => {
      if (!dragging) return; dragging = false;
      if (!moved) { target = Math.round(ry / 180) * 180; flip(1); return; }
      target = Math.round((ry + (reduced() ? 0 : vel * 9)) / 180) * 180; vy = reduced() ? 0 : vel; vx = 0; if (reduced()) { ry = target; rx = 0; }
    };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end); el.addEventListener("lostpointercapture", end);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") { e.preventDefault(); flip(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); flip(-1); } });
    return {
      el,
      reveal(d) { return new Promise(res => { if (!d) { ry = target = 0; vy = 0; res(); return; } ry = -720; tween = { s: performance.now(), d, from: -720, to: 0, done: res }; }); },
      front() { tween = null; target = Math.round(ry / 360) * 360; if (reduced()) { ry = target; vy = 0; } },
      live(v) { on = v; el.tabIndex = v ? 0 : -1; }, idle(v) { idle = v; },
      onSide(f) { cb.side = f; }, onTouch(f) { cb.touch = f; },
      stop() { cancelAnimationFrame(raf); }
    };
  }

  /* ---- sparks and rising embers ---- */
  function sparks(cv) {
    const ctx = cv.getContext("2d"); let W = 0, H = 0, raf = 0, on = false, em = [], sp = [];
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const C = ["255,184,146", "232,128,92", "255,220,180", "242,144,104"];
    const ember = y => ({ x: Math.random() * W, y: y == null ? H + 10 : y, vy: -(.25 + Math.random() * .7), ph: Math.random() * 6.3, r: .7 + Math.random() * 1.9, a: .25 + Math.random() * .6, c: C[(Math.random() * 4) | 0] });
    function loop() {
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter";
      for (const e of em) {
        e.y += e.vy; e.ph += .03; e.x += Math.sin(e.ph) * .35; const f = e.a * (.75 + .25 * Math.sin(e.ph * 3));
        ctx.fillStyle = `rgba(${e.c},${(f * .22).toFixed(3)})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 3.2, 0, 6.29); ctx.fill();
        ctx.fillStyle = `rgba(${e.c},${f.toFixed(3)})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.29); ctx.fill();
        if (e.y < -20) Object.assign(e, ember());
      }
      for (let i = sp.length - 1; i >= 0; i--) {
        const s = sp[i]; s.x += s.vx; s.y += s.vy; s.vx *= .955; s.vy = s.vy * .955 + .055; s.l -= s.dc;
        if (s.l <= 0) { sp.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(${s.c},${s.l.toFixed(3)})`; ctx.lineWidth = s.w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 3.2, s.y - s.vy * 3.2); ctx.stroke();
      }
      raf = on && cv.isConnected ? requestAnimationFrame(loop) : 0;
    }
    return {
      start(n) { if (reduced()) return; size(); em = Array.from({ length: n || 32 }, () => ember(Math.random() * H)); on = true; if (!raf) raf = requestAnimationFrame(loop); },
      burst(x, y) { if (reduced()) return; for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, v = 2 + Math.random() * 6.5; sp.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, l: 1, dc: .011 + Math.random() * .016, w: .8 + Math.random() * 1.8, c: C[(Math.random() * 4) | 0] }); } },
      stop() { on = false; em = []; sp = []; ctx.clearRect(0, 0, W, H); }
    };
  }

  /* ---- the moment ----
     open({ n, streak, story, from, slot, log, rest, today, onShare, buzz })
     story: true → the days light up and fold into the medal; false → the medal flies out of `from`.
     slot: element that receives the small medal when the moment closes (the medal flies into it). */
  let OPEN = null;
  function open(o) {
    if (OPEN) return OPEN.close(true);
    const n = o.n, streak = o.streak || n, today = o.today, from = o.from, R = reduced();
    const win = streakWindow(streak, today, o.log, o.rest);
    const next = nextMilestone(streak), path = pathAround(streak), short = innerHeight < 780;
    const restTxt = win.rest === 1 ? " — bitta dam olish kuni bilan." : win.rest > 1 ? ` — ${win.rest} ta dam olish kuni bilan.` : ".";
    const title = o.title || (o.story ? `${n} kun ketma-ket!` : `${n} kunlik medal`);
    const lead = o.lead != null ? o.lead : o.story ? `${uzDate(win.start)}dan beri seriyani uzmadingiz${restTxt}` : `Hozir ${streak} kun ketma-ket.${next ? ` Keyingi medalgacha ${next - streak} kun qoldi.` : ""}`;
    const back = o.back || `<div class="mdl-bn">${n}</div><div class="mdl-bk">KUN KETMA-KET</div>${o.story ? `<div class="mdl-bd">${dotDate(win.start)} — ${dotDate(today, 1)}</div><hr><div class="mdl-bs">${win.practice} mashq kuni${win.rest ? `<br>${win.rest} dam olish kuni` : ""}</div>` : `<hr><div class="mdl-bs">Seriya: ${streak} kun</div>`}`;

    /* calendar: Monday-first weeks of the streak, at most the last five weeks */
    let days = win.days; if (days.length > 35) days = days.slice(-35);
    const first = days.length ? days[0].k : today, pad = (dOf(first).getDay() + 6) % 7, tailN = 6 - (dOf(today).getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < pad; i++) cells.push(`<i class="mdl-c out"></i>`);
    days.forEach((d, i) => {
      const day = dOf(d.k).getDate(), isT = d.k === today;
      if (d.rest) cells.push(`<i class="mdl-c rest" data-p="${i}">${IC.moon}</i>`);
      else if (d.on) cells.push(`<i class="mdl-c${isT ? " today" : ""}" data-p="${i}" style="--a:${(.26 + Math.min(1, (d.min || 10) / 20) * .46).toFixed(2)}">${day}</i>`);
      else cells.push(`<i class="mdl-c gap" data-p="${i}">${day}</i>`);
    });
    for (let i = 1; i <= tailN; i++) cells.push(`<i class="mdl-c next">${dOf(addTo(today, i)).getDate()}</i>`);
    const cap = win.days.length > 35 ? "Oxirgi 5 hafta" : `Sizning ${streak} kuningiz`;

    const lm = lastMilestone(streak), ci = path.indexOf(lm);
    const items = path.map(x => {
      const cls = x < lm ? "mdl-got" : x === lm ? "mdl-cur" : "mdl-lock";
      const lb = cls === "mdl-cur" && o.story && x === streak ? "Bugun" : `${x} kun`;
      const left = cls === "mdl-lock" && x === next ? `<span class="mdl-left">${x - streak} kun qoldi</span>` : "";
      const sr = cls === "mdl-lock" ? ", yopiq" : ", olingan";
      return `<li class="${cls}"${cls === "mdl-cur" ? ' aria-current="step"' : ""}><span class="mdl-cw"><span class="mdl-coin">${cls === "mdl-lock" ? IC.lock : `<b>${x}</b>`}</span></span><span class="mdl-lb">${lb}<span class="sr-only">${sr}</span></span>${left}</li>`;
    }).join("");
    const nextTxt = next ? `<p class="mdl-next">Har kuni davom etsangiz, ${next} kunlik medal <b>${uzDate(addTo(today, next - streak))}da</b> ochiladi.</p>` : `<p class="mdl-next">Eng katta marraga yetdingiz.</p>`;

    const ov = document.createElement("div");
    ov.className = "mdl" + (short ? " short" : "");
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "mdl-h"); ov.setAttribute("aria-describedby", "mdl-lead");
    ov.innerHTML = `<div class="mdl-bg"></div><div class="mdl-glow"><i></i></div><div class="mdl-waves"><i></i><i></i><i></i></div><canvas class="mdl-fx" aria-hidden="true"></canvas>
      <div class="mdl-top"><button class="mdl-x" type="button" aria-label="Yopish">${IC.x}</button></div>
      <div class="mdl-body">
        <div class="mdl-zone">${o.story ? `<div class="mdl-cal" aria-hidden="true"><div class="mdl-wd"><span>Du</span><span>Se</span><span>Ch</span><span>Pa</span><span>Ju</span><span>Sh</span><span>Ya</span></div><div class="mdl-cells">${cells.join("")}</div></div>` : ""}<div class="mdl-hold"></div></div>
        <div class="mdl-slot"><span class="mdl-cap">${cap}</span><span class="mdl-hint">${IC.spin}Aylantirish uchun suring</span></div>
        <h2 class="mdl-h mdl-rev" id="mdl-h" tabindex="-1">${title}</h2>
        <p class="mdl-lead mdl-rev" id="mdl-lead">${lead}</p>
        ${o.nextHTML ? `<section class="mdl-path mdl-rev">${o.nextHTML}</section>` : `<section class="mdl-path mdl-rev" aria-labelledby="mdl-pt"><h3 id="mdl-pt">${next ? "Keyingi marra" : "Marralar"}</h3><ol class="mdl-ms" style="--cols:${path.length};--fill:${(Math.max(0, ci) / path.length * 100).toFixed(1)}%">${items}</ol>${nextTxt}</section>`}
      </div>
      <div class="mdl-acts mdl-rev"><button class="mdl-btn mdl-pri" type="button" data-mdl="go">${o.primary || "Davom etish"}</button><button class="mdl-btn mdl-sec" type="button" data-mdl="sh">${IC.share}Ulashish</button></div>
      <div class="sr-only" aria-live="polite"></div>`;
    document.body.appendChild(ov);
    const $ = s => ov.querySelector(s), live = $("[aria-live]"), say = t => { live.textContent = ""; setTimeout(() => { live.textContent = t; }, 60); };
    const hold = $(".mdl-hold"), fx = sparks($(".mdl-fx"));
    const M = medal(hold, n, short ? 140 : 188, back, `${title}. Aylantirish uchun suring yoki Enter bosing.`, o.emblem, o.ring);
    M.onSide(s => say(s ? `Medalning orqa tomoni. ${o.title || n + " kun ketma-ket"}.${o.story ? ` ${uzDate(win.start)}dan ${uzDate(today)}gacha, ${win.practice} mashq kuni${win.rest ? ", " + win.rest + " dam olish kuni" : ""}.` : ""}` : "Medalning old tomoni."));
    M.onTouch(() => $(".mdl-hint").classList.add("gone"));

    /* page behind: inert, no scroll */
    const others = [...document.body.children].filter(e => e !== ov && !e.inert && e.tagName !== "SCRIPT");
    others.forEach(e => { e.inert = true; }); const prevOv = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden";
    const back0 = document.activeElement; let state = "opening", timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (state !== "closed") f(); }, ms));

    const geom = () => { const hr = hold.getBoundingClientRect(), sr = ov.getBoundingClientRect(), cx = hr.left + hr.width / 2 - sr.left, cy = hr.top + hr.height / 2 - sr.top; ov.style.setProperty("--my", cy + "px"); return { hr, cx, cy }; };
    const ui = base => {
      ov.querySelectorAll(".mdl-rev").forEach((e, i) => later(() => e.classList.add("in"), base + i * 100));
      later(() => $(".mdl-hint").classList.add("on"), base + 150);
      later(() => { state = "open"; ov.classList.add("ui"); M.live(true); M.idle(true); $("#mdl-h").focus({ preventScroll: true }); say(o.story ? `${n} kun ketma-ket! Yangi medal olindi.${next ? ` Keyingi marra: ${next} kun, ${next - streak} kun qoldi.` : ""}` : `${title}.`); }, base + 300);
    };
    requestAnimationFrame(() => ov.classList.add("open"));
    M.idle(false);
    if (from) from.style.opacity = "0";

    if (R) { const c = $(".mdl-cal"); if (c) c.remove(); geom(); M.reveal(0); ov.classList.add("burst"); ui(0); }
    else if (o.story) {
      const { cx, cy } = geom(); hold.style.opacity = "0";
      later(() => { $(".mdl-cal").classList.add("on"); $(".mdl-cap").classList.add("on"); }, 120);
      const lit = [...ov.querySelectorAll(".mdl-c[data-p]")];
      lit.forEach((c, k) => later(() => { c.classList.add("lit"); later(() => c.classList.add("set"), 160); }, 280 + k * 21));
      const t1 = 280 + lit.length * 21 + 280;
      later(() => {
        const sr = ov.getBoundingClientRect();
        ov.querySelectorAll(".mdl-c:not(.out)").forEach(c => { const r = c.getBoundingClientRect(); c.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${sr.left + cx - r.left - r.width / 2}px,${sr.top + cy - r.top - r.height / 2}px) scale(.2)`, opacity: 0 }], { duration: 520, delay: Math.random() * 160, easing: "cubic-bezier(.55,0,.8,.2)", fill: "forwards" }); });
        $(".mdl-cap").classList.remove("on");
      }, t1);
      later(() => {
        hold.style.opacity = ""; hold.animate([{ transform: "scale(.2)", opacity: 0 }, { opacity: 1, offset: .15 }, { transform: "none", opacity: 1 }], { duration: 820, easing: "cubic-bezier(.3,1.45,.5,1)" });
        M.reveal(1000); fx.start();
        later(() => { ov.classList.add("burst"); fx.burst(cx, cy); const c = $(".mdl-cal"); if (c) c.classList.remove("on"); o.buzz && o.buzz(); }, 180);
        ui(520);
      }, t1 + 560);
    } else {
      const { hr, cx, cy } = geom(), fr = from ? from.getBoundingClientRect() : null;
      if (fr) hold.animate([{ transform: `translate(${fr.left + fr.width / 2 - hr.left - hr.width / 2}px,${fr.top + fr.height / 2 - hr.top - hr.height / 2}px) scale(${Math.max(.08, fr.width / hr.width)})`, opacity: 0 }, { opacity: 1, offset: .1 }, { transform: "none", opacity: 1 }], { duration: 900, easing: "cubic-bezier(.2,.85,.25,1.06)" });
      M.reveal(1000); fx.start(24);
      later(() => { ov.classList.add("burst"); fx.burst(cx, cy); }, 560);
      ui(700);
    }

    function close(now) {
      if (state === "closing" || state === "closed") return; state = "closing";
      timers.forEach(clearTimeout); timers = [];
      M.live(false); M.idle(false); M.front(); ov.classList.remove("ui"); ov.querySelectorAll(".mdl-rev").forEach(e => e.classList.remove("in")); $(".mdl-hint").classList.remove("on");
      let mini = null;
      if (o.slot && o.slot.isConnected) { o.slot.innerHTML = miniHTML(n, o.miniId); mini = o.slot.firstElementChild; o.slot.style.opacity = "0"; if (from && from !== o.slot) from.style.opacity = ""; }
      else if (from) from.style.opacity = "";
      const D = R || now ? 1 : 640;
      if (mini && !R && !now) {
        const tr = mini.getBoundingClientRect(), hr = hold.getBoundingClientRect();
        hold.getAnimations().forEach(a => a.cancel());
        hold.animate([{ transform: "none", opacity: 1 }, { opacity: 1, offset: .8 }, { transform: `translate(${tr.left + tr.width / 2 - hr.left - hr.width / 2}px,${tr.top + tr.height / 2 - hr.top - hr.height / 2}px) scale(${tr.width / hr.width})`, opacity: 0 }], { duration: D, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" });
      }
      ov.classList.add("fading"); others.forEach(e => { e.inert = false; }); document.documentElement.style.overflow = prevOv;
      setTimeout(() => fx.stop(), R ? 0 : 300);
      setTimeout(() => {
        state = "closed"; M.stop(); ov.remove(); OPEN = null;
        if (o.slot) o.slot.style.opacity = "";
        if (mini) { if (!R) mini.classList.add("pop"); mini.focus({ preventScroll: true }); if (o.onMini) o.onMini(mini); }
        else if (back0 && back0.isConnected) back0.focus({ preventScroll: true });
        o.onClose && o.onClose();
      }, D + 20);
    }
    ov.querySelector(".mdl-x").onclick = () => close();
    ov.querySelector('[data-mdl="go"]').onclick = () => close();
    ov.querySelector('[data-mdl="sh"]').onclick = () => o.onShare && o.onShare(o.shareText || `Easy English'da ${n} kun ketma-ket ingliz tilini mashq qildim!`);
    ov.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const f = [...ov.querySelectorAll('button,[tabindex="0"]')].filter(x => x.offsetParent !== null);
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
    });
    OPEN = { close };
    return OPEN;
  }

  root.MEDAL = Object.assign({}, core, { open, miniHTML, defs, isOpen: () => !!OPEN });
})(typeof globalThis !== "undefined" ? globalThis : window);
