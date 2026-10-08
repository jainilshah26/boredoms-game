import { AVATARS, avatar, photoToAvatar } from "./avatars.js";
import { sfx, setSound, store, toast, buzz, confetti, floatEmoji, burst, sleep } from "./fx.js";
import { api, cloud, Net, PID, COLORS, hostRoom, joinRoom, leaveRoom, closeRoom, startGame, endRound, send, live, resume } from "./net.js";
import { GAME, LIST, META, ICON } from "./games/index.js";
import { esc } from "./games/common.js";

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const app = $("#app");
const S = { me: null, tab: "play", view: null, ctx: null, over: false, intro: true, social: { friends: [], incoming: [], outgoing: [], invites: [] } };
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
    (tab ? `<div class="tabs"><nav aria-label="Main">${[["play", "♠︎", "Play"], ["friends", "♥︎", "Friends"], ["me", null, "Me"]].map(([k, i, l]) => `<button class="tab ${tab === k ? "on" : ""}" data-tab="${k}"><span class="i">${i || avatar(myAv(), 26)}</span>${l}${k === "friends" && badgeN() ? `<em class="badge" id="fbadge">${badgeN()}</em>` : ""}</button>`).join("")}</nav></div>` : "");
  const s = $("#snd"), t = $("#thm");
  if (s) s.onclick = () => { setSound(!sfx.on); s.innerHTML = sfx.on ? SND_ON : SND_OFF; if (sfx.on) sfx.play("pop"); };
  if (t) t.onclick = () => { setTheme(THEMES[(THEMES.indexOf(document.documentElement.dataset.theme) + 1) % THEMES.length]); toast("Table color: " + THEME_NAMES[document.documentElement.dataset.theme]); };
  $$("[data-tab]").forEach(b => b.onclick = () => ({ play: home, friends: friendsTab, me: meTab })[b.dataset.tab]());
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
    <div class="err" id="er" role="alert"></div><button class="btn" id="go">${mode === "up" ? "Create account" : "Log in"}</button>${mode === "in" ? `<button class="linkbtn" id="fp" type="button">Forgot password?</button>` : ""}</div>
   <p class="foot">${cloud ? "" : "Preview mode: your account and rooms stay on this device."}</p>`;
  $$("[data-a]").forEach(b => b.onclick = () => authScreen(b.dataset.a));
  $("#eye").onclick = () => { const i = $("#upw"), sh = i.type === "password"; i.type = sh ? "text" : "password"; $("#eye").textContent = sh ? "Hide" : "Show"; };
  const bindAv = () => $$("#avp [data-av]").forEach(b => b.onclick = () => { pick = b.dataset.av; $$("#avp [data-av]").forEach(x => x.classList.toggle("on", x === b)); sfx.play("pop"); });
  if (mode === "up") bindAv();
  const go = $("#go"), er = $("#er"); if ($("#fp")) $("#fp").onclick = () => resetScreen($("#uid").value.trim());
  go.onclick = async () => {
    const id = $("#uid").value.trim(), pw = $("#upw").value;
    if (!/^[A-Za-z0-9_]{3,14}$/.test(id)) return er.textContent = "Player ID: 3–14 letters, numbers or _.";
    if (pw.length < 6) return er.textContent = "Password needs at least 6 characters.";
    if (mode === "up" && pw !== $("#upw2").value) return er.textContent = "Passwords don't match.";
    go.disabled = true; go.textContent = mode === "up" ? "Creating…" : "Logging in…"; er.textContent = "";
    try { S.me = await (mode === "up" ? api.signUp(id, pw, pick) : api.logIn(id, pw)); S.intro = true; if (mode === "up") { let c = null; try { c = await api.makeRecovery(); } catch (e) { } S.noRec = false; if (c) return codeScreen(c, "Save your recovery code", () => { home(); pollSocial(true); }); } home(); pollSocial(true); checkRec(); }
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
  S.intro = false; nudge(); $("#mk").onclick = createSheet; $("#jn").onclick = () => joinSheet();
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
  const seatsHtml = r.players.map((p, i) => `<div class="seat" style="--i:${i}"><div class="seatav">${avatar(p.av, 62, p.c)}</div><b>${esc(p.n)}</b>${p.id === r.hostId ? ' <span class="crown">♛</span>' : ""}${isLive && p.id === PID ? "<small>you</small>" : ""}${isLive && p.id !== PID ? addBtn(p.n) : ""}</div>`).join("") +
    Array.from({ length: Math.max(0, Math.min(r.max, 10) - n) }, () => `<div class="seat open">${isLive ? "Waiting…" : "Open seat"}</div>`).join("");
  frame(null, `<div class="top"><button class="back" id="lv" aria-label="Back to home">‹</button><h2>${isLive ? "Live room" : mode + " room"}</h2><span class="count">${isLive ? '<span class="live">●</span> ' : ""}${n}/${r.max}</span></div>
   ${isLive ? `<section class="ticket"><div><small>Room ID</small><div class="code">${r.id}</div></div><div><small>Password</small><div class="code">${r.pw}</div></div></section>
   <div class="row2" style="margin:16px 0 22px"><button class="btn" id="sh">Share invite</button><button class="btn g" id="cp">Copy</button></div>` : `<section class="ticket" style="grid-template-columns:1fr"><div><small>One phone</small><div class="code" style="font-size:22px">Pass it around</div></div></section><div style="height:18px"></div>`}
   <div class="table"><h2>The table</h2><div class="seats">${seatsHtml}</div>
   ${!isLive && n < r.max ? `<div class="addrow"><input id="np" maxlength="14" placeholder="Friend on this phone" aria-label="Friend's name"><button class="btn c" id="ad">Add</button></div>` : ""}</div>
   ${isLive ? inviteCard(r) : ""}
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
  bindFriendBtns(); bindInvites(r);
  $$("[data-g]").forEach(b => b.onclick = () => isHost ? gameSheet(b.dataset.g) : gameSheet(b.dataset.g, { help: true, note: `Only ${esc(r.host)} can start a game.` }));
}

