import { $, $$, stripHTML, setStrip, banner, queue } from "./common.js";
import { sfx, burst, shake, buzz } from "../fx.js";
import { arcadeState, arcadeAct, nextFrame, cancelFrame, DEBUG } from "./arcade.js";
import { stripInfo, endRun, ovButtons, winBanner } from "./arcade_ui.js";
import { N, newGame, swap, hint, validSwap, MOVES } from "./candy_core.js";

const COL = ["#E8453C", "#F2842B", "#F2C62E", "#35C07A", "#3B8CF0", "#A860E8"], DARK = ["#9E1B14", "#B2500B", "#B38C07", "#17804A", "#1B56B0", "#6A32A8"];
const sleep = ms => new Promise(r => setTimeout(r, ms));

export default {
  id: "candy", name: "Candy Match", min: 1, max: 10, solo: true, anytime: true,
  init: arcadeState, act: arcadeAct, bot: () => null,
  mount(root, ctx) {
    const P = ctx.players; let S = ctx.state;
    const best0 = +(localStorage.getItem("bf_best_candy") || 0);
    root.innerHTML = `<div class="game bounce candy">${P.length > 1 ? stripHTML(P, stripInfo(S, P)) : ""}
      <div class="arc-hud"><span>Score <b id="sc">0</b></span><span>Moves <b id="mv">${MOVES}</b></span><span>Best <b id="bs">${best0}</b></span></div>
      <div class="arc-wrap candywrap"><canvas id="cv" aria-label="Candy board"></canvas><div class="arc-ov" id="ov"></div></div>
      <div class="pad2 cr"><button id="ht" aria-label="Show a move">💡<small>HINT</small></button></div>
      <div class="banner"></div></div>`;
    const cv = $(root, "#cv"), g = cv.getContext("2d"), ov = $(root, "#ov"), wrap = $(root, ".arc-wrap");
    let px = 320, c = 40, dpr = 1;
    const size = () => {
      const land = innerWidth > innerHeight && innerHeight < 520, avail = land ? innerHeight - 110 : innerHeight - (innerHeight < 700 ? 400 : 360);
      px = Math.max(240, Math.min((wrap.parentElement.clientWidth || 360) - (land ? 300 : 0), 480, avail)); px -= px % N; c = px / N; dpr = Math.min(devicePixelRatio || 1, 3);
      cv.style.width = px + "px"; cv.style.height = px + "px"; cv.width = Math.round(px * dpr); cv.height = Math.round(px * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      sprites.forEach(s => { if (s.cell >= 0) { s.x = s.tx = (s.cell % N) * c; s.y = s.ty = (s.cell / N | 0) * c; } });
    };
    let G = newGame(S.seed), mode = "ready", busy = false, raf = 0, last = 0, best = best0, sel = -1, idle = 0, hintCells = [], pops = [], parts = [], shakeT = 0;
    const sprites = new Map();
    const load = () => { sprites.clear(); G.b.forEach((cell, i) => sprites.set(cell.id, { id: cell.id, t: cell.t, k: cell.k, cell: i, x: (i % N) * c, y: (i / N | 0) * c, tx: (i % N) * c, ty: (i / N | 0) * c, sc: 1, al: 1, die: 0 })); };
    size(); load(); const ro = new ResizeObserver(() => { size(); }); ro.observe(wrap.parentElement);
    const hud = () => { $(root, "#sc").textContent = G.score; $(root, "#mv").textContent = G.moves; };

    /* ---- drawing ---- */
    const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .55 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); };
    const shape = (t, x, y, r) => {
      g.beginPath();
      if (t === 0) g.arc(x, y, r, 0, 7);
      else if (t === 1) { const s = r * .92; g.roundRect ? g.roundRect(x - s, y - s, s * 2, s * 2, s * .5) : g.rect(x - s, y - s, s * 2, s * 2); }
      else if (t === 2) return star(x, y + r * .05, r * 1.1);
      else if (t === 3) { g.moveTo(x, y - r); g.lineTo(x + r * 1.0, y + r * .8); g.lineTo(x - r * 1.0, y + r * .8); g.closePath(); }
      else if (t === 4) { g.moveTo(x, y - r * 1.05); g.bezierCurveTo(x + r * 1.1, y - r * .1, x + r * 1.0, y + r * .95, x, y + r * .95); g.bezierCurveTo(x - r * 1.0, y + r * .95, x - r * 1.1, y - r * .1, x, y - r * 1.05); }
      else { for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05); } g.closePath(); }
    };
    function candy(s, now) {
      const cx = s.x + c / 2, cy = s.y + c / 2, r = c * .38 * s.sc; if (s.al <= 0 || r <= 0) return; g.save(); g.globalAlpha = Math.max(0, s.al);
      if (s.k === 4) {
        const gr = g.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r * 1.1); gr.addColorStop(0, "#8A8FA0"); gr.addColorStop(.5, "#2B2F3C"); gr.addColorStop(1, "#0E1018"); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 1.08, 0, 7); g.fill();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + now / 700; g.fillStyle = COL[i % 6]; g.beginPath(); g.arc(cx + Math.cos(a) * r * .62, cy + Math.sin(a) * r * .62, r * .16, 0, 7); g.fill(); }
        g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(cx - r * .35, cy - r * .45, r * .26, r * .14, -.6, 0, 7); g.fill(); g.restore(); return;
      }
      const gr = g.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r * 1.15); gr.addColorStop(0, "#fff"); gr.addColorStop(.25, COL[s.t]); gr.addColorStop(1, DARK[s.t]);
      g.fillStyle = "rgba(0,0,0,.28)"; shape(s.t, cx + 1.5, cy + 3, r); g.fill();
      g.fillStyle = gr; shape(s.t, cx, cy, r); g.fill(); g.lineWidth = 2; g.strokeStyle = DARK[s.t]; g.stroke();
      g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(cx - r * .32, cy - r * .42, r * .3, r * .15, -.7, 0, 7); g.fill();
      if (s.k === 1 || s.k === 2) { g.save(); shape(s.t, cx, cy, r); g.clip(); g.fillStyle = "rgba(255,255,255,.8)"; for (let i = -1; i <= 1; i++) { if (s.k === 1) g.fillRect(cx - r * 1.2, cy + i * r * .62 - r * .1, r * 2.4, r * .22); else g.fillRect(cx + i * r * .62 - r * .1, cy - r * 1.2, r * .22, r * 2.4); } g.restore(); }
      if (s.k === 3) { g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 3; g.setLineDash([5, 4]); g.beginPath(); g.arc(cx, cy, r * 1.22, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = "#fff"; [[-1.2, 0], [1.2, 0]].forEach(([dx]) => { g.beginPath(); g.moveTo(cx + dx * r, cy); g.lineTo(cx + dx * r * 1.45, cy - r * .35); g.lineTo(cx + dx * r * 1.45, cy + r * .35); g.closePath(); g.fill(); }); }
      g.restore();
    }
    function draw(now, dt) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sx = shakeT > 0 ? Math.sin(now / 18) * 3 : 0; g.save(); g.translate(sx, 0);
      for (let i = 0; i < N * N; i++) { g.fillStyle = (i + (i / N | 0)) % 2 ? "#26164A" : "#2E1C5A"; g.fillRect((i % N) * c, (i / N | 0) * c, c, c); }
      if (sel >= 0) { g.strokeStyle = "#FFE27A"; g.lineWidth = 4; g.strokeRect((sel % N) * c + 2, (sel / N | 0) * c + 2, c - 4, c - 4); }
      const k = 1 - Math.exp(-dt / 70);
      sprites.forEach(s => {
        s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k; if (Math.abs(s.tx - s.x) < .3) s.x = s.tx; if (Math.abs(s.ty - s.y) < .3) s.y = s.ty;
        if (s.die) { s.sc = Math.max(0, s.sc - dt / 180); s.al = s.sc; }
        let o = s; if (hintCells.includes(s.cell) && !s.die && !busy) { const w = 1 + .12 * Math.sin(now / 160); o = { ...s, sc: s.sc * w }; }
        candy(o, now);
      });
      parts = parts.filter(q => q.l > 0); parts.forEach(q => { q.l -= dt; q.x += q.vx * dt / 16; q.y += q.vy * dt / 16; q.vy += .25; g.globalAlpha = Math.max(0, q.l / 500); g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill(); }); g.globalAlpha = 1;
      pops = pops.filter(q => now - q.t < 900); g.textAlign = "center"; pops.forEach(q => { const kk = (now - q.t) / 900; g.globalAlpha = 1 - kk; g.font = `900 ${Math.round(c * (q.big ? .8 : .6))}px "Playfair Display",Georgia,serif`; g.lineWidth = 5; g.strokeStyle = "rgba(0,0,0,.7)"; g.strokeText(q.s, q.x, q.y - kk * c); g.fillStyle = q.big ? "#FFE27A" : "#fff"; g.fillText(q.s, q.x, q.y - kk * c); g.globalAlpha = 1; });
      g.restore(); if (shakeT > 0) shakeT -= dt;
    }
    function loop(t) {
      raf = nextFrame(loop); const dt = Math.min(60, t - (last || t)); last = t; const now = performance.now();
      if (mode === "play" && !busy) { idle += dt; if (idle > 6000 && !hintCells.length) showHint(); }
      draw(now, dt);
    }
    const showHint = () => { const h = hint(G); hintCells = h ? [h[0], h[1]] : []; };
    const burstAt = (i, col) => { const x = (i % N + .5) * c, y = ((i / N | 0) + .5) * c; for (let n = 0; n < 7; n++) { const a = Math.random() * 6.28, v = 1.5 + Math.random() * 3; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, r: 2 + Math.random() * 3, c: col, l: 400 + Math.random() * 200 }); } };

    /* ---- play a move: animate each step the rules give back ---- */
    async function doSwap(a, b) {
      if (busy || mode !== "play" || !validSwap(a, b)) return; busy = true; sel = -1; hintCells = []; idle = 0;
      const r = swap(G, a, b); const at = i => sprites.get(idAt[i]);
      /* ids of whatever stood on the two squares before the move */
      const idAt = {}; sprites.forEach(s => { idAt[s.cell] = s.id; });
      for (const f of r.frames) {
        if (f.t === "swap" || f.t === "bad") { const A = sprites.get(idAt[f.a]), B = sprites.get(idAt[f.c]); if (!A || !B) continue; const ac = A.cell; A.cell = B.cell; B.cell = ac; A.tx = (A.cell % N) * c; A.ty = (A.cell / N | 0) * c; B.tx = (B.cell % N) * c; B.ty = (B.cell / N | 0) * c; if (f.t === "bad") { sfx.play("bonk"); buzz(10); shakeT = 160; } else sfx.play("tap"); await sleep(190); [idAt[f.a], idAt[f.c]] = [idAt[f.c], idAt[f.a]]; }
        else if (f.t === "clear") {
          f.ids.forEach(id => { const s = sprites.get(id); if (s) { s.die = 1; burstAt(s.cell, COL[s.t] || "#fff"); } });
          f.made.forEach(m => { const s = sprites.get(m.id); if (s) { s.t = m.t; s.k = m.k; s.die = 0; s.sc = 1.5; s.al = 1; } });
          sfx.play(f.combo > 1 ? "up" : "pop"); buzz(f.combo > 2 ? 25 : 10);
          const mid = f.cells[f.cells.length >> 1] ?? 0; pops.push({ s: "+" + f.gain, x: (mid % N + .5) * c, y: ((mid / N | 0) + .5) * c, t: performance.now(), big: f.combo > 1 });
          if (f.combo > 1) pops.push({ s: ["", "", "Sweet!", "Tasty!", "Delicious!", "Divine!"][Math.min(f.combo, 5)], x: px / 2, y: px * .45, t: performance.now(), big: true });
          $(root, "#sc").textContent = f.score;
          await sleep(210);
          f.ids.forEach(id => sprites.delete(id));
          /* the board after gravity and refill: existing candies slide down, new ones drop in from above */
          const cols = {}; f.board.forEach((cell, i) => { let s = sprites.get(cell.id); if (!s) { const x = i % N; cols[x] = (cols[x] || 0) + 1; s = { id: cell.id, t: cell.t, k: cell.k, cell: i, x: x * c, y: -cols[x] * c, tx: x * c, ty: 0, sc: 1, al: 1, die: 0 }; sprites.set(cell.id, s); } s.cell = i; s.t = cell.t; s.k = cell.k; s.tx = (i % N) * c; s.ty = (i / N | 0) * c; idAt[i] = cell.id; });
          await sleep(330);
        } else if (f.t === "shuffle") { banner(root, "No moves left, shuffling…"); sprites.forEach(s => { s.sc = .3; }); f.board.forEach((cell, i) => { const s = sprites.get(cell.id); if (s) { s.t = cell.t; s.k = cell.k; s.cell = i; s.x = s.tx = (i % N) * c; s.y = s.ty = (i / N | 0) * c; } }); sfx.play("sparkle"); await sleep(500); banner(root, ""); }
      }
      sprites.forEach(s => { if (!s.die) { s.sc = Math.max(s.sc, 1); if (s.sc > 1) s.sc = Math.max(1, s.sc - .5); } });
      hud(); busy = false; if (G.moves <= 0) finish();
    }
    function finish() {
      mode = "over"; sfx.play("lose"); if (G.score > best) { best = G.score; try { localStorage.setItem("bf_best_candy", best); } catch (e) { } $(root, "#bs").textContent = best; }
      setTimeout(() => endRun(ctx, "candy", G.score, ov, "Out of moves!").then(() => ovButtons(ov, S, ctx)), 500);
    }
    const start = () => { if (mode !== "ready") return; mode = "play"; ov.hidden = true; idle = 0; };

    /* ---- input: swipe a candy, or tap one then its neighbour ---- */
    let down = null;
    const cellAt = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * N, y = (e.clientY - r.top) / r.height * N; return x < 0 || y < 0 || x >= N || y >= N ? -1 : (y | 0) * N + (x | 0); };
    cv.addEventListener("pointerdown", e => { e.preventDefault(); if (mode === "ready") start(); if (mode !== "play" || busy) return; const i = cellAt(e); if (i < 0) return; idle = 0; hintCells = []; down = { i, x: e.clientX, y: e.clientY, moved: false }; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", e => {
      if (!down || down.moved || busy) return; const dx = e.clientX - down.x, dy = e.clientY - down.y, th = (cv.getBoundingClientRect().width / N) * .35;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > th) { down.moved = true; const to = Math.abs(dx) > Math.abs(dy) ? down.i + Math.sign(dx) : down.i + Math.sign(dy) * N; sel = -1; if (validSwap(down.i, to)) doSwap(down.i, to); }
    });
    const release = () => { if (down && !down.moved && !busy) { const i = down.i; if (sel >= 0 && validSwap(sel, i)) doSwap(sel, i); else { sel = sel === i ? -1 : i; sfx.play("tap"); } } down = null; };
    cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", () => { down = null; });
    $(root, "#ht").addEventListener("pointerdown", e => { e.preventDefault(); if (mode === "ready") start(); if (mode === "play" && !busy) { showHint(); idle = 0; sfx.play("pop"); } });
    const kd = e => { if (e.key === "h" || e.key === "H") { if (mode === "play" && !busy) showHint(); } }; addEventListener("keydown", kd);
    const vis = () => { if (!DEBUG && document.hidden && mode === "play" && !busy) { /* nothing is timed, so there is nothing to pause */ } }; document.addEventListener("visibilitychange", vis);

    ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Candy Match</h2><p class="sub">Swipe a candy to swap it with its neighbour.<br>Match 3 or more of a kind. Match 4 or 5 for special candies!<br>You have ${MOVES} moves. Score as much as you can.</p><button class="btn" id="go">Tap to play</button></div>`; $(ov, "#go").onclick = start;
    hud(); raf = nextFrame(loop);
    if (/[?&]debug/.test(location.search)) window.__dbg = { get G() { return G; }, get mode() { return mode; }, get busy() { return busy; }, start, swap: doSwap, hint: () => hint(G), get sprites() { return sprites; } };

    const fresh = ns => { S = ns; G = newGame(S.seed); mode = "ready"; busy = false; sel = -1; hintCells = []; parts = []; pops = []; load(); ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>New round</h2><button class="btn" id="go">Tap to play</button></div>`; $(ov, "#go").onclick = start; hud(); banner(root, ""); };
    const q = queue(async (s, ev) => {
      if (ev.some(e => e.t === "reset")) return fresh(s);
      S = s; if (P.length > 1) setStrip(root, -1, stripInfo(S, P));
      if (S.over) {
        if (["play", "ready"].includes(mode) || (mode === "over" && false)) { mode = "over"; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Round over</h2><p class="sub">The host ended the round.</p><div class="ovb" id="ovb"></div></div>`; }
        winBanner(root, S, P, ctx); ovButtons(ov, S, ctx);
        if (ev.some(e => e.t === "done")) ctx.finished(P.length === 1 ? -1 : S.winner);
      } else if (mode === "over") ovButtons(ov, S, ctx);
    });
    return { push: (s, e) => q.push(s, e), get busy() { return false; }, destroy() { cancelFrame(raf); removeEventListener("keydown", kd); ro.disconnect(); document.removeEventListener("visibilitychange", vis); } };
  },
};
