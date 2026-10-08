/* Red-ball platformer: level generator and physics, no screen code. */
import { rng } from "./arcade.js";

export const TILE = 32, ROWS = 9, GROUND = 6, VW = 480, VH = 288;
export const PHYS = { G: .48, TERM: 11, MAXV: 3.5, JUMP: 9.8, SPRING: 12.8, R: 12 };

/* Same seed + level number always gives the same level on every phone. */
export function genLevel(seed, n) {
  const r = rng(((seed ^ Math.imul(n + 1, 2654435761)) >>> 0) || 1);
  const W = Math.min(150, 64 + n * 12), solid = Array.from({ length: ROWS }, () => new Uint8Array(W));
  const spikes = [], rings = [], flags = [];
  const ground = (a, b) => { for (let c = a; c < Math.min(b, W); c++) for (let y = GROUND; y < ROWS; y++) solid[y][c] = 1; };
  const raise = (c, h) => { for (let k = 1; k <= h; k++) solid[GROUND - k][c] = 1; };
  const ring = (c, row) => rings.push({ x: c * TILE + TILE / 2, y: row * TILE + TILE / 2, got: false });
  const hazardChance = Math.min(.82, .42 + n * .06);
  ground(0, 8); let x = 8, rest = 0, lastFlag = 0;
  while (x < W - 12) {
    if (rest > 0 || r() > hazardChance) { // a breather: flat ground, sometimes rings or a low platform
      const len = 3 + ((r() * 4) | 0); ground(x, x + len);
      if (x - lastFlag >= 26) { flags.push({ x: (x + 1) * TILE + TILE / 2, y: GROUND * TILE, got: false }); lastFlag = x; }
      if (r() < .55) for (let k = 0; k < Math.min(3, len); k++) ring(x + k, GROUND - 2);
      if (len >= 5 && n > 1 && r() < .5) { const pc = x + 1, pl = 2 + ((r() * 2) | 0); for (let k = 0; k < pl; k++) solid[GROUND - 2][pc + k] = 1; for (let k = 0; k < pl; k++) ring(pc + k, GROUND - 3); }
      x += len; rest = Math.max(0, rest - 1); continue;
    }
    const t = r(); rest = 1;
    if (t < .28) { // a pit to jump over
      const gap = n >= 2 ? 2 + ((r() * 2) | 0) : 2, lead = 3; ground(x, x + lead); const gs = x + lead;
      ground(gs + gap, gs + gap + 4); for (let k = 0; k < gap; k++) ring(gs + k, GROUND - 3 + (k === 0 || k === gap - 1 ? 1 : 0));
      x = gs + gap + 4;
    } else if (t < .5) { // blocks to hop onto
      const L = 7; ground(x, x + L); const h = n >= 2 && r() < .5 ? 2 : 1, w = 1 + ((r() * 2) | 0);
      for (let k = 0; k < w; k++) raise(x + 3 + k, h); ring(x + 3, GROUND - h - 2); if (w > 1) ring(x + 4, GROUND - h - 2); x += L;
    } else if (t < .72) { // spikes
      const maxW = n < 2 ? 1 : n < 5 ? 2 : 3, w = 1 + ((r() * maxW) | 0), L = w + 6; ground(x, x + L); const sc = x + 3;
      spikes.push({ x: sc * TILE, w: w * TILE }); for (let k = 0; k < w; k++) ring(sc + k, GROUND - 3); x += L;
    } else if (t < .86) { // stairs
      const L = 9; ground(x, x + L); const hs = [1, 1, 2, 2, 1, 1]; hs.forEach((h, k) => raise(x + 2 + k, h)); ring(x + 4, GROUND - 4); x += L;
    } else { // spring to a high ledge full of rings
      const L = 8; ground(x, x + L); solid[GROUND][x + 2] = 2;
      for (let k = 0; k < 3; k++) { solid[2][x + 3 + k] = 1; ring(x + 3 + k, 1); } ring(x + 2, 3); x += L;
    }
  }
  ground(x, W);
  return { n, W, solid, spikes, rings, flags, endX: (W - 3) * TILE };
}

export function newWorld(seed, n) {
  const L = genLevel(seed, n), sx = 48, sy = GROUND * TILE - PHYS.R;
  return { L, ball: { x: sx, y: sy, vx: 0, vy: 0, rot: 0, onGround: true, coyote: 0, jumpBuf: 0, squash: 0 }, cp: { x: sx, y: sy }, prevJump: false, inv: 0, t: 0 };
}
export function respawn(w) { const b = w.ball; b.x = w.cp.x; b.y = w.cp.y; b.vx = b.vy = 0; b.onGround = true; w.inv = 90; }