/* ---------- game sheet & start ---------- */
function gameSheet(id, o = {}) {
  const g = META[id], r = Net.room, hum = r.players.length, red = g.red;
  let lo = Math.max(0, g.min - hum), hi = Math.max(lo, Math.min(3, g.max - hum)); if (g.solo || hum >= g.max) { lo = 0; hi = 0; }
  const opts = []; for (let k = lo; k <= hi; k++) opts.push(k);
  let bots = hum === 1 && !g.solo ? Math.max(lo, Math.min(2, hi)) : lo;
  const sum = () => hum > g.max ? `The first ${g.max} players play. Everyone else watches.` : g.solo ? (hum > 1 ? (g.raceText || "Race! Everyone gets the same puzzle. First to finish wins.") : "Just you. Take your time.") : bots ? `${hum === 1 ? "You" : hum + " players"} + ${bots} bot${bots > 1 ? "s" : ""} will play.` : `All ${hum} players join.`;
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
    finished: w => finished(w), api,
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
  app.classList.toggle("inroom", live());
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


/* ---------- friends ---------- */
const rel = n => { const k = String(n).toLowerCase(), s = S.social; return s.friends.some(f => f.id === k) ? "friend" : s.outgoing.some(f => f.id === k) ? "sent" : s.incoming.some(f => f.id === k) ? "incoming" : "none"; };
const badgeN = () => S.social.incoming.length + S.social.invites.length;
/* small "+" shown next to other players' names; tap to send a friend request */
const addBtn = n => { if (!S.me || String(n).toLowerCase() === S.me.id.toLowerCase()) return ""; const r = rel(n); return r === "friend" ? `<small class="isfr">♥ friend</small>` : r === "sent" ? `<small class="isfr">requested</small>` : `<button class="addfr" data-af="${esc(n)}" aria-label="Add ${esc(n)} as a friend">${r === "incoming" ? "Accept" : "+ Friend"}</button>`; };
const bindFriendBtns = () => { };
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-af]"); if (!b || b.disabled) return; e.stopPropagation(); b.disabled = true; const n = b.dataset.af;
  try {
    const r = await api.request(n); toast(r.status === "accepted" ? `You and ${n} are now friends!` : `Friend request sent to ${n}.`); sfx.play("up");
    b.replaceWith(Object.assign(document.createElement("small"), { className: "isfr", textContent: r.status === "accepted" ? "♥ friend" : "requested" })); pollSocial(true);
  } catch (err) { toast(err.message); b.disabled = false; }
});
function inviteCard(r) {
  const inRoom = new Set(r.players.map(p => p.n.toLowerCase())), list = S.social.friends.filter(f => !inRoom.has(f.id)).sort((a, b) => b.online - a.online).slice(0, 8);
  if (!list.length) return `<div class="card invcard"><h2>Invite friends</h2><p class="sub" style="margin:4px 0 0">Add friends from the Friends tab, then invite them here with one tap.</p></div>`;
  return `<div class="card invcard"><h2>Invite friends</h2><div class="frlist">${list.map(f => `<div class="fr"><span class="frav">${avatar(f.avatar, 40)}<i class="dot ${f.online ? "on" : ""}"></i></span><span class="frn"><b>${esc(f.name)}</b><small>${f.online ? "Online now" : "Offline"}</small></span><button class="btn c sm" data-inv="${f.id}">Invite</button></div>`).join("")}</div></div>`;
}
function bindInvites(r) {
  $$("[data-inv]").forEach(b => b.onclick = async () => {
    b.disabled = true; try { await api.invite(b.dataset.inv, r.id, r.pw); b.textContent = "Sent ✓"; sfx.play("pop"); } catch (e) { toast(e.message); b.disabled = false; }
  });
}
async function pollSocial(force) {
  if (!S.me || (document.hidden && !force)) return;
  const r = await api.friends(); if (!r) return;
  const old = S.social, oldIn = new Set(old.incoming.map(x => x.id)), oldInv = new Set(old.invites.map(x => x.id + x.room));
  const sig = JSON.stringify(old); S.social = r;
  r.incoming.filter(x => !oldIn.has(x.id)).forEach(x => { toast(`${x.name} wants to be your friend!`); sfx.play("pop"); });
  r.invites.filter(x => !oldInv.has(x.id + x.room)).forEach(() => sfx.play("up"));
  const fb = $("#fbadge"), n = badgeN(); if (fb) { fb.textContent = n; fb.hidden = !n; } else if (n && $(".tabs")) { const b = $('[data-tab="friends"]'); if (b) b.insertAdjacentHTML("beforeend", `<em class="badge" id="fbadge">${n}</em>`); }
  if (sig !== JSON.stringify(r)) { if ($("#flists")) renderFriendLists(); if (lobbyOn()) lobby(true); }
  showInvites();
}
/* a game invite from a friend: a banner on any screen except mid-game */
function showInvites() {
  $$(".invbar").forEach(el => { if (!S.social.invites.some(i => i.id + i.room === el.dataset.k)) el.remove(); });
  if (S.view) return;
  S.social.invites.slice(0, 2).forEach(i => {
    const k = i.id + i.room; if (document.querySelector(`.invbar[data-k="${k}"]`)) return;
    const el = document.createElement("div"); el.className = "invbar"; el.dataset.k = k; el.setAttribute("role", "alert");
    el.innerHTML = `${avatar(i.avatar, 40)}<span><b>${esc(i.name)}</b> invited you to play</span><button class="btn c sm" data-j>Join</button><button class="x" data-x aria-label="Dismiss">✕</button>`; document.body.appendChild(el);
    el.querySelector("[data-x]").onclick = () => { el.remove(); S.social.invites = S.social.invites.filter(x => x.id + x.room !== k); api.clearInvite(i.id); };
    el.querySelector("[data-j]").onclick = async e => {
      const b = e.currentTarget; b.disabled = true; b.textContent = "Joining…"; api.clearInvite(i.id); S.social.invites = S.social.invites.filter(x => x.id + x.room !== k);
      try { leaveRoom(); await joinRoom(i.room, i.pw, { n: S.me.id, av: myAv() }); el.remove(); closeSheet(); lobby(); sfx.play("up"); }
      catch (err) { toast(err.message); el.remove(); }
    };
  });
}
async function playWith(f) {
  try { await hostRoom({ max: 10, live: true, me: { n: S.me.id, av: myAv() } }); } catch (e) { return toast("Couldn't open a room. Check your internet."); }
  try { await api.invite(f.id, Net.room.id, Net.room.pw); toast(`Invite sent to ${f.name}.`); } catch (e) { toast(e.message); }
  lobby(); sfx.play("up");
}
const frRow = (f, kind) => `<div class="fr"><span class="frav">${avatar(f.avatar, 44)}${kind === "friend" ? `<i class="dot ${f.online ? "on" : ""}"></i>` : ""}</span><span class="frn"><b>${esc(f.name)}</b><small>${kind === "friend" ? (f.online ? "Online now" : "Offline") : kind === "in" ? "Wants to be friends" : "Request sent"}</small></span>${
  kind === "friend" ? `<button class="btn c sm" data-pw="${f.id}">Play</button><button class="icon sm" data-rm="${f.id}" aria-label="Remove ${esc(f.name)}">✕</button>` :
  kind === "in" ? `<button class="btn sm" data-ac="${f.id}">Accept</button><button class="icon sm" data-dc="${f.id}" aria-label="Decline">✕</button>` : `<button class="icon sm" data-cx="${f.id}" aria-label="Cancel request">✕</button>`}</div>`;
