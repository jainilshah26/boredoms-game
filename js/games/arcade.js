/* Shared bits for the real-time arcade games (Snake, Bounce).
   Everybody plays the same seeded run on their own phone; only the final score travels through the room. */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function arcadeState(players) {
  return { players, seed: (Math.random() * 4294967296) >>> 0, scores: {}, turn: -1, over: false, winner: -1 };
}
const humans = s => s.players.map((p, i) => i).filter(i => !s.players[i].bot);
function top(s) {
  let w = -1, best = -1; Object.entries(s.scores).forEach(([i, v]) => { if (v > best) { best = v; w = +i; } }); return w;
}
export function arcadeAct(s, a) {
  if (a.a === "score") {
    if (s.over || s.scores[a.p] != null || a.p == null || a.p < 0) return null;
    s.scores[a.p] = Math.max(0, Math.min(200000, Math.floor(+a.score || 0)));
    const ev = [{ t: "score", p: a.p, score: s.scores[a.p], ms: 0 }];
    if (humans(s).every(i => s.scores[i] != null)) { s.over = true; s.winner = top(s); ev.push({ t: "done", ms: 0 }); }
    return ev;
  }
  if (a.a === "fin") { /* the host can end the round for everyone */
    if (s.over || a.p !== 0) return null; s.over = true; s.winner = top(s); if (s.winner < 0) s.winner = 0; return [{ t: "done", ms: 0 }];
  }
  return null;
}

/* Frame scheduling. In ?debug test mode a timer drives the loop so two tabs in one browser can both run. */
export const DEBUG = typeof location !== "undefined" && /[?&]debug/.test(location.search);
export const nextFrame = f => DEBUG ? setTimeout(() => f(performance.now()), 16) : requestAnimationFrame(f);
export const cancelFrame = id => DEBUG ? clearTimeout(id) : cancelAnimationFrame(id);
