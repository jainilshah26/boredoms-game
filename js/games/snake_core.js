/* Snake rules, no screen code: easy to test. */
import { rng } from "./arcade.js";

export const COLS = 16, ROWS = 20;
const same = (a, b) => a && b && a.x === b.x && a.y === b.y;

export function newSnake(seed) {
  const s = { snake: [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }], dir: { x: 1, y: 0 }, queue: [], food: null, bonus: null, score: 0, eaten: 0, alive: true, ticks: 0, r: rng(seed) };
  placeFood(s); return s;
}
/* turn the snake; reversing straight back into yourself is ignored */
export function turn(s, d) {
  const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
  if ((d.x === -last.x && d.y === -last.y) || (d.x === last.x && d.y === last.y)) return false;
  if (s.queue.length >= 3) return false; s.queue.push(d); return true;
}
/* milliseconds per move; faster as you score */
export const interval = s => Math.max(62, 140 - Math.floor(s.score / 40) * 7);
export const level = s => 1 + Math.floor(s.score / 40);

function freeCells(s) {
  const cells = []; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = { x, y }; if (!s.snake.some(p => same(p, c)) && !same(s.food, c) && !same(s.bonus, c)) cells.push(c); }
  return cells;
}
function placeFood(s) { const f = freeCells(s); s.food = f.length ? f[(s.r() * f.length) | 0] : null; }

/* advance one move; returns what happened */
export function step(s) {
  const ev = {}; if (!s.alive) return ev;
  if (s.queue.length) s.dir = s.queue.shift();
  s.ticks++;
  if (s.bonus && --s.bonus.ttl <= 0) { s.bonus = null; ev.bonusGone = true; }
  const h = s.snake[0], n = { x: h.x + s.dir.x, y: h.y + s.dir.y };
  if (n.x < 0 || n.y < 0 || n.x >= COLS || n.y >= ROWS) { s.alive = false; ev.died = "wall"; return ev; }
  const eatFood = same(s.food, n), eatBonus = same(s.bonus, n), grow = eatFood || eatBonus;
  if ((grow ? s.snake : s.snake.slice(0, -1)).some(p => same(p, n))) { s.alive = false; ev.died = "self"; return ev; }
  s.snake.unshift(n); if (!grow) s.snake.pop();
  if (eatBonus) { s.score += 20 + s.bonus.ttl; ev.ate = "bonus"; ev.gain = 20 + s.bonus.ttl; s.bonus = null; }
  if (eatFood) {
    s.score += 10; s.eaten++; ev.ate = "food"; ev.gain = 10; placeFood(s);
    if (s.eaten % 5 === 0 && !s.bonus) { const f = freeCells(s).filter(c => !same(c, s.food)); if (f.length) s.bonus = { ...f[(s.r() * f.length) | 0], ttl: 48, max: 48 }; }
  }
  if (!s.food) { s.alive = false; ev.died = "perfect"; }
  return ev;
}