function renderFriendLists() {
  const el = $("#flists"); if (!el) return; const s = S.social;
  el.innerHTML = (s.invites.length ? `<h2 class="sec"><span>Game invites</span></h2><div class="card frlist">${s.invites.map(i => `<div class="fr"><span class="frav">${avatar(i.avatar, 44)}</span><span class="frn"><b>${esc(i.name)}</b><small>Room ${esc(i.room)}</small></span><button class="btn sm" data-jn="${i.id}">Join</button></div>`).join("")}</div>` : "") +
    (s.incoming.length ? `<h2 class="sec"><span>Friend requests</span></h2><div class="card frlist">${s.incoming.map(f => frRow(f, "in")).join("")}</div>` : "") +
    `<h2 class="sec"><span>My friends${s.friends.length ? " · " + s.friends.length : ""}</span></h2>` +
    (s.friends.length ? `<div class="card frlist">${s.friends.map(f => frRow(f, "friend")).join("")}</div>` : `<div class="card"><p class="sub" style="margin:0;text-align:center">No friends yet.<br>Search a Player ID above, or tap <b>+ Friend</b> next to anyone in a room.</p></div>`) +
    (s.outgoing.length ? `<h2 class="sec"><span>Sent requests</span></h2><div class="card frlist">${s.outgoing.map(f => frRow(f, "out")).join("")}</div>` : "");
  el.querySelectorAll("[data-ac]").forEach(b => b.onclick = async () => { b.disabled = true; try { await api.respond(b.dataset.ac, true); toast("Friend added!"); sfx.play("up"); } catch (e) { toast(e.message); } await pollSocial(true); renderFriendLists(); });
  el.querySelectorAll("[data-dc]").forEach(b => b.onclick = async () => { b.disabled = true; try { await api.respond(b.dataset.dc, false); } catch (e) { toast(e.message); } await pollSocial(true); renderFriendLists(); });
  el.querySelectorAll("[data-cx]").forEach(b => b.onclick = async () => { b.disabled = true; try { await api.remove(b.dataset.cx); } catch (e) { toast(e.message); } await pollSocial(true); renderFriendLists(); });
  el.querySelectorAll("[data-pw]").forEach(b => b.onclick = () => { b.disabled = true; playWith(s.friends.find(f => f.id === b.dataset.pw)); });
  el.querySelectorAll("[data-jn]").forEach(b => b.onclick = async () => { const i = s.invites.find(x => x.id === b.dataset.jn); b.disabled = true; b.textContent = "Joining…"; api.clearInvite(i.id); try { await joinRoom(i.room, i.pw, { n: S.me.id, av: myAv() }); lobby(); sfx.play("up"); } catch (e) { toast(e.message); b.disabled = false; b.textContent = "Join"; } });
  el.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { const f = s.friends.find(x => x.id === b.dataset.rm); sheet(`<h2>Remove ${esc(f.name)}?</h2><p class="sub">You won't be able to invite each other until you add each other again.</p><div class="row2" style="margin-top:6px"><button class="btn g" id="no">Keep</button><button class="btn" id="yes">Remove</button></div>`); $("#no").onclick = closeSheet; $("#yes").onclick = async () => { closeSheet(); try { await api.remove(f.id); } catch (e) { toast(e.message); } await pollSocial(true); renderFriendLists(); }; });
}
function friendsTab() {
  leaveRoom(); S.tab = "friends"; S.view = null;
  frame("friends", `<section class="hero"><div class="herov">${avatar(myAv(), 84)}</div><div><p class="kick">Your ID</p><h1>${esc(S.me.id)}</h1><p class="sub" style="margin:2px 0 0">Share it so friends can find you.</p></div></section>
   <div class="card"><label for="fq" style="margin-top:0">Find a player</label><input id="fq" maxlength="14" autocapitalize="none" autocomplete="off" placeholder="Type a Player ID"><div id="fr" class="frlist"></div></div>
   <div id="flists"></div>`);
  renderFriendLists(); pollSocial(true);
  let tm = 0, seq = 0; $("#fq").oninput = e => { clearTimeout(tm); const q = e.target.value.trim(), my = ++seq; if (q.length < 2) { $("#fr").innerHTML = ""; return; } tm = setTimeout(async () => { const res = await api.find(q); if (my !== seq || !$("#fr")) return; const word = { friend: "♥ friend", sent: "requested", incoming: "" }; $("#fr").innerHTML = res.length ? res.map(f => `<div class="fr"><span class="frav">${avatar(f.avatar, 40)}</span><span class="frn"><b>${esc(f.name)}</b></span>${f.rel === "none" || f.rel === "incoming" ? `<button class="btn c sm" data-af="${f.id}">${f.rel === "incoming" ? "Accept" : "+ Friend"}</button>` : `<small class="isfr">${word[f.rel]}</small>`}</div>`).join("") : `<p class="sub" style="margin:10px 0 0">No player found with that ID.</p>`; bindFriendBtns($("#fr")); }, 250); };
}


