/* Accounts (Supabase), live rooms (Supabase Realtime) and the host-side game runner. */
import { CONFIG } from "./config.js";
import { store, toast } from "./fx.js";
import { GAME } from "./games/index.js";

export const PID = (() => { const r = () => Math.random().toString(36).slice(2, 10); try { let p = sessionStorage.getItem("bf_pid"); if (!p) { p = r(); sessionStorage.setItem("bf_pid", p); } return p; } catch (e) { return r(); } })();
/* ?offline switches to a test mode: accounts live on this device and rooms work between tabs of one browser. */
export const cloud = !!(CONFIG.url && CONFIG.key) && !/[?&]offline/.test(location.search);

let sbp = null;
function sbClient() {
  if (sbp) return sbp;
  sbp = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
    s.onload = () => res(window.supabase.createClient(CONFIG.url, CONFIG.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 25 } } }));
    s.onerror = () => { sbp = null; rej(new Error("Couldn't reach the game server. Check your internet.")); }; document.head.appendChild(s);
  });
  return sbp;
}
async function sha(s) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join(""); }

/* ---------- accounts ---------- */
const rpc = async (fn, args) => { const { data, error } = await (await sbClient()).rpc(fn, args); if (error) throw new Error(error.message || "Something went wrong."); return data; };
const LU = () => store.get("bf_users", {});
export const api = {
  token: store.get("bf_token"),
  async signUp(id, pw, av) {
    if (cloud) { const r = await rpc("bf_signup", { p_id: id, p_pw: pw, p_avatar: av }); this.token = r.token; store.set("bf_token", r.token); return r.profile; }
    const u = LU(), k = id.toLowerCase(); if (u[k]) throw new Error("That Player ID is taken. Try another.");
    u[k] = { id, h: await sha(k + pw), avatar: av, played: 0, wins: 0 }; store.set("bf_users", u); this.token = k; store.set("bf_token", k); return { id, avatar: av, played: 0, wins: 0 };
  },
  async logIn(id, pw) {
    if (cloud) { const r = await rpc("bf_login", { p_id: id, p_pw: pw }); this.token = r.token; store.set("bf_token", r.token); return r.profile; }
    const u = LU(), k = id.toLowerCase(), r = u[k]; if (!r || r.h !== await sha(k + pw)) throw new Error("Wrong Player ID or password.");
    this.token = k; store.set("bf_token", k); return { id: r.id, avatar: r.avatar, played: r.played, wins: r.wins };
  },
  async me() {
    if (!this.token) return null;
    try {
      if (cloud) return await rpc("bf_me", { p_token: this.token });
      const r = LU()[this.token]; return r ? { id: r.id, avatar: r.avatar, played: r.played, wins: r.wins } : null;
    } catch (e) { return null; }
  },
  async setAvatar(av) {
    if (cloud) return rpc("bf_set_avatar", { p_token: this.token, p_avatar: av });
    const u = LU(); if (u[this.token]) { u[this.token].avatar = av; store.set("bf_users", u); const r = u[this.token]; return { id: r.id, avatar: av, played: r.played, wins: r.wins }; }
  },
  async record(won) {
    try {
      if (cloud) return await rpc("bf_record", { p_token: this.token, p_won: !!won });
      const u = LU(), r = u[this.token]; if (r) { r.played++; if (won) r.wins++; store.set("bf_users", u); return { id: r.id, avatar: r.avatar, played: r.played, wins: r.wins }; }
    } catch (e) { }
  },
  logOut() { this.token = null; store.set("bf_token", null); },
};

