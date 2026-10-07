import { esc, $, $$, queue, stripHTML, setStrip, banner, sleep } from "./common.js";
import { sfx, burst, shake, Dice3D, floatText, reduced } from "../fx.js";
import { avatar } from "../avatars.js";

const J = { 4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92, 27: 5, 40: 3, 43: 18, 54: 31, 66: 45, 76: 58, 89: 53, 99: 41 };
const cellXY = n => { if (n <= 0) return [6, 106.5]; const r = (n - 1) / 10 | 0, k = (n - 1) % 10, c = r % 2 ? 9 - k : k; return [(c + .5) * 10, (9 - r + .5) * 10]; };
const HF = 1.12; // wrap height / width

export default {
  id: "snl", name: "Snake & Ladder", min: 2, max: 10,
  init(players) { return { players, pos: players.map(() => 0), turn: 0, die: 0, over: false, winner: -1, msg: "Roll to start. You need the exact number to land on 100." }; },
  act(s, a) {
    if (a.a !== "roll" || s.over || s.turn !== a.p) return null;
    const p = a.p, d = 1 + Math.random() * 6 | 0, from = s.pos[p], np = from + d, ev = [{ t: "roll", p, d, ms: 1000 }]; s.die = d;
    if (np > 100) { ev.push({ t: "stay", p, need: 100 - from, ms: 500 }); s.msg = `${s.players[p].n} rolled ${d} but needs exactly ${100 - from}.`; }
    else {
      const path = []; for (let i = from + 1; i <= np; i++) path.push(i);
      ev.push({ t: "move", p, from, path, ms: path.length * 230 + 100 }); s.pos[p] = np; s.msg = `${s.players[p].n} rolled ${d} and moved to ${np}.`;
      if (J[np]) { ev.push({ t: "jump", p, from: np, to: J[np], up: J[np] > np, ms: 1100 }); s.pos[p] = J[np]; s.msg += J[np] > np ? ` Ladder! Up to ${J[np]} 🪜` : ` Snake! Down to ${J[np]} 🐍`; }
    }
    if (s.pos[p] === 100) { s.over = true; s.winner = p; s.turn = -1; ev.push({ t: "win", p, ms: 600 }); }
    else if (d === 6) { s.msg += " Rolled a 6, go again!"; ev.push({ t: "again", p }); }
    else s.turn = (s.turn + 1) % s.players.length;
    return ev;
  },
  bot() { return { a: "roll" }; },
  mount(root, ctx) {
    const P = ctx.players;
    /* board cells */
    let cells = ""; for (let r = 9; r >= 0; r--) for (let c = 0; c < 10; c++) { const n = r * 10 + (r % 2 ? 10 - c : c + 1); cells += `<div class="sc ${(r + c) % 2 ? "a" : "b"}${J[n] ? (J[n] > n ? " lad" : " snk") : ""}${n === 100 ? " goal" : ""}"><span>${n === 100 ? "🏆" : n}</span></div>`; }
    /* ladders and snakes */
    const SN = ["#2fa66a", "#e0643a", "#8e5cd9", "#d9458b", "#1e9fb8", "#c8a21a", "#4a7be0"];
    let art = "", si = 0;
    for (const k in J) {
      const a = +k, b = J[k], [ax, ay] = cellXY(a), [bx, by] = cellXY(b);
      if (b > a) { // ladder from a (bottom) to b (top)
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), nx = -dy / L * 1.7, ny = dx / L * 1.7;
        art += `<g class="ladder"><path d="M${ax + nx} ${ay + ny}L${bx + nx} ${by + ny}M${ax - nx} ${ay - ny}L${bx - nx} ${by - ny}" stroke="#5b3a14" stroke-width="2.1" stroke-linecap="round" opacity=".35" transform="translate(.5 .7)"/>
          <path d="M${ax + nx} ${ay + ny}L${bx + nx} ${by + ny}M${ax - nx} ${ay - ny}L${bx - nx} ${by - ny}" stroke="#c98a3d" stroke-width="1.5" stroke-linecap="round"/>`;
        const steps = Math.max(3, Math.round(L / 3.4)); for (let i = 1; i < steps; i++) { const t = i / steps, x = ax + dx * t, y = ay + dy * t; art += `<path d="M${x + nx} ${y + ny}L${x - nx} ${y - ny}" stroke="#e9b86a" stroke-width="1.1" stroke-linecap="round"/>`; }
        art += `</g>`;
      } else { // snake: head at a (top), tail at b
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, col = SN[si++ % SN.length], amp = 2.6, waves = Math.max(2, L / 14);
        const pts = []; for (let i = 0; i <= 36; i++) { const t = i / 36, w = Math.sin(t * Math.PI * 2 * waves) * amp * (1 - t * .45); pts.push([ax + dx * t + nx * w, ay + dy * t + ny * w]); }
        const d = "M" + pts.map(p => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L");
        const [hx, hy] = pts[0], [h2x, h2y] = pts[2], hd = Math.atan2(hy - h2y, hx - h2x) * 180 / Math.PI;
        art += `<g class="snake"><path d="${d}" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity=".25" transform="translate(.5 .7)"/>
          <path d="${d}" fill="none" stroke="${col}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="1.1 2.2" stroke-linecap="round"/>
          <g transform="translate(${hx} ${hy}) rotate(${hd})"><ellipse rx="3.1" ry="2.6" fill="${col}" stroke="rgba(0,0,0,.35)" stroke-width=".3"/><circle cx="-.2" cy="-1.3" r=".85" fill="#fff"/><circle cx="-.2" cy="1.3" r=".85" fill="#fff"/><circle cx="-.05" cy="-1.3" r=".42" fill="#222"/><circle cx="-.05" cy="1.3" r=".42" fill="#222"/><path d="M3 0h2.4l.9-.8M5.4 0l.9.8" stroke="#e11d48" stroke-width=".5" fill="none" stroke-linecap="round"/></g></g>`;
      }
    }
    root.innerHTML = `<div class="game snl">${stripHTML(P, P.map(() => "start"))}
      <div class="sbwrap"><div class="sboard">${cells}<svg class="sart" viewBox="0 0 100 100">${art}</svg></div><div class="sstart"><span>START</span></div><div class="pawns"></div></div>
      <div class="banner"></div><div class="log"></div>
      <div class="controls"><div class="dicebox"></div><button class="btn" id="roll">Roll dice</button></div></div>`;
    const pawns = $(root, ".pawns"), dice = new Dice3D($(root, ".dicebox"), 62);
    const pw = P.map((p, i) => { const d = document.createElement("div"); d.className = "pawn"; d.innerHTML = `<div class="pin">${avatar(p.av, 34, p.c)}</div>`; pawns.appendChild(d); return d; });
    const shownPos = P.map(() => -1);
    const place = (i, n, ms = 0) => {
      const [x, y] = cellXY(n); const same = P.map((_, k) => k).filter(k => shownPos[k] === n && k !== i), off = same.length ? same.length : 0;
      const ox = (off % 3 - 1) * 1.9, oy = (off / 3 | 0) * 1.6;
      pw[i].style.transition = ms ? `left ${ms}ms ease-in-out, top ${ms}ms ease-in-out` : "none";
      pw[i].style.left = (x + ox) + "%"; pw[i].style.top = ((y + oy) / HF) + "%"; shownPos[i] = n; pw[i].style.zIndex = 10 + i;
    };
    const layout = s => { P.forEach((_, i) => place(i, s.pos[i])); };
    const paint = s => {
      layout(s); dice.set(s.die || 1, true); $(root, ".log").textContent = s.msg;
      setStrip(root, s.turn, s.pos.map(n => n ? `🏁 ${n}` : "start"));
      const btn = $(root, "#roll"), my = ctx.mine(s.turn) && !s.over;
      btn.disabled = !my; btn.textContent = s.over ? "Game over" : my ? "Roll dice 🎲" : `${s.players[s.turn].n}'s turn…`;
      if (s.over) { banner(root, `🏆 ${esc(P[s.winner].n)} wins!`, "won"); btn.textContent = "Play again"; btn.disabled = false; btn.onclick = () => ctx.act({ a: "again" }); }
      else { banner(root, my ? "Your turn! Roll the dice." : `${esc(P[s.turn].n)} is up`); btn.onclick = () => { btn.disabled = true; ctx.act({ a: "roll" }); }; }
    };
    const hop = async (i, n) => { place(i, n, 210); if (!reduced()) pw[i].querySelector(".pin").animate([{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-16px) scale(1.15,.9)" }, { transform: "translateY(0) scale(.92,1.08)" }, { transform: "scale(1)" }], { duration: 220 }); sfx.play("hop"); await sleep(230); };
    const q = queue(async (s, ev) => {
      for (const e of ev) {
        if (e.t === "reset") { P.forEach((_, i) => place(i, 0)); }
        if (e.t === "roll") { $(root, ".log").textContent = `${P[e.p].n} is rolling…`; $(root, "#roll").disabled = true; await dice.roll(e.d); banner(root, `${esc(P[e.p].n)} rolled a <b>${e.d}</b>`); }
        if (e.t === "stay") { sfx.play("err"); floatText(pw[e.p], `Need ${e.need}`, "#FF8A96"); await sleep(500); }
        if (e.t === "move") { for (const n of e.path) await hop(e.p, n); }
        if (e.t === "jump") {
          if (e.up) { sfx.play("up"); burst(pw[e.p], ["🪜", "✨", "⭐"], 6); floatText(pw[e.p], "Ladder! ▲", "#4BE08F"); place(e.p, e.to, 900); await sleep(950); }
          else { sfx.play("down"); shake($(root, ".sbwrap")); floatText(pw[e.p], "Snake! ▼", "#FF5468"); place(e.p, e.to, 900); await sleep(950); }
          burst(pw[e.p], e.up ? ["⭐"] : ["💨"], 4);
        }
        if (e.t === "win") { burst(pw[e.p], ["🎉", "⭐", "✨", "🏆"], 14); }
        if (e.t === "again") { sfx.play("coin"); floatText(pw[e.p], "Roll again!", "#E8C766"); }
      }
      paint(s);
      if (s.over && ev.some(e => e.t === "win")) ctx.finished(s.winner);
      else if (ev.length && ctx.mine(s.turn) && !s.over) sfx.play("turn");
    });
    paint(ctx.state);
    return { push: (s, e) => q.push(s, e), get busy() { return q.busy; }, destroy() { } };
  },
};
