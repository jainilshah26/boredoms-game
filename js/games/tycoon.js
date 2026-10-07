import { esc, $, $$, queue, stripHTML, setStrip, banner, sleep } from "./common.js";
import { sfx, burst, shake, Dice3D, floatText, reduced } from "../fx.js";
import { avatar } from "../avatars.js";

const GROUPS = ["#8B5A2B", "#4FC3F7", "#EC6FA5", "#FF9F43", "#E8453C", "#F2C230"];
const T = [
  { k: "go", n: "GO", e: "🏁" }, { k: "p", n: "Jaipur", g: 0, price: 60, e: "🏰" }, { k: "chance", n: "Chance", e: "🎁" }, { k: "p", n: "Udaipur", g: 0, price: 80, e: "🛶" },
  { k: "p", n: "Goa", g: 1, price: 100, e: "🏖️" }, { k: "rest", n: "Rest Stop", e: "☕" }, { k: "p", n: "Pune", g: 1, price: 110, e: "🌧️" }, { k: "tax", n: "Tax", amt: 100, e: "🧾" },
  { k: "p", n: "Kolkata", g: 2, price: 140, e: "🌉" }, { k: "p", n: "Chennai", g: 2, price: 150, e: "🌴" }, { k: "park", n: "Jackpot", e: "🎰" }, { k: "chance", n: "Chance", e: "🎁" },
  { k: "p", n: "Hyderabad", g: 3, price: 180, e: "🕌" }, { k: "p", n: "Bengaluru", g: 3, price: 200, e: "💻" }, { k: "p", n: "Delhi", g: 4, price: 240, e: "🏛️" }, { k: "wheel", n: "Lucky Wheel", e: "🎡" },
  { k: "p", n: "Mumbai", g: 4, price: 260, e: "🌆" }, { k: "chance", n: "Chance", e: "🎁" }, { k: "p", n: "Taj Mahal", g: 5, price: 300, e: "🕍" }, { k: "p", n: "Gateway", g: 5, price: 350, e: "🚪" },
];
const N = T.length;
const tilePos = i => i === 0 ? [5, 5] : i <= 4 ? [5 - i, 5] : i === 5 ? [0, 5] : i <= 9 ? [0, 5 - (i - 5)] : i === 10 ? [0, 0] : i <= 14 ? [i - 10, 0] : i === 15 ? [5, 0] : [5, i - 15];
const rentOf = (s, i) => { const t = T[i], base = Math.round(t.price * .12), o = s.owner[i]; const mates = T.map((x, j) => x.g === t.g && x.k === "p" ? j : -1).filter(j => j >= 0); return mates.every(j => s.owner[j] === o) ? base * 2 : base; };
const worth = (s, p) => s.cash[p] + Object.entries(s.owner).reduce((t, [i, o]) => t + (o === p ? T[i].price : 0), 0);
const CHANCE = [["Found a lucky coin! +₹100", 100], ["Birthday gift! +₹150", 150], ["Parking ticket −₹60", -60], ["Doctor bills −₹100", -100], ["Won a quiz show! +₹120", 120], ["Chai for everyone −₹40", -40], ["Advance to GO!", "go"], ["Tax refund +₹80", 80]];
const WHEEL = [-120, -60, 60, 120, 250, 100];
const alive = s => s.players.map((_, i) => i).filter(i => s.alive[i]);

