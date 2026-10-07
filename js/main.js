import { AVATARS, avatar, photoToAvatar } from "./avatars.js";
import { sfx, setSound, store, toast, buzz, confetti, floatEmoji, burst, sleep } from "./fx.js";
import { api, cloud, Net, PID, COLORS, hostRoom, joinRoom, leaveRoom, closeRoom, startGame, endRound, send, live } from "./net.js";
import { GAME, LIST, META, ICON } from "./games/index.js";
import { esc } from "./games/common.js";

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const app = $("#app");
const S = { me: null, tab: "play", view: null, ctx: null, over: false, intro: true };
const MODES = [["Duo", 2, "2 players"], ["Trio", 3, "3 players"], ["Squad", 4, "Up to 4"], ["Party", 10, "Up to 10"]];
const THEMES = ["felt", "velvet", "midnight"], THEME_NAMES = { felt: "Felt", velvet: "Velvet", midnight: "Midnight" };
const setTheme = n => { document.documentElement.dataset.theme = n; store.set("bf_theme", n); };
setTheme(THEMES.includes(store.get("bf_theme")) ? store.get("bf_theme") : "felt");
const myAv = () => S.me ? S.me.avatar : "cat";
const SND_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9a4 4 0 010 6M19 6.5a8 8 0 010 11"/></svg>`;
const SND_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>`;
const TH_ICO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 010 17z" fill="currentColor"/></svg>`;
const LOGO = `<div class="sign" role="img" aria-label="Boredoms Fun"><i class="bulbs"></i><span class="s-top"><span>♠&#xFE0E;</span> <span class="rd">♥&#xFE0E;</span> <span class="rd">♦&#xFE0E;</span> <span>♣&#xFE0E;</span></span><span class="s-a">Boredoms</span><span class="s-b">FUN</span><i class="bulbs"></i></div>`;

/* ---------- sheets ---------- */
function closeSheet() { $$(".sheet-wrap").forEach(s => s.remove()); }
function sheet(html) {
  closeSheet(); const el = document.createElement("div"); el.className = "sheet-wrap";
  el.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`; document.body.appendChild(el);
  el.querySelector(".scrim").onclick = closeSheet; return el;
}
addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
document.addEventListener("click", e => { const b = e.target.closest("button"); if (b && !b.disabled) { sfx.play("tap"); buzz(8); } }, true);

/* ---------- shell ---------- */
function frame(tab, inner, bar = true) {
  window.scrollTo(0, 0); app.className = tab ? "hastabs" : "";
  app.innerHTML = (bar ? `<header class="bar"><span class="mini"><i>♠&#xFE0E;</i><span class="gold">Boredoms Fun</span></span><span class="bar-r"><button class="icon" id="snd" aria-label="Sound ${sfx.on ? "on" : "off"}">${sfx.on ? SND_ON : SND_OFF}</button><button class="icon" id="thm" aria-label="Change table color">${TH_ICO}</button></span></header>` : "") + inner +
    (tab ? `<div class="tabs"><nav aria-label="Main">${[["play", "♠︎", "Play"], ["me", null, "Me"]].map(([k, i, l]) => `<button class="tab ${tab === k ? "on" : ""}" data-tab="${k}"><span class="i">${i || avatar(myAv(), 26)}</span>${l}</button>`).join("")}</nav></div>` : "");
  const s = $("#snd"), t = $("#thm");
  if (s) s.onclick = () => { setSound(!sfx.on); s.innerHTML = sfx.on ? SND_ON : SND_OFF; if (sfx.on) sfx.play("pop"); };
  if (t) t.onclick = () => { setTheme(THEMES[(THEMES.indexOf(document.documentElement.dataset.theme) + 1) % THEMES.length]); toast("Table color: " + THEME_NAMES[document.documentElement.dataset.theme]); };
  $$("[data-tab]").forEach(b => b.onclick = () => ({ play: home, me: meTab })[b.dataset.tab]());
}
const tile = (g, i) => `<button class="tile ${g.red ? "red" : ""}" data-g="${g.id}" style="--i:${i}" aria-label="${META[g.id].name}, ${g.pl}, ${g.time}"><span class="idx tl"><b>${g.rank}</b><i>${g.suit}︎</i></span><span class="idx br"><b>${g.rank}</b><i>${g.suit}︎</i></span><span class="face" aria-hidden="true">${ICON[g.id]}</span><span class="t-name">${META[g.id].name}</span><span class="t-meta">${g.tag}<br>${g.pl} · ${g.time}</span></button>`;
function avatarGrid(sel, extra = "") {
  return `<div class="avgrid">${AVATARS.map(a => `<button type="button" data-av="${a.id}" class="${a.id === sel ? "on" : ""}" aria-label="${a.name}" title="${a.name}">${avatar(a.id, 54)}<small>${a.name}</small></button>`).join("")}${extra}</div>`;
}

