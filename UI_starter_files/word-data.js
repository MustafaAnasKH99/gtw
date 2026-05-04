// Mock semantic-similarity dictionary for the secret word "EMBASSY".
// Lower rank = closer in meaning. Rank 1 is the secret word itself.
// In production this would come from a word2vec/embeddings model.
window.SECRET_WORD = "embassy";

// Curated list — top ~50 closest words, then bands of "warm/lukewarm/cold" words.
// Anything not in this map gets assigned a pseudorandom faraway rank.
window.RANK_MAP = {
  // ── Hot (1–25) ─────────────────────────────────────────────────
  "embassy": 1,
  "consulate": 2,
  "ambassador": 3,
  "diplomat": 4,
  "diplomatic": 5,
  "envoy": 6,
  "legation": 7,
  "chancery": 8,
  "mission": 9,
  "delegation": 10,
  "attache": 11,
  "ministry": 12,
  "foreign": 13,
  "diplomacy": 14,
  "emissary": 15,
  "consul": 16,
  "passport": 17,
  "visa": 18,
  "credentials": 19,
  "envoys": 20,
  "ambassadors": 21,
  "embassies": 22,
  "diplomats": 23,
  "official": 24,
  "representative": 25,

  // ── Warm (26–80) ───────────────────────────────────────────────
  "government": 31,
  "treaty": 34,
  "negotiation": 38,
  "protocol": 41,
  "summit": 44,
  "dignitary": 47,
  "statesman": 49,
  "bureau": 52,
  "office": 55,
  "headquarters": 58,
  "compound": 61,
  "premises": 64,
  "residence": 67,
  "building": 71,
  "nation": 74,
  "country": 77,
  "state": 80,

  // ── Lukewarm (100–500) ─────────────────────────────────────────
  "politics": 112,
  "policy": 128,
  "minister": 143,
  "secretary": 156,
  "agreement": 178,
  "border": 201,
  "capital": 234,
  "city": 267,
  "international": 289,
  "global": 312,
  "world": 356,
  "travel": 401,
  "journey": 445,
  "letter": 478,

  // ── Cold (500–2000) ────────────────────────────────────────────
  "house": 612,
  "home": 678,
  "office": 55, // dup ok
  "work": 845,
  "job": 912,
  "money": 1024,
  "paper": 1156,
  "document": 723,
  "book": 1340,
  "table": 1567,
  "chair": 1789,
  "window": 1834,
  "door": 1901,

  // ── Frigid (2000+) ─────────────────────────────────────────────
  "cat": 2456,
  "dog": 2512,
  "tree": 2789,
  "rock": 3012,
  "river": 2934,
  "mountain": 2701,
  "ocean": 3145,
  "fire": 3267,
  "ice": 3489,
  "snow": 3501,
  "banana": 4012,
  "potato": 4234,
  "pizza": 4567,
  "computer": 3890,
  "phone": 3756,
  "music": 3623,
  "song": 3712,
  "dance": 3845,
  "happy": 4123,
  "sad": 4256,
  "love": 3934,
  "hate": 4089,
};

// Stable hash → pseudorandom rank for words not in the map.
window.fallbackRank = function(word) {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Range: 1500 – 9999 (always cold)
  return 1500 + (Math.abs(h) % 8500);
};

window.getRank = function(word) {
  const w = word.toLowerCase().trim();
  if (!w) return null;
  if (Object.prototype.hasOwnProperty.call(window.RANK_MAP, w)) {
    return window.RANK_MAP[w];
  }
  return window.fallbackRank(w);
};

// Heat 0..1 from rank: 1 = hottest, ~5000+ = coldest
window.heatFromRank = function(rank) {
  if (rank == null) return 0;
  if (rank <= 1) return 1;
  // log-curve so the top ranks feel meaningfully different
  const t = Math.log(rank) / Math.log(5000);
  return Math.max(0, Math.min(1, 1 - t));
};
