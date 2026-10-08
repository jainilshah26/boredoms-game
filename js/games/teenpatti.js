import { esc, $, $$, queue, banner, sleep, rect } from "./common.js";
import { sfx, burst, shake, floatText, fly, reduced, confetti } from "../fx.js";
import { avatar } from "../avatars.js";
import { newDeck, evalHand, cmpHands, strength, RANKNAME, SYM } from "./teenpatti_core.js";

/* Teen Patti with play chips. Blind players bet the stake, players who have seen their cards bet double. */
const START = 1000, BOOT = 10, MAXSTAKE = 160, MAXROUNDS = 8;
const L = s => s.players.length;
const active = s => s.players.map((_, i) => i).filter(i => s.live[i] && !s.folded[i]);
const nextActive = (s, p) => { let n = p; do { n = (n + 1) % L(s); } while (!(s.live[n] && !s.folded[n])); return n; };
const cost = (s, p) => (s.seen[p] ? 2 : 1) * s.stake;
const snap = s => ({ chips: [...s.chips], pot: s.pot, stake: s.stake });

function startRound(s, ev) {
  s.round++; s.live = s.chips.map(c => c >= BOOT);
  let d = s.dealer; do { d = (d + 1) % L(s); } while (!s.live[d]); s.dealer = d;
  const deck = newDeck(); s.hands = s.players.map((_, i) => s.live[i] ? [deck.pop(), deck.pop(), deck.pop()] : []);
  s.folded = s.players.map(() => false); s.seen = s.players.map(() => false); s.reveal = null; s.lastWin = null;
  s.pot = 0; s.live.forEach((l, i) => { if (l) { s.chips[i] -= BOOT; s.pot += BOOT; } });
  s.stake = BOOT; s.turns = 0; s.phase = "bet"; s.turn = nextActive(s, s.dealer);
  s.msg = `Round ${s.round}: everyone put in the ${BOOT} chip boot.`;
  ev.push({ t: "deal", dealer: s.dealer, snap: snap(s), ms: 1500 });
}
function endRound(s, ev, w, reason, names) {
  const amt = s.pot; s.chips[w] += amt; s.pot = 0; s.lastWin = { p: w, amt, reason, name: names ? names[w] : null };
  s.msg = `${s.players[w].n} wins ${amt} chips${reason === "pack" ? " (everyone else packed)" : names ? " with " + names[w] : ""}.`;
  ev.push({ t: "roundEnd", p: w, amt, reason, snap: snap(s), ms: 1400 });
  const playable = s.chips.filter(c => c >= BOOT).length;
  if (s.round >= MAXROUNDS || playable <= 1) {
    let b = 0; s.chips.forEach((c, i) => { if (c > s.chips[b]) b = i; });
    s.over = true; s.phase = "over"; s.winner = b; s.turn = -1; s.msg += ` Game over: ${s.players[b].n} finishes with the most chips (${s.chips[b]}).`; ev.push({ t: "win", p: b, ms: 600 });
  } else { s.phase = "roundEnd"; s.turn = w; }
}
function showdown(s, ev, requester, why) {
  const ids = active(s), hs = {}, names = {}, rev = {};
  ids.forEach(i => { hs[i] = evalHand(s.hands[i]); names[i] = hs[i].name; rev[i] = s.hands[i]; });
  /* best hand wins; if hands tie, the player who asked for the show loses */
  let order = ids.slice(); const k = order.indexOf(requester); if (k >= 0) order = [...order.slice(k + 1), ...order.slice(0, k + 1)];
  let w = order[0]; for (const i of order) if (cmpHands(hs[i], hs[w]) > 0) w = i;
  s.reveal = rev; s.revealNames = names; ev.push({ t: "showdown", ids, requester, why, ms: 1700 });
  endRound(s, ev, w, "show", names);
}
function pay(s, p, amt) { const a = Math.min(Math.max(0, s.chips[p]), amt); s.chips[p] -= a; s.pot += a; return a; }
function afterBet(s, ev, p, short) {
  s.turns++;
  if (short) { s.msg = `${s.players[p].n} is all in. Time for a showdown!`; return showdown(s, ev, p, "allin"); }
  if (s.turns >= 12 * active(s).length) { s.msg = "Table limit reached. Showdown!"; return showdown(s, ev, p, "limit"); }
  s.turn = nextActive(s, p);
}