/* ---------- auth ---------- */
function authScreen(mode = "in") {
  closeRoom(); S.me = null; app.className = ""; window.scrollTo(0, 0);
  let pick = AVATARS[Math.random() * AVATARS.length | 0].id;
  app.innerHTML = LOGO + `<p class="tag">${mode === "up" ? "Make your player account and pick your buddy." : "Welcome back. Log in to play."}</p>
   <div class="card"><div class="seg" role="tablist"><button class="${mode === "in" ? "on" : ""}" data-a="in">Log in</button><button class="${mode === "up" ? "on" : ""}" data-a="up">Create account</button></div>
    <label for="uid">Player ID</label><input id="uid" maxlength="14" autocomplete="username" autocapitalize="none" placeholder="e.g. jainil_07">
    <label for="upw">Password</label><div class="pw"><input id="upw" type="password" autocomplete="${mode === "up" ? "new-password" : "current-password"}" placeholder="At least 6 characters"><button class="eye" type="button" id="eye">Show</button></div>
    ${mode === "up" ? `<label for="upw2">Confirm password</label><input id="upw2" type="password" autocomplete="new-password"><label>Pick your buddy</label><div id="avp">${avatarGrid(pick)}</div>` : ""}
    <div class="err" id="er" role="alert"></div><button class="btn" id="go">${mode === "up" ? "Create account" : "Log in"}</button></div>
   <p class="foot">${cloud ? "" : "Preview mode: your account and rooms stay on this device."}</p>`;
  $$("[data-a]").forEach(b => b.onclick = () => authScreen(b.dataset.a));
  $("#eye").onclick = () => { const i = $("#upw"), sh = i.type === "password"; i.type = sh ? "text" : "password"; $("#eye").textContent = sh ? "Hide" : "Show"; };
  const bindAv = () => $$("#avp [data-av]").forEach(b => b.onclick = () => { pick = b.dataset.av; $$("#avp [data-av]").forEach(x => x.classList.toggle("on", x === b)); sfx.play("pop"); });
  if (mode === "up") bindAv();
  const go = $("#go"), er = $("#er");
  go.onclick = async () => {
    const id = $("#uid").value.trim(), pw = $("#upw").value;
    if (!/^[A-Za-z0-9_]{3,14}$/.test(id)) return er.textContent = "Player ID: 3–14 letters, numbers or _.";
    if (pw.length < 6) return er.textContent = "Password needs at least 6 characters.";
    if (mode === "up" && pw !== $("#upw2").value) return er.textContent = "Passwords don't match.";
    go.disabled = true; go.textContent = mode === "up" ? "Creating…" : "Logging in…"; er.textContent = "";
    try { S.me = await (mode === "up" ? api.signUp(id, pw, pick) : api.logIn(id, pw)); S.intro = true; home(); }
    catch (e) { er.textContent = e.message || "Couldn't connect. Check your internet and try again."; go.disabled = false; go.textContent = mode === "up" ? "Create account" : "Log in"; }
  };
  $$("input").forEach(i => i.onkeydown = e => { if (e.key === "Enter") go.click(); });
}

