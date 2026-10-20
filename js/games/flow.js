import { $, $$, stripHTML, setStrip, banner, queue } from "./common.js";
import { sfx, burst, shake, buzz } from "../fx.js";
import { arcadeState, arcadeAct, nextFrame, cancelFrame, DEBUG } from "./arcade.js";
import { stripInfo, endRun, ovButtons, winBanner } from "./arcade_ui.js";
import { makeLevel, newPlay, begin, step, reset, complete, solved, filled, points, adjacent, spec } from "./flow_core.js";

const COL = ["#E8453C", "#2E7BE8", "#F2B632", "#26B574", "#B068F0", "#F2842B", "#14C2D6", "#F06AAE", "#EDE6D3"];
const TIME = 180;

export default {
  id: "flow", name: "Free Flow", min: 1, max: 10, solo: true, anytime: true,
  init: arcadeState, act: arcadeAct, bot: () => null,
  mount(root, ctx) {
    const P = ctx.players; let S = ctx.state;
    const best0 = +(localStorage.getItem("bf_best_flow") || 0);
    root.innerHTML = `<div class="game bounce flow">${P.length > 1 ? stripHTML(P, stripInfo(S, P)) : ""}
      <div class="arc-hud"><span>Score <b id="sc">0</b></span><span>Level <b id="lv">1</b></span><span>Time <b id="tm">3:00</b></span><span>Best <b id="bs">${best0}</b></span></div>
      <div class="arc-wrap flowwrap"><canvas id="cv" aria-label="Free Flow board"></canvas><div class="arc-ov" id="ov"></div></div>
      <div class="pad2 cr two"><button id="rs" aria-label="Clear the board">↺<small>RESTART</small></button><button id="sk" aria-label="Skip this puzzle">⏭<small>SKIP</small></button></div>
      <div class="banner"></div></div>`;
    const cv = $(root, "#cv"), g = cv.getContext("2d"), ov = $(root, "#ov"), wrap = $(root, ".arc-wrap");
    let px = 300, dpr = 1;
    const size = () => {
      const land = innerWidth > innerHeight && innerHeight < 520, avail = land ? innerHeight - 110 : innerHeight - (innerHeight < 700 ? 400 : 370);
      px = Math.max(240, Math.min((wrap.parentElement.clientWidth || 360) - (land ? 300 : 0), 480, avail)); dpr = Math.min(devicePixelRatio || 1, 3);
      cv.style.width = px + "px"; cv.style.height = px + "px"; cv.width = Math.round(px * dpr); cv.height = Math.round(px * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size(); const ro = new ResizeObserver(() => { size(); draw(); }); ro.observe(wrap.parentElement);

    let lvl = 0, L, p, score = 0, mode = "ready", left = TIME * 1000, last = 0, raf = 0, active = -1, lastCell = -1, born = 0, flash = 0, best = best0, solvedAt = 0, pops = [], doneSet = new Set();
    const load = () => { L = makeLevel(S.seed, lvl); p = newPlay(L); active = -1; born = performance.now(); doneSet = new Set(); hud(); };
    const fmt = ms => { const s = Math.ceil(ms / 1000); return (s / 60 | 0) + ":" + String(s % 60).padStart(2, "0"); };
    const hud = () => { $(root, "#sc").textContent = score; $(root, "#lv").textContent = lvl + 1; $(root, "#tm").textContent = fmt(Math.max(0, left)); };
    const cs = () => px / L.n, ctr = i => [((i % L.n) + .5) * cs(), ((i / L.n | 0) + .5) * cs()];
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };

    function draw() {
      const n = L.n, c = cs(), now = performance.now();
      g.fillStyle = "#0C141C"; g.fillRect(0, 0, px, px);
      for (let i = 0; i < n * n; i++) { const x = (i % n) * c, y = (i / n | 0) * c, o = p.own[i]; g.fillStyle = o >= 0 ? COL[o] + "26" : "#131E29"; rr(x + 1.5, y + 1.5, c - 3, c - 3, c * .14); g.fill(); }
      /* the pipes */
      g.lineCap = "round"; g.lineJoin = "round";
      p.paths.forEach((pa, k) => { if (pa.length < 2) return; g.strokeStyle = COL[k]; g.lineWidth = c * .4; g.globalAlpha = .96; g.beginPath(); pa.forEach((i, j) => { const [x, y] = ctr(i); j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.globalAlpha = 1; if (k === active && mode === "play") { const [x, y] = ctr(pa[pa.length - 1]); g.fillStyle = COL[k] + "55"; g.beginPath(); g.arc(x, y, c * .52, 0, 7); g.fill(); } });
      /* the dots */
      L.pairs.forEach((q, k) => [q.a, q.b].forEach(i => { const [x, y] = ctr(i), done = complete(p, k), pulse = done ? 1 + .06 * Math.sin(now / 220 + k) : 1; g.fillStyle = COL[k]; g.beginPath(); g.arc(x, y, c * .3 * pulse, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.arc(x - c * .08, y - c * .1, c * .09, 0, 7); g.fill(); }));
      const grow = Math.min(1, (now - born) / 350); if (grow < 1) { g.fillStyle = `rgba(12,20,28,${1 - grow})`; g.fillRect(0, 0, px, px); }
      if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * .6})`; g.fillRect(0, 0, px, px); flash = Math.max(0, flash - .04); }
      pops = pops.filter(q => now - q.t < 900); g.textAlign = "center"; pops.forEach(q => { const k = (now - q.t) / 900; g.globalAlpha = 1 - k; g.font = `900 ${Math.round(c * 1.0)}px "Playfair Display",Georgia,serif`; g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,.7)"; g.strokeText(q.s, px / 2, px / 2 - k * c * 1.5); g.fillStyle = "#FFE27A"; g.fillText(q.s, px / 2, px / 2 - k * c * 1.5); g.globalAlpha = 1; });
    }
    function check() {
      p.paths.forEach((_, k) => { const d = complete(p, k); if (d && !doneSet.has(k)) { doneSet.add(k); sfx.play("ring"); buzz(15); } if (!d) doneSet.delete(k); });
      if (solved(p) && mode === "play") {
        mode = "solved"; solvedAt = performance.now(); const secs = (solvedAt - born) / 1000, gain = points(L.n) + Math.max(0, Math.round(60 - secs)); score += gain; flash = .8; pops.push({ s: "+" + gain, t: solvedAt });
        sfx.play("win"); buzz([40, 30, 60]); burst(cv, ["⭐", "✨", "🎉"], 8); hud();
        setTimeout(() => { if (mode === "solved") { lvl++; load(); mode = "play"; } }, 1000);
      }
    }
    function loop() {
      raf = nextFrame(loop); const n = performance.now(), dt = Math.min(100, n - (last || n)); last = n;
      if (mode === "play" || mode === "solved") { left -= dt; if (Math.floor(left / 1000) !== Math.floor((left + dt) / 1000)) hud(); if (left <= 0) timeUp(); }
      draw();
    }
    function timeUp() {
      left = 0; hud(); mode = "over"; active = -1; sfx.play("die"); shake(wrap, 350);
      if (score > best) { best = score; try { localStorage.setItem("bf_best_flow", best); } catch (e) { } $(root, "#bs").textContent = best; }
      endRun(ctx, "flow", score, ov, "Time's up!").then(() => ovButtons(ov, S, ctx));
    }
    const start = () => { if (mode !== "ready") return; mode = "play"; ov.hidden = true; last = performance.now(); born = performance.now(); };

    /* ---- touch and mouse: drag a line from a dot ---- */
    const cellAt = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * L.n, y = (e.clientY - r.top) / r.height * L.n; if (x < 0 || y < 0 || x >= L.n || y >= L.n) return -1; return (y | 0) * L.n + (x | 0); };
    const walk = to => {
      if (active < 0 || to < 0 || to === lastCell) return; const n = L.n;
      /* a fast finger can skip squares: go there one neighbour at a time */
      let from = lastCell, guard = 0;
      while (from !== to && guard++ < 20) { const fr = from / n | 0, fc = from % n, tr = to / n | 0, tc = to % n; const nx = Math.abs(tc - fc) >= Math.abs(tr - fr) ? fr * n + fc + Math.sign(tc - fc) : (fr + Math.sign(tr - fr)) * n + fc; if (!adjacent(n, from, nx)) break; step(p, active, nx); from = nx; }
      lastCell = to; check();
    };
    cv.addEventListener("pointerdown", e => { e.preventDefault(); if (mode === "ready") start(); if (mode !== "play") return; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); const c = cellAt(e); if (c < 0) return; const k = begin(p, c); active = k; lastCell = c; if (k >= 0) { sfx.play("tap"); buzz(6); } check(); });
    cv.addEventListener("pointermove", e => { if (active >= 0 && mode === "play") { e.preventDefault(); walk(cellAt(e)); } });
    const up = () => { active = -1; lastCell = -1; }; cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    $(root, "#rs").addEventListener("pointerdown", e => { e.preventDefault(); if (mode === "ready") start(); if (mode === "play") { reset(p); doneSet.clear(); sfx.play("tap"); } });
    $(root, "#sk").addEventListener("pointerdown", e => { e.preventDefault(); if (mode === "ready") start(); if (mode === "play") { lvl++; load(); sfx.play("pop"); } });
    const vis = () => { if (!DEBUG && document.hidden && mode === "play") { mode = "paused"; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Paused</h2><button class="btn" id="res">Resume</button></div>`; $(ov, "#res").onclick = () => { mode = "play"; ov.hidden = true; last = performance.now(); }; } };
    document.addEventListener("visibilitychange", vis);

    load(); ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Free Flow</h2><p class="sub">Drag from a dot to join it to the dot of the same colour.<br>Fill every square. Solve as many puzzles as you can in 3 minutes.</p><button class="btn" id="go">Tap to start</button></div>`; $(ov, "#go").onclick = start;
    raf = nextFrame(loop);
    if (/[?&]debug/.test(location.search)) window.__dbg = { get L() { return L; }, get p() { return p; }, get mode() { return mode; }, get score() { return score; }, get lvl() { return lvl; }, start, solve() { L.sol.forEach((s, c) => { begin(p, s[0]); for (let i = 1; i < s.length; i++) step(p, c, s[i]); }); check(); }, setLeft(ms) { left = ms; } };

    const fresh = ns => { S = ns; lvl = 0; score = 0; left = TIME * 1000; mode = "ready"; load(); pops = []; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>New round</h2><button class="btn" id="go">Tap to start</button></div>`; $(ov, "#go").onclick = start; hud(); banner(root, ""); };
    const q = queue(async (s, ev) => {
      if (ev.some(e => e.t === "reset")) return fresh(s);
      S = s; if (P.length > 1) setStrip(root, -1, stripInfo(S, P));
      if (S.over) {
        if (["play", "ready", "paused", "solved"].includes(mode)) { mode = "over"; active = -1; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Round over</h2><p class="sub">The host ended the round.</p><div class="ovb" id="ovb"></div></div>`; }
        winBanner(root, S, P, ctx); ovButtons(ov, S, ctx);
        if (ev.some(e => e.t === "done")) ctx.finished(P.length === 1 ? -1 : S.winner);
      } else if (mode === "over") ovButtons(ov, S, ctx);
    });
    return { push: (s, e) => q.push(s, e), get busy() { return false; }, destroy() { cancelFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", vis); } };
  },
};