function endTurn(s, ev, again) {
  const al = alive(s);
  if (al.length === 1) { s.over = true; s.winner = al[0]; s.turn = -1; s.phase = "over"; ev.push({ t: "win", p: al[0], ms: 600 }); return; }
  if (again && s.alive[s.turn]) { s.phase = "roll"; s.dbl = (s.dbl || 0) + 1; ev.push({ t: "again", p: s.turn }); return; }
  s.dbl = 0; let n = s.turn; do { n = (n + 1) % s.players.length; } while (!s.alive[n]); s.turn = n; s.phase = "roll";
}
function pay(s, ev, from, to, amt, why, i) {
  const paid = Math.min(amt, Math.max(0, s.cash[from]));
  if (s.cash[from] < amt) { // bankrupt: hand everything over
    s.cash[from] -= amt; if (to != null) s.cash[to] += paid; ev.push({ t: "pay", p: from, to, amt: paid, why, i, cash: [...s.cash], ms: 700 });
    s.alive[from] = false; Object.keys(s.owner).forEach(k => { if (s.owner[k] === from) delete s.owner[k]; }); s.cash[from] = 0;
    ev.push({ t: "bankrupt", p: from, cash: [...s.cash], ms: 900 }); return true;
  }
  s.cash[from] -= amt; if (to != null) s.cash[to] += amt; else s.pot += amt;
  ev.push({ t: "pay", p: from, to, amt, why, i, cash: [...s.cash], ms: 650 }); return false;
}
function landOn(s, ev, p, dbl) {
  const i = s.pos[p], t = T[i]; let again = dbl && s.dbl < 2;
  if (t.k === "p") {
    const o = s.owner[i];
    if (o == null) { if (s.cash[p] >= t.price) { s.phase = "buy"; s.buyTile = i; s.msg = `${s.players[p].n} can buy ${t.n} for ₹${t.price}`; s.again = again; return; } s.msg = `${s.players[p].n} can't afford ${t.n}.`; }
    else if (o !== p) { const amt = rentOf(s, i); s.msg = `${s.players[p].n} pays ₹${amt} rent to ${s.players[o].n}`; pay(s, ev, p, o, amt, "rent", i); }
    else s.msg = `${s.players[p].n} is home at ${t.n}.`;
  } else if (t.k === "tax") { s.msg = `${s.players[p].n} pays ₹${t.amt} tax`; pay(s, ev, p, null, t.amt, "tax", i); }
  else if (t.k === "park") { if (s.pot > 0) { const g = s.pot; s.cash[p] += g; s.pot = 0; s.msg = `${s.players[p].n} wins the ₹${g} jackpot! 🎰`; ev.push({ t: "gain", p, amt: g, why: "jackpot", cash: [...s.cash], ms: 800 }); } else s.msg = "Jackpot is empty. Taxes feed it!"; }
  else if (t.k === "chance") {
    const [text, v] = CHANCE[Math.random() * CHANCE.length | 0]; s.msg = `${s.players[p].n}: ${text}`; ev.push({ t: "chance", p, text, ms: 1100 });
    if (v === "go") { const path = []; for (let k = s.pos[p] + 1; k <= N; k++) path.push(k % N); s.pos[p] = 0; s.cash[p] += 200; ev.push({ t: "move", p, path, ms: path.length * 190 + 100 }); ev.push({ t: "gain", p, amt: 200, why: "go", cash: [...s.cash], ms: 600 }); }
    else if (v > 0) { s.cash[p] += v; ev.push({ t: "gain", p, amt: v, why: "chance", cash: [...s.cash], ms: 600 }); }
    else pay(s, ev, p, null, -v, "chance", i);
  } else if (t.k === "wheel") {
    const v = WHEEL[Math.random() * WHEEL.length | 0]; s.msg = `${s.players[p].n} spins the wheel: ${v > 0 ? "+" : "−"}₹${Math.abs(v)}`; ev.push({ t: "wheel", p, v, ms: 1400 });
    if (v > 0) { s.cash[p] += v; ev.push({ t: "gain", p, amt: v, why: "wheel", cash: [...s.cash], ms: 600 }); } else pay(s, ev, p, null, -v, "wheel", i);
  }
  endTurn(s, ev, again);
}