/* ---------- home ---------- */
function home(prefill) {
  leaveRoom(); S.view = null; S.tab = "play"; if (!S.me) return authScreen("in");
  frame("play", `<section class="hero"><div class="herov">${avatar(myAv(), 84)}</div><div><p class="kick">Welcome back</p><h1>${esc(S.me.id)}</h1><p class="sub" style="margin:2px 0 0">${S.me.wins} win${S.me.wins === 1 ? "" : "s"} · ${S.me.played} played</p></div></section>
   <div class="row2"><button class="btn" id="mk">Create room</button><button class="btn c" id="jn">Join room</button></div>
   <h2 class="sec"><span>Quick play</span></h2><p class="sub" style="text-align:center;margin:8px 0 0">Solo against bots. No room needed.</p>
   <div class="tiles ${S.intro ? "intro" : ""}">${LIST.map(tile).join("")}</div>`);
  S.intro = false; $("#mk").onclick = createSheet; $("#jn").onclick = () => joinSheet();
  $$("[data-g]").forEach(b => b.onclick = () => quickStart(b.dataset.g));
  if (prefill) joinSheet(prefill);
}
async function quickStart(id) {
  try { await hostRoom({ max: 10, live: false, me: { n: S.me.id, av: myAv() } }); } catch (e) { return toast("Couldn't start."); }
  Net.room.quick = true; gameSheet(id);
}
function joinSheet(prefill) {
  const el = sheet(`<h2>Join a room</h2><p class="sub">Ask the host for the Room ID and password. The host must have the room open.</p>
   <label for="ri">Room ID</label><input id="ri" maxlength="6" autocapitalize="characters" value="${esc(prefill || "")}" style="text-transform:uppercase;letter-spacing:3px">
   <label for="rp">Password</label><input id="rp" maxlength="4" inputmode="numeric" placeholder="4 digits">
   <div class="err" id="er" role="alert"></div><button class="btn c" id="jj">Join room</button>`);
  const go = async () => {
    const id = $("#ri").value.trim().toUpperCase(), pw = $("#rp").value.trim(), er = $("#er"), btn = $("#jj");
    if (id.length !== 6 || pw.length !== 4) return er.textContent = "Enter the 6-character Room ID and 4-digit password.";
    er.textContent = ""; btn.disabled = true; btn.textContent = "Looking for room…";
    try { await joinRoom(id, pw, { n: S.me.id, av: myAv() }); closeSheet(); history.replaceState(null, "", location.pathname + location.search); lobby(); sfx.play("up"); }
    catch (e) { er.textContent = e.message; btn.disabled = false; btn.textContent = "Join room"; }
  };
  $("#jj").onclick = go; el.querySelectorAll("input").forEach(i => i.onkeydown = e => { if (e.key === "Enter") go(); });
  (prefill ? $("#rp") : $("#ri")).focus();
}
function createSheet() {
  let mi = 2, online = true;
  const el = sheet(`<h2>New room</h2><p class="sub">Where is everyone playing?</p>
   <div class="modes"><button class="mode on" data-s="1"><b>Own phones</b><small>Friends join online</small></button><button class="mode" data-s="0"><b>One phone</b><small>Pass it around</small></button></div>
   <p class="sub" style="margin:16px 0 8px">How many players?</p>
   <div class="modes">${MODES.map((m, i) => `<button class="mode ${i === mi ? "on" : ""}" data-m="${i}"><b>${m[0]}</b><small>${m[2]}</small></button>`).join("")}</div>
   <div class="err" id="er" role="alert"></div><button class="btn" id="go">Create room</button>`);
  el.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { online = b.dataset.s === "1"; el.querySelectorAll("[data-s]").forEach(x => x.classList.toggle("on", x === b)); });
  el.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { mi = +b.dataset.m; el.querySelectorAll("[data-m]").forEach(x => x.classList.toggle("on", x === b)); });
  $("#go").onclick = async () => {
    const go = $("#go"); go.disabled = true; go.textContent = "Opening room…";
    try { await hostRoom({ max: MODES[mi][1], live: online, me: { n: S.me.id, av: myAv() } }); closeSheet(); lobby(); sfx.play("up"); }
    catch (e) { $("#er").textContent = "Couldn't open the room online. Check your internet and try again."; go.disabled = false; go.textContent = "Create room"; }
  };
}

