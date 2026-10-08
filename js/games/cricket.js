import { $, $$, esc, stripHTML, setStrip, banner, queue } from "./common.js";
import { sfx, burst, shake, reduced, buzz } from "../fx.js";
import { arcadeState, arcadeAct, nextFrame, cancelFrame, DEBUG } from "./arcade.js";
import { stripInfo, endRun, ovButtons, winBanner } from "./arcade_ui.js";
import { BALLS, WICKETS, WIN, EARLY, newMatch, next, play } from "./cricket_core.js";

const VW = 360, VH = 460, CX = 180, Y0 = 92, Y1 = 372; /* logical canvas, bowler end, batter end */
const KEYS = { ArrowLeft: -1, a: -1, A: -1, ArrowUp: 0, w: 0, W: 0, s: 0, S: 0, " ": 0, ArrowDown: 0, ArrowRight: 1, d: 1, D: 1 };
const ease = p => p;
const halfW = p => 16 + 104 * p;                       /* pitch half-width at progress p (perspective) */
const yAt = p => Y0 + (Y1 - Y0) * Math.pow(p, 1.12);
const laneX = (line, p) => CX + line * halfW(p) * .5;  /* -2..2 */
const FIELD = [[-130, 150], [120, 140], [-150, 250], [150, 262], [-60, 98], [70, 104], [0, 60]];

