/* Candy Match rules (match three). No screen code, so it can be tested on its own.
   Cells are { id, t: colour 0-5 (-1 for a colour bomb), k: 0 plain | 1 clears its row | 2 clears its column | 3 wrapped (3x3) | 4 colour bomb }. */
import { rng } from "./arcade.js";

export const N = 8, TYPES = 6, LIVES = 3;
const R = i => i / N | 0, C = i => i % N;

/* Levels cycle through three kinds of goal and get harder every three levels. */
export function levelSpec(n) {
  const tier = Math.floor((n - 1) / 3), kind = ["score", "collect", "jelly"][(n - 1) % 3];
  if (kind === "score") return { n, kind, moves: 20, target: 1400 + 500 * tier };
  if (kind === "collect") return { n, kind, moves: 20 + (tier > 2 ? 1 : 0), target: 14 + 3 * tier, color: (n * 5 + tier) % TYPES };
  return { n, kind, moves: 23 + Math.min(tier, 4), jelly: Math.min(28, 6 + 3 * tier) };
}
export function goalText(sp) {
  return sp.kind === "score" ? `Score ${sp.target} points` : sp.kind === "collect" ? `Clear ${sp.target} ${["red circles", "orange squares", "yellow stars", "green triangles", "blue drops", "purple hexagons"][sp.color]}` : `Clear all the jelly (${sp.jelly} squares)`;
}
/* how far along the goal is: { done, have, need } */
export function progress(g) {
  const sp = g.spec;
  if (sp.kind === "score") return { done: g.score >= sp.target, have: Math.min(g.score, sp.target), need: sp.target };
  if (sp.kind === "collect") return { done: g.got >= sp.target, have: Math.min(g.got, sp.target), need: sp.target };
  return { done: g.jelly.size === 0, have: sp.jelly - g.jelly.size, need: sp.jelly };
}

export function newGame(seed, level = 1) {
  const spec = levelSpec(level), s = ((seed >>> 0) * 977 + level * 13) >>> 0;
  const g = { seed: s, level, spec, rnd: rng(s * 17 + 5), idc: 0, score: 0, got: 0, jelly: new Set(), moves: spec.moves, b: [] };
  do {
    g.b = [];
    for (let i = 0; i < N * N; i++) {
      let t; do { t = g.rnd() * TYPES | 0; } while ((C(i) >= 2 && g.b[i - 1].t === t && g.b[i - 2].t === t) || (R(i) >= 2 && g.b[i - N].t === t && g.b[i - 2 * N].t === t));
      g.b.push(mk(g, t));
    }
  } while (!hint(g));
  if (spec.kind === "jelly") { const idx = Array.from({ length: N * N }, (_, i) => i).sort((a, b) => (R(b) - R(a)) + (g.rnd() - .5) * 5); idx.slice(0, spec.jelly).forEach(i => g.jelly.add(i)); }
  return g;
}
const mk = (g, t, k = 0) => ({ id: ++g.idc, t, k });

/* runs of three or more in a line, then grouped when they overlap (L and T shapes) */
function findGroups(b) {
  const runs = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N;) { const c = b[y * N + x]; let e = x + 1; if (c && c.t >= 0) while (e < N && b[y * N + e] && b[y * N + e].t === c.t) e++; if (e - x >= 3) runs.push({ h: true, t: c.t, cells: Array.from({ length: e - x }, (_, i) => y * N + x + i) }); x = Math.max(e, x + 1); }
  for (let x = 0; x < N; x++) for (let y = 0; y < N;) { const c = b[y * N + x]; let e = y + 1; if (c && c.t >= 0) while (e < N && b[e * N + x] && b[e * N + x].t === c.t) e++; if (e - y >= 3) runs.push({ h: false, t: c.t, cells: Array.from({ length: e - y }, (_, i) => (y + i) * N + x) }); y = Math.max(e, y + 1); }
  const groups = [], used = Array(runs.length).fill(false);
  runs.forEach((r, i) => {
    if (used[i]) return; used[i] = true; const grp = { t: r.t, runs: [r], cells: new Set(r.cells) }; let grew = true;
    while (grew) { grew = false; runs.forEach((q, j) => { if (!used[j] && q.t === grp.t && q.cells.some(c => grp.cells.has(c))) { used[j] = true; grp.runs.push(q); q.cells.forEach(c => grp.cells.add(c)); grew = true; } }); }
    groups.push(grp);
  });
  return groups;
}
const hasMatch = b => findGroups(b).length > 0;

