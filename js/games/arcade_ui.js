/* Screen pieces shared by the arcade games. */
import { esc, $, banner } from "./common.js";
import { sfx, burst, confetti } from "../fx.js";

export const lbHTML = (list, me) => `<ol class="lb">${(list || []).slice(0, 5).map((r, i) => `<li class="${r.name === me ? "me" : ""}"><span>${i + 1}</span><b>${esc(r.name)}</b><em>${r.score}</em></li>`).join("") || `<li class="empty">Be the first on the board!</li>`}</ol>`;

export function stripInfo(S, P) { return P.map((_, i) => S.scores[i] != null ? `🏁 ${S.scores[i]}` : "playing…"); }

/* one run ended: send the score to the room, save it to the high-score board, show the result */
export async function endRun(ctx, gameId, score, ov, label) {
  ctx.act({ a: "score", score });
  const me = ctx.players[ctx.mySeat >= 0 ? ctx.mySeat : 0].n;
  ov.hidden = false; ov.innerHTML = `<div class="ovc"><h2>${label}</h2><p class="big">${score}</p><p class="sub">points</p><p class="sub" id="ovn">Saving your score…</p></div>`;
  const r = await ctx.api.submitScore(gameId, score); const list = await ctx.api.leaderboard(gameId);
  if (!ov.isConnected) return;
  const improved = r && r.improved && score > 0;
  if (improved) { sfx.play("win"); burst($(ov, ".big") || ov, ["⭐", "✨", "🏆"], 10); }
  $(ov, "#ovn").innerHTML = r ? (improved ? `🎉 New personal best! Rank #${r.rank}` : `Your best: ${r.best} · Rank #${r.rank}`) : "Sign in online to join the leaderboard.";
  $(ov, ".ovc").insertAdjacentHTML("beforeend", `<h3>Top players</h3>${lbHTML(list, me)}<div class="ovb" id="ovb"></div>`);
}
export function ovButtons(ov, S, ctx, againLabel = "Play again") {
  const b = $(ov, "#ovb"); if (!b) return;
  const solo = ctx.players.length === 1;
  if (S.over) b.innerHTML = `<button class="btn" id="again">${againLabel}</button>`;
  else b.innerHTML = `<p class="sub">Waiting for the others… (${Object.keys(S.scores).length}/${ctx.players.filter(p => !p.bot).length} finished)</p>${ctx.mySeat === 0 && !solo ? `<button class="btn g sm" id="fin">End round for everyone</button>` : ""}`;
  const a = $(ov, "#again"); if (a) a.onclick = () => ctx.act({ a: "again" });
  const f = $(ov, "#fin"); if (f) f.onclick = () => ctx.act({ a: "fin" });
}
export function winBanner(root, S, P, ctx) {
  if (!S.over) return;
  const solo = P.length === 1; if (solo) return banner(root, "Run finished", "won");
  banner(root, S.winner >= 0 ? `🏆 ${esc(P[S.winner].n)} wins with ${S.scores[S.winner] ?? 0}!` : "Round over", "won");
}
export { confetti };