/* ---------- realtime bus ---------- */
async function makeBus(name, onmsg, ondrop) {
  if (cloud) {
    const c = await sbClient();
    return new Promise((res, rej) => {
      const ch = c.channel(name, { config: { broadcast: { self: true } } }); let ok = false;
      ch.on("broadcast", { event: "m" }, p => onmsg(p.payload)).subscribe(st => {
        if (st === "SUBSCRIBED" && !ok) { ok = true; res({ send: m => ch.send({ type: "broadcast", event: "m", payload: m }), close: () => c.removeChannel(ch) }); }
        else if (!ok && (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED")) rej(new Error(st));
        else if (ok && (st === "CHANNEL_ERROR" || st === "TIMED_OUT")) ondrop && ondrop();
      });
      setTimeout(() => { if (!ok) rej(new Error("timeout")); }, 9000);
    });
  }
  const bc = new BroadcastChannel(name); bc.onmessage = e => onmsg(e.data);
  return { send: m => { bc.postMessage(m); setTimeout(() => onmsg(JSON.parse(JSON.stringify(m))), 0); }, close: () => bc.close() };
}

/* ---------- the room ---------- */
export const COLORS = ["#E8453C", "#2E7BE8", "#F2B632", "#26B574", "#9B59D8", "#F2842B", "#14AEC2", "#E0539A", "#EDE6D3", "#7C8AA8"];
export const rid = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.random() * 32 | 0]).join("");
export const Net = {
  room: null, bus: null, isHost: false, timers: [], gen: 0, hostSeen: 0, seen: {}, pending: null,
  runner: null, lastSeq: -1,
  cb: { roster() { }, start() { }, state() { }, react() { }, closed() { }, toLobby() { } },
};
const chanName = async (id, pw) => "bf-" + id + "-" + (await sha(id + pw)).slice(0, 12);
const L = () => Net.cb;
export const live = () => !!(Net.room && Net.room.live);

export function closeRoom(late) {
  Net.gen++; Net.timers.forEach(clearInterval); Net.timers = [];
  if (Net.runner) Net.runner.stop(); Net.runner = null;
  const b = Net.bus; Net.bus = null; if (b) setTimeout(() => { try { b.close(); } catch (e) { } }, late ? 400 : 0);
  Net.room = null; Net.isHost = false; Net.pending = null; Net.seen = {}; Net.lastSeq = -1;
}
export function leaveRoom() {
  if (Net.bus) { try { Net.bus.send(Net.isHost ? { t: "closed", from: PID } : { t: "leave", from: PID }); } catch (e) { } }
  closeRoom(true);
}
addEventListener("pagehide", () => { try { leaveRoom(); } catch (e) { } });

const rosterMsg = () => { const r = Net.room; return { t: "roster", from: PID, room: { id: r.id, max: r.max, host: r.host, hostId: r.hostId, players: r.players, inGame: !!Net.runner } }; };
const sendRoster = () => { if (Net.room && Net.bus) Net.bus.send(rosterMsg()); };

export async function hostRoom({ max, live: isLive, me }) {
  closeRoom(); const gen = Net.gen;
  const room = { id: rid(), pw: String(1000 + Math.random() * 9000 | 0), max, live: isLive, host: me.n, hostId: PID, players: [{ id: PID, n: me.n, av: me.av, c: COLORS[0] }] };
  if (isLive) {
    Net.bus = await makeBus(await chanName(room.id, room.pw), m => { if (gen === Net.gen) handle(m); }, drop);
    Net.room = room; Net.isHost = true;
    Net.timers.push(setInterval(() => {
      sendRoster(); const now = Date.now();
      room.players.slice().forEach(p => { if (p.id !== PID && now - (Net.seen[p.id] || now) > 15000) removePlayer(p.id, "lost connection"); });
      if (Net.runner) Net.runner.resync();
    }, 3000));
    sendRoster();
  } else { Net.room = room; Net.isHost = true; }
  return room;
}
export async function joinRoom(id, pw, me) {
  closeRoom(); const gen = Net.gen;
  try { Net.bus = await makeBus(await chanName(id, pw), m => { if (gen === Net.gen) handle(m); }, drop); }
  catch (e) { throw new Error("Couldn't connect. Check your internet and try again."); }
  return new Promise((res, rej) => {
    let tries = 0; const hello = () => Net.bus && Net.bus.send({ t: "hello", from: PID, n: me.n, av: me.av });
    const p = { id, pw, res, rej }; Net.pending = p;
    p.timer = setInterval(() => {
      if (Net.pending !== p) return clearInterval(p.timer);
      if (++tries >= 5) { clearInterval(p.timer); Net.pending = null; closeRoom(); rej(new Error("No open room found with that ID and password. Ask the host to keep the room open.")); } else hello();
    }, 1100); hello();
  });
}
function drop() { if (!Net.bus) return; closeRoom(); toast("Connection lost."); L().closed("Connection lost."); }

