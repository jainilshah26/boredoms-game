import { esc, $, $$, queue, stripHTML, setStrip, banner, sleep } from "./common.js";
import { sfx, burst, shake, Dice3D, floatText, reduced, toast } from "../fx.js";
import { avatar } from "../avatars.js";

/* A world tour of 30 UNESCO World Heritage Sites, three per colour set. */
const GROUPS = [["Africa", "#8B5A2B"], ["Middle East", "#4FC3F7"], ["South Asia", "#EC6FA5"], ["East Asia", "#FF9F43"], ["South-East Asia & Oceania", "#E8453C"], ["Southern Europe", "#F2C230"], ["Western Europe", "#2EBB77"], ["Northern & Eastern Europe", "#14AEC2"], ["South America", "#5B6CFF"], ["North America", "#9B59D8"]];
const P = (n, f, c, e, g, price) => ({ k: "p", n, f, c, e, g, price });
const T = [
  { k: "go", n: "GO", e: "🏁", d: "Collect ₹200 every time you pass." },
  P("Pyramids of Giza", "🇪🇬", "Egypt", "🔺", 0, 60), P("Victoria Falls", "🇿🇼", "Zimbabwe & Zambia", "🌊", 0, 60),
  { k: "tax", n: "Income Tax", e: "🧾", amt: 150, d: "Pay ₹150. It goes into the Jackpot." },
  P("Serengeti", "🇹🇿", "Tanzania", "🦁", 0, 80),
  { k: "chance", n: "Chance", e: "🎁", d: "Draw a surprise card." },
  P("Petra", "🇯🇴", "Jordan", "🏜️", 1, 100), P("Hagia Sophia", "🇹🇷", "Türkiye", "🕌", 1, 100), P("Persepolis", "🇮🇷", "Iran", "🏛️", 1, 120),
  P("Sigiriya", "🇱🇰", "Sri Lanka", "🪨", 2, 140),
  { k: "rest", n: "Rest Stop", e: "☕", d: "Take a breather. Nothing happens." },
  P("Bagan", "🇲🇲", "Myanmar", "🛕", 2, 140), P("Taj Mahal", "🇮🇳", "India", "🕌", 2, 160),
  P("Great Wall", "🇨🇳", "China", "🏯", 3, 180), P("Himeji Castle", "🇯🇵", "Japan", "🏯", 3, 180),
  { k: "chance", n: "Chance", e: "🎁", d: "Draw a surprise card." },
  P("Gyeongju", "🇰🇷", "South Korea", "⛩️", 3, 200),
  P("Angkor Wat", "🇰🇭", "Cambodia", "🛕", 4, 220), P("Borobudur", "🇮🇩", "Indonesia", "🗿", 4, 220), P("Great Barrier Reef", "🇦🇺", "Australia", "🐠", 4, 240),
  { k: "park", n: "Jackpot", e: "🎰", d: "Collect everything that has piled up from taxes." },
  P("Colosseum", "🇮🇹", "Italy", "🏟️", 5, 260), P("Acropolis", "🇬🇷", "Greece", "🏛️", 5, 260), P("Alhambra", "🇪🇸", "Spain", "🏰", 5, 280),
  P("Versailles", "🇫🇷", "France", "👑", 6, 300),
  { k: "chance", n: "Chance", e: "🎁", d: "Draw a surprise card." },
  P("Stonehenge", "🇬🇧", "United Kingdom", "🪨", 6, 300), P("Cologne Cathedral", "🇩🇪", "Germany", "⛪", 6, 320),
  P("Kremlin & Red Square", "🇷🇺", "Russia", "🧅", 7, 340), P("Bryggen", "🇳🇴", "Norway", "🏘️", 7, 340),
  { k: "wheel", n: "Lucky Wheel", e: "🎡", d: "Spin for a prize or a penalty." },
  P("Hallstatt", "🇦🇹", "Austria", "🏔️", 7, 360),
  P("Machu Picchu", "🇵🇪", "Peru", "⛰️", 8, 380), P("Galápagos Islands", "🇪🇨", "Ecuador", "🐢", 8, 380),
  { k: "tax", n: "Luxury Tax", e: "💎", amt: 200, d: "Pay ₹200. It goes into the Jackpot." },
  P("Iguazú Falls", "🇦🇷", "Argentina", "💦", 8, 400),
  { k: "chance", n: "Chance", e: "🎁", d: "Draw a surprise card." },
  P("Chichén Itzá", "🇲🇽", "Mexico", "🗿", 9, 420), P("Statue of Liberty", "🇺🇸", "United States", "🗽", 9, 450), P("Grand Canyon", "🇺🇸", "United States", "🏞️", 9, 500),
];
const N = T.length, GO = 200, START = 1500;
const maxRounds = n => n > 6 ? 24 : 30; /* big tables get a shorter clock so a game stays around half an hour */
const PROPS = T.map((t, i) => t.k === "p" ? i : -1).filter(i => i >= 0);
const tilePos = i => i === 0 ? [10, 10] : i < 10 ? [10 - i, 10] : i === 10 ? [0, 10] : i < 20 ? [0, 10 - (i - 10)] : i === 20 ? [0, 0] : i < 30 ? [i - 20, 0] : i === 30 ? [10, 0] : [10, i - 30];
const baseRent = t => Math.max(5, Math.round(t.price * .2 / 5) * 5);
const mates = i => T.map((x, j) => x.k === "p" && x.g === T[i].g ? j : -1).filter(j => j >= 0);
const hasSet = (s, i) => mates(i).every(j => s.owner[j] === s.owner[i]);
const rentOf = (s, i) => baseRent(T[i]) * (hasSet(s, i) ? 2 : 1);
const worth = (s, p) => s.cash[p] + Object.entries(s.owner).reduce((t, [i, o]) => t + (o === p ? T[i].price : 0), 0);
const CHANCE = [["Found a lucky coin! +₹150", 150], ["Birthday gift! +₹200", 200], ["Parking ticket −₹80", -80], ["Doctor bills −₹150", -150], ["Won a quiz show! +₹180", 180], ["Chai for everyone −₹60", -60], ["Advance to GO!", "go"], ["Tax refund +₹100", 100], ["A travel agent flies you to a wonder!", "warp"], ["Sold a souvenir stall +₹120", 120]];
const WHEEL = [-200, -100, 100, 200, 400, 150];
const alive = s => s.players.map((_, i) => i).filter(i => s.alive[i]);