/* which special (if any) a group makes, and on which square */
function special(grp, pref) {
  const longest = Math.max(...grp.runs.map(r => r.cells.length)), hz = grp.runs.find(r => r.h && r.cells.length === longest), cells = [...grp.cells];
  const pick = fallback => cells.find(c => pref.includes(c)) ?? fallback;
  if (longest >= 5) return { k: 4, at: pick(hz ? hz.cells[hz.cells.length >> 1] : grp.runs[0].cells[2]), t: -1 };
  const H = grp.runs.filter(r => r.h), V = grp.runs.filter(r => !r.h);
  if (H.length && V.length) { const cross = cells.find(c => H.some(r => r.cells.includes(c)) && V.some(r => r.cells.includes(c))); return { k: 3, at: pick(cross), t: grp.t }; }
  if (longest === 4) { const r = grp.runs.find(r => r.cells.length === 4); return { k: r.h ? 2 : 1, at: pick(r.cells[1]), t: grp.t }; }
  return null;
}

/* every square a special candy wipes when it goes off */
function blast(b, i) {
  const c = b[i], out = []; if (!c) return out; const y = R(i), x = C(i);
  if (c.k === 1) for (let k = 0; k < N; k++) out.push(y * N + k);
  else if (c.k === 2) for (let k = 0; k < N; k++) out.push(k * N + x);
  else if (c.k === 3) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < N && xx >= 0 && xx < N) out.push(yy * N + xx); }
  return out;
}
/* clear a set of squares, setting off any special candy inside it */
function expand(b, start, extra) {
  const set = new Set(start), q = [...set]; if (extra) extra.forEach(i => { if (!set.has(i)) { set.add(i); q.push(i); } });
  while (q.length) { const i = q.pop(), c = b[i]; if (!c) continue; let more = [];
    if (c.k === 4) { const t = c.bombT; more = t === undefined ? [] : b.map((d, j) => d && (t === null || (d.t >= 0 && d.t === t)) ? j : -1).filter(j => j >= 0); } else if (c.k) more = blast(b, i);
    more.forEach(j => { if (!set.has(j)) { set.add(j); q.push(j); } }); }
  return set;
}

function settle(g, frames, pref, first) {
  let combo = 0;
  for (;;) {
    let clear = new Set(), made = [], hit = false;
    const groups = findGroups(g.b);
    if (first) { clear = first.set; hit = true; made = first.made || []; first = null; }
    if (!groups.length && !hit) break;
    combo++;
    for (const grp of groups) {
      const sp = special(grp, pref), cells = [...grp.cells];
      const s = expand(g.b, cells.filter(c => !sp || c !== sp.at)); s.forEach(c => clear.add(c));
      if (sp) { made.push({ at: sp.at, k: sp.k, t: sp.t }); clear.delete(sp.at); }
    }
    made.forEach(m => clear.delete(m.at));
    const ids = [...clear].map(i => g.b[i] && g.b[i].id).filter(Boolean), cl = [...clear].filter(i => g.b[i]);
    const gain = cl.length * 20 * combo + made.length * 60; g.score += gain;
    const jc = cl.filter(i => g.jelly.has(i)); jc.forEach(i => g.jelly.delete(i));
    const gotNow = g.spec.kind === "collect" ? cl.filter(i => g.b[i].t === g.spec.color).length : 0; g.got += gotNow;
    cl.forEach(i => { g.b[i] = null; });
    made.forEach(m => { const old = g.b[m.at]; g.b[m.at] = { id: old ? old.id : ++g.idc, t: m.t, k: m.k }; });
    const madeOut = made.map(m => ({ ...m, id: g.b[m.at].id }));
    pref = [];
    /* gravity, then new candies drop in */
    const born = [];
    for (let x = 0; x < N; x++) { const col = []; for (let y = N - 1; y >= 0; y--) if (g.b[y * N + x]) col.push(g.b[y * N + x]); while (col.length < N) { const c = mk(g, g.rnd() * TYPES | 0); born.push(c.id); col.push(c); } for (let y = N - 1, k = 0; y >= 0; y--, k++) g.b[y * N + x] = col[k]; }
    frames.push({ t: "clear", jelly: jc, got: g.got, ids, cells: cl, made: madeOut, gain, combo, born, board: snap(g.b), score: g.score });
    made = [];
  }
}
const snap = b => b.map(c => ({ id: c.id, t: c.t, k: c.k }));

