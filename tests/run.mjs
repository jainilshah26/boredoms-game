/* Logic tests for every game. Run with: npm test  (needs Node 18+, no dependencies). */
import { GAME, LIST, META } from "../js/games/index.js";
import { AVATARS } from "../js/avatars.js";
import { newSnake, step as snakeStep, turn, COLS, ROWS, interval } from "../js/games/snake_core.js";
import { genLevel, newWorld, stepWorld, TILE, GROUND } from "../js/games/bounce_core.js";
import { evalHand, cmpHands } from "../js/games/teenpatti_core.js";
import { arcadeState, arcadeAct } from "../js/games/arcade.js";

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.log("  FAIL:", msg); } return cond; };
const section = t => console.log("\n" + t);
const mk = n => Array.from({ length: n }, (_, i) => ({ id: null, n: "P" + i, av: "cat", c: "#fff", bot: true }));

section("Catalogue");
ok(LIST.length === 9, "9 games listed");
ok(AVATARS.length >= 20 && new Set(AVATARS.map(a => a.id)).size === AVATARS.length, "avatars have unique ids");
ok(AVATARS.every(a => a.svg && a.bg), "every avatar has artwork and a colour");
for (const g of LIST) ok(META[g.id] && GAME[g.id].mount && GAME[g.id].init, `${g.id} is wired up`);
console.log("  8 games, " + AVATARS.length + " avatars");

section("Turn-based games: bot-vs-bot until someone wins");
for (const [id, counts, runs, cap] of [["ludo", [2, 3, 4], 60, 5000], ["snl", [2, 6, 10], 60, 4000], ["tyc", [2, 4, 10], 25, 6000], ["clash", [2, 3, 6, 10], 60, 4000], ["ttt", [2], 40, 30]]) {
  const g = GAME[id]; let games = 0, stuck = 0;
  for (const n of counts) for (let r = 0; r < runs; r++) {
    const s = g.init(mk(n)); let i = 0;
    for (; i < cap && !s.over; i++) { const a = g.bot(s); const ev = a && g.act(s, { ...a, p: s.turn }); if (!ev) { ok(false, `${id} bot move rejected`); break; } }
    games++; if (!s.over) stuck++;
    if (id === "clash") ok(s.hands.reduce((t, h) => t + h.length, 0) + s.deck.length + s.pile.length === 108, "clash keeps all 108 cards");
  }
  ok(stuck === 0, `${id}: ${stuck} unfinished games`); console.log(`  ${id}: ${games} games, ${stuck} unfinished`);
}

section("Business Tycoon world tour");
{ const s = GAME.tyc.init(mk(10)); ok(s.players.length === 10, "10 players fit"); ok(GAME.tyc.max === 10, "max is 10"); }

section("Snake");
{
  const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }], key = p => p.x + "," + p.y;
  const bot = s => { const body = new Set(s.snake.slice(0, -1).map(key)), h = s.snake[0], prev = new Map([[key(h), null]]), q = [h];
    while (q.length) { const c = q.shift(); if (s.food && c.x === s.food.x && c.y === s.food.y) break; for (const d of DIRS) { const n = { x: c.x + d.x, y: c.y + d.y }; if (n.x < 0 || n.y < 0 || n.x >= COLS || n.y >= ROWS || body.has(key(n)) || prev.has(key(n))) continue; prev.set(key(n), c); q.push(n); } }
    let cur = s.food && prev.has(key(s.food)) ? s.food : null; if (!cur) return s.dir; while (prev.get(key(cur)) && key(prev.get(key(cur))) !== key(h)) cur = prev.get(key(cur)); return { x: cur.x - h.x, y: cur.y - h.y }; };
  let scored = 0, overlap = 0;
  for (let seed = 1; seed <= 100; seed++) { const s = newSnake(seed); for (let i = 0; i < 3000 && s.alive; i++) { turn(s, bot(s)); snakeStep(s); if (s.food && s.snake.some(p => p.x === s.food.x && p.y === s.food.y)) overlap++; } if (s.score > 0) scored++; }
  ok(scored === 100, "bot scores in every run"); ok(overlap === 0, "food never spawns on the snake");
  const a = newSnake(9), b = newSnake(9); ok(JSON.stringify(a.food) === JSON.stringify(b.food), "same seed gives same first apple");
  const t = newSnake(5); turn(t, { x: -1, y: 0 }); ok(t.queue.length === 0, "180-degree turn ignored");
  const w = newSnake(5); w.snake = [{ x: 15, y: 3 }, { x: 14, y: 3 }, { x: 13, y: 3 }]; ok(snakeStep(w).died === "wall", "wall ends the run");
  const e = newSnake(5); e.food = { x: 9, y: 10 }; snakeStep(e); ok(e.score === 10 && e.snake.length === 4, "eating scores 10 and grows");
  ok(interval({ score: 0 }) > interval({ score: 400 }), "snake speeds up");
  console.log("  100 bot runs, all scored");
}