function finish(s, ev, why) {
  let b = 0; s.players.forEach((_, i) => { if (s.alive[i] && worth(s, i) > worth(s, b)) b = i; });
  s.over = true; s.winner = b; s.turn = -1; s.phase = "over"; s.msg = `${why} Richest: ${s.players[b].n} (₹${worth(s, b)})`; ev.push({ t: "win", p: b, ms: 600 });
}
function endTurn(s, ev, again) {
  const al = alive(s);
  if (al.length === 1) { s.over = true; s.winner = al[0]; s.turn = -1; s.phase = "over"; ev.push({ t: "win", p: al[0], ms: 600 }); return; }
  if (again && s.alive[s.turn]) { s.phase = "roll"; s.dbl = (s.dbl || 0) + 1; ev.push({ t: "again", p: s.turn }); return; }
  s.dbl = 0; s.tc = (s.tc || 0) + 1; if (s.tc >= al.length * maxRounds(s.players.length)) return finish(s, ev, `${maxRounds(s.players.length)} rounds are up!`);
  let n = s.turn; do { n = (n + 1) % s.players.length; } while (!s.alive[n]); s.turn = n; s.phase = "roll";
}
function pay(s, ev, from, to, amt, why, i) {
  const paid = Math.min(amt, Math.max(0, s.cash[from]));
  if (s.cash[from] < amt) { // bankrupt: hand everything over
    s.cash[from] -= amt; if (to != null) s.cash[to] += paid; ev.push({ t: "pay", p: from, to, amt: paid, why, i, cash: [...s.cash], ms: 700 });
    s.alive[from] = false; Object.keys(s.owner).forEach(k => { if (s.owner[k] === from) delete s.owner[k]; }); s.cash[from] = 0;
    ev.push({ t: "bankrupt", p: from, cash: [...s.cash], owner: { ...s.owner }, ms: 900 }); return true;
  }
  s.cash[from] -= amt; if (to != null) s.cash[to] += amt; else s.pot += amt;
  ev.push({ t: "pay", p: from, to, amt, why, i, cash: [...s.cash], ms: 650 }); return false;
}
function landOn(s, ev, p, dbl) {
  const i = s.pos[p], t = T[i], again = dbl && s.dbl < 2, who = s.players[p].n;
  if (t.k === "p") {
    const o = s.owner[i];
    if (o == null) { if (s.cash[p] >= t.price) { s.phase = "buy"; s.buyTile = i; s.msg = `${who} can buy ${t.n} for ₹${t.price}`; s.again = again; return; } s.msg = `${who} can't afford ${t.n}.`; }
    else if (o !== p) { const amt = rentOf(s, i); s.msg = `${who} pays ₹${amt} rent to ${s.players[o].n} for visiting ${t.n}`; pay(s, ev, p, o, amt, "rent", i); }
    else s.msg = `${who} is home at ${t.n}.`;
  } else if (t.k === "tax") { s.msg = `${who} pays ₹${t.amt} tax`; pay(s, ev, p, null, t.amt, "tax", i); }
  else if (t.k === "park") { if (s.pot > 0) { const g = s.pot; s.cash[p] += g; s.pot = 0; s.msg = `${who} wins the ₹${g} jackpot! 🎰`; ev.push({ t: "gain", p, amt: g, why: "jackpot", cash: [...s.cash], ms: 800 }); } else s.msg = "Jackpot is empty. Taxes feed it!"; }
  else if (t.k === "chance") {
    const [text, v] = CHANCE[Math.random() * CHANCE.length | 0]; s.msg = `${who}: ${text}`; ev.push({ t: "chance", p, text, ms: 1100 });
    if (v === "go") { const path = []; for (let k = s.pos[p] + 1; k <= N; k++) path.push(k % N); s.pos[p] = 0; s.cash[p] += GO; ev.push({ t: "move", p, path, ms: path.length * 140 + 100 }); ev.push({ t: "gain", p, amt: GO, why: "go", cash: [...s.cash], ms: 600 }); }
    else if (v === "warp") { const to = PROPS[Math.random() * PROPS.length | 0]; s.pos[p] = to; ev.push({ t: "warp", p, to, ms: 1000 }); return landOn(s, ev, p, dbl); }
    else if (v > 0) { s.cash[p] += v; ev.push({ t: "gain", p, amt: v, why: "chance", cash: [...s.cash], ms: 600 }); }
    else pay(s, ev, p, null, -v, "chance", i);
  } else if (t.k === "wheel") {
    const v = WHEEL[Math.random() * WHEEL.length | 0]; s.msg = `${who} spins the wheel: ${v > 0 ? "+" : "−"}₹${Math.abs(v)}`; ev.push({ t: "wheel", p, v, ms: 1400 });
    if (v > 0) { s.cash[p] += v; ev.push({ t: "gain", p, amt: v, why: "wheel", cash: [...s.cash], ms: 600 }); } else pay(s, ev, p, null, -v, "wheel", i);
  }
  endTurn(s, ev, again);
}

