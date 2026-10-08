/* Teen Patti rules (play chips only). No screen code, so it can be tested on its own. */

export const SUITS = ["S", "H", "D", "C"], SYM = { S: "♠", H: "♥", D: "♦", C: "♣" };
export const RANKNAME = r => ({ 11: "J", 12: "Q", 13: "K", 14: "A" }[r] || String(r));
const RANKWORD = r => ({ 14: "Aces", 13: "Kings", 12: "Queens", 11: "Jacks", 10: "Tens" }[r] || r + "s");
const RANKONE = r => ({ 14: "Ace", 13: "King", 12: "Queen", 11: "Jack" }[r] || String(r));

export function newDeck() {
  const d = []; for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

/* Ranking, best to worst: Trail (three of a kind), Pure sequence (straight flush), Sequence,
   Color (flush), Pair, High card. A-K-Q is the top sequence, A-2-3 is second, then K-Q-J down to 4-3-2. */
export function evalHand(cards) {
  const r = cards.map(c => c.r).sort((a, b) => b - a), flush = cards.every(c => c.s === cards[0].s);
  const trail = r[0] === r[1] && r[1] === r[2];
  const a23 = r[0] === 14 && r[1] === 3 && r[2] === 2, run = r[0] - r[1] === 1 && r[1] - r[2] === 1;
  const seq = run || a23, seqStrength = (r[0] === 14 && r[1] === 13) ? 100 : a23 ? 99 : r[0];
  const seqName = (r[0] === 14 && r[1] === 13) ? "A-K-Q" : a23 ? "A-2-3" : `${RANKNAME(r[0])}-${RANKNAME(r[1])}-${RANKNAME(r[2])}`;
  if (trail) return { cat: 6, key: [6, r[0]], name: `Trail of ${RANKWORD(r[0])}` };
  if (seq && flush) return { cat: 5, key: [5, seqStrength], name: `Pure sequence ${seqName}` };
  if (seq) return { cat: 4, key: [4, seqStrength], name: `Sequence ${seqName}` };
  if (flush) return { cat: 3, key: [3, r[0], r[1], r[2]], name: `Color, ${RANKONE(r[0])} high` };
  if (r[0] === r[1] || r[1] === r[2]) { const pr = r[1], kick = r[0] === r[1] ? r[2] : r[0]; return { cat: 2, key: [2, pr, kick], name: `Pair of ${RANKWORD(pr)}` }; }
  return { cat: 1, key: [1, r[0], r[1], r[2]], name: `High card ${RANKONE(r[0])}` };
}
/* >0 when a beats b, <0 when b beats a, 0 for an exact tie */
export function cmpHands(a, b) { for (let i = 0; i < Math.max(a.key.length, b.key.length); i++) { const d = (a.key[i] || 0) - (b.key[i] || 0); if (d) return d; } return 0; }
/* 0..1 strength guess the bots use */
export function strength(h) {
  const k = h.key;
  if (h.cat === 6) return .97 + k[1] / 14 * .03;
  if (h.cat === 5) return .9 + (k[1] === 100 ? 1 : k[1] === 99 ? .97 : k[1] / 14) * .06;
  if (h.cat === 4) return .8 + (k[1] === 100 ? 1 : k[1] === 99 ? .97 : k[1] / 14) * .09;
  if (h.cat === 3) return .62 + k[1] / 14 * .16;
  if (h.cat === 2) return .38 + k[1] / 14 * .22;
  return .08 + k[1] / 14 * .24 + k[2] / 14 * .04;
}