/* ---------- lobby ---------- */
const lobbyOn = () => !!$(".ticket");
Net.cb.roster = () => { if (lobbyOn()) lobby(true); };
function lobby(keep) {
  const r = Net.room; if (!r) return home(); S.view = null; S.ctx = null;
  const n = r.players.length, isLive = !!r.live, isHost = !isLive || Net.isHost;
  const link = location.origin + location.pathname + "#join=" + r.id;
  const mode = (MODES.find(m => m[1] === r.max) || ["Room"])[0];
  const seatsHtml = r.players.map((p, i) => `<div class="seat" style="--i:${i}"><div class="seatav">${avatar(p.av, 62, p.c)}</div><b>${esc(p.n)}</b>${p.id === r.hostId ? ' <span class="crown">♛</span>' : ""}${isLive && p.id === PID ? "<small>you</small>" : ""}</div>`).join("") +
    Array.from({ length: Math.max(0, Math.min(r.max, 10) - n) }, () => `<div class="seat open">${isLive ? "Waiting…" : "Open seat"}</div>`).join("");
  frame(null, `<div class="top"><button class="back" id="lv" aria-label="Back to home">‹</button><h2>${isLive ? "Live room" : mode + " room"}</h2><span class="count">${isLive ? '<span class="live">●</span> ' : ""}${n}/${r.max}</span></div>
   ${isLive ? `<section class="ticket"><div><small>Room ID</small><div class="code">${r.id}</div></div><div><small>Password</small><div class="code">${r.pw}</div></div></section>
   <div class="row2" style="margin:16px 0 22px"><button class="btn" id="sh">Share invite</button><button class="btn g" id="cp">Copy</button></div>` : `<section class="ticket" style="grid-template-columns:1fr"><div><small>One phone</small><div class="code" style="font-size:22px">Pass it around</div></div></section><div style="height:18px"></div>`}
   <div class="table"><h2>The table</h2><div class="seats">${seatsHtml}</div>
   ${!isLive && n < r.max ? `<div class="addrow"><input id="np" maxlength="14" placeholder="Friend on this phone" aria-label="Friend's name"><button class="btn c" id="ad">Add</button></div>` : ""}</div>
   <h2 class="sec"><span>${isHost ? "Pick a game" : "Waiting for " + esc(r.host)}</span></h2><p class="sub" style="text-align:center;margin:8px 0 0">${isHost ? "Short on players? Bots can fill in." : "The host picks the game. Tap one to read the rules."}</p>
   <div class="tiles">${LIST.map(tile).join("")}</div>`, false);
  if (keep) $$(".seat").forEach(s => s.style.animation = "none");
  $("#lv").onclick = () => { leaveRoom(); home(); };
  if (isLive) {
    const text = `Join my Boredoms Fun room!\nRoom ID: ${r.id}\nPassword: ${r.pw}\n${link}`;
    const copy = async () => { try { await navigator.clipboard.writeText(text); toast("Invite copied. Paste it in your group chat."); } catch (e) { toast(`Share Room ID ${r.id} and password ${r.pw}`); } };
    $("#cp").onclick = copy; $("#sh").onclick = async () => { if (navigator.share) { try { await navigator.share({ title: "Boredoms Fun", text }); return; } catch (e) { if (e && e.name === "AbortError") return; } } copy(); };
  }
  const ad = $("#ad");
  if (ad) { const add = () => { const v = $("#np").value.trim(); if (!v) return; if (r.players.find(p => p.n.toLowerCase() === v.toLowerCase())) return toast("That name is already in the room."); const free = AVATARS.filter(a => !r.players.some(p => p.av === a.id)); r.players.push({ id: "L" + r.players.length + Math.random().toString(36).slice(2, 5), n: v, c: COLORS[r.players.length % COLORS.length], av: free[Math.random() * free.length | 0].id }); sfx.play("up"); lobby(); }; ad.onclick = add; $("#np").onkeydown = e => { if (e.key === "Enter") add(); }; }
  $$("[data-g]").forEach(b => b.onclick = () => isHost ? gameSheet(b.dataset.g) : gameSheet(b.dataset.g, { help: true, note: `Only ${esc(r.host)} can start a game.` }));
}