export default {
  id: "cricket", name: "Cricket", min: 1, max: 10, solo: true, anytime: true,
  init: arcadeState, act: arcadeAct, bot: () => null,
  mount(root, ctx) {
    const P = ctx.players; let S = ctx.state;
    const best0 = +(localStorage.getItem("bf_best_cricket") || 0);
    root.innerHTML = `<div class="game bounce cricket">${P.length > 1 ? stripHTML(P, stripInfo(S, P)) : ""}
      <div class="arc-hud"><span>Runs <b id="sc">0</b></span><span>Balls <b id="bl">${BALLS}</b></span><span id="wk" aria-label="Wickets left">${"🏏".repeat(WICKETS)}</span><span>Best <b id="bs">${best0}</b></span></div>
      <div class="arc-wrap wide"><canvas id="cv" aria-label="Cricket pitch"></canvas><div class="arc-ov" id="ov"></div></div>
      <div class="pad2 cr" aria-label="Shot buttons"><button data-s="-1" aria-label="Hit left">◀<small>LEFT</small></button><button data-s="0" aria-label="Hit straight">▲<small>STRAIGHT</small></button><button data-s="1" aria-label="Hit right">▶<small>RIGHT</small></button></div>
      <div class="banner"></div></div>`;
    const cv = $(root, "#cv"), g = cv.getContext("2d"), ov = $(root, "#ov"), wrap = $(root, ".arc-wrap");
    let scale = 1;
    const size = () => {
      const land = innerWidth > innerHeight && innerHeight < 520, avail = land ? innerHeight - 100 : innerHeight - 330;
      const cw = Math.min((wrap.parentElement.clientWidth || 360) - (land ? 300 : 0), 520), w = Math.min(cw, Math.max(250, avail * VW / VH)), dpr = Math.min(devicePixelRatio || 1, 3);
      cv.style.width = w + "px"; cv.style.height = w * VH / VW + "px"; cv.width = Math.round(w * dpr); cv.height = Math.round(w * VH / VW * dpr); scale = cv.width / VW; g.setTransform(scale, 0, 0, scale, 0, 0);
    };
    size(); const ro = new ResizeObserver(() => { size(); draw(performance.now()); }); ro.observe(wrap.parentElement);

    let m = newMatch(S.seed), mode = "ready", raf = 0, best = best0, cur = null, t0 = 0, arrive = 0, swing = null, res = null, resAt = 0, runUp = 0, flash = 0, resultMs = 900;
    const now = () => performance.now();
    const hud = () => { $(root, "#sc").textContent = m.runs; $(root, "#bl").textContent = Math.max(0, BALLS - m.balls); $(root, "#wk").textContent = "🏏".repeat(Math.max(0, WICKETS - m.wk)) + "💥".repeat(Math.min(WICKETS, m.wk)); };

    /* ---- the match flow ---- */
    function bowl() { cur = next(m); res = null; swing = null; mode = "runup"; runUp = now(); }
    function resolve(shot, err) {
      if (mode !== "flight") return; const o = play(m, shot, err); mode = "result"; res = o; resAt = now(); if (shot != null) swing = { shot, t: now() };
      hud();
      const k = o.kind; flash = k === "six" || k === "four" ? .5 : k === "out" ? .7 : 0;
      if (k === "six") { sfx.play("win"); buzz([30, 20, 50]); burst(cv, ["🏏", "✨", "🎉"], 6); }
      else if (k === "four") { sfx.play("ring"); buzz(20); }
      else if (k === "out") { sfx.play("die"); buzz([40, 30, 80]); shake(wrap, 380); }
      else if (k === "wide") sfx.play("pop"); else if (k === "runs") sfx.play("eat"); else sfx.play("tap");
      banner(root, "");
      resultMs = k === "six" || k === "four" ? 1250 : 950;
    }
    function finish() {
      mode = "over"; const label = m.wk >= WICKETS ? "All out!" : "Innings over";
      if (m.runs > best) { best = m.runs; try { localStorage.setItem("bf_best_cricket", best); } catch (e) { } $(root, "#bs").textContent = best; }
      endRun(ctx, "cricket", m.runs, ov, label + ` ${m.sixes}×6  ${m.fours}×4`).then(() => ovButtons(ov, S, ctx));
    }
    const start = () => { if (mode !== "ready") return; ov.hidden = true; bowl(); };
    function press(shot) {
      if (mode === "ready") return start();
      if (mode !== "flight") return;
      const err = now() - arrive; if (err < -EARLY) { swing = { shot, t: now(), dud: true }; return; }
      resolve(shot, err);
    }

    /* ---- drawing ---- */
    function ballPos(d, p) { /* where the ball is at progress p (0 bowler end .. 1 the bat) */
      let line = d.end !== undefined ? d.end : d.line; const s = d.start;
      const q = Math.min(1, Math.max(0, (p - .55) / .3)); const ln = s + (line - s) * q * q * (3 - 2 * q);
      const hOff = p < .5 ? 46 * (1 - 2 * p) : 16 * (2 * p - 1) * (1 - .0 * p), k = .35 + .65 * p;
      return { x: laneX(ln, p), y: yAt(p) - hOff * k, gy: yAt(p), r: 3.2 + 7.5 * p };
    }
    const stumps = (x, y, s, fall) => { g.save(); g.translate(x, y); g.scale(s, s); for (let i = -1; i <= 1; i++) { g.save(); g.translate(i * 7, 0); if (fall) { g.rotate(fall * (i || 1) * .9); g.translate(0, -fall * 8); } g.fillStyle = "#F5E9C0"; g.fillRect(-1.6, -26, 3.2, 26); g.restore(); } if (!fall) { g.fillStyle = "#C79A3B"; g.fillRect(-10, -27, 8, 2.4); g.fillRect(2, -27, 8, 2.4); } g.restore(); };
    const person = (x, y, s, col, bat) => { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(0, 1, 10, 4, 0, 0, 7); g.fill(); g.fillStyle = "#fff"; g.fillRect(-6, -22, 12, 22); g.fillStyle = col; g.fillRect(-6, -22, 12, 7); g.fillStyle = "#F2C6A0"; g.beginPath(); g.arc(0, -30, 7, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(0, -32, 7.6, Math.PI, 0); g.fill(); if (bat) bat(); g.restore(); };
    function draw(t) {
      g.setTransform(scale, 0, 0, scale, 0, 0);
      /* sky + crowd + grass */
      const sk = g.createLinearGradient(0, 0, 0, 120); sk.addColorStop(0, "#6EC1F5"); sk.addColorStop(1, "#CDEBFF"); g.fillStyle = sk; g.fillRect(0, 0, VW, 120);
      g.fillStyle = "#5E6B7A"; g.fillRect(0, 56, VW, 40); for (let i = 0; i < 70; i++) { g.fillStyle = ["#E8453C", "#F2B632", "#2E7BE8", "#fff", "#26B574"][i % 5]; g.fillRect((i * 17) % VW, 60 + ((i * 7) % 5) * 7, 6, 5); }
      g.fillStyle = "#3E8E41"; g.fillRect(0, 96, VW, VH - 96); for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? "#47994A" : "#3C8A3F"; g.fillRect(0, 96 + i * 42, VW, 21); }
      g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2; g.beginPath(); g.ellipse(CX, 330, 190, 250, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      /* pitch */
      g.fillStyle = "#C9A66B"; g.beginPath(); g.moveTo(CX - halfW(0) * .8, Y0); g.lineTo(CX + halfW(0) * .8, Y0); g.lineTo(CX + halfW(1) * .8, Y1 + 24); g.lineTo(CX - halfW(1) * .8, Y1 + 24); g.fill();
      g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 1.4; [-1, 0, 1].forEach(l => { g.beginPath(); g.moveTo(laneX(l, 0), Y0); g.lineTo(laneX(l, 1), Y1); g.stroke(); });
      g.strokeStyle = "#fff"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(CX - halfW(1) * .95, Y1 + 8); g.lineTo(CX + halfW(1) * .95, Y1 + 8); g.stroke();
      FIELD.forEach(([fx, fy], i) => person(CX + fx, fy + 96, .5, "#2E7BE8"));
      stumps(CX, Y0 + 2, .55, 0);
      const out = mode === "result" && res && res.kind === "out" && res.how === "bowled", fall = out ? Math.min(1, (t - resAt) / 250) : 0;
      stumps(CX, Y1 + 6, 1, fall);
      /* the bowler */
      const ru = mode === "runup" ? Math.min(1, (t - runUp) / 700) : 1;
      person(CX + (mode === "runup" ? (1 - ru) * 26 : 0), Y0 + 14 - (mode === "runup" ? (1 - ru) * 12 : 0), .72 + .1 * ru, "#E8453C", () => { g.fillStyle = "#F2C6A0"; g.fillRect(-12, -38 - (mode === "flight" || mode === "result" ? 6 : 0), 4, 14); });
      /* the batter + bat */
      const bx = CX + (cur ? (swing ? swing.shot * 14 : 0) : 0), sw = swing ? Math.min(1, (t - swing.t) / 220) : 0, ang = swing ? (-1.1 + sw * (1.1 + (swing.shot + 1) * .95)) : -.35;
      person(CX - 16, Y1 + 20, 1.15, "#26B574", null);
      g.save(); g.translate(CX - 8, Y1 - 12); g.rotate(swing ? (swing.shot * -.9) + (sw < 1 ? (1 - sw) * -1.2 * (swing.shot || 1) : 0) : -.2); g.fillStyle = "#D8B070"; g.fillRect(-3, -34, 7, 38); g.fillStyle = "#8A5A24"; g.fillRect(-2, 2, 5, 12); g.restore();
      /* the ball */
      if ((mode === "flight" || mode === "runup") && cur) {
        const e = t - t0, p = mode === "flight" ? Math.min(1, e / cur.T) : 0, b = mode === "runup" ? { x: CX + (1 - ru) * 26 + 4, y: Y0 - 8 - (1 - ru) * 6, gy: Y0 + 20, r: 3.2 } : ballPos(cur, p);
        g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(b.x, b.gy, b.r * 1.2, b.r * .5, 0, 0, 7); g.fill();
        g.fillStyle = "#C4162A"; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = Math.max(.8, b.r * .14); g.beginPath(); g.arc(b.x, b.y, b.r * .7, -.9, .9); g.stroke();
        if (mode === "flight") { const err = t - arrive, live = err > -WIN.ok && err < WIN.ok; g.strokeStyle = live ? (Math.abs(err) <= WIN.perfect ? "#FFE27A" : "#7CE28A") : "rgba(255,255,255,.45)"; g.lineWidth = live ? 4 : 2; g.setLineDash(live ? [] : [5, 5]); g.beginPath(); g.ellipse(laneX(cur.line, 1), Y1 - 4, 30, 11, 0, 0, 7); g.stroke(); g.setLineDash([]); }
      }
      if (mode === "result" && res) {
        const e = (t - resAt) / 1000, k = res.kind;
        if (k === "six" || k === "four" || k === "runs" || (k === "out" && res.how === "caught")) {
          const dir = res.shot == null ? 0 : res.shot, dist = k === "six" ? 300 : k === "four" ? 240 : k === "out" ? 120 : 90, sp = k === "four" ? 1.7 : 1.2, q = Math.min(1, e * sp);
          const bx2 = laneX(res.d.line, 1) + dir * 150 * q, by = Y1 - dist * q, h = k === "six" || k === "out" ? Math.sin(q * Math.PI) * 120 : k === "runs" ? Math.sin(q * Math.PI) * 18 : 0;
          g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(bx2, by, 6, 3, 0, 0, 7); g.fill(); g.fillStyle = "#C4162A"; g.beginPath(); g.arc(bx2, by - h, 6 - q * 2, 0, 7); g.fill();
        }
        /* the big call-out */
        const pop = Math.min(1, e * 6), sc = .6 + .4 * pop + (k === "six" ? .25 : 0), big = k === "six" ? "#FFE27A" : k === "four" ? "#7CE28A" : k === "out" ? "#FF7B7B" : "#fff";
        g.save(); g.translate(CX, 214); g.scale(sc, sc); g.globalAlpha = Math.min(1, pop * 1.5); g.font = `900 ${k === "six" || k === "four" || k === "out" ? 46 : 30}px "Playfair Display",Georgia,serif`; g.textAlign = "center"; g.lineWidth = 7; g.strokeStyle = "rgba(0,0,0,.65)"; g.strokeText(res.text, 0, 0); g.fillStyle = big; g.fillText(res.text, 0, 0);
        if (res.runs && k !== "six" && k !== "four") { g.font = `700 22px "Josefin Sans",sans-serif`; g.strokeText("+" + res.runs, 0, 32); g.fillText("+" + res.runs, 0, 32); } g.restore();
      }
      if (swing && swing.dud && t - swing.t < 400) { g.fillStyle = "rgba(255,255,255,.9)"; g.font = `700 16px "Josefin Sans",sans-serif`; g.textAlign = "center"; g.fillText("Wait for the ball…", CX, 330); }
      if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * .5})`; g.fillRect(0, 0, VW, VH); flash = Math.max(0, flash - .05); }
    }
    function loop(t) {
      raf = nextFrame(loop); const n = now();
      if (mode === "runup" && n - runUp >= 700) { mode = "flight"; t0 = n; arrive = n + cur.T; }
      else if (mode === "flight" && n > arrive + WIN.ok) resolve(null, 0);
      else if (mode === "result" && n - resAt > resultMs) { if (m.over) finish(); else bowl(); }
      draw(n);
    }
    /* ---- input ---- */
    const kd = e => { if (e.key in KEYS) { e.preventDefault(); press(KEYS[e.key]); } }; addEventListener("keydown", kd);
    $$(root, ".pad2 button").forEach(b => b.addEventListener("pointerdown", e => { e.preventDefault(); b.classList.add("down"); press(+b.dataset.s); setTimeout(() => b.classList.remove("down"), 120); }));
    const vis = () => { if (!DEBUG && document.hidden && (mode === "flight" || mode === "runup")) { const was = mode; mode = "paused"; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Paused</h2><button class="btn" id="res">Resume</button></div>`; $(ov, "#res").onclick = () => { ov.hidden = true; bowl(); }; } };
    document.addEventListener("visibilitychange", vis);
    ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Cricket</h2><p class="sub">Tap LEFT, STRAIGHT or RIGHT to match the lane the ball is in, just as it reaches the bat.<br>12 balls, 3 wickets. Time it well for fours and sixes!</p><button class="btn" id="go">Tap to bat</button></div>`; $(ov, "#go").onclick = start;
    hud(); raf = nextFrame(loop);
    if (/[?&]debug/.test(location.search)) window.__dbg = { get m() { return m; }, get cur() { return cur; }, get mode() { return mode; }, get arrive() { return arrive; }, get res() { return res; }, press, start, now };

    const fresh = ns => { S = ns; m = newMatch(S.seed); mode = "ready"; cur = null; res = null; swing = null; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>New round</h2><button class="btn" id="go">Tap to bat</button></div>`; $(ov, "#go").onclick = start; hud(); banner(root, ""); };
    const q = queue(async (s, ev) => {
      if (ev.some(e => e.t === "reset")) return fresh(s);
      S = s; if (P.length > 1) setStrip(root, -1, stripInfo(S, P));
      if (S.over) {
        if (["flight", "runup", "ready", "paused", "result"].includes(mode)) { mode = "over"; ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>Round over</h2><p class="sub">The host ended the round.</p><div class="ovb" id="ovb"></div></div>`; }
        winBanner(root, S, P, ctx); ovButtons(ov, S, ctx);
        if (ev.some(e => e.t === "done")) ctx.finished(P.length === 1 ? -1 : S.winner);
      } else if (mode === "over") ovButtons(ov, S, ctx);
    });
    return { push: (s, e) => q.push(s, e), get busy() { return false; }, destroy() { cancelFrame(raf); removeEventListener("keydown", kd); ro.disconnect(); document.removeEventListener("visibilitychange", vis); } };
  },
};
