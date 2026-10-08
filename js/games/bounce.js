import { $, $$, esc, stripHTML, setStrip, banner, queue } from "./common.js";
import { sfx, burst, shake, floatText, reduced, buzz } from "../fx.js";
import { arcadeState, arcadeAct, nextFrame, cancelFrame, DEBUG } from "./arcade.js";
import { stripInfo, endRun, ovButtons, winBanner } from "./arcade_ui.js";
import { TILE, ROWS, GROUND, VW, VH, PHYS, newWorld, stepWorld, respawn } from "./bounce_core.js";

const KEYS = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "jump", w: "jump", W: "jump", " ": "jump" };

export default {
  id: "bounce", name: "Red Ball", min: 1, max: 10, solo: true, anytime: true,
  init: arcadeState, act: arcadeAct, bot: () => null,
  mount(root, ctx) {
    const P = ctx.players; let S = ctx.state;
    const best0 = +(localStorage.getItem("bf_best_bounce") || 0);
    root.innerHTML = `<div class="game bounce">${P.length > 1 ? stripHTML(P, stripInfo(S, P)) : ""}
      <div class="arc-hud"><span>Score <b id="sc">0</b></span><span id="lives" aria-label="Lives">❤️❤️❤️</span><span>Level <b id="lv">1</b></span><span>Best <b id="bs">${best0}</b></span></div>
      <div class="arc-wrap wide"><canvas id="cv" aria-label="Red ball level"></canvas><div class="arc-ov" id="ov"></div></div>
      <div class="pad2"><div class="lr"><button data-k="left" aria-label="Roll left">◀</button><button data-k="right" aria-label="Roll right">▶</button></div><button class="jb" data-k="jump" aria-label="Jump">⤒<small>JUMP</small></button></div>
      <div class="banner"></div></div>`;
    const cv = $(root, "#cv"), g = cv.getContext("2d"), ov = $(root, "#ov"), wrap = $(root, ".arc-wrap");
    let scale = 1, VWd = VW;
    const size = () => {
      const land = innerWidth > innerHeight && innerHeight < 520, avail = land ? innerHeight - 100 : innerHeight - 330;
      const cw = Math.min((wrap.parentElement.clientWidth || 360) - (land ? 300 : 0), 560); VWd = cw < 460 && !land ? 384 : VW;
      const w = Math.min(cw, Math.max(260, avail * VWd / VH)), dpr = Math.min(devicePixelRatio || 1, 3);
      cv.style.width = w + "px"; cv.style.height = w * VH / VWd + "px"; cv.width = Math.round(w * dpr); cv.height = Math.round(w * VH / VWd * dpr); scale = cv.width / VWd; g.setTransform(scale, 0, 0, scale, 0, 0);
    };
    size(); const ro = new ResizeObserver(() => { size(); draw(); }); ro.observe(wrap.parentElement);

    const input = { left: false, right: false, jump: false };
    let run, w, mode = "ready", acc = 0, last = 0, raf = 0, parts = [], texts = [], freeze = 0, camX = 0, springT = 0, best = best0, banner2 = 0, ctxLevelMsg = "";
    const newRun = seed => ({ seed, n: 0, lives: 3, score: 0, rings: 0, frames: 0 });
    const loadLevel = () => { w = newWorld(run.seed, run.n); run.frames = 0; camX = 0; };
    const hud = () => { $(root, "#sc").textContent = run.score; $(root, "#lv").textContent = run.n + 1; $(root, "#lives").textContent = run.lives > 0 ? "❤️".repeat(run.lives) : "💔"; };
    run = newRun(S.seed); loadLevel();

    const grad = { sky: null };
    const hills = (x0, amp, off, col, par) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, VH); for (let x = 0; x <= VWd; x += 8) g.lineTo(x, VH - off - amp * (Math.sin((x + camX * par) / 70) + .6 * Math.sin((x + camX * par) / 31 + 2)) * .5); g.lineTo(VWd, VH); g.fill(); };
    function draw() {
      const b = w.ball, L = w.L, now = performance.now();
      const sk = g.createLinearGradient(0, 0, 0, VH); sk.addColorStop(0, "#5FB7F2"); sk.addColorStop(.7, "#BFE7FF"); sk.addColorStop(1, "#E9F8FF"); g.fillStyle = sk; g.fillRect(0, 0, VWd, VH);
      g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 6; i++) { const cx = ((i * 210 - camX * .25 - now / 90) % (VWd + 260) + VWd + 260) % (VWd + 260) - 130, cy = 30 + (i * 37) % 70; g.beginPath(); g.ellipse(cx, cy, 34, 13, 0, 0, 7); g.ellipse(cx + 22, cy - 6, 24, 12, 0, 0, 7); g.ellipse(cx - 24, cy + 2, 22, 10, 0, 0, 7); g.fill(); }
      hills(0, 90, 40, "#9AD7A0", .2); hills(0, 70, 10, "#6FBF73", .45);
      g.save(); g.translate(-Math.round(camX), 0);
      const c0 = Math.max(0, Math.floor(camX / TILE) - 1), c1 = Math.min(L.W - 1, Math.ceil((camX + VWd) / TILE) + 1);
      for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
        const t = L.solid[r][c]; if (!t) continue; const x = c * TILE, y = r * TILE, above = r > 0 && L.solid[r - 1][c];
        g.fillStyle = "#B5562F"; g.fillRect(x, y, TILE, TILE); g.fillStyle = "#8F3E20"; g.fillRect(x, y + TILE / 2 - 1, TILE, 2); g.fillRect(x + (r % 2 ? 8 : 24), y, 2, TILE / 2); g.fillRect(x + (r % 2 ? 24 : 8), y + TILE / 2, 2, TILE / 2);
        g.fillStyle = "rgba(255,200,150,.35)"; g.fillRect(x, y, TILE, 2);
        if (!above && t === 1) { g.fillStyle = "#5BBF4A"; g.fillRect(x, y, TILE, 7); g.fillStyle = "#3E9A36"; g.fillRect(x, y + 7, TILE, 2); g.fillStyle = "#8EE07A"; g.fillRect(x, y, TILE, 2); }
        if (t === 2) { const comp = springT > 0 ? .5 : 1, baseY = y + TILE - 6, topY = baseY - 22 * comp; g.fillStyle = "#6B7280"; g.fillRect(x + 4, baseY, TILE - 8, 6); g.strokeStyle = "#E8453C"; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 4; i++) g.lineTo(x + (i % 2 ? 23 : 9), baseY - 22 * comp * i / 4); g.stroke(); g.fillStyle = "#F2B632"; g.fillRect(x + 3, topY - 5, TILE - 6, 5); }
      }
      for (const s of L.spikes) { for (let x = s.x; x < s.x + s.w; x += TILE / 2) { g.fillStyle = "#9CA3AF"; g.beginPath(); g.moveTo(x, GROUND * TILE); g.lineTo(x + TILE / 4, GROUND * TILE - 14); g.lineTo(x + TILE / 2, GROUND * TILE); g.fill(); g.fillStyle = "#E5E7EB"; g.beginPath(); g.moveTo(x + TILE / 4, GROUND * TILE - 14); g.lineTo(x + TILE / 4 + 3, GROUND * TILE - 3); g.lineTo(x + TILE / 4 - 1, GROUND * TILE - 3); g.fill(); } }
      for (const f of L.flags) { g.fillStyle = "#6B7280"; g.fillRect(f.x - 1, f.y - 36, 3, 36); g.fillStyle = f.got ? "#26B574" : "#E8453C"; g.beginPath(); g.moveTo(f.x + 2, f.y - 36); g.lineTo(f.x + 22, f.y - 29); g.lineTo(f.x + 2, f.y - 22); g.fill(); }
      const ex = L.endX; g.fillStyle = "#6B7280"; g.fillRect(ex - 6, GROUND * TILE - 90, 8, 90); g.fillRect(ex + 70, GROUND * TILE - 90, 8, 90); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#fff" : "#111"; g.fillRect(ex + 2 + i * 9, GROUND * TILE - 96, 9, 9); g.fillStyle = i % 2 ? "#111" : "#fff"; g.fillRect(ex + 2 + i * 9, GROUND * TILE - 87, 9, 9); }
      g.fillStyle = "rgba(255,230,120,.25)"; g.fillRect(ex + 2, GROUND * TILE - 78, 70, 78);
      for (const rg of L.rings) { if (rg.got) continue; const bob = Math.sin(now / 260 + rg.x) * 2.5, sq = Math.abs(Math.cos(now / 420 + rg.x * .05)) * .5 + .5; g.strokeStyle = "#E8A317"; g.lineWidth = 4; g.beginPath(); g.ellipse(rg.x, rg.y + bob, 6 * sq + 2, 11, 0, 0, 7); g.stroke(); g.strokeStyle = "#FFE27A"; g.lineWidth = 1.6; g.beginPath(); g.ellipse(rg.x, rg.y + bob, 6 * sq + 2, 11, 0, 0, 7); g.stroke(); }
      // ball
      if (!(w.inv > 0 && Math.floor(w.inv / 6) % 2)) {
        const sq = b.squash, sx = 1 + sq * .28, sy = 1 - sq * .28; g.save(); g.translate(b.x, b.y + (1 - sy) * PHYS.R); g.scale(sx, sy);
        g.rotate(b.rot); const rg = g.createRadialGradient(-4, -5, 2, 0, 0, PHYS.R + 2); rg.addColorStop(0, "#FF8A80"); rg.addColorStop(.45, "#E8261F"); rg.addColorStop(1, "#8E0B0B"); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, PHYS.R, 0, 7); g.fill();
        g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, PHYS.R - 4, .3, 2.2); g.stroke(); g.rotate(-b.rot);
        g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.ellipse(-4, -5, 3.5, 2.2, -.6, 0, 7); g.fill(); g.restore();
      }
      for (const p of parts) { g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); } g.globalAlpha = 1;
      g.font = '700 14px "Josefin Sans",sans-serif'; g.textAlign = "center"; for (const t of texts) { g.globalAlpha = Math.max(0, t.life / 50); g.fillStyle = "#fff"; g.strokeStyle = "#1A1410"; g.lineWidth = 3; g.strokeText(t.s, t.x, t.y); g.fillText(t.s, t.x, t.y); } g.globalAlpha = 1;
      g.restore();
      // progress bar along the top
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(10, 8, VWd - 20, 5); g.fillStyle = "#E8C766"; g.fillRect(10, 8, (VWd - 20) * Math.min(1, b.x / L.endX), 5);
      if (mode === "dead" || banner2 > 0) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, 0, VWd, VH); if (ctxLevelMsg) { g.fillStyle = "#fff"; g.font = '900 30px "Playfair Display",serif'; g.fillText(ctxLevelMsg, VWd / 2, VH / 2); } }
    }
    const pop = (x, y, c, n = 8) => { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 4, vy: -Math.random() * 3 - 1, r: 2 + Math.random() * 2, c, life: 30, max: 30 }); };
    const say = (s, x, y) => texts.push({ s, x, y, life: 50 });
    function onEvents(ev) {
      for (const e of ev) {
        if (e === "jump") sfx.play("jump");
        else if (e === "ring") { sfx.play("ring"); run.score += 50; run.rings++; hud(); pop(w.ball.x, w.ball.y, "#FFD54A", 8); say("+50", w.ball.x, w.ball.y - 20); buzz(5); }
        else if (e === "spring") { sfx.play("spring"); springT = 12; pop(w.ball.x, w.ball.y + 10, "#fff", 6); }
        else if (e === "checkpoint") { sfx.play("flag"); say("Checkpoint!", w.ball.x, w.ball.y - 30); }
        else if (e.startsWith("die")) return lose(e.slice(4));
        else if (e === "finish") return win();
      }
    }
    function lose(why) {
      if (mode !== "play") return; sfx.play("die"); buzz([40, 30, 80]); shake(wrap, 350); pop(w.ball.x, w.ball.y, "#E8261F", 14); run.lives--; hud();
      if (run.lives <= 0) { mode = "over"; draw(); const label = "Out of lives!"; setTimeout(() => end(label), 700); return; }
      mode = "dead"; ctxLevelMsg = why === "spike" ? "Ouch! Spikes" : "Oops! You fell"; freeze = 55;
    }
    function win() {
      if (mode !== "play") return; const sec = run.frames / 60, bonus = 200 + run.n * 50 + Math.max(0, Math.round((90 - sec) * 5)); run.score += bonus; hud(); sfx.play("up"); buzz([30, 30, 60]);
      burst(cv, ["⭐", "✨", "🏁"], 10); mode = "next"; ctxLevelMsg = `Level ${run.n + 1} clear! +${bonus}`; banner2 = 90; freeze = 90;
    }
    function end(label) { if (run.score > best) { best = run.score; try { localStorage.setItem("bf_best_bounce", best); } catch (e) { } $(root, "#bs").textContent = best; } endRun(ctx, "bounce", run.score, ov, label).then(() => ovButtons(ov, S, ctx)); }

    function loop(t) {
      raf = nextFrame(loop); const dt = Math.min(100, t - (last || t)); last = t;
      if (mode === "play") {
        acc += dt;
        while (acc >= 1000 / 60 && mode === "play") { acc -= 1000 / 60; run.frames++; if (springT > 0) springT--; onEvents(stepWorld(w, input)); }
        const tx = Math.max(0, Math.min(w.L.W * TILE - VWd, w.ball.x - VWd * .38)); camX += (tx - camX) * .18;
      } else if (mode === "dead" || mode === "next") {
        if (--freeze <= 0) { banner2 = 0; ctxLevelMsg = ""; if (mode === "next") { run.n++; loadLevel(); } else respawn(w); mode = "play"; acc = 0; hud(); }
      }
      parts = parts.filter(p => (p.life--) > 0).map(p => { p.x += p.vx; p.y += p.vy; p.vy += .15; return p; }); texts = texts.filter(p => (p.life--, p.y -= .5, p.life > 0));
      draw();
    }
    const start = () => { if (mode !== "ready") return; mode = "play"; ov.hidden = true; last = performance.now(); acc = 0; };
    const setK = (k, v) => { if (!k) return; if (v && mode === "ready") start(); input[k] = v; };
    const kd = e => { const k = KEYS[e.key]; if (k) { e.preventDefault(); setK(k, true); } }, ku = e => { const k = KEYS[e.key]; if (k) setK(k, false); };
    addEventListener("keydown", kd); addEventListener("keyup", ku);
    $$(root, ".pad2 button").forEach(b => { const k = b.dataset.k; const on = e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("down"); setK(k, true); }, off = () => { b.classList.remove("down"); setK(k, false); }; b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("pointerleave", off); b.addEventListener("contextmenu", e => e.preventDefault()); });
    const vis = () => { if (!DEBUG && document.hidden && mode === "play") { mode = "paused"; input.left = input.right = input.jump = false; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Paused</h2><button class="btn" id="res">Resume</button></div>`; $(ov, "#res").onclick = () => { mode = "play"; ov.hidden = true; last = performance.now(); }; } };
    document.addEventListener("visibilitychange", vis);
    ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Red Ball</h2><p class="sub">Hold ◀ ▶ to roll and ⤒ to jump.<br>Grab the rings, dodge the spikes, reach the checkered gate.</p><button class="btn" id="go">Tap to start</button></div>`; $(ov, "#go").onclick = start;
    hud(); raf = nextFrame(loop);
    if (/[?&]debug/.test(location.search)) window.__dbg = { get run() { return run; }, get w() { return w; }, get mode() { return mode; }, input, start };

    const fresh = ns => { S = ns; run = newRun(S.seed); loadLevel(); mode = "ready"; parts = []; texts = []; ctxLevelMsg = ""; input.left = input.right = input.jump = false; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>New round</h2><button class="btn" id="go">Tap to start</button></div>`; $(ov, "#go").onclick = start; hud(); banner(root, ""); };
    const q = queue(async (s, ev) => {
      if (ev.some(e => e.t === "reset")) return fresh(s);
      S = s; if (P.length > 1) setStrip(root, -1, stripInfo(S, P));
      if (S.over) {
        if (["play", "ready", "paused", "dead", "next"].includes(mode)) { mode = "over"; input.left = input.right = input.jump = false; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Round over</h2><p class="sub">The host ended the round.</p><div class="ovb" id="ovb"></div></div>`; }
        winBanner(root, S, P, ctx); ovButtons(ov, S, ctx);
        if (ev.some(e => e.t === "done")) ctx.finished(P.length === 1 ? -1 : S.winner);
      } else if (mode === "over") ovButtons(ov, S, ctx);
    });
    return { push: (s, e) => q.push(s, e), get busy() { return false; }, destroy() { cancelFrame(raf); removeEventListener("keydown", kd); removeEventListener("keyup", ku); ro.disconnect(); document.removeEventListener("visibilitychange", vis); } };
  },
};