function removePlayer(id, why) {
  const r = Net.room; const p = r.players.find(x => x.id === id); if (!p) return;
  r.players = r.players.filter(x => x.id !== id);
  if (Net.runner && !Net.runner.g.anytime && Net.runner.players.some(x => x.id === id)) { Net.bus && Net.bus.send({ t: "toLobby", from: PID, why: `${p.n} ${why || "left"}. Round ended.` }); }
  sendRoster(); L().roster();
}
function handle(m) {
  if (!m || !m.t) return;
  if (m.from && m.from !== PID) { Net.seen[m.from] = Date.now(); if (Net.room && m.from === Net.room.hostId) Net.hostSeen = Date.now(); }
  const r = Net.room, fromHost = r && m.from === r.hostId;
  switch (m.t) {
    case "hello": if (Net.isHost && m.from !== PID) hostAdd(m); break;
    case "roster": onRoster(m); break;
    case "denied": if (m.to === PID && Net.pending) { const p = Net.pending; Net.pending = null; clearInterval(p.timer); closeRoom(); p.rej(new Error(m.why)); } break;
    case "start": if (fromHost) { Net.lastSeq = m.seq; L().start(m); } break;
    case "state": if (fromHost && m.seq > Net.lastSeq) { Net.lastSeq = m.seq; L().state(m); } break;
    case "act": if (Net.isHost && Net.runner) { const i = Net.runner.players.findIndex(p => p.id === m.from); if (i >= 0) Net.runner.act(i, m.a); } break;
    case "toLobby": if (fromHost) { if (Net.runner) { Net.runner.stop(); Net.runner = null; } Net.lastSeq = -1; L().toLobby(m.why); } break;
    case "leave": if (Net.isHost) removePlayer(m.from, "left"); break;
    case "closed": if (!Net.isHost && fromHost) { closeRoom(); toast("The host closed the room."); L().closed("The host closed the room."); } break;
    case "react": L().react(m); break;
  }
}
function hostAdd(m) {
  const r = Net.room; let p = r.players.find(x => x.id === m.from);
  if (!p) {
    if (Net.runner) return Net.bus.send({ t: "denied", to: m.from, why: "A game is in progress. Try again in a minute." });
    if (r.players.length >= r.max) return Net.bus.send({ t: "denied", to: m.from, why: "This room is full." });
    const base = String(m.n || "Player").slice(0, 14); let nm = base, k = 2; while (r.players.some(x => x.n.toLowerCase() === nm.toLowerCase())) nm = base + " " + k++;
    const c = COLORS.find(c => !r.players.some(x => x.c === c)) || COLORS[0];
    r.players.push({ id: m.from, n: nm, av: m.av || "cat", c });
  }
  Net.seen[m.from] = Date.now(); sendRoster(); L().roster();
}
function onRoster(m) {
  if (Net.pending) {
    if (!m.room.players.some(p => p.id === PID)) return;
    const p = Net.pending; Net.pending = null; clearInterval(p.timer);
    Net.room = { ...m.room, pw: p.pw, live: true }; Net.hostSeen = Date.now();
    Net.timers.push(setInterval(() => { if (!Net.bus) return; Net.bus.send({ t: "hb", from: PID }); if (Net.room && Date.now() - Net.hostSeen > 15000) { closeRoom(); toast("Lost connection to the host."); L().closed("Lost connection to the host."); } }, 4000));
    p.res(Net.room); return;
  }
  const r = Net.room; if (!r || Net.isHost || m.from !== r.hostId) return;
  if (!m.room.players.some(p => p.id === PID)) { closeRoom(); toast("You were removed from the room."); L().closed("You were removed from the room."); return; }
  r.players = m.room.players; r.max = m.room.max; r.inGame = m.room.inGame; L().roster();
}

