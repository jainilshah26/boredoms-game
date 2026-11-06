/* Undercover rules. No screen code, so it can be tested on its own.
   Three similar words from one category are dealt out: civilians, undercover agents and imposters each get a different one
   and nobody knows which team they are on. Players give clues, accuse each other, defend themselves and vote people out. */
import { CATS } from "./undercover_data.js";

export const TEAMS = ["Civilian", "Undercover agent", "Imposter"], TEAM_ICON = ["🧑", "🕵️", "🎭"];
export const MIN = 5, MAX = 20;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];

export function teamSizes(n) { const u = Math.max(1, Math.round(n / 5)), i = Math.max(1, Math.round(n / 7)); return [n - u - i, u, i]; }
const norm = t => String(t || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const clean = (t, max) => String(t || "").replace(/[<>&]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

export const aliveSeats = s => s.players.map((_, i) => i).filter(i => s.alive[i]);
const count = s => { const c = [0, 0, 0]; aliveSeats(s).forEach(i => c[s.role[i]]++); return c; };

export function init(players) {
  const n = players.length, [c, u, i] = teamSizes(n), cat = pick(CATS), set = shuffle(pick(cat.sets).slice());
  const roles = shuffle([...Array(c).fill(0), ...Array(u).fill(1), ...Array(i).fill(2)]);
  const s = { players, n, cat: cat.n, emoji: cat.e, set, role: roles, word: roles.map(r => set[r]), alive: players.map(() => true), ready: players.map(p => !!p.bot),
    phase: "reveal", round: 1, order: [], turn: -1, clues: [], history: [], votes: {}, tally: null, accused: [], single: false, defenses: {}, votes2: {}, spares: 0, last: null, over: false, winner: [], winners: [], used: [] };
  if (s.ready.every(Boolean)) startClues(s);
  return s;
}
const startClues = s => {
  const al = aliveSeats(s), k = (s.round - 1) % al.length; s.order = [...al.slice(k), ...al.slice(0, k)]; s.clues = []; s.votes = {}; s.votes2 = {}; s.defenses = {}; s.accused = []; s.tally = null;
  s.phase = "clue"; s.turn = s.order[0];
};
/* second vote: who someone may choose (not themselves; -1 means spare everyone, only while sparing is still allowed) */
const opts2 = (s, p) => [...s.accused.filter(i => i !== p), ...(s.spares < 2 ? [-1] : [])];
const voters = s => s.phase === "vote2" ? aliveSeats(s).filter(i => opts2(s, i).length) : aliveSeats(s);
const everyoneVoted = (s, v) => voters(s).every(i => v[i] !== undefined);

/* who still has to act (bots are driven from this) */
export function pending(s) {
  if (s.over) return [];
  const al = aliveSeats(s);
  if (s.phase === "reveal") return s.players.map((_, i) => i).filter(i => !s.ready[i]);
  if (s.phase === "clue" || s.phase === "defend") return [s.turn];
  if (s.phase === "vote1") return al.filter(i => s.votes[i] === undefined);
  if (s.phase === "vote2") return voters(s).filter(i => s.votes2[i] === undefined);
  if (s.phase === "result") return s.players.some(p => !p.bot) ? [] : [al[0] ?? 0];
  return [];
}

function winCheck(s) {
  const [c, u, i] = count(s);
  if (u + i === 0) { s.over = true; s.winners = [0]; }
  else if (c <= u + i) { s.over = true; s.winners = [u ? 1 : null, i ? 2 : null].filter(x => x != null); }
  if (s.over) { s.phase = "over"; s.turn = -1; s.winner = s.players.map((_, k) => k).filter(k => s.winners.includes(s.role[k])); }
  return s.over;
}

export function act(s, a) {
  if (s.over || a.p == null || a.p < 0 || a.p >= s.n) return null; const p = a.p, ev = [];
  if (a.a === "ready" && s.phase === "reveal") {
    if (s.ready[p]) return null; s.ready[p] = true; ev.push({ t: "ready", p });
    if (s.ready.every(Boolean)) { startClues(s); ev.push({ t: "phase", ms: 300 }); } return ev;
  }
  if (a.a === "clue" && s.phase === "clue" && s.turn === p && s.alive[p]) {
    const text = clean(a.text, 24); if (!text) return null;
    if (norm(text) === norm(s.word[p])) return null;
    s.clues.push({ p, text }); s.used.push(norm(text)); ev.push({ t: "clue", p, text, ms: 250 });
    const k = s.order.indexOf(p) + 1; if (k < s.order.length) s.turn = s.order[k]; else { s.phase = "vote1"; s.turn = -1; ev.push({ t: "phase" }); } return ev;
  }
  if (a.a === "vote" && s.phase === "vote1" && s.alive[p]) {
    const t = a.t | 0; if (t === p || t < 0 || t >= s.n || !s.alive[t]) return null; s.votes[p] = t; ev.push({ t: "vote", p });
    if (everyoneVoted(s, s.votes)) tallyOne(s, ev); return ev;
  }
  if (a.a === "defend" && s.phase === "defend" && s.turn === p) {
    s.defenses[p] = clean(a.text, 90) || "I have nothing to hide."; ev.push({ t: "defend", p, text: s.defenses[p], ms: 300 });
    const k = s.accused.indexOf(p) + 1; if (k < s.accused.length) s.turn = s.accused[k]; else { s.phase = "vote2"; s.turn = -1; s.votes2 = {}; ev.push({ t: "phase" }); } return ev;
  }
  if (a.a === "vote2" && s.phase === "vote2" && s.alive[p]) {
    const t = a.t | 0; if (!opts2(s, p).includes(t) || s.votes2[p] !== undefined) return null; s.votes2[p] = t; ev.push({ t: "vote", p });
    if (everyoneVoted(s, s.votes2)) resolve(s, ev); return ev;
  }
  if (a.a === "next" && s.phase === "result" && (!s.players[p].bot || !s.players.some(q => !q.bot))) {
    s.history.push({ round: s.round, clues: s.clues, elim: s.last ? s.last.elim : -1 }); s.round++; s.last = null; startClues(s); ev.push({ t: "phase" }); return ev;
  }
  return null;
}

/* first vote counted: the most accused (up to three) must defend themselves */
function tallyOne(s, ev) {
  const c = {}; Object.values(s.votes).forEach(t => { c[t] = (c[t] || 0) + 1; });
  const top = Math.max(...Object.values(c)); let tops = Object.keys(c).filter(k => c[k] === top).map(Number);
  s.single = tops.length === 1; if (tops.length > 3) tops = shuffle(tops).slice(0, 3);
  s.tally = c; s.accused = tops.sort((a, b) => s.order.indexOf(a) - s.order.indexOf(b)); s.phase = "defend"; s.turn = s.accused[0]; s.defenses = {}; ev.push({ t: "tally", ms: 600 }, { t: "phase" });
}
/* second vote counted: someone goes, or everyone is spared */
function resolve(s, ev) {
  const c = {}; Object.values(s.votes2).forEach(t => { c[t] = (c[t] || 0) + 1; });
  const top = Math.max(...Object.values(c)); const tops = Object.keys(c).filter(k => c[k] === top).map(Number);
  let out = tops.length === 1 ? tops[0] : (tops.includes(-1) ? -1 : pick(tops));
  if (out === -1 || out === undefined) { s.spares++; s.last = { elim: -1 }; ev.push({ t: "spare", ms: 500 }); }
  else { s.spares = 0; s.alive[out] = false; s.last = { elim: out, role: s.role[out], word: s.word[out] }; ev.push({ t: "elim", p: out, role: s.role[out], ms: 900 }); }
  s.tally2 = c; s.phase = "result"; s.turn = -1;
  if (winCheck(s)) ev.push({ t: "win", ms: 800 }); else ev.push({ t: "phase" });
}

/* a human left: a bot takes over their seat */
export function onLeave(s, i) {
  if (!s.players[i] || s.players[i].bot) return null; s.players[i].bot = true; s.players[i].id = null; s.players[i].n += " (left)"; s.ready[i] = true;
  const ev = [{ t: "left", p: i }];
  if (s.phase === "reveal" && s.ready.every(Boolean)) { startClues(s); ev.push({ t: "phase" }); }
  return ev;
}

/* ---------- bots ---------- */
const DEFENSE = ["That clue was honest, I promise.", "Why me? Look at the others.", "My word fits what I said.", "I'm just a normal player.", "You're making a mistake.", "Ask the quiet ones instead.", "Everything I said was true.", "I'd vote for someone else."];
export function bot(s, seat) {
  const p = seat ?? s.turn, cat = CATS.find(c => c.n === s.cat), al = aliveSeats(s);
  if (s.phase === "reveal") return { a: "ready" };
  if (s.phase === "clue") {
    const base = cat.clues.filter(w => norm(w) !== norm(s.word[p])), pool = base.filter(w => !s.used.includes(norm(w)));
    return { a: "clue", text: pick(pool.length ? pool : base) };
  }
  if (s.phase === "vote1") {
    const cand = al.filter(i => i !== p); /* a little suspicion: clues that repeat what others said look safe, odd ones look suspicious */
    const sc = i => { const c = s.clues.find(x => x.p === i); const odd = c && !cat.clues.includes(c.text.toLowerCase()) ? 2 : 0; return odd + Math.random() * 3; };
    return { a: "vote", t: cand.sort((a, b) => sc(b) - sc(a))[0] };
  }
  if (s.phase === "defend") return { a: "defend", text: pick(DEFENSE) };
  if (s.phase === "vote2") {
    const cand = opts2(s, p).filter(i => i >= 0).sort((a, b) => ((s.tally || {})[b] || 0) - ((s.tally || {})[a] || 0));
    if (!cand.length || (s.spares < 2 && Math.random() < .12)) return { a: "vote2", t: -1 };
    return { a: "vote2", t: cand[0] };
  }
  if (s.phase === "result") return { a: "next" };
  return null;
}
