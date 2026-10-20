/* Free Flow rules: join each pair of matching dots with a path so every square is filled.
   Puzzles are cut from a random path that visits every square, so each one has a solution. No screen code. */
import { rng } from "./arcade.js";

/* size and number of colours for level 0, 1, 2 ... */
export const SPECS = [[5, 4], [5, 5], [6, 5], [6, 6], [7, 6], [7, 7], [8, 7], [8, 8], [9, 8], [9, 9]];
export const spec = lvl => SPECS[Math.min(lvl, SPECS.length - 1)];
export const points = n => n * n * 4;

/* a random path through every square of an n x n grid (backbite moves on a snake path) */
function hamPath(n, r) {
  let p = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) p.push(y * n + (y % 2 ? n - 1 - x : x));
  const nb = i => { const y = i / n | 0, x = i % n, o = []; if (x > 0) o.push(i - 1); if (x < n - 1) o.push(i + 1); if (y > 0) o.push(i - n); if (y < n - 1) o.push(i + n); return o; };
  for (let it = 0; it < n * n * 30; it++) {
    if (r() < .5) p.reverse();
    const pos = new Map(p.map((c, i) => [c, i])), opts = nb(p[0]).filter(c => pos.get(c) > 1);
    if (!opts.length) continue;
    const j = pos.get(opts[r() * opts.length | 0]);
    p = p.slice(0, j).reverse().concat(p.slice(j));
  }
  return p;
}

/* level: { n, k, pairs: [{a, b}], sol: [[cells]] }; cells are row * n + column */
export function makeLevel(seed, lvl) {
  const [n, k] = spec(lvl), r = rng((seed >>> 0) * 131 + lvl * 7919 + 3), path = hamPath(n, r), total = n * n;
  const len = Array(k).fill(3); let spare = total - 3 * k; while (spare > 0) { len[r() * k | 0]++; spare--; }
  const sol = []; let at = 0; for (const l of len) { sol.push(path.slice(at, at + l)); at += l; }
  return { n, k, lvl, pairs: sol.map(s => ({ a: s[0], b: s[s.length - 1] })), sol };
}

export function newPlay(L) {
  const p = { L, n: L.n, paths: Array.from({ length: L.k }, () => []), own: new Int8Array(L.n * L.n).fill(-1), dot: new Int8Array(L.n * L.n).fill(-1) };
  L.pairs.forEach((q, c) => { p.dot[q.a] = c; p.dot[q.b] = c; });
  return p;
}
const rebuild = p => { p.own.fill(-1); p.paths.forEach((pa, c) => pa.forEach(i => { p.own[i] = c; })); };
export const adjacent = (n, a, b) => { const d = Math.abs(a - b); return (d === n) || (d === 1 && (a / n | 0) === (b / n | 0)); };
export const complete = (p, c) => { const pa = p.paths[c]; return pa.length > 1 && pa[pa.length - 1] !== pa[0] && p.dot[pa[pa.length - 1]] === c; };

/* touch a square. Returns the colour being drawn, or -1 when nothing can start there */
export function begin(p, cell) {
  const c = p.dot[cell];
  if (c >= 0) { p.paths[c] = [cell]; rebuild(p); return c; }
  const o = p.own[cell];
  if (o >= 0) { const i = p.paths[o].indexOf(cell); p.paths[o] = p.paths[o].slice(0, i + 1); rebuild(p); return o; }
  return -1;
}
/* move the line of colour c onto a neighbouring square. Returns true when something changed */
export function step(p, c, cell) {
  const pa = p.paths[c]; if (!pa.length) return false;
  const head = pa[pa.length - 1]; if (cell === head || !adjacent(p.n, head, cell)) return false;
  if (pa.length > 1 && cell === pa[pa.length - 2]) { pa.pop(); rebuild(p); return true; }
  if (complete(p, c)) return false;
  if (p.own[cell] === c) { p.paths[c] = pa.slice(0, pa.indexOf(cell) + 1); rebuild(p); return true; }
  const d = p.dot[cell]; if (d >= 0 && d !== c) return false;
  const o = p.own[cell];
  if (o >= 0 && d < 0) p.paths[o] = p.paths[o].slice(0, p.paths[o].indexOf(cell));
  pa.push(cell); rebuild(p); return true;
}
export const reset = p => { p.paths.forEach((_, c) => { p.paths[c] = []; }); rebuild(p); };
export const filled = p => { let n = 0; for (const v of p.own) if (v >= 0) n++; return n; };
export const solved = p => p.paths.every((_, c) => complete(p, c)) && filled(p) === p.n * p.n;