/* ---------- game sheet & start ---------- */
function gameSheet(id, o = {}) {
  const g = META[id], r = Net.room, hum = r.players.length, red = g.red;
  let lo = Math.max(0, g.min - hum), hi = Math.max(lo, Math.min(3, g.max - hum)); if (g.solo || hum >= g.max) { lo = 0; hi = 0; }
  const opts = []; for (let k = lo; k <= hi; k++) opts.push(k);
  let bots = hum === 1 && !g.solo ? Math.max(lo, Math.min(2, hi)) : lo;
  const sum = () => hum > g.max ? `The first ${g.max} players play. Everyone else watches.` : g.solo ? (hum > 1 ? "Race! Everyone gets the same puzzle. First to finish wins." : "Just you. Take your time.") : bots ? `${hum === 1 ? "You" : hum + " players"} + ${bots} bot${bots > 1 ? "s" : ""} will play.` : `All ${hum} players join.`;
  const el = sheet(`<div class="gh ${red ? "red" : ""}"><span class="gi" aria-hidden="true">${ICON[id]}</span><div><h2>${g.name}</h2><p>${g.pl} · about ${g.time}</p></div></div>
   <h3>How to play</h3><ol class="how">${g.how.map(x => `<li>${x}</li>`).join("")}</ol>
   ${o.help ? `${o.note ? `<p class="sub">${o.note}</p>` : ""}<button class="btn" id="ok">Got it</button>` : `${opts.length > 1 ? `<h3>Bot opponents</h3><div class="chips" id="bc" style="margin-top:10px">${opts.map(k => `<button class="chip ${k === bots ? "on" : ""}" data-b="${k}">${k === 0 ? "No bots" : k + " bot" + (k > 1 ? "s" : "")}</button>`).join("")}</div>` : ""}
   <p class="sub" id="sum" style="margin:14px 0 0">${sum()}</p><button class="btn" id="st">Start game 🎲</button>`}`);
  if (o.help) return $("#ok").onclick = closeSheet;
  el.querySelectorAll("[data-b]").forEach(b => b.onclick = () => { bots = +b.dataset.b; el.querySelectorAll("[data-b]").forEach(x => x.classList.toggle("on", x === b)); $("#sum").textContent = sum(); });
  $("#st").onclick = () => { closeSheet(); startGame(id, bots); };
}

/* ---------- playing ---------- */
Net.cb.start = m => {
  const players = m.players, isLive = live();
  const ctx = {
    state: m.s, players, local: !isLive,
    mySeat: isLive ? players.findIndex(p => p.id === PID) : players.findIndex(p => !p.bot),
    mine: i => i >= 0 && i < players.length && (isLive ? players[i].id === PID : !players[i].bot),
    act: a => isLive ? send.act(a) : send.act(a, S.ctx.state.turn >= 0 ? S.ctx.state.turn : S.ctx.mySeat),
    finished: w => finished(w),
  };
  S.ctx = ctx; S.over = false; closeSheet(); gameScreen(m.g, ctx);
};
Net.cb.state = m => { if (!S.view || !S.ctx) return; S.ctx.state = m.s; S.view.push(m.s, m.ev || []); };
Net.cb.toLobby = why => { S.view && S.view.destroy && S.view.destroy(); S.view = null; S.ctx = null; closeSheet(); if (why) toast(why); if (Net.room && !Net.room.quick) lobby(); else home(); };
Net.cb.closed = why => { S.view = null; S.ctx = null; closeSheet(); home(); };
Net.cb.react = m => { const p = Net.room && Net.room.players.find(x => x.id === m.from); floatEmoji(m.e, m.from === PID ? "" : (p ? p.n : m.n)); sfx.play("pop"); };

