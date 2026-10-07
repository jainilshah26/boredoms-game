import { esc, $, $$, queue, stripHTML, setStrip, banner, sleep } from "./common.js";
import { sfx, burst, shake, floatText, reduced } from "../fx.js";

const PEERS = Array.from({ length: 81 }, (_, i) => { const r = i / 9 | 0, c = i % 9, s = new Set(); for (let k = 0; k < 9; k++) { s.add(r * 9 + k); s.add(k * 9 + c); } const br = r - r % 3, bc = c - c % 3; for (let a = 0; a < 3; a++)for (let b = 0; b < 3; b++)s.add((br + a) * 9 + bc + b); s.delete(i); return [...s]; });
const pop = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
const cands = (g, i) => { let m = 0; for (const j of PEERS[i]) if (g[j]) m |= 1 << g[j]; return ~m & 0x3fe; };
function pick(g) { let best = -1, bc = 10, bm = 0; for (let i = 0; i < 81; i++) if (!g[i]) { const m = cands(g, i), c = pop(m); if (c < bc) { bc = c; best = i; bm = m; if (c <= 1) break; } } return [best, bc, bm]; }
function count(g, lim) { const [b, bc, bm] = pick(g); if (b < 0) return 1; if (!bc) return 0; let n = 0; for (let d = 1; d <= 9; d++) if (bm & (1 << d)) { g[b] = d; n += count(g, lim - n); g[b] = 0; if (n >= lim) break; } return n; }
function fill(g) { const [b, bc, bm] = pick(g); if (b < 0) return true; if (!bc) return false; const ds = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => bm & (1 << d)).sort(() => Math.random() - .5); for (const d of ds) { g[b] = d; if (fill(g)) return true; g[b] = 0; } return false; }
function make(remove) {
  const sol = Array(81).fill(0); fill(sol); const pz = [...sol]; const order = [...Array(81).keys()].sort(() => Math.random() - .5); let gone = 0;
  for (const i of order) { if (gone >= remove) break; const v = pz[i]; pz[i] = 0; if (count([...pz], 2) === 1) gone++; else pz[i] = v; }
  return { sol, pz };
}
const fmt = t => `${t / 60 | 0}:${String(t % 60).padStart(2, "0")}`;

