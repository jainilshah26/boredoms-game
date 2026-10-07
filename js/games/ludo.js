import { esc, $, $$, queue, stripHTML, setStrip, banner, sleep } from "./common.js";
import { sfx, burst, shake, Dice3D, floatText, reduced } from "../fx.js";
import { avatar } from "../avatars.js";

/* 52 squares clockwise; colour k starts at square 13*k */
const PATH = []; const add = (c, r) => PATH.push([c, r]);
for (let c = 1; c <= 5; c++) add(c, 6); for (let r = 5; r >= 0; r--) add(6, r); add(7, 0); add(8, 0);
for (let r = 1; r <= 5; r++) add(8, r); for (let c = 9; c <= 14; c++) add(c, 6); add(14, 7); add(14, 8);
for (let c = 13; c >= 9; c--) add(c, 8); for (let r = 9; r <= 14; r++) add(8, r); add(7, 14); add(6, 14);
for (let r = 13; r >= 9; r--) add(6, r); for (let c = 5; c >= 0; c--) add(c, 8); add(0, 7); add(0, 6);
const HOMECOL = [[[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]];
const HOMEEND = [[6.6, 7.5], [7.5, 6.6], [8.4, 7.5], [7.5, 8.4]];
const YARD = [[0, 0], [9, 0], [9, 9], [0, 9]];
const SPOT = [[2, 2], [4, 2], [2, 4], [4, 4]];
const LC = ["#E8453C", "#27B26A", "#F2B632", "#2E7BE8"], LDARK = ["#9E241D", "#14753F", "#B07F0C", "#17489E"], LLIGHT = ["#FFC9C4", "#C2F0D6", "#FFEBB0", "#C3DAFF"];
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const SEATS = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
const abs = (col, p) => (col * 13 + p) % 52;

/* centre of a token, in board cells */
function xy(col, k, p) {
  if (p < 0) { const [ox, oy] = YARD[col], [sx, sy] = SPOT[k]; return [ox + sx, oy + sy]; }
  if (p <= 50) { const [c, r] = PATH[abs(col, p)]; return [c + .5, r + .5]; }
  if (p <= 55) { const [c, r] = HOMECOL[col][p - 51]; return [c + .5, r + .5]; }
  const [x, y] = HOMEEND[col]; return [x + (k % 2 - .5) * .3, y + ((k / 2 | 0) - .5) * .3];
}
const legal = (s, p, d) => { const out = []; s.t[p].forEach((q, k) => { if (q === -1 ? d === 6 : q + d <= 56) out.push(k); }); return out; };
const next = s => { s.turn = (s.turn + 1) % s.players.length; s.phase = "roll"; s.sixes = 0; s.legal = []; };

function doMove(s, p, k, d, ev) {
  const from = s.t[p][k], to = from === -1 ? 0 : from + d, col = s.col[p]; s.t[p][k] = to;
  const steps = from === -1 ? 1 : d; const e = { t: "move", p, k, from, to, ms: steps * 200 + 120 }; ev.push(e);
  let bonus = d === 6;
  if (to <= 50) {
    const a = abs(col, to);
    if (!SAFE.has(a)) s.players.forEach((_, o) => { if (o === p) return; s.t[o].forEach((q, j) => { if (q >= 0 && q <= 50 && abs(s.col[o], q) === a) { s.t[o][j] = -1; ev.push({ t: "capture", p: o, k: j, by: p, from: q, ms: 650 }); bonus = true; } }); });
  }
  if (to === 56) { ev.push({ t: "home", p, k, ms: 500 }); bonus = true; }
  if (s.t[p].every(q => q === 56)) { s.over = true; s.winner = p; s.turn = -1; ev.push({ t: "win", p, ms: 600 }); return; }
  s.phase = "roll"; s.legal = [];
  if (bonus) ev.push({ t: "again", p }); else next(s);
}
function score(s, p, k, d) {
  const q = s.t[p][k], to = q === -1 ? 0 : q + d, col = s.col[p]; let sc = to + Math.random();
  if (q === -1) sc += 40; if (to === 56) sc += 80; else if (to > 50) sc += 25;
  if (to <= 50) { const a = abs(col, to); if (SAFE.has(a)) sc += 12; s.players.forEach((_, o) => { if (o !== p) s.t[o].forEach(z => { if (z >= 0 && z <= 50 && abs(s.col[o], z) === a && !SAFE.has(a)) sc += 70; }); }); }
  return sc;
}

export default {
  id: "ludo", name: "Ludo", min: 2, max: 4,
  init(players) {
    const seats = SEATS[players.length] || SEATS[4], col = seats.slice(0, players.length);
    return { players: players.map((p, i) => ({ ...p, c: LC[col[i]] })), col, t: players.map(() => [-1, -1, -1, -1]), turn: 0, phase: "roll", die: 0, legal: [], sixes: 0, over: false, winner: -1 };
  },
  act(s, a) {
    if (s.over || s.turn !== a.p) return null; const p = a.p;
    if (a.a === "roll" && s.phase === "roll") {
      const d = 1 + Math.random() * 6 | 0; s.die = d; const ev = [{ t: "roll", p, d, ms: 1000 }];
      if (d === 6 && ++s.sixes >= 3) { ev.push({ t: "triple", p, ms: 900 }); next(s); return ev; }
      const lg = legal(s, p, d);
      if (!lg.length) { ev.push({ t: "nomove", p, ms: 700 }); if (d === 6) { s.phase = "roll"; ev.push({ t: "again", p }); } else next(s); return ev; }
      if (lg.length === 1 || new Set(lg.map(k => s.t[p][k])).size === 1) { doMove(s, p, lg[0], d, ev); return ev; }
      s.phase = "move"; s.legal = lg; return ev;
    }
    if (a.a === "move" && s.phase === "move" && s.legal.includes(a.k)) { const ev = []; doMove(s, p, a.k, s.die, ev); return ev; }
    return null;
  },
  bot(s) {
    if (s.phase === "roll") return { a: "roll" };
    let best = s.legal[0], bs = -1; s.legal.forEach(k => { const v = score(s, s.turn, k, s.die); if (v > bs) { bs = v; best = k; } }); return { a: "move", k: best };
  },
  mount(root, ctx) {
    const P = ctx.players, N = P.length;
    let svg = `<rect width="15" height="15" rx=".6" fill="#FFF8E7"/>`;
    for (let c = 0; c < 4; c++) {
      const [ox, oy] = YARD[c]; svg += `<rect x="${ox}" y="${oy}" width="6" height="6" fill="${LC[c]}"/><rect x="${ox + 1}" y="${oy + 1}" width="4" height="4" rx=".7" fill="#fff" stroke="${LDARK[c]}" stroke-width=".08"/>`;
      SPOT.forEach(([x, y]) => svg += `<circle cx="${ox + x}" cy="${oy + y}" r=".72" fill="${LLIGHT[c]}" stroke="${LC[c]}" stroke-width=".1"/>`);
    }
    PATH.forEach(([c, r], i) => { const col = [0, 13, 26, 39].indexOf(i); svg += `<rect x="${c}" y="${r}" width="1" height="1" fill="${col > -1 ? LC[col] : "#fff"}" stroke="#c9b27a" stroke-width=".05"/>`; if (SAFE.has(i) && col < 0) svg += `<text x="${c + .5}" y="${r + .74}" font-size=".78" text-anchor="middle" fill="#c8981a">★</text>`; if (col > -1) svg += `<text x="${c + .5}" y="${r + .72}" font-size=".6" text-anchor="middle" fill="#fff" opacity=".9">▶</text>`; });
    HOMECOL.forEach((cells, c) => cells.forEach(([x, y], j) => svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="${LC[c]}" opacity="${.55 + j * .09}" stroke="#fff" stroke-width=".05"/>`));
    svg += `<polygon points="6,6 9,6 7.5,7.5" fill="${LC[1]}"/><polygon points="9,6 9,9 7.5,7.5" fill="${LC[2]}"/><polygon points="6,9 9,9 7.5,7.5" fill="${LC[3]}"/><polygon points="6,6 6,9 7.5,7.5" fill="${LC[0]}"/><circle cx="7.5" cy="7.5" r=".42" fill="#fff" stroke="#c8981a" stroke-width=".08"/>`;
    root.innerHTML = `<div class="game ludo">${stripHTML(P, P.map(() => "🏠 0/4"))}
      <div class="lboard"><svg viewBox="0 0 15 15">${svg}</svg><div class="ltoks"></div></div>
      <div class="banner"></div><div class="controls"><div class="dicebox"></div><button class="btn" id="roll">Roll dice</button></div></div>`;
    const board = $(root, ".lboard"), layer = $(root, ".ltoks"), dice = new Dice3D($(root, ".dicebox"), 60);
    const cellPx = () => board.clientWidth / 15; const setCell = () => board.style.setProperty("--cell", cellPx() + "px");
    setCell(); const ro = new ResizeObserver(setCell); ro.observe(board);
    const el = P.map((p, i) => [0, 1, 2, 3].map(k => { const d = document.createElement("button"); d.className = "ltok"; d.style.setProperty("--tc", p.c); d.style.setProperty("--dk", LDARK[LC.indexOf(p.c)]); d.innerHTML = `<span class="pin">${avatar(p.av, 30, "")}</span>`; d.onclick = () => d.classList.contains("glow") && ctx.act({ a: "move", k }); layer.appendChild(d); return d; }));
    const pos = P.map(() => [-1, -1, -1, -1]); const col = ctx.state.col;
    const put = (i, k, ms) => {
      const [x, y] = xy(col[i], k, pos[i][k]); const t = el[i][k];
      t.style.transition = ms ? `left ${ms}ms ease-in-out, top ${ms}ms ease-in-out` : "none"; t.style.left = x / 15 * 100 + "%"; t.style.top = y / 15 * 100 + "%";
    };
    const spread = () => { /* nudge tokens sharing a square so they stay visible */
      const g = {}; P.forEach((_, i) => pos[i].forEach((p, k) => { if (p < 0 || p === 56) return; const key = i + "-" + k; const [x, y] = xy(col[i], k, p); (g[x.toFixed(2) + "," + y.toFixed(2)] ||= []).push([i, k]); }));
      Object.values(g).forEach(arr => arr.forEach(([i, k], n) => { const t = el[i][k], m = arr.length; t.style.setProperty("--ox", m > 1 ? ((n % 2) - .5) * 34 + "%" : "0%"); t.style.setProperty("--oy", m > 1 ? (((n / 2 | 0) % 2) - .5) * 34 + "%" : "0%"); t.style.zIndex = 5 + n; }));
      P.forEach((_, i) => pos[i].forEach((p, k) => { if (p < 0 || p === 56) { el[i][k].style.setProperty("--ox", "0%"); el[i][k].style.setProperty("--oy", "0%"); } }));
    };
    const info = s => P.map((_, i) => `🏠 ${s.t[i].filter(q => q === 56).length}/4`);
    const paint = s => {
      P.forEach((_, i) => s.t[i].forEach((p, k) => { pos[i][k] = p; put(i, k, 0); el[i][k].classList.remove("glow"); el[i][k].classList.toggle("home", p === 56); }));
      spread(); dice.set(s.die || 1, true); setStrip(root, s.turn, info(s));
      const my = ctx.mine(s.turn) && !s.over, btn = $(root, "#roll");
      if (s.phase === "move" && my) s.legal.forEach(k => el[s.turn][k].classList.add("glow"));
      btn.disabled = !(my && s.phase === "roll"); btn.textContent = s.over ? "Play again" : my ? (s.phase === "roll" ? "Roll dice 🎲" : "Pick a token 👆") : `${P[s.turn].n}'s turn…`;
      btn.onclick = s.over ? () => ctx.act({ a: "again" }) : () => { btn.disabled = true; ctx.act({ a: "roll" }); };
      if (s.over) { btn.disabled = false; banner(root, `🏆 ${esc(P[s.winner].n)} wins!`, "won"); }
      else banner(root, my ? (s.phase === "roll" ? "Your turn! Roll the dice." : "Tap a glowing token to move it.") : `${esc(P[s.turn].n)} is up`);
    };
    const hopTo = async (i, k, p, ms = 190) => { pos[i][k] = p; put(i, k, ms); const pin = el[i][k].querySelector(".pin"); if (!reduced()) pin.animate([{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-45%) scale(1.15,.92)" }, { transform: "translateY(0) scale(.94,1.06)" }, { transform: "none" }], { duration: ms + 10 }); sfx.play("hop"); await sleep(ms + 10); };
    const q = queue(async (s, ev) => {
      for (const e of ev) {
        if (e.t === "reset") { P.forEach((_, i) => pos[i] = [-1, -1, -1, -1]); }
        if (e.t === "roll") { banner(root, `${esc(P[e.p].n)} is rolling…`); $(root, "#roll").disabled = true; await dice.roll(e.d); banner(root, `${esc(P[e.p].n)} rolled a <b>${e.d}</b>`); }
        if (e.t === "nomove") { sfx.play("err"); banner(root, `${esc(P[e.p].n)} can't move`); await sleep(650); }
        if (e.t === "triple") { sfx.play("bonk"); floatText($(root, ".dicebox"), "3 sixes! Turn lost", "#FF8A96"); await sleep(850); }
        if (e.t === "move") {
          const t = el[e.p][e.k]; t.style.zIndex = 50; t.style.setProperty("--ox", "0%"); t.style.setProperty("--oy", "0%");
          if (e.from === -1) { sfx.play("pop"); burst(t, ["✨"], 4); await hopTo(e.p, e.k, 0, 260); } else for (let n = e.from + 1; n <= e.to; n++) await hopTo(e.p, e.k, n);
          spread();
        }
        if (e.t === "capture") {
          const t = el[e.p][e.k]; sfx.play("bonk"); shake(board, 380); burst(t, ["💥", "💫", "😵"], 6); floatText(t, "Sent home!", "#FF5468");
          pos[e.p][e.k] = -1; put(e.p, e.k, 650); await sleep(680); spread();
        }
        if (e.t === "home") { sfx.play("up"); const t = el[e.p][e.k]; t.classList.add("home"); burst(t, ["⭐", "🎉", "✨"], 9); floatText(t, "Home! 🏠", "#E8C766"); await sleep(450); }
        if (e.t === "again") { sfx.play("coin"); floatText($(root, ".dicebox"), "Roll again!", "#E8C766"); }
        if (e.t === "win") { burst($(root, ".lboard"), ["🎉", "⭐", "🏆"], 16); }
      }
      paint(s);
      if (s.over && ev.some(e => e.t === "win")) ctx.finished(s.winner);
      else if (ev.length && ctx.mine(s.turn) && !s.over) sfx.play("turn");
    });
    paint(ctx.state);
    return { push: (s, e) => q.push(s, e), get busy() { return q.busy; }, destroy() { ro.disconnect(); } };
  },
};
