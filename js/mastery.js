/* Mistake Mastery tracker: marks speaking mistake topics as mastered
   once they do not recur across 2+ consecutive voice calls. */
(function (root) {
  "use strict";

  // UI labels shown to learners in Uzbek
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
   * Compute mastered and active mistake topics from voice call history.
   * @param {Array} calls - call records [{ id, day, fixes: [{topic}], off: [idx] }]
   * @param {number} [cleanTarget=2] - clean calls required to mark a topic mastered
   */
  function computeMastery(calls, cleanTarget) {
    const target = Math.max(1, Math.round(cleanTarget || 2));
    const list = (Array.isArray(calls) ? calls : [])
      .map((c, idx) => ({ c, idx }))
      .sort((a, b) => {
        const da = String(a.c && a.c.day || "");
        const db = String(b.c && b.c.day || "");
        if (da !== db) return da < db ? -1 : 1;
        return b.idx - a.idx; // calls are typically ordered newest-first
      })
      .map((x) => x.c);

    const byTopic = {};
    list.forEach((call, callIdx) => {
      const off = new Set(Array.isArray(call && call.off) ? call.off : []);
      const fixes = Array.isArray(call && call.fixes) ? call.fixes : [];
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