section("Red Ball levels");
{
  function solvable(seed, n) {
    const base = newWorld(seed, n), L = { ...base.L, rings: [], flags: [] }, mkw = b => ({ L, ball: { ...b }, cp: base.cp, prevJump: false, inv: 0, t: 0 });
    const key = w => { const b = w.ball; return `${Math.round(b.x / 3)}|${Math.round(b.y / 3)}|${Math.round(b.vx)}|${Math.round(b.vy)}|${b.onGround ? 1 : 0}`; };
    const MAC = [{ jump: 0, T: 7 }, { jump: 26, T: 12 }, { jump: 12, T: 12 }], open = [mkw(base.ball)], seen = new Set(); let exp = 0;
    while (open.length && exp < 60000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].ball.x > open[bi].ball.x) bi = i; const cur = open.splice(bi, 1)[0]; exp++;
      for (const m of MAC) { if (m.jump && !(cur.ball.onGround || cur.ball.coyote > 0)) continue; const w = { ...cur, ball: { ...cur.ball } }; let dead = false;
        for (let f = 0; f < m.T; f++) { const ev = stepWorld(w, { left: false, right: true, jump: f < m.jump }); if (ev.some(e => e.startsWith("die"))) { dead = true; break; } if (ev.includes("finish")) return true; }
        if (dead) continue; const k = key(w); if (seen.has(k)) continue; seen.add(k); open.push(w); }
    }
    return false;
  }
  let total = 0, good = 0; for (let n = 0; n <= 12; n++) for (let seed = 1; seed <= 12; seed++) { total++; if (solvable(seed * 104729, n)) good++; }
  ok(good === total, `${total - good} of ${total} levels have no winning route`); console.log(`  ${good}/${total} generated levels are beatable`);
  const a = genLevel(123, 3), b = genLevel(123, 3), c = genLevel(124, 3); ok(JSON.stringify(a.rings) === JSON.stringify(b.rings), "same seed gives same level"); ok(JSON.stringify(a.rings) !== JSON.stringify(c.rings), "different seeds differ");
  const w = newWorld(5, 0); for (let i = 0; i < 90; i++) stepWorld(w, {}); ok(w.ball.onGround && Math.abs(w.ball.y - (GROUND * TILE - 12)) < 1.5, "ball rests on the ground");
  const j = newWorld(5, 0); let apex = j.ball.y; for (let i = 0; i < 80; i++) { stepWorld(j, { jump: true }); apex = Math.min(apex, j.ball.y); } const h = (GROUND * TILE - 12 - apex) / TILE; ok(h > 2.5 && h < 3.5, `jump height ${h.toFixed(1)} tiles`);
}

section("Teen Patti");
{
  const H = s => evalHand(s.split(" ").map(x => ({ r: { A: 14, K: 13, Q: 12, J: 11, T: 10 }[x[0]] || +x[0], s: x[1] })));
  const order = ["AS AH AD", "KS KH KD", "AS KS QS", "AS 2S 3S", "5S 4S 3S", "AS KH QD", "AS 2H 3D", "KS QH JD", "4S 3H 2D", "AS 2S 9S", "AS 2S 8S", "KS KH 2D", "AS KH 9D", "AS KH 8D", "KS QH 2D"];
  let good = true; for (let i = 0; i + 1 < order.length; i++) if (cmpHands(H(order[i]), H(order[i + 1])) <= 0) { good = false; console.log("  order broke at", order[i], order[i + 1]); }
  ok(good, "hand ranking order");
  ok(cmpHands(H("AS KH 9D"), H("AC KD 9H")) === 0, "exact tie detected");
  const g = GAME.teenpatti; let bad = 0, ended = 0;
  for (let n = 2; n <= 10; n++) for (let r = 0; r < 20; r++) {
    const s = g.init(mk(n)); let i = 0;
    while (!s.over && i++ < 4000) { const a = g.bot(s); if (!a) { bad++; break; } if (g.act(s, { ...a, p: s.turn }) === null) { bad++; break; } if (s.chips.reduce((x, y) => x + y, 0) + s.pot !== 1000 * n) { bad++; break; } }
    if (s.over) ended++; else bad++;
  }
  ok(bad === 0, "bot-vs-bot games keep chips constant and never stall"); ok(ended === 180, "every simulated game ends");
}

section("Arcade scoring and rooms");
{
  const s = arcadeState([{ n: "a" }, { n: "b" }, { n: "c", bot: true }]);
  ok(arcadeAct(s, { a: "score", p: 0, score: 120 }) && !s.over, "first score keeps the round open");
  ok(arcadeAct(s, { a: "score", p: 0, score: 999 }) === null, "a player can only score once");
  arcadeAct(s, { a: "score", p: 1, score: 300 }); ok(s.over && s.winner === 1, "highest score wins when all humans finish");
  const t = arcadeState([{ n: "a" }, { n: "b" }]); arcadeAct(t, { a: "score", p: 1, score: 5 }); ok(arcadeAct(t, { a: "fin", p: 1 }) === null, "only the host can end a round");
  ok(arcadeAct(t, { a: "fin", p: 0 }) && t.over && t.winner === 1, "host ends the round, best score wins");
  const u = arcadeState([{ n: "a" }]); arcadeAct(u, { a: "score", p: 0, score: 9e9 }); ok(u.scores[0] === 200000, "scores are capped");
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
