/* «Xato yopildi» (Mistake Mastery): ovozli qo'ng'iroqlarda qilingan xato mavzulari
   keyingi 2+ qo'ng'iroqda takrorlanmasa, avtomatik «O'zlashtirildi» deb belgilanadi. */
(function (root) {
  "use strict";

  const TOPIC_LABELS = {
    uz: "O'zbekcha aralashtirmasdan gapirish",
    "be-ing": "am / is / are + -ing",
    "wh-q": "So'roq so'zi bilan savol",
    past: "O'tgan zamon fe'llari",
    art: "a / an / the artikllari",
    prep: "in / on / at predloglari",
    be: "am / is / are",
    do: "do / does (savol va inkor)",
    s3: "he / she dan keyin -s",
    plural: "Ko'plik shakli",
    pron: "he / she / it olmoshlari",
    order: "Gapda so'z tartibi",
    word: "To'g'ri so'z tanlash",
    other: "Boshqa tuzatishlar",
  };

  /**
   * @param {Array} calls - CLS ro'yxati [{ id, day, fixes: [{topic}], off: [idx] }]
   * @param {number} [cleanTarget=2] - nechta toza qo'ng'iroqdan keyin mavzu o'zlashtirilgan hisoblanadi
   */
  function computeMastery(calls, cleanTarget) {
    const target = Math.max(1, Math.round(cleanTarget || 2));
    const list = (Array.isArray(calls) ? calls : [])
      .map((c, idx) => ({ c, idx }))
      .sort((a, b) => {
        const da = String(a.c && a.c.day || "");
        const db = String(b.c && b.c.day || "");
        if (da !== db) return da < db ? -1 : 1;
        return b.idx - a.idx; // CLS odatda eng yangisi boshida keladi
      })
      .map((x) => x.c);

    const byTopic = {};
    list.forEach((call, callIdx) => {
      const off = new Set(Array.isArray(call && call.off) ? call.off : []);
      const fixes = Array.isArray(call && call.fixes) ? call.fixes : [];
      const seenInCall = new Set();
      fixes.forEach((f, i) => {
        if (!f || off.has(i)) return;
        const topic = typeof f.topic === "string" && f.topic ? f.topic : "other";
        if (!byTopic[topic]) {
          byTopic[topic] = {
            topic,
            title: TOPIC_LABELS[topic] || topic,
            count: 0,
            lastIdx: callIdx,
            lastDay: String(call.day || ""),
          };
        }
        byTopic[topic].count++;
        byTopic[topic].lastIdx = callIdx;
        byTopic[topic].lastDay = String(call.day || "");
        seenInCall.add(topic);
      });
    });

    const total = list.length;
    const mastered = [];
    const active = [];
    Object.values(byTopic).forEach((item) => {
      const cleanStreak = Math.max(0, total - 1 - item.lastIdx);
      const entry = {
        topic: item.topic,
        title: item.title,
        count: item.count,
        cleanStreak,
        target,
        lastDay: item.lastDay,
        mastered: cleanStreak >= target,
      };
      if (entry.mastered) mastered.push(entry);
      else active.push(entry);
    });

    mastered.sort((a, b) => b.cleanStreak - a.cleanStreak || b.count - a.count);
    active.sort((a, b) => b.count - a.count || a.cleanStreak - b.cleanStreak);
    return { mastered, active, totalCalls: total };
  }

  const api = { TOPIC_LABELS, computeMastery };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MASTERY = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