/* ---------- messages the UI sends ---------- */
export const send = {
  react(e, n) { if (Net.bus) Net.bus.send({ t: "react", from: PID, e, n }); else L().react({ from: PID, e, n }); },
  act(a, p) { // p is the seat index (used on one phone); online the host works out the seat from who sent it
    if (!live()) { Net.runner && Net.runner.act(p, a); return; }
    if (Net.isHost && Net.runner) { const i = Net.runner.players.findIndex(x => x.id === PID); Net.runner.act(p != null ? p : i, a); return; }
    Net.bus && Net.bus.send({ t: "act", from: PID, a });
  },
};

/* ---------- host: run a game ---------- */
export function startGame(gameId, bots) {
  const r = Net.room, g = GAME[gameId];
  const humans = r.players.slice(0, g.max).map(p => ({ id: p.id, n: p.n, av: p.av, c: p.c }));
  const want = Math.min(g.max, Math.max(g.min, humans.length + (bots || 0)));
  const BOTS = ["Pixel", "Turbo", "Nova", "Zippy", "Biscuit", "Comet", "Mango", "Pogo", "Waffles"], BAV = ["robot", "alien", "ghost", "dino", "pig", "frog", "koala", "unicorn", "axolotl", "bear"];
  const players = [...humans]; let k = 0;
  while (players.length < want) { players.push({ id: null, n: BOTS[(k + (Math.random() * 9 | 0)) % BOTS.length] + (k ? "" : ""), av: BAV[(k * 3 + (Math.random() * 9 | 0)) % BAV.length], c: COLORS[players.length % COLORS.length], bot: true }); k++; }
  const used = new Set(); players.forEach(p => { if (p.bot) { while (used.has(p.n) || humans.some(h => h.n === p.n)) p.n += "!"; used.add(p.n); } });
  Net.runner = new Runner(gameId, players, r.live);
  Net.runner.begin();
}
class Runner {
  constructor(id, players, isLive) { this.gid = id; this.g = GAME[id]; this.players = players; this.live = isLive; this.seq = 0; this.timer = null; this.dead = false; }
  begin() {
    this.s = this.g.init(this.players); this.players = this.s.players;
    this.out({ t: "start", from: PID, g: this.gid, seq: 0, s: this.s, players: this.s.players });
    this.nextBot(400);
  }
  out(m) { if (this.live) Net.bus.send(m); else { const c = JSON.parse(JSON.stringify(m)); setTimeout(() => { if (this.dead) return; if (c.t === "start") L().start(c); else L().state(c); }, 0); } }
  act(p, a) {
    if (this.dead) return; const s = this.s;
    let ev;
    if (a.a === "again") {
      if (!s.over) return;
      const ns = this.g.init(s.players); Object.keys(s).forEach(k => delete s[k]); Object.assign(s, ns); ev = [{ t: "reset" }];
    } else {
      if (!this.g.anytime && s.turn !== p) return;
      try { ev = this.g.act(s, { ...a, p }); } catch (e) { console.error(e); return; }
    }
    if (!ev) return;
    this.seq++; this.out({ t: "state", from: PID, seq: this.seq, s, ev });
    const ms = ev.reduce((t, e) => t + (e.ms || 0), 0); this.nextBot(500 + ms);
  }
  resync() { if (this.live && !this.dead) this.out({ t: "state", from: PID, seq: this.seq, s: this.s, ev: [], re: true }); }
  nextBot(delay) {
    clearTimeout(this.timer); if (this.dead) return;
    const s = this.s; if (s.turn < 0 || s.over) return;
    const tp = this.players[s.turn]; if (!tp || !tp.bot) return;
    this.timer = setTimeout(() => { if (this.dead) return; const a = this.g.bot(this.s); if (a) this.act(this.s.turn, a); else this.nextBot(600); }, delay);
  }
  stop() { this.dead = true; clearTimeout(this.timer); }
}
export function endRound(why) {
  if (Net.runner) { Net.runner.stop(); Net.runner = null; }
  if (live() && Net.bus && Net.isHost) Net.bus.send({ t: "toLobby", from: PID, why });
  else L().toLobby(why);
}