/* ---------- recovery code & password reset ---------- */
function codeScreen(code, title, then) {
  closeRoom(); app.className = ""; window.scrollTo(0, 0);
  app.innerHTML = LOGO + `<div class="card"><h2>${title}</h2><p class="sub">If you ever forget your password, this code is the <b>only</b> way back into your account, with all your wins and friends. Screenshot it or write it down somewhere safe.</p>
   <section class="ticket" style="grid-template-columns:1fr;margin-top:14px"><div><small>Your recovery code</small><div class="code" style="font-size:clamp(22px,7vw,32px);letter-spacing:.08em">${code}</div></div></section>
   <div class="row2" style="margin-top:16px"><button class="btn g" id="cpc">Copy</button><button class="btn" id="dn">I saved it</button></div></div>`;
  $("#cpc").onclick = async () => { try { await navigator.clipboard.writeText(code); toast("Code copied."); } catch (e) { toast("Copy didn't work. Please write it down."); } };
  $("#dn").onclick = then;
}
function resetScreen(prefill = "") {
  closeRoom(); S.me = null; app.className = ""; window.scrollTo(0, 0);
  app.innerHTML = LOGO + `<p class="tag">Forgot your password? Use your recovery code to set a new one and keep your account.</p>
   <div class="card"><label for="uid">Player ID</label><input id="uid" maxlength="14" autocapitalize="none" value="${esc(prefill)}">
    <label for="rc">Recovery code</label><input id="rc" maxlength="14" autocapitalize="characters" autocomplete="off" placeholder="XXXX-XXXX-XXXX" style="text-transform:uppercase;letter-spacing:2px">
    <label for="npw">New password</label><div class="pw"><input id="npw" type="password" autocomplete="new-password" placeholder="At least 6 characters"><button class="eye" type="button" id="eye">Show</button></div>
    <div class="err" id="er" role="alert"></div><button class="btn" id="go">Set new password</button><button class="linkbtn" id="bk" type="button">Back to log in</button>
    <p class="sub" style="margin:14px 0 0;font-size:14px">No recovery code? Accounts made before this feature can't be reset, because we never stored your password. You can make a new account.</p></div>`;
  $("#eye").onclick = () => { const i = $("#npw"), sh = i.type === "password"; i.type = sh ? "text" : "password"; $("#eye").textContent = sh ? "Hide" : "Show"; };
  $("#bk").onclick = () => authScreen("in");
  const go = $("#go"), er = $("#er");
  go.onclick = async () => {
    const id = $("#uid").value.trim(), code = $("#rc").value.trim(), pw = $("#npw").value;
    if (!id || code.replace(/[^A-Za-z0-9]/g, "").length !== 12) return er.textContent = "Enter your Player ID and the 12-character recovery code.";
    if (pw.length < 6) return er.textContent = "Password needs at least 6 characters.";
    go.disabled = true; go.textContent = "Checking…"; er.textContent = "";
    try { const r = await api.resetPassword(id, code, pw); S.me = r.profile; S.intro = true; S.noRec = false; sfx.play("up"); codeScreen(r.code, "Password changed. Here is your new recovery code", () => { home(); pollSocial(true); }); }
    catch (e) { er.textContent = e.message || "Couldn't connect. Check your internet and try again."; go.disabled = false; go.textContent = "Set new password"; }
  };
  $$("input").forEach(i => i.onkeydown = e => { if (e.key === "Enter") go.click(); });
}
async function checkRec() { if (!S.me) return; S.noRec = !(await api.hasRecovery()); if ($(".hero") && S.tab === "play") nudge(); }
function nudge() {
  if (!S.noRec || $(".nudge") || !$(".hero")) return;
  $(".hero").insertAdjacentHTML("afterend", `<button class="nudge" id="rcn"><b>Protect your account</b><span>Get a recovery code in case you forget your password</span></button>`);
  $("#rcn").onclick = makeCode;
}
async function makeCode() {
  try { const c = await api.makeRecovery(); S.noRec = false; codeScreen(c, "Your recovery code", () => meTab()); } catch (e) { toast(e.message); }
}
function passSheet() {
  sheet(`<h2>Change password</h2><label for="op">Current password</label><input id="op" type="password" autocomplete="current-password"><label for="np1">New password</label><input id="np1" type="password" autocomplete="new-password" placeholder="At least 6 characters">
   <div class="err" id="er" role="alert"></div><button class="btn" id="sv">Save new password</button>`);
  $("#sv").onclick = async () => { const b = $("#sv"); b.disabled = true; try { await api.changePassword($("#op").value, $("#np1").value); closeSheet(); toast("Password changed."); sfx.play("up"); } catch (e) { $("#er").textContent = e.message; b.disabled = false; } };
}