export default {
  id: "teenpatti", name: "Teen Patti", min: 2, max: 10,
  init(players) {
    const s = { players, chips: players.map(() => START), live: players.map(() => true), dealer: -1, round: 0, maxRounds: MAXROUNDS, hands: players.map(() => []), folded: players.map(() => false), seen: players.map(() => false), pot: 0, stake: BOOT, turns: 0, turn: 0, phase: "bet", reveal: null, revealNames: null, lastWin: null, msg: "", over: false, winner: -1 };
    startRound(s, []); return s;
  },
  act(s, a) {
    if (s.over || s.turn !== a.p) return null; const p = a.p, ev = [], who = s.players[p].n;
    if (s.phase === "roundEnd") { if (a.a !== "next") return null; startRound(s, ev); return ev; }
    if (s.phase !== "bet") return null;
    if (a.a === "see") { if (s.seen[p]) return null; s.seen[p] = true; s.msg = `${who} looked at their cards.`; return [{ t: "see", p, ms: 650 }]; }
    if (a.a === "pack") { s.folded[p] = true; s.msg = `${who} packed.`; ev.push({ t: "pack", p, ms: 600 }); const left = active(s); if (left.length === 1) endRound(s, ev, left[0], "pack"); else { s.turns++; s.turn = nextActive(s, p); } return ev; }
    if (a.a === "chaal") { const c = cost(s, p), paid = pay(s, p, c); s.msg = `${who} plays ${s.seen[p] ? "seen" : "blind"} for ${paid}.`; ev.push({ t: "bet", p, amt: paid, kind: "chaal", snap: snap(s), ms: 750 }); afterBet(s, ev, p, paid < c); return ev; }
    if (a.a === "raise") { if (s.stake >= MAXSTAKE) return null; s.stake *= 2; const c = cost(s, p), paid = pay(s, p, c); s.msg = `${who} raises the stake to ${s.stake}.`; ev.push({ t: "bet", p, amt: paid, kind: "raise", snap: snap(s), ms: 800 }); afterBet(s, ev, p, paid < c); return ev; }
    if (a.a === "show") { if (active(s).length !== 2) return null; const c = cost(s, p), paid = pay(s, p, c); s.msg = `${who} asks for a show.`; ev.push({ t: "bet", p, amt: paid, kind: "show", snap: snap(s), ms: 700 }); showdown(s, ev, p, "show"); return ev; }
    return null;
  },
  bot(s) {
    const p = s.turn;
    if (s.phase === "roundEnd") return { a: "next" };
    const h = evalHand(s.hands[p]), n = active(s).length, x = strength(h) + (Math.random() - .5) * .14, c = cost(s, p);
    if (!s.seen[p]) {
      if (Math.random() < (s.turns >= n ? .7 : .3)) return { a: "see" };
      if (n === 2 && s.turns > 8 && Math.random() < .25) return { a: "show" };
      if (s.stake >= MAXSTAKE / 2 && Math.random() < .25) return { a: "pack" };
      return Math.random() < .12 && s.stake < MAXSTAKE ? { a: "raise" } : { a: "chaal" };
    }
    if (x < .12 || (x < .24 && s.stake > BOOT * 2) || (c > s.chips[p] * .35 && x < .6)) return { a: "pack" };
    if (n === 2 && (x > .5 || s.turns > 10)) return { a: "show" };
    if (x > .78 && s.stake < MAXSTAKE && Math.random() < .5) return { a: "raise" };
    return { a: "chaal" };
  },
  mount(root, ctx) {
    const P = ctx.players, N = P.length, many = N > 6; let S = ctx.state;
    const humans = P.map((p, i) => i).filter(i => !P[i].bot), hot = ctx.local && humans.length > 1; let revealed = -1, dealing = false;
    root.innerHTML = `<div class="game tp">
      <div class="tp-info"><span>Round <b id="rd">1</b></span><span>Boot <b>${BOOT}</b></span><span>Stake <b id="stk">${BOOT}</b></span></div>
      <div class="tp-seats ${many ? "many" : ""}"></div>
      <div class="tp-table"><div class="tp-deck" id="deck"><i></i><i></i><i></i></div><div class="tp-pot"><div class="tp-coins" id="coins"></div><b id="pot">0</b><small>POT</small></div><div class="tp-log" id="log"></div></div>
      <div class="tp-me" id="me"></div><div class="banner"></div><div class="tp-acts" id="acts"></div><div class="cover" id="cover" hidden></div></div>`;
    const seatsEl = $(root, ".tp-seats"), me$ = $(root, "#me"), acts = $(root, "#acts"), cover = $(root, "#cover"), potEl = $(root, "#pot");
    const seatOf = s => hot ? (revealed === s.turn && s.turn >= 0 ? s.turn : -1) : ctx.mySeat;
    const card = (c, cls = "") => `<div class="pc ${cls} ${c.s === "H" || c.s === "D" ? "red" : ""}"><i class="tl"><b>${RANKNAME(c.r)}</b><u>${SYM[c.s]}</u></i><span class="mid">${SYM[c.s]}</span><i class="br"><b>${RANKNAME(c.r)}</b><u>${SYM[c.s]}</u></i></div>`;
    const back = `<div class="pc back"></div>`;
    let nums = null; /* chips/pot/stake while animating */
    const setNums = sn => { nums = sn; potEl.textContent = sn.pot; $(root, "#stk").textContent = sn.stake; $(root, "#coins").innerHTML = "🪙".repeat(Math.min(6, 1 + Math.floor(sn.pot / 60))); $$(root, ".tps .ch").forEach((e, i) => e.textContent = "🪙 " + sn.chips[i]); };
    const seatHTML = (s, i) => {
      const p = P[i], live = s.live[i], fold = s.folded[i], isTurn = s.turn === i && !s.over && s.phase === "bet", rev = s.reveal && s.reveal[i];
      const status = !live ? "Out" : fold ? "Packed" : s.phase === "over" && s.winner === i ? "👑 Champion" : s.seen[i] ? "Seen" : "Blind";
      const minis = dealing || !live ? "" : [0, 1, 2].map(k => rev ? `<i class="mc up ${rev[k].s === "H" || rev[k].s === "D" ? "red" : ""}">${RANKNAME(rev[k].r)}${SYM[rev[k].s]}</i>` : `<i class="mc ${fold ? "gone" : ""}"></i>`).join("");
      const won = s.lastWin && s.lastWin.p === i && s.phase !== "bet";
      return `<div class="tps ${isTurn ? "turn" : ""} ${fold ? "fold" : ""} ${!live ? "out" : ""} ${won ? "won" : ""}" data-si="${i}" style="--pc:${p.c}">${s.dealer === i ? '<em class="dlr" title="Dealer">D</em>' : ""}${avatar(p.av, many ? 30 : 38, p.c)}<b>${esc(p.n)}${p.bot ? " 🤖" : ""}${i === ctx.mySeat && !hot ? " (you)" : ""}</b><span class="ch">🪙 ${s.chips[i]}</span><span class="st ${status.toLowerCase().replace(/[^a-z]/g, "")}">${status}</span><span class="mcs">${minis}</span>${rev ? `<small class="hn">${esc(s.revealNames[i])}</small>` : ""}</div>`;
    };
    const myCards = (s, me) => {
      if (me < 0) return `<p class="tp-note">${hot ? "Hands are hidden." : "You're watching 👀"}</p>`;
      if (!s.live[me]) return `<p class="tp-note">You're out of chips. Watch the rest of the game!</p>`;
      const h = s.hands[me], seen = s.seen[me] || (s.reveal && s.reveal[me]), name = seen ? evalHand(h).name : "";
      return `<div class="pcs ${s.folded[me] ? "fold" : ""}">${h.map((c, i) => `<div class="pcw ${seen ? "up" : ""}" data-i="${i}" style="--i:${i}"><div class="pcf">${back}${card(c, "front")}</div></div>`).join("")}</div><div class="hname">${seen ? esc(name) : "Blind: tap See cards to look"}</div>`;
    };
    function paint(s) {
      S = s; const me = seatOf(s); setNums({ chips: s.chips, pot: s.pot, stake: s.stake });
      $(root, "#rd").textContent = `${Math.min(s.round, MAXROUNDS)}/${MAXROUNDS}`; $(root, "#log").textContent = s.msg || "";
      seatsEl.innerHTML = P.map((_, i) => seatHTML(s, i)).join(""); me$.innerHTML = dealing ? "" : myCards(s, me);
      const my = ctx.mine(s.turn) && !s.over && me === s.turn;
      if (s.over) { banner(root, `🏆 ${esc(P[s.winner].n)} wins the game!`, "won"); acts.innerHTML = `<button class="btn" id="again">Play again</button>`; $(root, "#again").onclick = () => ctx.act({ a: "again" }); }
      else if (s.phase === "roundEnd") { banner(root, my ? "You won the round! 🎉" : `${esc(P[s.turn].n)} won the round`); acts.innerHTML = my ? `<button class="btn" id="nx">Deal next round</button>` : `<p class="tp-note">Waiting for ${esc(P[s.turn].n)} to deal…</p>`; if (my) $(root, "#nx").onclick = () => ctx.act({ a: "next" }); }
      else {
        const c = cost(s, s.turn), raiseOk = s.stake < MAXSTAKE, two = active(s).length === 2;
        banner(root, my ? (s.seen[s.turn] ? "Your move. You've seen your cards." : "Your move. You're playing blind.") : `${esc(P[s.turn].n)} is deciding…`);
        acts.innerHTML = my ? `<div class="tp-row"><button class="btn c" data-a="pack">Pack</button><button class="btn" data-a="chaal"><small>${s.seen[s.turn] ? "Seen" : "Blind"}</small>Chaal ${c}</button><button class="btn" data-a="raise" ${raiseOk ? "" : "disabled"}><small>Stake ×2</small>Raise ${(s.seen[s.turn] ? 2 : 1) * s.stake * 2}</button></div><div class="tp-row">${s.seen[s.turn] ? "" : `<button class="btn g" data-a="see">👁 See cards</button>`}${two ? `<button class="btn g" data-a="show">Show ${c}</button>` : ""}</div>` : "";
        $$(acts, "[data-a]").forEach(b => b.onclick = () => { if (b.dataset.a === "see") { const w = $$(me$, ".pcw"); w.forEach(x => x.classList.add("up")); sfx.play("card"); } ctx.act({ a: b.dataset.a }); });
      }
      if (hot && !s.over && s.turn >= 0 && !P[s.turn].bot && revealed !== s.turn && s.phase !== "roundEnd") { cover.hidden = false; cover.innerHTML = `<div class="cv">${avatar(P[s.turn].av, 72, P[s.turn].c)}<h2>Pass the phone to ${esc(P[s.turn].n)}</h2><p>Hide the screen from everyone else.</p><button class="btn" id="reveal">I'm ${esc(P[s.turn].n)}, show my turn</button><button class="btn g sm" id="cvbk">Leave game</button></div>`; $(cover, "#cvbk").onclick = () => document.querySelector("#bk").click(); $(cover, "#reveal").onclick = () => { revealed = s.turn; cover.hidden = true; paint(S); }; }
      else if (!hot || revealed === s.turn || s.phase === "roundEnd" || s.over) cover.hidden = true;
    }
    const seat = i => $(root, `.tps[data-si="${i}"]`), seatAv = i => { const e = seat(i); return e && (e.querySelector(".avatar") || e); };
    const q = queue(async (s, ev) => {
      for (const e of ev) {
        if (e.t === "deal") {
          dealing = true; setNums(e.snap); seatsEl.innerHTML = P.map((_, i) => seatHTML({ ...s, reveal: null }, i)).join(""); me$.innerHTML = ""; $(root, "#rd").textContent = `${Math.min(s.round, MAXROUNDS)}/${MAXROUNDS}`;
          const deck = rect($(root, "#deck")), w = 42, h = 60; let n = 0;
          for (let k = 0; k < 3; k++) for (let i = 0; i < N; i++) { if (!s.live[i]) continue; const at = seatAv(i); if (!at) continue; sfx.play("card"); fly(back, { left: deck.left + deck.width / 2 - w / 2, top: deck.top, width: w, height: h }, rect(at), { ms: 380, scaleTo: .5, cls: "ucfly" }); if (++n % 2 === 0) await sleep(55); }
          await sleep(450); dealing = false;
        }
        if (e.t === "see") { sfx.play("card"); const el = seat(e.p); if (el) { floatText(el, "👁 Seen", "#E8C766"); } if (e.p === seatOf(S) || ctx.mySeat === e.p) { $$(me$, ".pcw").forEach(x => x.classList.add("up")); } await sleep(400); }
        if (e.t === "bet") { sfx.play("cash"); setNums(e.snap); const el = seatAv(e.p), pot = rect($(root, ".tp-pot")); if (el) { fly("🪙", rect(el), pot, { ms: 420, cls: "chipfly" }); floatText(el, `${e.kind === "raise" ? "Raise " : e.kind === "show" ? "Show " : ""}−${e.amt}`, "#FF8A96"); } await sleep(520); }
        if (e.t === "pack") { sfx.play("bonk"); const el = seat(e.p); if (el) { el.classList.add("fold"); floatText(el, "Pack", "#FF8A96"); } await sleep(450); }
        if (e.t === "showdown") { sfx.play("sparkle"); banner(root, "🂠 Showdown!"); e.ids.forEach(i => { const el = seat(i); if (el && s.reveal[i]) { $(el, ".mcs").innerHTML = s.reveal[i].map(c => `<i class="mc up ${c.s === "H" || c.s === "D" ? "red" : ""}">${RANKNAME(c.r)}${SYM[c.s]}</i>`).join(""); } }); const mv = ctx.mySeat; if (mv >= 0 && s.reveal[mv]) $$(me$, ".pcw").forEach(x => x.classList.add("up")); await sleep(1100); }
        if (e.t === "roundEnd") { setNums(e.snap); const el = seatAv(e.p), pot = rect($(root, ".tp-pot")); sfx.play(e.p === ctx.mySeat ? "win" : "coin"); if (el) { for (let k = 0; k < 4; k++) fly("🪙", pot, rect(el), { ms: 520, cls: "chipfly" }); burst(el, ["🪙", "✨", "⭐"], 8); floatText(el, `+${e.amt}`, "#4BE08F"); } await sleep(700); }
        if (e.t === "win") { burst($(root, ".tp-table"), ["🎉", "🪙", "🏆"], 14); }
        if (e.t === "reset") { revealed = -1; }
      }
      paint(s);
      if (s.over && ev.some(e => e.t === "win")) ctx.finished(s.winner);
      else if (ev.length && ctx.mine(s.turn) && !s.over) sfx.play("turn");
    });
    /* the first round is dealt when the game opens: show the deal */
    if (S.round === 1 && S.turns === 0 && S.phase === "bet") q.push(S, [{ t: "deal", snap: snap(S), ms: 0 }]); else paint(S);
    return { push: (s, e) => q.push(s, e), get busy() { return q.busy; }, destroy() { } };
  },
};
