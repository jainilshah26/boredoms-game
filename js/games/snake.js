import { $, $$, esc, stripHTML, setStrip, banner, queue } from "./common.js";
import { sfx, burst, shake, floatText, reduced, buzz } from "../fx.js";
import { arcadeState, arcadeAct, nextFrame, cancelFrame, DEBUG } from "./arcade.js";
import { stripInfo, endRun, ovButtons, winBanner } from "./arcade_ui.js";
import { COLS, ROWS, newSnake, step, turn, interval, level } from "./snake_core.js";

const LCD = { bg: "#B9CC9A", ghost: "#AEC28F", on: "#1F2D1B", edge: "#7E9164" };
const DIR = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 }, W: { x: 0, y: -1 }, S: { x: 0, y: 1 }, A: { x: -1, y: 0 }, D: { x: 1, y: 0 } };

export default {
  id: "snake", name: "Snake", min: 1, max: 10, solo: true, anytime: true,
  init: arcadeState, act: arcadeAct, bot: () => null,
  mount(root, ctx) {
    const P = ctx.players, me = ctx.mySeat >= 0 ? ctx.mySeat : 0; let S = ctx.state;
    const best0 = +(localStorage.getItem("bf_best_snake") || 0);
    root.innerHTML = `<div class="game snake">${P.length > 1 ? stripHTML(P, stripInfo(S, P)) : ""}
      <div class="arc-hud"><span>Score <b id="sc">0</b></span><span>Best <b id="bs">${best0}</b></span><span>Level <b id="lv">1</b></span></div>
      <div class="arc-wrap"><canvas id="cv" aria-label="Snake board"></canvas><div class="arc-ov" id="ov"></div></div>
      <div class="dpad" aria-label="Direction pad"><button data-d="ArrowUp" aria-label="Up">▲</button><button data-d="ArrowLeft" aria-label="Left">◀</button><button data-d="ArrowDown" aria-label="Down">▼</button><button data-d="ArrowRight" aria-label="Right">▶</button></div>
      <div class="banner"></div></div>`;
    const cv = $(root, "#cv"), g = cv.getContext("2d"), ov = $(root, "#ov"), wrap = $(root, ".arc-wrap");
    let cell = 16, dpr = 1;
    const size = () => {
      const land = innerWidth > innerHeight && innerHeight < 520, w = Math.min((wrap.parentElement.clientWidth || 360) - (land ? 300 : 0), 420);
      cell = Math.max(land ? 10 : 11, Math.min(Math.floor(w / COLS), Math.floor(((land ? innerHeight - 110 : innerHeight - (innerHeight < 700 ? 440 : 400))) / ROWS)));
      dpr = Math.min(devicePixelRatio || 1, 3); cv.width = cell * COLS * dpr; cv.height = cell * ROWS * dpr; cv.style.width = cell * COLS + "px"; cv.style.height = cell * ROWS + "px"; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size(); const ro = new ResizeObserver(() => { size(); draw(); }); ro.observe(wrap.parentElement);

    let game = newSnake(S.seed), mode = "ready", acc = 0, last = 0, raf = 0, pops = [], flash = 0, tongue = 0, best = best0;
    const hud = () => { $(root, "#sc").textContent = game.score; $(root, "#lv").textContent = level(game); };
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fill(); };
    function draw() {
      g.fillStyle = LCD.bg; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = LCD.ghost; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) g.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      g.strokeStyle = LCD.edge; g.lineWidth = 2; g.strokeRect(1, 1, cell * COLS - 2, cell * ROWS - 2);
      const f = game.food; if (f) { const x = f.x * cell, y = f.y * cell, c = cell; g.fillStyle = LCD.on; g.fillRect(x + c * .35, y + c * .12, c * .3, c * .2); rr(x + c * .15, y + c * .3, c * .7, c * .6, c * .25); }
      const b = game.bonus; if (b) { const pulse = .5 + .5 * Math.sin(performance.now() / 110), x = b.x * cell, y = b.y * cell, c = cell; g.fillStyle = LCD.on; g.save(); g.translate(x + c / 2, y + c / 2); g.rotate(performance.now() / 600); const r = c * (.62 + .12 * pulse); g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr2 = i % 2 ? r * .45 : r; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath(); g.fill(); g.restore(); g.fillRect(0, 0, cv.width / dpr * (b.ttl / b.max), 3); }
      game.snake.forEach((p, i) => { g.fillStyle = LCD.on; if (i === 0) { rr(p.x * cell, p.y * cell, cell, cell, cell * .35); g.fillStyle = LCD.bg; const d = game.dir, ex = d.y ? [.28, .72] : [d.x > 0 ? .62 : .38, d.x > 0 ? .62 : .38], ey = d.y ? [d.y > 0 ? .62 : .38, d.y > 0 ? .62 : .38] : [.28, .72]; for (let k = 0; k < 2; k++) g.fillRect(p.x * cell + cell * ex[k] - cell * .09, p.y * cell + cell * ey[k] - cell * .09, cell * .18, cell * .18); if (tongue > 0 || (mode === "play" && Math.floor(performance.now() / 350) % 4 === 0)) { g.fillStyle = LCD.on; g.fillRect(p.x * cell + cell / 2 + d.x * cell * .75 - cell * .06, p.y * cell + cell / 2 + d.y * cell * .75 - cell * .06, cell * .12, cell * .12); } } else { const inset = i === game.snake.length - 1 ? cell * .18 : cell * .08; rr(p.x * cell + inset, p.y * cell + inset, cell - inset * 2, cell - inset * 2, cell * .22); } });
      pops = pops.filter(p => performance.now() - p.t < 700); g.font = `700 ${Math.round(cell * .8)}px "Josefin Sans",monospace`; g.textAlign = "center"; pops.forEach(p => { const k = (performance.now() - p.t) / 700; g.globalAlpha = 1 - k; g.fillStyle = LCD.on; g.fillText(p.s, p.x * cell + cell / 2, p.y * cell - k * cell * 1.2); g.globalAlpha = 1; });
      if (flash > 0) { g.fillStyle = `rgba(31,45,27,${flash})`; g.fillRect(0, 0, cv.width, cv.height); flash = Math.max(0, flash - .06); }
    }
    function loop(t) {
      raf = nextFrame(loop); const dt = Math.min(100, t - (last || t)); last = t;
      if (mode === "play") {
        acc += dt;
        while (acc >= interval(game) && game.alive) {
          acc -= interval(game); const ev = step(game);
          if (ev.ate) { sfx.play("eat"); tongue = 3; const h = game.snake[0]; pops.push({ s: "+" + ev.gain, x: h.x, y: h.y, t: performance.now() }); buzz(8); hud(); if (ev.ate === "bonus") burst(cv.getBoundingClientRect ? [cv.getBoundingClientRect().left + h.x * cell, cv.getBoundingClientRect().top + h.y * cell] : cv, ["⭐"], 5); }
          if (tongue > 0) tongue--;
          if (ev.died) { die(ev.died); break; }
        }
      }
      draw();
    }
    function die(why) {
      mode = "over"; sfx.play("die"); buzz([40, 30, 80]); flash = .9; shake(wrap, 400); draw();
      if (game.score > best) { best = game.score; try { localStorage.setItem("bf_best_snake", best); } catch (e) { } $(root, "#bs").textContent = best; }
      setTimeout(() => endRun(ctx, "snake", game.score, ov, why === "perfect" ? "Perfect board!" : why === "wall" ? "Hit the wall!" : "Ate your tail!").then(() => ovButtons(ov, S, ctx)), 650);
    }
    const start = () => { if (mode !== "ready") return; mode = "play"; ov.hidden = true; last = performance.now(); acc = 0; };
    const press = d => { if (S.over && mode === "over") return; if (mode === "ready") start(); if (mode === "play") { if (turn(game, d)) buzz(5); } };
    ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Snake</h2><p class="sub">Swipe, use the arrows or your keyboard.<br>Eat the apples. Don't hit the walls or your tail.</p><button class="btn" id="go">Tap to start</button></div>`; $(ov, "#go").onclick = start;
    const key = e => { const d = DIR[e.key]; if (d) { e.preventDefault(); press(d); } else if (e.key === " " && mode === "ready") { e.preventDefault(); start(); } };
    addEventListener("keydown", key);
    $$(root, ".dpad button").forEach(b => b.addEventListener("pointerdown", e => { e.preventDefault(); press(DIR[b.dataset.d]); }));
    /* swipe anywhere on the game screen (not only on the board) */
    let sx = 0, sy = 0, sw = false;
    root.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; sx = e.clientX; sy = e.clientY; sw = true; });
    root.addEventListener("pointermove", e => { if (!sw) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) { press(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) }); sx = e.clientX; sy = e.clientY; } });
    addEventListener("pointerup", () => sw = false); addEventListener("pointercancel", () => sw = false);
    const vis = () => { if (!DEBUG && document.hidden && mode === "play") { mode = "paused"; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Paused</h2><button class="btn" id="res">Resume</button></div>`; $(ov, "#res").onclick = () => { mode = "play"; ov.hidden = true; last = performance.now(); }; } };
    document.addEventListener("visibilitychange", vis);
    hud(); draw(); raf = nextFrame(loop);
    if (/[?&]debug/.test(location.search)) window.__dbg = { get game() { return game; }, get mode() { return mode; }, press, start };

    const fresh = ns => { S = ns; game = newSnake(S.seed); mode = "ready"; acc = 0; pops = []; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>New round</h2><button class="btn" id="go">Tap to start</button></div>`; $(ov, "#go").onclick = start; hud(); banner(root, ""); draw(); };
    const q = queue(async (s, ev) => {
      if (ev.some(e => e.t === "reset")) return fresh(s);
      S = s; if (P.length > 1) setStrip(root, -1, stripInfo(S, P));
      if (S.over) {
        if (mode === "play" || mode === "ready" || mode === "paused") { mode = "over"; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Round over</h2><p class="sub">The host ended the round.</p><div class="ovb" id="ovb"></div></div>`; }
        winBanner(root, S, P, ctx); ovButtons(ov, S, ctx);
        if (ev.some(e => e.t === "done")) ctx.finished(P.length === 1 ? -1 : S.winner);
      } else if (mode === "over") ovButtons(ov, S, ctx);
    });
    return { push: (s, e) => q.push(s, e), get busy() { return false; }, destroy() { cancelFrame(raf); removeEventListener("keydown", key); ro.disconnect(); document.removeEventListener("visibilitychange", vis); } };
  },
};
