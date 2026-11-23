/* Pronunciation trainer (#talaffuz): 1-minute focused drills for sounds
   Uzbek learners commonly mix up (th, w/v, short vs long vowels, tricky stress). */
(function (root) {
  "use strict";

  const PACKS = [
    {
      id: "th",
      title: "th tovushi",
      sub: "think · three · this · they",
      tip: "Til uchini oldingi tishlar orasiga yengil qo'yib havo chiqaring («s» yoki «t» emas).",
      items: [
        { w: "think", pair: "sink", uz: "o'ylamoq", pron: "sink emas — til tish orasida" },
        { w: "three", pair: "tree", uz: "uch (3)", pron: "tri emas — til tish orasida" },
        { w: "thank", pair: "tank", uz: "rahmat aytmoq", pron: "tenk emas — til tish orasida" },
        { w: "this", pair: "dis", uz: "bu", pron: "yumshoq «z»ga yaqin, til tish orasida" },
        { w: "they", pair: "day", uz: "ular", pron: "dey emas — til tish orasida" },
        { w: "bath", pair: "bat", uz: "vanna", pron: "oxirida «t» emas, havo bilan" },
      ],
    },
    {
      id: "wv",
      title: "w va v farqi",
      sub: "west · very · wine · work",
      tip: "«w» da lablar yumaloq (xuddi «u» aytgandek); «v» da yuqori tish pastki labga tegadi.",
      items: [
        { w: "west", pair: "vest", uz: "g'arb", pron: "lablar yumaloq: U-est" },
        { w: "very", pair: "wary", uz: "juda", pron: "tish pastki labga tegadi: VE-ri" },
        { w: "wine", pair: "vine", uz: "vino", pron: "lablar yumaloq: U-ayn" },
        { w: "wet", pair: "vet", uz: "ho'l", pron: "lablar yumaloq: U-et" },
        { w: "work", pair: "fork", uz: "ish", pron: "lablar yumaloq: U-o'k" },
        { w: "visit", pair: "wiz", uz: "tashrif buyurmoq", pron: "tish labga tegadi: VI-zit" },
      ],
    },
    {
      id: "vowels",
      title: "Qisqa va cho'ziq unlilar",
      sub: "ship/sheep · live/leave · sit/seat",
      tip: "Cho'ziq unlini biroz cho'zib ayting — aks holda butunlay boshqa so'z chiqadi.",
      items: [
        { w: "sheep", pair: "ship", uz: "qo'y", pron: "cho'ziq «ii»: shIIp" },
        { w: "ship", pair: "sheep", uz: "kema", pron: "qisqa «i»: ship" },
        { w: "leave", pair: "live", uz: "ketmoq", pron: "cho'ziq «ii»: lIIv" },
        { w: "seat", pair: "sit", uz: "o'rindiq", pron: "cho'ziq «ii»: sIIt" },
        { w: "pool", pair: "pull", uz: "hovuz", pron: "cho'ziq «uu»: pUUl" },
        { w: "beat", pair: "bit", uz: "urmoq / yutmoq", pron: "cho'ziq «ii»: bIIt" },
      ],
    },
    {
      id: "stress",
      title: "Urg'u va qiyin so'zlar",
      sub: "hotel · comfortable · island",
      tip: "Katta harfda yozilgan bo'g'inga kuchliroq urg'u bering, qolganini yengil ayting.",
      items: [
        { w: "hotel", pair: "", uz: "mehmonxona", pron: "hou-TEL (oxirgi bo'g'in urg'uli)" },
        { w: "island", pair: "", uz: "orol", pron: "AY-land («s» o'qilmaydi)" },
        { w: "Wednesday", pair: "", uz: "chorshanba", pron: "UENZ-dey («d» tushib qoladi)" },
        { w: "comfortable", pair: "", uz: "qulay", pron: "KAMF-tə-bəl (3 bo'g'in)" },
        { w: "vegetable", pair: "", uz: "sabzavot", pron: "VEJ-tə-bəl (3 bo'g'in)" },
        { w: "clothes", pair: "", uz: "kiyim", pron: "klouz (1 bo'g'in)" },
      ],
    },
  ];

  const clean = (s) => String(s || "").toLowerCase().replace(/[^a-z']/g, " ").replace(/\s+/g, " ").trim();

  /**
   * Evaluate speech recognition transcript against target word and confusable pair.
   * Returns { ok: boolean, confused: boolean, heard: string }.
   */
  function evaluate(heard, target, pair) {
    const h = clean(heard);
    const t = clean(target);
    const p = clean(pair);
    if (!h) return { ok: false, confused: false, heard: "" };
    const words = h.split(" ");
    const ok = h === t || words.includes(t);
    const confused = !ok && !!p && (h === p || words.includes(p));
    return { ok, confused, heard: h };
  }

  function renderView(ctx) {
    const { app, nav, esc, ICON, say, speakSlow } = ctx;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let pack = null;
    let idx = 0;
    let okCount = 0;
    let status = null; // { ok, confused, heard } | null
    let listening = false;
    let rec = null;

    function stopRec() {
      listening = false;
      if (rec) {
        try { rec.abort(); } catch (e) {}
        rec = null;
      }
    }

    function drawMenu() {
      stopRec();
      app.innerHTML = `${nav("#unitlar", "Unitlar", "Talaffuz mashqi")}
        <p class="sub">1 daqiqalik qisqa mashq: o'zbek o'rganuvchilar eng ko'p adashtiradigan inglizcha tovushlar.</p>
        <div class="list">
          ${PACKS.map((p) => `<button class="li" type="button" data-pk="${p.id}">
            <span class="ic">${ICON.mic}</span>
            <span class="tx"><b>${esc(p.title)}</b><span>${esc(p.sub)} · ${p.items.length} ta so'z</span></span>
            <span class="go">${ICON.chev}</span>
          </button>`).join("")}
        </div>`;
      app.querySelectorAll("[data-pk]").forEach((btn) => {
        btn.onclick = () => {
          pack = PACKS.find((x) => x.id === btn.dataset.pk) || PACKS[0];
          idx = 0; okCount = 0; status = null;
          drawDrill();
          say(pack.items[0].w);
        };
      });
    }

    function drawDone() {
      stopRec();
      const total = pack.items.length;
      const pct = Math.round((okCount / total) * 100);
      app.innerHTML = `${nav("#unitlar", "Unitlar", pack.title)}
        <div class="card mq-fin">
          <div class="mq-big">${ICON.check}</div>
          <h2>${okCount} / ${total} to'g'ri (${pct}%)</h2>
          <p class="muted">Har kuni 1 daqiqa takrorlasangiz, talaffuz tez o'rnashadi.</p>
          <button class="btn" id="prAgain" type="button">Yana bir marta</button>
          <button class="btn ghost" id="prMenu" type="button" style="margin-top:8px">Boshqa tovush tanlash</button>
        </div>`;
      document.getElementById("prAgain").onclick = () => { idx = 0; okCount = 0; status = null; drawDrill(); say(pack.items[0].w); };
      document.getElementById("prMenu").onclick = drawMenu;
    }

    function drawDrill() {
      const it = pack.items[idx];
      const total = pack.items.length;
      const pct = Math.round((idx / total) * 100);
      let fb = "";
      if (status) {
        if (status.ok) {
          fb = `<div class="mq-res ok"><div class="tx"><b>Zo'r!</b> «${esc(it.w)}» aniq eshitildi.</div></div>`;
        } else if (status.confused) {
          fb = `<div class="mq-res part"><div class="tx"><b>Yaqin!</b> «${esc(status.heard)}» eshitildi — «${esc(it.w)}» qilib qayta urining.</div></div>`;
        } else {
          fb = `<div class="mq-res no"><div class="tx">Eshitildi: <b lang="en">${esc(status.heard || "—")}</b>. Yana bir bor sekinroq ayting.</div></div>`;
        }
      }
      app.innerHTML = `${nav("#unitlar", "Unitlar", pack.title)}
        <div class="mq-top"><span class="mq-t">${esc(pack.title)}</span><span class="mq-cnt">${idx + 1} / ${total}</span></div>
        <div class="mq-bar"><i style="width:${pct}%"></i></div>
        <div class="card" style="text-align:center;padding:24px 18px">
          <div style="font:700 32px/1.2 var(--font-display);margin-bottom:4px" lang="en">${esc(it.w)}</div>
          <p class="muted" style="margin:0 0 8px">${esc(it.uz)}${it.pair ? ` · adashtirmang: <b lang="en">${esc(it.pair)}</b>` : ""}</p>
          <p class="hook" style="justify-content:center;text-align:left"><span class="ht"><b>Qanday aytiladi</b>${esc(it.pron)}</span></p>
          <p class="muted" style="font-size:13px;margin:10px 0 16px">${esc(pack.tip)}</p>
          <div class="row" style="margin-bottom:12px">
            <button class="btn ghost" id="prPlay" type="button">${ICON.vol}Eshitish</button>
            <button class="btn ghost" id="prSlow" type="button">Sekinroq</button>
          </div>
          ${fb}
          ${SR
            ? `<button class="btn" id="prMic" type="button">${ICON.mic}${listening ? "Tinglayapman…" : status && status.ok ? "Keyingisi" : "Ovoz bilan aytish"}</button>`
            : `<button class="btn" id="prSelf" type="button">${ICON.check}Aytdim — keyingisi</button>`}
          ${status && !status.ok ? `<button class="mq-ch" id="prSkip" type="button">O'tkazib yuborish</button>` : ""}
        </div>`;

      document.getElementById("prPlay").onclick = () => say(it.w);
      document.getElementById("prSlow").onclick = () => speakSlow(it.w);

      const advance = (counted) => {
        if (counted) okCount++;
        idx++;
        status = null;
        if (idx >= total) drawDone();
        else { drawDrill(); say(pack.items[idx].w); }
      };

      const skipBtn = document.getElementById("prSkip");
      if (skipBtn) skipBtn.onclick = () => advance(false);

      const selfBtn = document.getElementById("prSelf");
      if (selfBtn) selfBtn.onclick = () => advance(true);

      const micBtn = document.getElementById("prMic");
      if (micBtn) {
        micBtn.onclick = () => {
          if (status && status.ok) return advance(true);
          if (listening) { stopRec(); return drawDrill(); }
          try {
            rec = new SR();
            rec.lang = "en-US";
            rec.interimResults = false;
            rec.maxAlternatives = 3;
            listening = true;
            drawDrill();
            rec.onresult = (e) => {
              const alts = [...(e.results[0] || [])].map((x) => x.transcript);
              let best = evaluate(alts[0] || "", it.w, it.pair);
              for (const alt of alts) {
                const ev = evaluate(alt, it.w, it.pair);
                if (ev.ok) { best = ev; break; }
              }
              stopRec();
              status = best;
              drawDrill();
            };
            rec.onerror = () => { stopRec(); status = { ok: false, confused: false, heard: "" }; drawDrill(); };
            rec.onend = () => { if (listening) { listening = false; drawDrill(); } };
            rec.start();
          } catch (e) {
            stopRec();
          }
        };
      }
    }

    drawMenu();
    return stopRec;
  }

  const api = { PACKS, evaluate, renderView };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PRONOUNCE = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