/* ---------- me ---------- */
function meTab() {
  leaveRoom(); S.tab = "me"; const st = S.me;
  frame("me", `<section class="hero"><div class="herov">${avatar(myAv(), 84)}</div><div><h1>${esc(st.id)}</h1><p class="sub" style="margin:2px 0 0">Your player card</p></div></section>
   <div class="card"><div class="stats"><div class="stat"><b>${st.played}</b>Games played</div><div class="stat"><b>${st.wins}</b>Wins</div></div></div>
   <div class="card"><h2>Pick your buddy</h2><p class="sub" style="margin:4px 0 0">Everyone in your room sees this on the board.</p>${avatarGrid(myAv(), `<label class="avup" title="Use your own picture"><input type="file" id="upl" accept="image/*" hidden><span>📷</span><small>My photo</small></label>`)}</div>
   <div class="card"><div class="setrow"><span>Sound effects</span><button class="chip ${sfx.on ? "on" : ""}" id="s2">${sfx.on ? "On" : "Off"}</button></div>
   <div class="setrow"><span>Table color</span><span class="chips">${THEMES.map(t => `<button class="chip ${document.documentElement.dataset.theme === t ? "on" : ""}" data-th="${t}">${THEME_NAMES[t]}</button>`).join("")}</span></div></div>
   <div class="card"><h2>Account security</h2><p class="sub" style="margin:4px 0 12px">${S.noRec ? "You have no recovery code yet. Make one so you can get back in if you forget your password." : "Your recovery code lets you reset a forgotten password. Making a new one replaces the old one."}</p><button class="btn ${S.noRec ? "" : "g"}" id="rc2">${S.noRec ? "Get recovery code" : "New recovery code"}</button><button class="btn g" id="cpw" style="margin-top:12px">Change password</button></div>
   <button class="btn g" id="so">Log out</button>`);
  const setAv = async a => { try { S.me = await api.setAvatar(a) || S.me; } catch (e) { return toast(e.message); } sfx.play("sparkle"); meTab(); };
  $$("[data-av]").forEach(b => b.onclick = () => setAv(b.dataset.av));
  $("#upl").onchange = async e => { const f = e.target.files[0]; if (!f) return; try { setAv(await photoToAvatar(f)); } catch (err) { toast(err.message); } };
  $("#s2").onclick = () => { setSound(!sfx.on); meTab(); };
  $("#rc2").onclick = () => { if (S.noRec) return makeCode(); sheet(`<h2>Make a new code?</h2><p class="sub">Your old recovery code will stop working.</p><div class="row2" style="margin-top:6px"><button class="btn g" id="no">Keep old</button><button class="btn" id="yes">New code</button></div>`); $("#no").onclick = closeSheet; $("#yes").onclick = () => { closeSheet(); makeCode(); }; };
  $("#cpw").onclick = passSheet;
  $$("[data-th]").forEach(b => b.onclick = () => { setTheme(b.dataset.th); meTab(); });
  $("#so").onclick = () => { api.logOut(); S.noRec = false; S.social = { friends: [], incoming: [], outgoing: [], invites: [] }; $$(".invbar").forEach(x => x.remove()); authScreen("in"); };
}

/* ---------- boot ---------- */
(async function boot() {
  app.innerHTML = LOGO + `<p class="tag">Loading…</p>`;
  const join = (location.hash.match(/join=([A-Za-z0-9]{6})/) || [])[1];
  setInterval(() => pollSocial(), 8000);
  S.me = await api.me();
  api.hit();
  checkRec();
  if (!S.me) return authScreen("in");
  pollSocial(true);
  home(join ? join.toUpperCase() : undefined);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { pollSocial(true); resume(); } });
})();
window.__bf = { S, Net, api, startGame };