function gameScreen(id, ctx) {
  const g = META[id];
  frame(null, `<div class="top"><button class="back" id="bk" aria-label="Leave game">‹</button><h2>${g.name}</h2><button class="icon" id="hp" aria-label="How to play">?</button></div>
   <div id="stage"></div><div id="foot"></div>
   ${live() ? `<div class="reactbar" aria-label="Reactions">${["😂", "🔥", "👏", "😡", "😭", "🎉"].map(e => `<button data-e="${e}">${e}</button>`).join("")}</div>` : ""}`, false);
  $("#bk").onclick = confirmLeave; $("#hp").onclick = () => gameSheet(id, { help: true });
  $$("[data-e]").forEach(b => b.onclick = () => send.react(b.dataset.e, S.me.id));
  S.view = GAME[id].mount($("#stage"), ctx);
}
function confirmLeave() {
  const isLive = live(), host = Net.isHost, quick = Net.room && Net.room.quick;
  sheet(`<h2>Leave this game?</h2><p class="sub">${isLive ? (host ? "This ends the round for everyone in the room." : "You'll leave the room. The round ends for everyone else too.") : "Your progress in this round will be lost."}</p><div class="row2" style="margin-top:6px"><button class="btn g" id="stay">Keep playing</button><button class="btn" id="leave">Leave</button></div>`);
  $("#stay").onclick = closeSheet;
  $("#leave").onclick = () => { closeSheet(); if (isLive && !host) { leaveRoom(); home(); } else if (isLive) endRound(`${S.me.id} ended the round.`); else if (quick) { leaveRoom(); home(); } else endRound(); };
}
async function finished(winner) {
  if (S.over) return; S.over = true; const ctx = S.ctx; if (!ctx) return;
  const won = winner >= 0 && ctx.mine(winner); const human = winner >= 0 && !ctx.players[winner].bot;
  if (won || (!live() && human && ctx.players.filter(p => !p.bot).length > 1 && ctx.mine(winner))) { sfx.play("win"); buzz([60, 40, 60]); confetti(); } else if (winner >= 0) sfx.play("lose");
  const p = await api.record(won); if (p) S.me = p;
  const foot = $("#foot"); if (!foot) return;
  const quick = Net.room && Net.room.quick, canBack = !live() || Net.isHost;
  foot.innerHTML = quick ? `<button class="btn g" id="back2">Back to home</button>` : canBack ? `<button class="btn g" id="back2">Back to lobby</button>` : `<p class="sub" style="text-align:center">Waiting for the host…</p>`;
  const b = $("#back2"); if (b) b.onclick = () => quick ? (leaveRoom(), home()) : endRound();
}

/* ---------- me ---------- */
function meTab() {
  leaveRoom(); S.tab = "me"; const st = S.me;
  frame("me", `<section class="hero"><div class="herov">${avatar(myAv(), 84)}</div><div><h1>${esc(st.id)}</h1><p class="sub" style="margin:2px 0 0">Your player card</p></div></section>
   <div class="card"><div class="stats"><div class="stat"><b>${st.played}</b>Games played</div><div class="stat"><b>${st.wins}</b>Wins</div></div></div>
   <div class="card"><h2>Pick your buddy</h2><p class="sub" style="margin:4px 0 0">Everyone in your room sees this on the board.</p>${avatarGrid(myAv(), `<label class="avup" title="Use your own picture"><input type="file" id="upl" accept="image/*" hidden><span>📷</span><small>My photo</small></label>`)}</div>
   <div class="card"><div class="setrow"><span>Sound effects</span><button class="chip ${sfx.on ? "on" : ""}" id="s2">${sfx.on ? "On" : "Off"}</button></div>
   <div class="setrow"><span>Table color</span><span class="chips">${THEMES.map(t => `<button class="chip ${document.documentElement.dataset.theme === t ? "on" : ""}" data-th="${t}">${THEME_NAMES[t]}</button>`).join("")}</span></div></div>
   <button class="btn g" id="so">Log out</button>`);
  const setAv = async a => { try { S.me = await api.setAvatar(a) || S.me; } catch (e) { return toast(e.message); } sfx.play("sparkle"); meTab(); };
  $$("[data-av]").forEach(b => b.onclick = () => setAv(b.dataset.av));
  $("#upl").onchange = async e => { const f = e.target.files[0]; if (!f) return; try { setAv(await photoToAvatar(f)); } catch (err) { toast(err.message); } };
  $("#s2").onclick = () => { setSound(!sfx.on); meTab(); };
  $$("[data-th]").forEach(b => b.onclick = () => { setTheme(b.dataset.th); meTab(); });
  $("#so").onclick = () => { api.logOut(); authScreen("in"); };
}

/* ---------- boot ---------- */
(async function boot() {
  app.innerHTML = LOGO + `<p class="tag">Loading…</p>`;
  const join = (location.hash.match(/join=([A-Za-z0-9]{6})/) || [])[1];
  S.me = await api.me();
  if (!S.me) return authScreen("in");
  home(join ? join.toUpperCase() : undefined);
})();
window.__bf = { S, Net, api };