const solidAt = (L, c, rr) => c < 0 || (rr >= 0 && rr < ROWS && c < L.W && L.solid[rr][c] > 0) ? (c < 0 ? 1 : L.solid[rr][c]) : 0;
function resolve(w, ev) {
  const b = w.ball, L = w.L, R = PHYS.R;
  for (let pass = 0; pass < 2; pass++) {
    const c0 = Math.floor((b.x - R) / TILE), c1 = Math.floor((b.x + R) / TILE), r0 = Math.floor((b.y - R) / TILE), r1 = Math.floor((b.y + R) / TILE);
    for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
      const tile = solidAt(L, c, rr); if (!tile) continue;
      const left = c * TILE, top = rr * TILE, cx = Math.max(left, Math.min(b.x, left + TILE)), cy = Math.max(top, Math.min(b.y, top + TILE));
      let dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy; if (d2 >= R * R) continue;
      let nx, ny, pen;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; pen = R - d; }
      else { const ex = [b.x - left, left + TILE - b.x, b.y - top, top + TILE - b.y], m = Math.min(...ex), k = ex.indexOf(m); nx = k === 0 ? -1 : k === 1 ? 1 : 0; ny = k === 2 ? -1 : k === 3 ? 1 : 0; pen = m + R; }
      b.x += nx * pen; b.y += ny * pen;
      if (Math.abs(ny) > Math.abs(nx)) {
        if (ny < 0) { if (b.vy > 2.5) b.squash = Math.min(1, b.vy / 9); if (tile === 2 && b.vy > .5) { b.vy = -PHYS.SPRING; ev.push("spring"); b.onGround = false; } else { b.vy = Math.min(b.vy, 0); b.onGround = true; } }
        else b.vy = Math.max(b.vy, 0);
      } else if (nx * b.vx < 0) b.vx = 0;
    }
  }
}
/* one 60th-of-a-second step. input = {left, right, jump}. Returns events like "ring", "die:spike", "finish". */
export function stepWorld(w, input) {
  const ev = [], b = w.ball, L = w.L, P = PHYS; w.t++; if (w.inv > 0) w.inv--;
  const acc = b.onGround ? .3 : .22;
  if (input.right && !input.left) b.vx = Math.min(P.MAXV, b.vx + acc); else if (input.left && !input.right) b.vx = Math.max(-P.MAXV, b.vx - acc); else b.vx *= b.onGround ? .85 : .97;
  if (input.jump && !w.prevJump) b.jumpBuf = 7; w.prevJump = input.jump; if (b.jumpBuf > 0) b.jumpBuf--;
  if (b.onGround) b.coyote = 7; else if (b.coyote > 0) b.coyote--;
  if (b.jumpBuf > 0 && b.coyote > 0) { b.vy = -P.JUMP; b.jumpBuf = 0; b.coyote = 0; b.onGround = false; ev.push("jump"); }
  if (!input.jump && b.vy < -3.5 && b.vy > -P.SPRING + .5) b.vy = -3.5;
  b.vy = Math.min(P.TERM, b.vy + P.G); b.onGround = false;
  for (let i = 0; i < 4; i++) { b.x += b.vx / 4; resolve(w, ev); b.y += b.vy / 4; resolve(w, ev); }
  if (b.x < P.R) { b.x = P.R; b.vx = Math.max(0, b.vx); }
  b.rot += b.vx / P.R; if (b.squash > 0) b.squash = Math.max(0, b.squash - .08);
  for (const g of L.rings) if (!g.got && Math.hypot(g.x - b.x, g.y - b.y) < 19) { g.got = true; ev.push("ring"); }
  for (const f of L.flags) if (!f.got && b.x > f.x) { f.got = true; w.cp = { x: f.x, y: f.y - P.R }; ev.push("checkpoint"); }
  if (!w.inv) {
    if (b.y > ROWS * TILE + 50) ev.push("die:fall");
    else for (const s of L.spikes) if (b.x + 8 > s.x + 7 && b.x - 8 < s.x + s.w - 7 && b.y + P.R - 3 > GROUND * TILE - 12 && b.y - P.R < GROUND * TILE) { ev.push("die:spike"); break; }
  } else if (b.y > ROWS * TILE + 50) respawn(w);
  if (b.x > L.endX) ev.push("finish");
  return ev;
}
