import { esc, $, $$, queue, banner, sleep, rect } from "./common.js";
const pc2 = (root, i) => root.querySelector(`.opp[data-oi="${i}"] .avatar`);
import { sfx, burst, shake, floatText, fly, reduced } from "../fx.js";
import { avatar } from "../avatars.js";

const COL = { R: "#E8453C", Y: "#F2B632", G: "#26B574", B: "#2E7BE8", K: "#2b2b3a" }, NAME = { R: "Red", Y: "Yellow", G: "Green", B: "Blue" };
const SYM = { S: "⊘", V: "⇄", D: "+2", F: "+4", W: "★" };
const sym = c => /\d/.test(c.v) ? c.v : SYM[c.v];
const cardHTML = (c, cls = "") => `<div class="ucard ${cls} c${c.c} v${c.v}"><i class="tl">${sym(c)}</i><span class="oval"><b>${sym(c)}</b></span><i class="br">${sym(c)}</i></div>`;
const BACK = `<div class="ucard back"><span class="oval"><b>BF</b></span></div>`;

function mkDeck() {
  const d = []; for (const c of "RYGB") { d.push({ c, v: "0" }); for (let n = 1; n <= 9; n++) d.push({ c, v: String(n) }, { c, v: String(n) }); for (const v of "SVD") d.push({ c, v }, { c, v }); }
  for (let i = 0; i < 4; i++) d.push({ c: "K", v: "W" }, { c: "K", v: "F" });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[d[i], d[j]] = [d[j], d[i]]; } return d;
}
const ok = (s, c) => c.c === "K" || c.c === s.color || (c.v === s.top.v && s.top.c !== "K");
const nextSeat = (s, from, n = 1) => { const L = s.players.length; return ((from + s.dir * n) % L + L * 2) % L; };
function draw(s, p, n) {
  for (let i = 0; i < n; i++) {
    if (!s.deck.length) { const top = s.pile.pop(); s.deck = s.pile.map(c => c.c === "K" ? { ...c } : c); s.pile = [top]; for (let k = s.deck.length - 1; k > 0; k--) { const j = Math.random() * (k + 1) | 0;[s.deck[k], s.deck[j]] = [s.deck[j], s.deck[k]]; } if (!s.deck.length) break; }
    s.hands[p].push(s.deck.pop());
  }
}
const best = (h) => { const n = { R: 0, Y: 0, G: 0, B: 0 }; h.forEach(c => { if (c.c !== "K") n[c.c]++; }); return Object.keys(n).sort((a, b) => n[b] - n[a])[0]; };

