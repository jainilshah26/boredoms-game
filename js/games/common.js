import { avatar } from "../avatars.js";
export { sleep } from "../fx.js";

export const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const $ = (r, s) => r.querySelector(s);
export const $$ = (r, s) => [...r.querySelectorAll(s)];

/* Runs state updates one after another so animations never overlap. */
export function queue(fn) {
  let busy = false; const q = [];
  async function run() {
    if (busy) return; busy = true;
    while (q.length) { const it = q.shift(); try { await fn(it.s, it.e); } catch (e) { console.error(e); } }
    busy = false;
  }
  return { push(s, e) { q.push({ s, e }); run(); }, get busy() { return busy || q.length > 0; } };
}

/* A row of player avatars. The player whose turn it is bounces and glows. */
export function stripHTML(players, info = []) {
  return `<div class="strip">${players.map((p, i) => `<div class="pcell" data-pi="${i}" style="--pc:${p.c}">${avatar(p.av, 40, p.c)}<b>${esc(p.n)}${p.bot ? " 🤖" : ""}</b><small class="pinfo">${info[i] ?? ""}</small></div>`).join("")}</div>`;
}
export function setStrip(root, turn, info) {
  $$(root, ".pcell").forEach((c, i) => { c.classList.toggle("turn", i === turn); if (info && info[i] != null) $(c, ".pinfo").innerHTML = info[i]; });
}
export const pcell = (root, i) => root.querySelector(`.pcell[data-pi="${i}"] .avatar`);
export const rect = el => el.getBoundingClientRect();

/* Banner under the board: whose move it is, or the result. */
export function banner(root, text, kind = "") { const b = $(root, ".banner"); if (!b) return; b.className = "banner " + kind; b.innerHTML = text; }