export function validSwap(a, c) { return a >= 0 && c >= 0 && a < N * N && c < N * N && ((Math.abs(a - c) === N) || (Math.abs(a - c) === 1 && R(a) === R(c))); }
/* try swapping two neighbours. Returns { ok, frames } and uses a move when it works. */
export function swap(g, a, c) {
  if (g.moves <= 0 || g.won || g.lost || !validSwap(a, c)) return { ok: false, frames: [] };
  const A = g.b[a], B = g.b[c]; const frames = [{ t: "swap", a, c }];
  [g.b[a], g.b[c]] = [B, A];
  let first = null;
  if (A.k === 4 || B.k === 4) {
    const bomb = A.k === 4 ? a : c, other = bomb === a ? B : A;
    g.b[bomb].bombT = other.k === 4 ? null : other.t; first = { set: expand(g.b, [bomb, bomb === a ? c : a]) };
  } else if (A.k && B.k) first = { set: expand(g.b, [a, c]) };
  if (!first && !hasMatch(g.b)) { [g.b[a], g.b[c]] = [A, B]; frames.push({ t: "bad", a, c }); return { ok: false, frames }; }
  g.moves--; settle(g, frames, [a, c], first);
  if (!hint(g)) { reshuffle(g); frames.push({ t: "shuffle", board: snap(g.b) }); }
  const pr = progress(g);
  if (pr.done) { const bonus = g.moves * 100; g.score += bonus; frames.push({ t: "win", bonus, moves: g.moves, score: g.score }); g.won = true; }
  else if (g.moves <= 0) { frames.push({ t: "lose" }); g.lost = true; }
  return { ok: true, frames };
}

/* every swap that would work */
export function validMoves(g) {
  const b = g.b, out = [];
  for (let i = 0; i < N * N; i++) for (const j of [i + 1, i + N]) {
    if (!validSwap(i, j)) continue;
    if (b[i].k === 4 || b[j].k === 4 || (b[i].k && b[j].k)) { out.push([i, j]); continue; }
    [b[i], b[j]] = [b[j], b[i]]; const m = hasMatch(b); [b[i], b[j]] = [b[j], b[i]]; if (m) out.push([i, j]);
  }
  return out;
}
/* a swap that would work, or null */
export function hint(g) {
  const b = g.b;
  for (let i = 0; i < N * N; i++) for (const j of [i + 1, i + N]) {
    if (!validSwap(i, j)) continue;
    if (b[i].k === 4 || b[j].k === 4 || (b[i].k && b[j].k)) return [i, j];
    [b[i], b[j]] = [b[j], b[i]]; const m = hasMatch(b); [b[i], b[j]] = [b[j], b[i]]; if (m) return [i, j];
  }
  return null;
}
/* nothing left to do: stir the colours up (specials stay where they are) */
export function reshuffle(g) {
  const idx = g.b.map((c, i) => i).filter(i => !g.b[i].k);
  for (let tries = 0; tries < 200; tries++) {
    const ts = idx.map(i => g.b[i].t); for (let i = ts.length - 1; i > 0; i--) { const j = g.rnd() * (i + 1) | 0;[ts[i], ts[j]] = [ts[j], ts[i]]; }
    idx.forEach((i, n) => { g.b[i] = { id: g.b[i].id, t: ts[n], k: 0 }; });
    if (!hasMatch(g.b) && hint(g)) return;
  }
  for (let i = 0; i < N * N; i++) g.b[i] = { id: g.b[i].id, t: g.rnd() * TYPES | 0, k: 0 };
  while (hasMatch(g.b) || !hint(g)) for (let i = 0; i < N * N; i++) g.b[i] = { id: g.b[i].id, t: g.rnd() * TYPES | 0, k: 0 };
}
export { findGroups, hasMatch };