export default {
  id: "clash", name: "Card Clash", min: 2, max: 10,
  init(players) {
    const deck = mkDeck(), hands = players.map(() => deck.splice(0, 7)); let top; do { top = deck.pop(); if (top.c === "K") { deck.unshift(top); top = null; } else if (!/\d/.test(top.v)) { deck.unshift(top); top = null; } } while (!top);
    return { players, deck, pile: [top], hands, top, color: top.c, dir: 1, turn: 0, drawn: -1, over: false, winner: -1 };
  },
  act(s, a) {
    if (s.over || s.turn !== a.p) return null; const p = a.p, ev = [];
    if (a.a === "play") {
      const c = s.hands[p][a.i]; if (!c || !ok(s, c) || (s.drawn >= 0 && a.i !== s.drawn)) return null;
      if (c.c === "K" && !"RYGB".includes(a.color || "")) return null;
      s.hands[p].splice(a.i, 1); s.pile.push(c); s.top = c; s.color = c.c === "K" ? a.color : c.c; s.drawn = -1;
      ev.push({ t: "play", p, card: c, i: a.i, color: s.color, ms: 520 });
      if (!s.hands[p].length) { s.over = true; s.winner = p; s.turn = -1; ev.push({ t: "win", p, ms: 600 }); return ev; }
      let step = 1;
      if (c.v === "V") { s.dir *= -1; ev.push({ t: "reverse", ms: 450 }); if (s.players.length === 2) step = 2; }
      if (c.v === "S") { step = 2; ev.push({ t: "skip", p: nextSeat(s, p), ms: 450 }); }
      if (c.v === "D" || c.v === "F") { const v = nextSeat(s, p), n = c.v === "D" ? 2 : 4; draw(s, v, n); ev.push({ t: "draw", p: v, n, pen: true, ms: 300 + n * 140 }); step = 2; }
      s.turn = nextSeat(s, p, step);
      return ev;
    }
    if (a.a === "draw" && s.drawn < 0) {
      draw(s, p, 1); const c = s.hands[p][s.hands[p].length - 1]; ev.push({ t: "draw", p, n: 1, ms: 400 });
      if (c && ok(s, c)) s.drawn = s.hands[p].length - 1; else s.turn = nextSeat(s, p);
      return ev;
    }
    if (a.a === "pass" && s.drawn >= 0) { s.drawn = -1; s.turn = nextSeat(s, p); return [{ t: "pass", p, ms: 250 }]; }
    return null;
  },
  bot(s) {
    const p = s.turn, h = s.hands[p], nxt = s.hands[nextSeat(s, p)].length;
    const cand = h.map((c, i) => ({ c, i })).filter(x => ok(s, x.c) && (s.drawn < 0 || x.i === s.drawn));
    if (!cand.length) return s.drawn >= 0 ? { a: "pass" } : { a: "draw" };
    cand.forEach(x => { x.sc = Math.random() + (x.c.c === s.color ? 1 : 0) + (/[SVD]/.test(x.c.v) ? (nxt <= 2 ? 3 : .8) : 0) + (x.c.c === "K" ? (h.length > 3 ? -2 : 1) : 0) + (/\d/.test(x.c.v) ? +x.c.v / 20 : 0); });
    cand.sort((a, b) => b.sc - a.sc); const pick = cand[0], rest = h.filter((_, i) => i !== pick.i);
    return { a: "play", i: pick.i, color: pick.c.c === "K" ? best(rest) || "R" : undefined };
  },
  mount(root, ctx) {
    const P = ctx.players, L = P.length;
    const humans = P.map((p, i) => i).filter(i => !P[i].bot);
    const hot = ctx.local && humans.length > 1;
    let revealed = -1;
    root.innerHTML = `<div class="game clash">
      <div class="opps"></div>
      <div class="table"><div class="piles"><button class="deck" id="deck" aria-label="Draw a card">${BACK}${BACK}${BACK}<em>Draw</em></button><div class="dir" id="dir">↻</div><div class="disc" id="disc"></div></div>
        <div class="curcol" id="curcol"></div></div>
      <div class="banner"></div><div class="actions row" id="acts"></div>
      <div class="hand" id="hand"></div><div class="cover" id="cover" hidden></div><div class="picker" id="picker" hidden></div></div>`;
    const deck = $(root, "#deck"), disc = $(root, "#disc"), handEl = $(root, "#hand"), cover = $(root, "#cover"), picker = $(root, "#picker");
    const seatOf = s => hot ? (revealed === s.turn ? s.turn : -1) : ctx.mySeat;
    let view = ctx.state, dirTurns = 0;
    const handBox = i => i === ctx.mySeatNow() ? handEl : null;
    ctx.mySeatNow = () => seatOf(view);
    const paintHand = s => {
      const me = seatOf(s); const hnd = me >= 0 ? s.hands[me] : [];
      const myTurn = me >= 0 && ctx.mine(s.turn) && s.turn === me && !s.over;
      if (hot && me < 0) { handEl.innerHTML = `<p class="hidden-hand">Hand hidden</p>`; return; }
      if (me < 0) { handEl.innerHTML = `<p class="hidden-hand">You're watching 👀</p>`; return; }
      handEl.className = "hand" + (hnd.length > 8 ? " tight" : "");
      handEl.innerHTML = hnd.map((c, i) => { const can = myTurn && ok(s, c) && (s.drawn < 0 || i === s.drawn); return `<button class="hc ${can ? "can" : myTurn ? "no" : ""}" data-i="${i}" style="--i:${i}">${cardHTML(c)}</button>`; }).join("");
      $$(handEl, ".hc").forEach(b => b.onclick = () => {
        const i = +b.dataset.i, c = hnd[i]; if (!myTurn) return; if (!(ok(s, c) && (s.drawn < 0 || i === s.drawn))) { sfx.play("err"); shake(b, 250); return; }
        if (c.c === "K") pickColor(col => ctx.act({ a: "play", i, color: col })); else ctx.act({ a: "play", i });
      });
    };
    const pickColor = fn => { picker.hidden = false; picker.innerHTML = `<div class="pk"><b>Choose a color</b><div>${"RYGB".split("").map(c => `<button data-c="${c}" style="background:${COL[c]}" aria-label="${NAME[c]}"></button>`).join("")}</div></div>`; $$(picker, "button").forEach(b => b.onclick = () => { picker.hidden = true; fn(b.dataset.c); }); };
    const paintOpps = s => {
      const me = seatOf(s); $(root, ".opps").innerHTML = P.map((p, i) => `<div class="opp ${s.turn === i ? "turn" : ""}" data-oi="${i}" style="--pc:${p.c}">${avatar(p.av, 40, p.c)}<b>${esc(p.n)}${p.bot ? " 🤖" : ""}${i === me ? " (you)" : ""}</b><span class="fan">${Array.from({ length: Math.min(8, s.hands[i].length) }, (_, k) => `<i style="--k:${k}"></i>`).join("")}</span><em>${s.hands[i].length} card${s.hands[i].length === 1 ? "" : "s"}${s.hands[i].length === 1 ? " · UNO!" : ""}</em></div>`).join("");
    };
    const paintTable = s => {
      disc.innerHTML = cardHTML(s.top, "big") ; disc.style.setProperty("--glow", COL[s.color]);
      $(root, "#curcol").innerHTML = `<span style="background:${COL[s.color]}"></span> ${NAME[s.color]}`;
      $(root, "#dir").textContent = s.dir > 0 ? "↻" : "↺";
      deck.disabled = !(ctx.mine(s.turn) && !s.over && s.drawn < 0 && seatOf(s) === s.turn);
    };
    const paint = s => {
      view = s; paintTable(s); paintOpps(s); paintHand(s);
      const me = seatOf(s), my = ctx.mine(s.turn) && !s.over && me === s.turn, acts = $(root, "#acts");
      acts.innerHTML = my && s.drawn >= 0 ? `<button class="btn g" id="pass">Keep & pass</button>` : "";
      if (my && s.drawn >= 0) $(root, "#pass").onclick = () => ctx.act({ a: "pass" });
      if (s.over) { banner(root, `🏆 ${esc(P[s.winner].n)} wins!`, "won"); acts.innerHTML = `<button class="btn" id="again">Play again</button>`; $(root, "#again").onclick = () => ctx.act({ a: "again" }); }
      else banner(root, my ? (s.drawn >= 0 ? "You drew a playable card. Play it or pass." : "Your turn! Play a glowing card or draw.") : `${esc(P[s.turn].n)} is playing…`);
      if (hot && !s.over && !P[s.turn].bot && revealed !== s.turn) { cover.hidden = false; cover.innerHTML = `<div class="cv">${avatar(P[s.turn].av, 72, P[s.turn].c)}<h2>Pass the phone to ${esc(P[s.turn].n)}</h2><p>Hide the screen from everyone else.</p><button class="btn" id="reveal">I'm ${esc(P[s.turn].n)}, show my cards</button></div>`; $(root, "#reveal").onclick = () => { revealed = s.turn; cover.hidden = true; paint(view); }; }
      else if (!hot || revealed === s.turn) cover.hidden = true;
    };
    deck.onclick = () => ctx.act({ a: "draw" });
    const target = (s, p) => { const me = seatOf(s); if (p === me) return rect(handEl); const o = pc2(root, p); return o ? rect(o) : rect(deck); };
    const CW = () => { const r = rect(disc.firstElementChild || disc); return { w: r.width || 60, h: r.height || 88 }; };
    const q = queue(async (s, ev) => {
      for (const e of ev) {
        if (e.t === "reset") { revealed = -1; dirTurns = 0; }
        if (e.t === "play") {
          sfx.play("card"); const me = seatOf(view); let from;
          const hc = e.p === me ? handEl.querySelector(`.hc[data-i="${e.i}"]`) : null;
          from = hc ? rect(hc) : target(view, e.p); const dr = rect(disc); const w = 64, h = 92;
          if (hc) hc.style.visibility = "hidden";
          const f0 = hc ? from : { left: from.left + from.width / 2 - w / 2, top: from.top + from.height / 2 - h / 2, width: w, height: h };
          await fly(cardHTML(e.card, "big"), f0, dr, { ms: 460, rot: (Math.random() - .5) * 24, cls: "ucfly" });
          disc.innerHTML = cardHTML(e.card, "big pop"); disc.style.setProperty("--glow", COL[e.color]); $(root, "#curcol").innerHTML = `<span style="background:${COL[e.color]}"></span> ${NAME[e.color]}`;
          if (e.card.c === "K") { burst(disc, ["🌈", "✨", "⭐"], 8); sfx.play("sparkle"); } if (/[DF]/.test(e.card.v)) shake($(root, ".table"), 300);
        }
        if (e.t === "reverse") { sfx.play("sparkle"); const d = $(root, "#dir"); d.classList.add("spin"); await sleep(450); d.classList.remove("spin"); }
        if (e.t === "skip") { sfx.play("bonk"); floatText(pc2(root, e.p) || disc, "Skipped! ⊘", "#FF8A96"); await sleep(400); }
        if (e.t === "draw") {
          const me = seatOf(view), to = target(view, e.p), dk = rect(deck);
          for (let k = 0; k < Math.min(e.n, 4); k++) { sfx.play("card"); const cw = 60, ch = 86; fly(BACK, { left: dk.left + dk.width / 2 - cw / 2, top: dk.top, width: cw, height: ch }, to, { ms: 380, scaleTo: .6, cls: "ucfly" }); await sleep(140); }
          if (e.pen) floatText(pc2(root, e.p) || disc, `+${e.n} cards!`, "#FF5468"); await sleep(260);
        }
        if (e.t === "win") burst(disc, ["🎉", "⭐", "🏆"], 14);
      }
      paint(s);
      if (!s.over) { const h = s.hands[s.turn]; if (ev.some(e => e.t === "play") && s.hands.some(h => h.length === 1)) { const k = s.hands.findIndex(h => h.length === 1); floatText(pc2(root, k) || disc, "UNO! 🔔", "#E8C766"); sfx.play("coin"); } }
      if (s.over && ev.some(e => e.t === "win")) ctx.finished(s.winner);
      else if (ev.length && ctx.mine(s.turn) && !s.over) sfx.play("turn");
    });
    paint(ctx.state);
    return { push: (s, e) => q.push(s, e), get busy() { return q.busy; }, destroy() { } };
  },
};