export default {
  id: "sdk", name: "Sudoku", min: 1, max: 10, anytime: true, solo: true,
  init(players) { const { sol, pz } = make(44); return { players, puzzle: pz, sol, solved: [], turn: -1, over: false, winner: -1, t0: Date.now() }; },
  act(s, a) {
    if (a.a !== "solved" || s.solved.includes(a.p)) return null;
    s.solved.push(a.p); const ev = [{ t: "solved", p: a.p, first: !s.over, ms: 400 }];
    if (!s.over) { s.over = true; s.winner = a.p; } return ev;
  },
  bot() { return null },
  mount(root, ctx) {
    const P = ctx.players, me = ctx.mySeat >= 0 ? ctx.mySeat : 0, S = ctx.state;
    const vals = [...S.puzzle]; let sel = -1, mistakes = 0, hints = 0, t = 0, done = false, timer = null;
    root.innerHTML = `<div class="game sdk">${P.length > 1 ? stripHTML(P, P.map(() => "🧩")) : ""}
      <div class="sstat"><span>⏱ <b id="tm">0:00</b></span><span>❌ <b id="ms">0</b></span><span>💡 <b id="hs">0</b></span></div>
      <div class="banner"></div>
      <div class="sgrid">${Array.from({ length: 81 }, (_, i) => `<button class="sc9${S.puzzle[i] ? " fix" : ""}${(i / 9 | 0) % 3 === 2 && i < 72 ? " rb" : ""}${i % 3 === 2 && i % 9 < 8 ? " cb" : ""}" data-i="${i}" aria-label="Row ${(i / 9 | 0) + 1} column ${i % 9 + 1}">${S.puzzle[i] || ""}</button>`).join("")}</div>
      <div class="npad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join("")}<button data-n="0" class="er" aria-label="Erase">⌫</button><button id="hint" class="ht">💡 Hint</button></div>
      <div class="actions" id="acts"></div></div>`;
    const cells = $$(root, ".sc9"), startAt = S.t0 && Math.abs(Date.now() - S.t0) < 3600000 ? S.t0 : Date.now();
    const render = () => {
      const sv = sel >= 0 ? vals[sel] : 0;
      cells.forEach((c, i) => {
        const v = vals[i]; if (c.textContent !== (v ? String(v) : "")) c.textContent = v || "";
        c.classList.toggle("bad", !!v && !S.puzzle[i] && v !== S.sol[i]); c.classList.toggle("sel", i === sel);
        c.classList.toggle("peer", sel >= 0 && i !== sel && PEERS[sel].includes(i)); c.classList.toggle("same", !!sv && v === sv && i !== sel);
      });
      $$(root, ".npad [data-n]").forEach(b => { const n = +b.dataset.n; if (n) b.classList.toggle("full", vals.filter(v => v === n).length >= 9 && cells.every((c, i) => vals[i] !== n || vals[i] === S.sol[i])); });
      $(root, "#ms").textContent = mistakes; $(root, "#hs").textContent = hints;
    };
    const check = () => {
      if (done || !vals.every((v, i) => v === S.sol[i])) return; done = true; clearInterval(timer);
      sfx.play("win"); wave(); ctx.act({ a: "solved" });
    };
    const wave = async () => { if (reduced()) return; cells.forEach((c, i) => c.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)", background: "#E8C766" }, { transform: "scale(1)" }], { duration: 500, delay: ((i / 9 | 0) + i % 9) * 45 })); };
    const put = n => {
      if (done || S.over && !P[me]) return; if (sel < 0 || S.puzzle[sel]) { sfx.play("err"); return; }
      if (n && n !== S.sol[sel]) { mistakes++; sfx.play("err"); shake(cells[sel], 250); } else if (n) sfx.play("pop");
      vals[sel] = n; render(); if (n === S.sol[sel]) { const rowDone = [...Array(9).keys()].every(k => vals[(sel / 9 | 0) * 9 + k] === S.sol[(sel / 9 | 0) * 9 + k]); if (rowDone) { sfx.play("sparkle"); burst(cells[sel], ["✨"], 5); } } check();
    };
    cells.forEach((c, i) => c.onclick = () => { sel = i; sfx.play("tap"); render(); });
    $$(root, ".npad [data-n]").forEach(b => b.onclick = () => put(+b.dataset.n));
    $(root, "#hint").onclick = () => {
      if (done) return; let i = sel >= 0 && !S.puzzle[sel] && vals[sel] !== S.sol[sel] ? sel : cells.findIndex((_, k) => !S.puzzle[k] && vals[k] !== S.sol[k]); if (i < 0) return;
      sel = i; vals[i] = S.sol[i]; hints++; sfx.play("sparkle"); burst(cells[i], ["💡", "✨"], 4); render(); check();
    };
    const key = e => { if (!root.isConnected) return removeEventListener("keydown", key); if (/^[1-9]$/.test(e.key)) put(+e.key); else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") put(0); else if (e.key.startsWith("Arrow") && sel >= 0) { const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key], n = sel + d; if (n >= 0 && n < 81 && !(d === -1 && sel % 9 === 0) && !(d === 1 && sel % 9 === 8)) { sel = n; render(); } e.preventDefault(); } };
    addEventListener("keydown", key);
    timer = setInterval(() => { if (!done && !S.over) { t = Math.floor((Date.now() - startAt) / 1000); $(root, "#tm").textContent = fmt(Math.max(0, t)); } }, 500);
    const paint = s => {
      S.over = s.over; S.solved = s.solved;
      if (P.length > 1) setStrip(root, -1, P.map((_, i) => s.solved.includes(i) ? `✅ #${s.solved.indexOf(i) + 1}` : "🧩"));
      if (s.over) { clearInterval(timer); banner(root, s.solved.includes(me) && s.winner === me ? `🏆 You solved it${P.length > 1 ? " first" : ""}!` : `🏆 ${esc(P[s.winner].n)} solved it first!`, "won"); $(root, "#acts").innerHTML = `<button class="btn" id="again">${P.length > 1 ? "Play again" : "New puzzle"}</button>`; $(root, "#again").onclick = () => ctx.act({ a: "again" }); }
      else banner(root, P.length > 1 ? "Race! First to fill the grid wins." : "Fill every row, column and box with 1–9.");
    };
    paint(S); render();
    const q = queue(async (s, ev) => { paint(s); for (const e of ev) { if (e.t === "solved" && e.first) { sfx.play("up"); if (e.p !== me) { sfx.play("lose"); floatText($(root, ".sgrid"), `${P[e.p].n} finished first!`, "#FF8A96"); } } } if (s.over && ev.some(e => e.t === "solved")) ctx.finished(s.winner); });
    return { push: (s, e) => q.push(s, e), get busy() { return false; }, destroy() { clearInterval(timer); removeEventListener("keydown", key); } };
  },
};