export default {
  id: "tyc", name: "Business Tycoon", min: 2, max: 8,
  init(players) { return { players, cash: players.map(() => 1000), pos: players.map(() => 0), owner: {}, alive: players.map(() => true), turn: 0, phase: "roll", dice: [1, 1], pot: 0, dbl: 0, buyTile: -1, msg: "Roll the dice and build your empire!", over: false, winner: -1 }; },
  act(s, a) {
    if (s.over || s.turn !== a.p) return null; const p = a.p, ev = [];
    if (a.a === "roll" && s.phase === "roll") {
      const d1 = 1 + Math.random() * 6 | 0, d2 = 1 + Math.random() * 6 | 0; s.dice = [d1, d2]; ev.push({ t: "roll", p, d: [d1, d2], ms: 1000 });
      const from = s.pos[p], steps = d1 + d2, path = []; for (let k = 1; k <= steps; k++) path.push((from + k) % N);
      s.pos[p] = path[path.length - 1]; ev.push({ t: "move", p, path, ms: path.length * 190 + 100 });
      if (path.includes(0)) { s.cash[p] += 200; ev.push({ t: "gain", p, amt: 200, why: "go", cash: [...s.cash], ms: 600 }); }
      landOn(s, ev, p, d1 === d2); return ev;
    }
    if (a.a === "buy" && s.phase === "buy") { const i = s.buyTile, t = T[i]; s.cash[p] -= t.price; s.owner[i] = p; s.msg = `${s.players[p].n} bought ${t.n}! 🎉`; ev.push({ t: "buy", p, i, price: t.price, cash: [...s.cash], ms: 800 }); endTurn(s, ev, s.again); return ev; }
    if (a.a === "skip" && s.phase === "buy") { s.msg = `${s.players[p].n} passed on ${T[s.buyTile].n}.`; endTurn(s, ev, s.again); return ev.length ? ev : [{ t: "noop" }]; }
    if (a.a === "fin") { let b = 0; s.players.forEach((_, i) => { if (s.alive[i] && worth(s, i) > worth(s, b)) b = i; }); s.over = true; s.winner = b; s.turn = -1; s.phase = "over"; s.msg = `Richest player: ${s.players[b].n} (₹${worth(s, b)})`; return [{ t: "win", p: b, ms: 600 }]; }
    return null;
  },
  bot(s) {
    if (s.phase === "roll") return { a: "roll" };
    if (s.phase === "buy") { const t = T[s.buyTile]; return s.cash[s.turn] - t.price >= 120 || t.price <= s.cash[s.turn] * .45 ? { a: "buy" } : { a: "skip" }; }
  },
  mount(root, ctx) {
    const P = ctx.players;
    let grid = ""; for (let i = 0; i < N; i++) {
      const t = T[i], [c, r] = tilePos(i), corner = [0, 5, 10, 15].includes(i);
      grid += `<div class="tt ${t.k}${corner ? " corner" : ""}" data-t="${i}" style="grid-column:${c + 1};grid-row:${r + 1}">${t.k === "p" ? `<i class="band" style="background:${GROUPS[t.g]}"></i>` : ""}<span class="te">${t.e}</span><b>${t.n}</b>${t.k === "p" ? `<small>₹${t.price}</small>` : t.k === "tax" ? `<small>−₹${t.amt}</small>` : t.k === "go" ? `<small>+₹200</small>` : ""}<em class="own"></em></div>`;
    }
    root.innerHTML = `<div class="game tyc">${stripHTML(P, P.map(() => "₹1000"))}
      <div class="tboardw"><div class="tgrid">${grid}<div class="tmid"><div class="pot">🎰 Jackpot <b id="pot">₹0</b></div><div class="dicebox two"></div><div class="tlog"></div></div></div><div class="tpawns"></div></div>
      <div class="banner"></div><div class="actions row" id="acts"></div></div>`;
    const tiles = $$(root, ".tt"), pawns = $(root, ".tpawns"), dbox = $(root, ".dicebox");
    const dice = [new Dice3D(dbox, 46), new Dice3D(dbox, 46)];
    const pw = P.map(p => { const d = document.createElement("div"); d.className = "tpawn"; d.innerHTML = `<div class="pin">${avatar(p.av, 30, p.c)}</div>`; pawns.appendChild(d); return d; });
    const shown = { pos: P.map(() => 0), cash: P.map(() => 1000), owner: {}, alive: P.map(() => true) };
    const place = (i, n, ms = 0) => {
      const [c, r] = tilePos(n), mates = P.map((_, k) => k).filter(k => k !== i && shown.pos[k] === n && shown.alive[k]), off = mates.filter(k => k < i).length;
      pw[i].style.transition = ms ? `left ${ms}ms ease-in-out, top ${ms}ms ease-in-out` : "none";
      pw[i].style.left = ((c + .5) / 6 * 100 + (off % 2 ? 1 : -1) * (off ? 2.6 : 0) + (off > 1 ? 1.4 : 0)) + "%"; pw[i].style.top = ((r + .5) / 6 * 100 + (off > 1 ? 2.6 : 0) - 1.5) + "%"; pw[i].style.zIndex = 10 + i; shown.pos[i] = n;
    };
    const owners = () => tiles.forEach((el, i) => { const o = shown.owner[i], e = $(el, ".own"); el.classList.toggle("owned", o != null); el.style.setProperty("--oc", o != null ? P[o].c : "transparent"); e.innerHTML = o != null ? avatar(P[o].av, 18, P[o].c) : ""; });
    const cashInfo = () => P.map((p, i) => shown.alive[i] ? `₹${shown.cash[i]}` : "💀 out");
    const showCash = () => { setStrip(root, ctx.state.turn, cashInfo()); };
    const paint = s => {
      shown.pos = [...s.pos]; shown.cash = [...s.cash]; shown.owner = { ...s.owner }; shown.alive = [...s.alive];
      P.forEach((_, i) => { place(i, s.pos[i]); pw[i].classList.toggle("out", !s.alive[i]); });
      owners(); dice.forEach((d, k) => d.set(s.dice[k], true)); $(root, "#pot").textContent = "₹" + s.pot; $(root, ".tlog").textContent = s.msg;
      setStrip(root, s.turn, cashInfo()); const my = ctx.mine(s.turn) && !s.over, acts = $(root, "#acts");
      if (s.over) { banner(root, `🏆 ${esc(P[s.winner].n)} wins!`, "won"); acts.innerHTML = `<button class="btn" id="again">Play again</button>`; $(root, "#again").onclick = () => ctx.act({ a: "again" }); return; }
      banner(root, my ? (s.phase === "buy" ? `Buy <b>${T[s.buyTile].n}</b> for ₹${T[s.buyTile].price}?` : "Your turn! Roll the dice.") : `${esc(P[s.turn].n)} is playing…`);
      acts.innerHTML = my ? (s.phase === "buy" ? `<button class="btn" id="buy">Buy ₹${T[s.buyTile].price}</button><button class="btn g" id="skip">Skip</button>` : `<button class="btn" id="roll">Roll dice 🎲</button>`) + `<button class="btn g sm" id="fin">Finish game</button>` : `<button class="btn g sm" id="fin" ${ctx.mine(0) || ctx.isHost ? "" : "disabled"}>Finish game</button>`;
      const b = id => $(root, id); if (b("#roll")) b("#roll").onclick = () => { b("#roll").disabled = true; ctx.act({ a: "roll" }); };
      if (b("#buy")) b("#buy").onclick = () => ctx.act({ a: "buy" }); if (b("#skip")) b("#skip").onclick = () => ctx.act({ a: "skip" });
      if (b("#fin")) b("#fin").onclick = () => { if (my) ctx.act({ a: "fin" }); else import("../fx.js").then(m => m.toast("Only the player whose turn it is can finish the game.")); };
    };
    const strip = i => $(root, `.pcell[data-pi="${i}"]`);
    const hop = async (i, n) => { place(i, n, 170); if (!reduced()) pw[i].querySelector(".pin").animate([{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-14px) scale(1.15,.9)" }, { transform: "translateY(0) scale(.92,1.08)" }, { transform: "none" }], { duration: 180 }); sfx.play("hop"); await sleep(185); };
    const q = queue(async (s, ev) => {
      for (const e of ev) {
        if (e.t === "reset") { shown.owner = {}; shown.cash = P.map(() => 1000); shown.pos = P.map(() => 0); shown.alive = P.map(() => true); owners(); P.forEach((_, i) => place(i, 0)); showCash(); }
        if (e.t === "roll") { banner(root, `${esc(P[e.p].n)} is rolling…`); const bt = $(root, "#roll"); if (bt) bt.disabled = true; await Promise.all(dice.map((d, k) => d.roll(e.d[k], 800 + k * 150))); }
        if (e.t === "move") { for (const n of e.path) await hop(e.p, n); }
        if (e.t === "gain") { sfx.play(e.why === "jackpot" ? "win" : "coin"); shown.cash = e.cash; showCash(); floatText(strip(e.p), `+₹${e.amt}`, "#4BE08F"); burst(pw[e.p], ["💰", "✨"], 5); if (e.why === "jackpot") $(root, "#pot").textContent = "₹0"; await sleep(560); }
        if (e.t === "pay") { sfx.play("cash"); shown.cash = e.cash; showCash(); floatText(strip(e.p), `−₹${e.amt}`, "#FF5468"); if (e.to != null) floatText(strip(e.to), `+₹${e.amt}`, "#4BE08F"); else if (e.why !== "rent") { const pot = $(root, "#pot"); pot.textContent = "₹" + (parseInt(pot.textContent.slice(1)) + e.amt); } shake(pw[e.p], 300); await sleep(600); }
        if (e.t === "buy") { sfx.play("up"); shown.owner[e.i] = e.p; shown.cash = e.cash; owners(); showCash(); floatText(strip(e.p), `−₹${e.price}`, "#FF5468"); burst(tiles[e.i], ["🏠", "✨", "⭐"], 8); tiles[e.i].classList.add("bought"); await sleep(700); tiles[e.i].classList.remove("bought"); }
        if (e.t === "chance") { sfx.play("sparkle"); banner(root, `🎁 ${esc(e.text)}`); burst(pw[e.p], ["🎁", "✨"], 6); await sleep(e.ms); }
        if (e.t === "wheel") { sfx.play("sparkle"); banner(root, `🎡 Spinning the wheel…`); const tm = tiles[15]; if (!reduced()) tm.animate([{ transform: "rotate(0)" }, { transform: "rotate(720deg) scale(1.2)" }, { transform: "rotate(1080deg)" }], { duration: 1200, easing: "ease-out" }); await sleep(1250); }
        if (e.t === "bankrupt") { sfx.play("lose"); shown.alive[e.p] = false; shown.cash = e.cash; shown.owner = Object.fromEntries(Object.entries(shown.owner).filter(([, o]) => o !== e.p)); owners(); pw[e.p].classList.add("out"); burst(pw[e.p], ["💸", "😭", "💥"], 8); banner(root, `💀 ${esc(P[e.p].n)} went bankrupt!`); showCash(); await sleep(900); }
        if (e.t === "again") { floatText(pw[e.p], "Doubles! Again", "#E8C766"); sfx.play("coin"); }
        if (e.t === "win") burst($(root, ".tboardw"), ["🎉", "💰", "🏆"], 16);
      }
      paint(s);
      if (s.over && ev.some(e => e.t === "win")) ctx.finished(s.winner);
      else if (ev.length && ctx.mine(s.turn) && !s.over) sfx.play("turn");
    });
    paint(ctx.state);
    return { push: (s, e) => q.push(s, e), get busy() { return q.busy; }, destroy() { } };
  },
};