export default {
  id: "tyc", name: "Business Tycoon", min: 2, max: 10,
  init(players) { return { players, cash: players.map(() => START), pos: players.map(() => 0), owner: {}, alive: players.map(() => true), turn: 0, phase: "roll", dice: [1, 1], pot: 0, dbl: 0, tc: 0, buyTile: -1, msg: "Roll the dice and collect the wonders of the world!", over: false, winner: -1 }; },
  act(s, a) {
    if (s.over || s.turn !== a.p) return null; const p = a.p, ev = [];
    if (a.a === "roll" && s.phase === "roll") {
      const d1 = 1 + Math.random() * 6 | 0, d2 = 1 + Math.random() * 6 | 0; s.dice = [d1, d2]; ev.push({ t: "roll", p, d: [d1, d2], ms: 1000 });
      const from = s.pos[p], steps = d1 + d2, path = []; for (let k = 1; k <= steps; k++) path.push((from + k) % N);
      s.pos[p] = path[path.length - 1]; ev.push({ t: "move", p, path, ms: path.length * 140 + 100 });
      if (path.includes(0)) { s.cash[p] += GO; ev.push({ t: "gain", p, amt: GO, why: "go", cash: [...s.cash], ms: 600 }); }
      landOn(s, ev, p, d1 === d2); return ev;
    }
    if (a.a === "buy" && s.phase === "buy") { const i = s.buyTile, t = T[i]; s.cash[p] -= t.price; s.owner[i] = p; s.msg = `${s.players[p].n} bought ${t.n}! 🎉`; ev.push({ t: "buy", p, i, price: t.price, cash: [...s.cash], ms: 800 }); endTurn(s, ev, s.again); return ev; }
    if (a.a === "skip" && s.phase === "buy") { s.msg = `${s.players[p].n} passed on ${T[s.buyTile].n}.`; endTurn(s, ev, s.again); return ev.length ? ev : [{ t: "noop" }]; }
    if (a.a === "fin") { finish(s, ev, "Game finished!"); return ev; }
    return null;
  },
  bot(s) {
    if (s.phase === "roll") return { a: "roll" };
    if (s.phase === "buy") { const t = T[s.buyTile], c = s.cash[s.turn], set = mates(s.buyTile).some(j => s.owner[j] === s.turn); return c - t.price >= (set ? 40 : 220) || t.price <= c * .4 ? { a: "buy" } : { a: "skip" }; }
  },
  mount(root, ctx) {
    const PL = ctx.players;
    let grid = ""; for (let i = 0; i < N; i++) {
      const t = T[i], [c, r] = tilePos(i), corner = i % 10 === 0;
      grid += `<button class="tt ${t.k}${corner ? " corner" : ""}" data-t="${i}" aria-label="${esc(t.n)}${t.price ? ", ₹" + t.price : ""}" style="grid-column:${c + 1};grid-row:${r + 1}">${t.k === "p" ? `<i class="band" style="background:${GROUPS[t.g][1]}"></i>` : ""}<span class="te">${t.k === "p" ? t.f : t.e}</span><small>${t.k === "p" ? "₹" + t.price : t.k === "tax" ? "−₹" + t.amt : t.k === "go" ? "+₹" + GO : ""}</small><em class="own"></em></button>`;
    }
    root.innerHTML = `<div class="game tyc">${stripHTML(PL, PL.map(() => "₹" + START))}
      <div class="tboardw"><div class="tgrid">${grid}<div class="tmid"><div class="tinfo" id="info"></div><div class="tmrow"><div class="dicebox two"></div><div class="pot">🎰 Jackpot<b id="pot">₹0</b></div></div><div class="tlog"></div></div></div><div class="tpawns"></div></div>
      <div class="banner"></div><div class="actions row" id="acts"></div></div>`;
    const tiles = $$(root, ".tt"), pawns = $(root, ".tpawns"), dbox = $(root, ".dicebox"), info = $(root, "#info");
    const dice = [new Dice3D(dbox, 40), new Dice3D(dbox, 40)];
    const pw = PL.map(p => { const d = document.createElement("div"); d.className = "tpawn"; d.innerHTML = `<div class="pin">${avatar(p.av, 26, p.c)}</div>`; pawns.appendChild(d); return d; });
    const shown = { pos: PL.map(() => 0), cash: PL.map(() => START), owner: {}, alive: PL.map(() => true) };
    const SIZE = 11;
    const place = (i, n, ms = 0) => {
      const [c, r] = tilePos(n), group = PL.map((_, k) => k).filter(k => shown.alive[k] && (k === i || shown.pos[k] === n)), off = group.indexOf(i), m = group.length;
      const cols = m > 6 ? 4 : m > 2 ? 3 : m, dx = m > 1 ? ((off % cols) - (cols - 1) / 2) * 2.3 : 0, dy = m > 1 ? ((off / cols | 0) - (Math.ceil(m / cols) - 1) / 2) * 2.6 : 0;
      pw[i].style.transition = ms ? `left ${ms}ms ease-in-out, top ${ms}ms ease-in-out` : "none";
      pw[i].style.left = ((c + .5) / SIZE * 100 + dx) + "%"; pw[i].style.top = ((r + .5) / SIZE * 100 + dy - 1) + "%"; pw[i].style.zIndex = 10 + i; shown.pos[i] = n;
    };
    const relayout = () => PL.forEach((_, k) => place(k, shown.pos[k]));
    const owners = () => tiles.forEach((el, i) => { const o = shown.owner[i], e = $(el, ".own"); el.classList.toggle("owned", o != null); el.style.setProperty("--oc", o != null ? PL[o].c : "transparent"); e.innerHTML = o != null ? avatar(PL[o].av, 16, PL[o].c) : ""; });
    const cashInfo = () => PL.map((p, i) => shown.alive[i] ? `₹${shown.cash[i]}` : "💀 out");
    const showCash = () => setStrip(root, ctx.state.turn, cashInfo());
    /* the card in the middle explains whichever square you're on (or tap any square) */
    let infoFor = 0;
    const showInfo = (i, owner = shown.owner) => {
      infoFor = i; const t = T[i], o = owner[i]; tiles.forEach((el, k) => el.classList.toggle("focus", k === i));
      if (t.k === "p") {
        const full = o != null && mates(i).every(j => owner[j] === o), rent = baseRent(t);
        info.innerHTML = `<div class="ic" style="--gc:${GROUPS[t.g][1]}"><i class="icband"></i><div class="ie">${t.e}</div><div class="ib"><b>${esc(t.n)}</b><span>${t.f} ${esc(t.c)}</span><span class="grp">${esc(GROUPS[t.g][0])} set</span></div><div class="ip"><span>Price <b>₹${t.price}</b></span><span>Rent <b>₹${rent}</b><small>₹${rent * 2} with full set</small></span><span class="own2">${o != null ? `${avatar(PL[o].av, 18, PL[o].c)} ${esc(PL[o].n)}${full ? " · full set ✓" : ""}` : "For sale"}</span></div></div>`;
      } else info.innerHTML = `<div class="ic plain"><div class="ie">${t.e}</div><div class="ib"><b>${esc(t.n)}</b><span>${esc(t.d || "")}</span></div></div>`;
    };
    tiles.forEach((el, i) => el.onclick = () => { sfx.play("tap"); showInfo(i); });
    const paint = s => {
      shown.pos = [...s.pos]; shown.cash = [...s.cash]; shown.owner = { ...s.owner }; shown.alive = [...s.alive];
      PL.forEach((_, i) => { place(i, s.pos[i]); pw[i].classList.toggle("out", !s.alive[i]); });
      owners(); dice.forEach((d, k) => d.set(s.dice[k], true)); $(root, "#pot").textContent = "₹" + s.pot;
      $(root, ".tlog").textContent = s.msg + `  ·  Round ${Math.min(maxRounds(PL.length), Math.floor((s.tc || 0) / Math.max(1, s.alive.filter(Boolean).length)) + 1)}/${maxRounds(PL.length)}`;
      showInfo(s.over ? s.pos[s.winner] : s.pos[s.turn]); setStrip(root, s.turn, cashInfo());
      const my = ctx.mine(s.turn) && !s.over, acts = $(root, "#acts");
      if (s.over) { banner(root, `🏆 ${esc(PL[s.winner].n)} wins!`, "won"); acts.innerHTML = `<button class="btn" id="again">Play again</button>`; $(root, "#again").onclick = () => ctx.act({ a: "again" }); return; }
      banner(root, my ? (s.phase === "buy" ? `Buy <b>${esc(T[s.buyTile].n)}</b> for ₹${T[s.buyTile].price}?` : "Your turn! Roll the dice.") : `${esc(PL[s.turn].n)} is playing…`);
      acts.innerHTML = my ? (s.phase === "buy" ? `<button class="btn" id="buy">Buy ₹${T[s.buyTile].price}</button><button class="btn g" id="skip">Skip</button>` : `<button class="btn" id="roll">Roll dice 🎲</button>`) + `<button class="btn g sm" id="fin">Finish game</button>` : `<button class="btn g sm" id="fin">Finish game</button>`;
      const b = id => $(root, id); if (b("#roll")) b("#roll").onclick = () => { b("#roll").disabled = true; ctx.act({ a: "roll" }); };
      if (b("#buy")) b("#buy").onclick = () => ctx.act({ a: "buy" }); if (b("#skip")) b("#skip").onclick = () => ctx.act({ a: "skip" });
      if (b("#fin")) b("#fin").onclick = () => { if (my) ctx.act({ a: "fin" }); else toast("Only the player whose turn it is can finish the game."); };
    };
    const strip = i => $(root, `.pcell[data-pi="${i}"]`);
    const hop = async (i, n, ms) => { place(i, n, ms); if (!reduced()) pw[i].querySelector(".pin").animate([{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-12px) scale(1.15,.9)" }, { transform: "translateY(0) scale(.92,1.08)" }, { transform: "none" }], { duration: ms + 10 }); sfx.play("hop"); await sleep(ms + 5); };
    const q = queue(async (s, ev) => {
      for (const e of ev) {
        if (e.t === "reset") { shown.owner = {}; shown.cash = PL.map(() => START); shown.pos = PL.map(() => 0); shown.alive = PL.map(() => true); owners(); relayout(); showCash(); }
        if (e.t === "roll") { banner(root, `${esc(PL[e.p].n)} is rolling…`); const bt = $(root, "#roll"); if (bt) bt.disabled = true; await Promise.all(dice.map((d, k) => d.roll(e.d[k], 800 + k * 150))); banner(root, `${esc(PL[e.p].n)} rolled <b>${e.d[0]} + ${e.d[1]} = ${e.d[0] + e.d[1]}</b>`); }
        if (e.t === "move") { for (const n of e.path) { await hop(e.p, n, 130); relayout(); } showInfo(e.path[e.path.length - 1]); }
        if (e.t === "warp") { sfx.play("sparkle"); burst(pw[e.p], ["✈️", "✨", "🌍"], 8); place(e.p, e.to, 900); await sleep(950); relayout(); burst(pw[e.p], ["🌍", "✨"], 6); showInfo(e.to); }
        if (e.t === "gain") { sfx.play(e.why === "jackpot" ? "win" : "coin"); shown.cash = e.cash; showCash(); floatText(strip(e.p), `+₹${e.amt}`, "#4BE08F"); burst(pw[e.p], ["💰", "✨"], 5); if (e.why === "jackpot") $(root, "#pot").textContent = "₹0"; await sleep(560); }
        if (e.t === "pay") { sfx.play("cash"); shown.cash = e.cash; showCash(); floatText(strip(e.p), `−₹${e.amt}`, "#FF5468"); if (e.to != null) floatText(strip(e.to), `+₹${e.amt}`, "#4BE08F"); else if (e.why !== "rent") { const pot = $(root, "#pot"); pot.textContent = "₹" + (parseInt(pot.textContent.slice(1)) + e.amt); } shake(pw[e.p], 300); await sleep(600); }
        if (e.t === "buy") { sfx.play("up"); shown.owner[e.i] = e.p; shown.cash = e.cash; owners(); showInfo(e.i); showCash(); floatText(strip(e.p), `−₹${e.price}`, "#FF5468"); burst(tiles[e.i], ["🏠", "✨", "⭐"], 8); tiles[e.i].classList.add("bought"); await sleep(700); tiles[e.i].classList.remove("bought"); }
        if (e.t === "chance") { sfx.play("sparkle"); banner(root, `🎁 ${esc(e.text)}`); burst(pw[e.p], ["🎁", "✨"], 6); await sleep(e.ms); }
        if (e.t === "wheel") { sfx.play("sparkle"); banner(root, `🎡 Spinning the wheel…`); const tm = tiles[30]; if (!reduced()) tm.animate([{ transform: "rotate(0)" }, { transform: "rotate(720deg) scale(1.3)" }, { transform: "rotate(1080deg)" }], { duration: 1200, easing: "ease-out" }); await sleep(1250); }
        if (e.t === "bankrupt") { sfx.play("lose"); shown.alive[e.p] = false; shown.cash = e.cash; shown.owner = e.owner || shown.owner; owners(); pw[e.p].classList.add("out"); relayout(); burst(pw[e.p], ["💸", "😭", "💥"], 8); banner(root, `💀 ${esc(PL[e.p].n)} went bankrupt!`); showCash(); await sleep(900); }
        if (e.t === "again") { floatText(pw[e.p], "Doubles! Again", "#E8C766"); sfx.play("coin"); }
        if (e.t === "win") burst($(root, ".tboardw"), ["🎉", "🌍", "🏆"], 16);
      }
      paint(s);
      if (s.over && ev.some(e => e.t === "win")) ctx.finished(s.winner);
      else if (ev.length && ctx.mine(s.turn) && !s.over) sfx.play("turn");
    });
    paint(ctx.state);
    return { push: (s, e) => q.push(s, e), get busy() { return q.busy; }, destroy() { } };
  },
};
