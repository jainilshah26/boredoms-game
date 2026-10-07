import { esc, $, $$, queue, stripHTML, setStrip, banner, sleep } from "./common.js";
import { sfx, burst, shake } from "../fx.js";

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const winLine = b => LINES.find(l => b[l[0]] > -1 && l.every(k => b[k] === b[l[0]]));

export default {
  id: "ttt", name: "Tic-Tac-Toe", min: 2, max: 2,
  init(players) { return { players, board: Array(9).fill(-1), turn: 0, line: null, winner: -1, over: false }; },
  act(s, a) {
    if (a.a !== "mark" || s.over || s.turn !== a.p || s.board[a.i] !== -1) return null;
    s.board[a.i] = a.p; const ev = [{ t: "place", i: a.i, p: a.p, ms: 380 }]; const l = winLine(s.board);
    if (l) { s.line = l; s.winner = a.p; s.over = true; s.turn = -1; ev.push({ t: "win", line: l, p: a.p, ms: 900 }); }
    else if (s.board.every(v => v > -1)) { s.over = true; s.turn = -1; ev.push({ t: "draw", ms: 600 }); }
    else s.turn = 1 - s.turn;
    return ev;
  },
  bot(s) {
    const me = s.turn, op = 1 - me, b = s.board, free = b.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0);
    if (Math.random() < .12) return { a: "mark", i: free[Math.random() * free.length | 0] };
    for (const who of [me, op]) for (const l of LINES) { const v = l.map(k => b[k]); if (v.filter(x => x === who).length === 2 && v.includes(-1)) return { a: "mark", i: l[v.indexOf(-1)] }; }
    if (b[4] < 0) return { a: "mark", i: 4 };
    const corners = [0, 2, 6, 8].filter(i => b[i] < 0); if (corners.length) return { a: "mark", i: corners[Math.random() * corners.length | 0] };
    return { a: "mark", i: free[0] };
  },
  mount(root, ctx) {
    const P = ctx.players;
    root.innerHTML = `<div class="game ttt">${stripHTML(P, ["X", "O"])}<div class="banner"></div>
      <div class="tboard"><div class="grid">${Array.from({ length: 9 }, (_, i) => `<button class="tcell" data-i="${i}" aria-label="Square ${i + 1}"></button>`).join("")}</div><svg class="wline" viewBox="0 0 300 300"></svg></div>
      <div class="actions"></div></div>`;
    const cells = $$(root, ".tcell"), wl = $(root, ".wline");
    const mark = (p) => p === 0
      ? `<svg viewBox="0 0 100 100"><path class="m" pathLength="1" d="M22 22L78 78M78 22L22 78" stroke="${P[0].c}" stroke-width="13" stroke-linecap="round" fill="none"/></svg>`
      : `<svg viewBox="0 0 100 100"><circle class="m" pathLength="1" cx="50" cy="50" r="29" stroke="${P[1].c}" stroke-width="13" fill="none" stroke-linecap="round"/></svg>`;
    let shown = Array(9).fill(-1);
    const paint = s => {
      cells.forEach((c, i) => { const v = s.board[i]; if (shown[i] !== v) { c.innerHTML = v > -1 ? mark(v) : ""; c.classList.toggle("filled", v > -1); shown[i] = v; } c.disabled = !(ctx.mine(s.turn) && s.board[i] < 0 && !s.over); });
      wl.innerHTML = ""; cells.forEach(c => c.classList.remove("win", "dim"));
      if (s.line) lineIn(s.line, s, false);
      setStrip(root, s.turn);
      if (s.over) { banner(root, s.winner > -1 ? `🏆 ${esc(P[s.winner].n)} wins!` : "🤝 It's a draw!", "won"); showAgain(); }
      else { const my = ctx.mine(s.turn); banner(root, my ? `Your move! <b>${s.turn ? "O" : "X"}</b>` : `${esc(P[s.turn].n)} is thinking…`); $(root, ".actions").innerHTML = ""; }
    };
    const showAgain = () => { $(root, ".actions").innerHTML = `<button class="btn" id="again">Play again</button>`; $(root, "#again").onclick = () => ctx.act({ a: "again" }); };
    const lineIn = (l, s, anim) => {
      const c = i => [(i % 3) * 100 + 50, (i / 3 | 0) * 100 + 50]; const [x1, y1] = c(l[0]), [x2, y2] = c(l[2]);
      const dx = x2 - x1, dy = y2 - y1, k = 38 / Math.hypot(dx, dy);
      wl.innerHTML = `<line class="${anim ? "drawl" : ""}" x1="${x1 - dx * k * .5}" y1="${y1 - dy * k * .5}" x2="${x2 + dx * k * .5}" y2="${y2 + dy * k * .5}" stroke="#E8C766" stroke-width="10" stroke-linecap="round" pathLength="1"/>`;
      cells.forEach((c, i) => c.classList.add(l.includes(i) ? "win" : "dim"));
    };
    cells.forEach(c => c.onclick = () => ctx.act({ a: "mark", i: +c.dataset.i }));
    const q = queue(async (s, ev) => {
      for (const e of ev) {
        if (e.t === "place") { sfx.play("pop"); cells[e.i].innerHTML = mark(e.p); cells[e.i].classList.add("filled", "pop"); shown[e.i] = e.p; await sleep(300); cells[e.i].classList.remove("pop"); }
        if (e.t === "win") { sfx.play("up"); lineIn(e.line, s, true); e.line.forEach(i => burst(cells[i], ["⭐", "✨"], 4)); await sleep(800); }
        if (e.t === "draw") { sfx.play("bonk"); shake(root.querySelector(".tboard")); await sleep(300); }
        if (e.t === "reset") { shown = Array(9).fill(-1); }
      }
      paint(s);
      if (s.over && ev.some(e => e.t === "win" || e.t === "draw")) ctx.finished(s.winner);
      else if (!s.over && ctx.mine(s.turn) && ev.length) sfx.play("turn");
    });
    paint(ctx.state);
    return { push: (s, e) => q.push(s, e), get busy() { return q.busy; }, destroy() { } };
  },
};
