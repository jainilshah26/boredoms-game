import { $, $$, esc, stripHTML, setStrip, banner, queue, sleep } from "./common.js";
import { sfx, burst, confetti, floatText } from "../fx.js";
import { avatar } from "../avatars.js";
import * as core from "./undercover_core.js";
import { CATS } from "./undercover_data.js";

const { TEAMS, TEAM_ICON } = core;

export default {
  id: "undercover", name: "Undercover", min: core.MIN, max: core.MAX, anytime: true, botOpts: [4, 6, 8, 10, 13, 16, 19],
  init: core.init, act: core.act, bot: core.bot, pending: core.pending, onLeave: core.onLeave,
  mount(root, ctx) {
    const P = ctx.players, local = ctx.local; let S = ctx.state, unlocked = -1, lastSig = "", celebrated = false;
    root.innerHTML = `<div class="game uc">${stripHTML(P, P.map(() => ""))}
      <div class="uc-head"><span id="ucr"></span><b id="ucp"></b></div><div class="uc-word" id="ucw"></div>
      <div class="uc-log" id="uclog" aria-live="polite"></div><div class="uc-panel" id="ucact"></div></div>`;
    const name = i => esc(S.players[i].n), humans = s => s.players.map((p, i) => i).filter(i => !s.players[i].bot);
    /* the people who must act now; in a one-phone game only the first of them gets the screen */
    const actors = s => s.over ? [] : s.phase === "result" ? humans(s) : core.pending(s).filter(i => !s.players[i].bot);
    const viewer = s => local ? unlocked : (ctx.mySeat >= 0 && !S.players[ctx.mySeat].bot ? ctx.mySeat : -1);
    const catOf = s => CATS.find(c => c.n === s.cat);
    /* on one phone the game has to be told which person is acting */
    const act = a => ctx.act(a, local ? (unlocked >= 0 ? unlocked : humans(S)[0]) : undefined);
    const phaseName = s => ({ reveal: "Memorise your word", clue: "Give a clue", vote1: "Who is suspicious?", defend: "Defend yourself", vote2: "Final vote", result: "Result", over: "Game over" })[s.phase];

    function drawLog(s) {
      const rows = []; const hist = s.history.concat(s.over || s.phase === "result" || true ? [{ round: s.round, clues: s.clues, cur: true }] : []);
      hist.forEach(h => {
        rows.push(`<div class="ul-round">Round ${h.round}</div>`);
        h.clues.forEach(c => rows.push(`<div class="ul-line"><b>${esc(s.players[c.p].n)}</b> <span>${esc(c.text)}</span></div>`));
        if (h.cur) {
          if (s.tally) rows.push(`<div class="ul-note">🗳️ Suspects: ${Object.entries(s.tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(s.players[k].n)} (${v})`).join(", ")}</div>`);
          s.accused.forEach(a => { if (s.defenses[a] != null) rows.push(`<div class="ul-line def"><b>🛡 ${esc(s.players[a].n)}</b> <span>${esc(s.defenses[a])}</span></div>`); });
          if (s.last) rows.push(s.last.elim >= 0 ? `<div class="ul-note out">${TEAM_ICON[s.last.role]} <b>${esc(s.players[s.last.elim].n)}</b> was voted out. They were ${/^[AEIOU]/.test(TEAMS[s.last.role]) ? "an" : "a"} <b>${TEAMS[s.last.role]}</b> (word: ${esc(s.last.word)}).</div>` : `<div class="ul-note">😮 Everyone was spared this round.</div>`);
        } else if (h.elim != null) rows.push(h.elim >= 0 ? `<div class="ul-note out">${TEAM_ICON[s.role[h.elim]]} <b>${esc(s.players[h.elim].n)}</b> was voted out (${TEAMS[s.role[h.elim]]}).</div>` : `<div class="ul-note">😮 Everyone was spared.</div>`);
      });
      const el = $(root, "#uclog"), atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60; el.innerHTML = rows.join(""); if (atBottom) el.scrollTop = el.scrollHeight;
    }
    function drawHeader(s, v) {
      $(root, "#ucr").textContent = `${s.emoji} ${s.cat} · Round ${s.round}`; $(root, "#ucp").textContent = phaseName(s);
      const w = $(root, "#ucw");
      if (s.over) w.innerHTML = `<div class="uc-all">${s.players.map((p, i) => `<div class="uc-r ${s.winners.includes(s.role[i]) ? "win" : ""}">${avatar(p.av, 28, p.c)}<span><b>${esc(p.n)}</b><small>${TEAM_ICON[s.role[i]]} ${TEAMS[s.role[i]]} · ${esc(s.word[i])}${s.alive[i] ? "" : " · out"}</small></span></div>`).join("")}</div>`;
      else if (v >= 0) w.innerHTML = `<small>Your word</small><b>${esc(s.word[v])}</b>${s.alive[v] ? `<small>You don't know which team you're on. Work it out from the clues.</small>` : `<small>You're out, but you can still watch. You were ${TEAM_ICON[s.role[v]]} ${TEAMS[s.role[v]]}.</small>`}`;
      else w.innerHTML = local ? `<small>🔒 Your word is hidden</small><b>? ? ?</b>` : `<small>Spectating</small><b>👀</b>`;
    }
    function drawStrip(s) {
      const info = s.players.map((_, i) => !s.alive[i] ? `${TEAM_ICON[s.role[i]]} out` : s.phase === "reveal" ? (s.ready[i] ? "✅" : "…") : s.phase === "vote1" ? (s.votes[i] !== undefined ? "✅ voted" : "…") : s.phase === "vote2" ? (s.votes2[i] !== undefined ? "✅ voted" : "…") : s.accused.includes(i) && s.phase === "defend" ? "🛡 on trial" : "");
      setStrip(root, s.phase === "clue" || s.phase === "defend" ? s.turn : -1, info); $$(root, ".pcell").forEach((c, i) => { c.style.opacity = s.alive[i] ? "" : ".45"; });
    }
    const voteBtns = (list, s, chosen, extra = "") => `<div class="uc-votes">${list.map(i => `<button class="ucv ${chosen === i ? "on" : ""}" data-t="${i}">${avatar(s.players[i].av, 34, s.players[i].c)}<b>${esc(s.players[i].n)}</b></button>`).join("")}${extra}</div>`;
    const textBox = (ph, max, btn) => `<div class="uc-say"><input id="ucin" maxlength="${max}" placeholder="${ph}" autocomplete="off" autocapitalize="none"><button class="btn" id="ucsend">${btn}</button></div>`;

    function drawPanel(s, v, cur) {
      const el = $(root, "#ucact"); const list = actors(s), mine = v >= 0 && list.includes(v);
      const wait = () => { const names = list.slice(0, 6).map(i => esc(s.players[i].n)).join(", "); return `<p class="sub">${list.length ? `Waiting for ${names}${list.length > 6 ? " and others" : ""}…` : "…"}</p>`; };
      if (s.over) { const mineWin = s.winner.some(i => ctx.mine(i) && (!local || true)); el.innerHTML = `<h3>${s.winners.includes(0) ? "🧑 The civilians win!" : s.winners.map(t => TEAM_ICON[t] + " " + TEAMS[t] + "s").join(" & ") + " win!"}</h3><p class="sub">${s.winners.includes(0) ? "Every spy was found." : "They stayed hidden until the civilians were outnumbered."}</p><button class="btn" id="ucagain">Play again</button>`; $(el, "#ucagain").onclick = () => act({ a: "again" }); banner(root, `🏆 ${s.winners.includes(0) ? "Civilians" : s.winners.map(t => TEAMS[t]).join(" & ")} won`, "won"); return; }
      if (local && cur >= 0 && unlocked !== cur) { el.innerHTML = `<div class="uc-cover"><h3>Pass the phone to <b>${name(cur)}</b></h3><p class="sub">Only ${name(cur)} should look at the screen.</p><button class="btn" id="ucshow">I'm ${name(cur)}</button></div>`; $(el, "#ucshow").onclick = () => { unlocked = cur; sfx.play("tap"); paint(S); }; banner(root, `${name(cur)}'s turn`); return; }
      if (s.phase === "reveal") {
        if (mine) { el.innerHTML = `<p class="sub">Read your word, then tap the button. Don't show anyone.</p><button class="btn" id="ucok">I've memorised it</button>`; $(el, "#ucok").onclick = () => act({ a: "ready" }); }
        else el.innerHTML = v >= 0 && s.ready[v] ? wait() : wait(); banner(root, "Everyone reads their own word");
      } else if (s.phase === "clue") {
        if (mine) { el.innerHTML = `<h3>Your clue</h3><p class="sub">One word (or two) that describes your word without giving it away. Don't say the word itself.</p>${textBox("Type a clue", 24, "Send")}`; const send = () => { const t = $(el, "#ucin").value.trim(); if (!t) return; act({ a: "clue", text: t }); }; $(el, "#ucsend").onclick = send; $(el, "#ucin").onkeydown = e => { if (e.key === "Enter") send(); }; setTimeout(() => { try { $(el, "#ucin").focus(); } catch (e) { } }, 50); }
        else el.innerHTML = `<p class="sub">${name(s.turn)} is thinking of a clue…</p>`;
        banner(root, mine ? "Your turn: give a clue" : `${name(s.turn)} is giving a clue`);
      } else if (s.phase === "vote1") {
        if (mine) { const cand = core.aliveSeats(s).filter(i => i !== v); el.innerHTML = `<h3>Who doesn't fit?</h3><p class="sub">Tap the player you think has a different word. Talk it over first!</p>${voteBtns(cand, s, s.votes[v])}`; $$(el, ".ucv").forEach(b => b.onclick = () => { sfx.play("tap"); act({ a: "vote", t: +b.dataset.t }); }); }
        else el.innerHTML = (v >= 0 && s.alive[v]) ? `<p class="sub">You voted. ${wait().replace('<p class="sub">', "").replace("</p>", "")}</p>` : wait();
        banner(root, "Vote for the most suspicious player");
      } else if (s.phase === "defend") {
        const who = s.accused.map(i => `<b>${name(i)}</b>`).join(" and ");
        if (mine) { el.innerHTML = `<h3>You're on trial!</h3><p class="sub">Defend yourself. Convince everyone your word fits the clues.</p>${textBox("Your defence", 90, "Defend")}`; const send = () => { const t = $(el, "#ucin").value.trim() || "I have nothing to hide."; act({ a: "defend", text: t }); }; $(el, "#ucsend").onclick = send; $(el, "#ucin").onkeydown = e => { if (e.key === "Enter") send(); }; setTimeout(() => { try { $(el, "#ucin").focus(); } catch (e) { } }, 50); }
        else el.innerHTML = `<p class="sub">On trial: ${who}.<br>${name(s.turn)} is defending…</p>`;
        banner(root, mine ? "Defend yourself!" : `${name(s.turn)} is defending`);
      } else if (s.phase === "vote2") {
        if (mine) { const opts = [...s.accused.filter(i => i !== v)]; el.innerHTML = `<h3>Who goes home?</h3><p class="sub">Pick one of the accused to vote out${s.spares < 2 ? ", or spare everyone" : ""}.</p>${voteBtns(opts, s, s.votes2[v], s.spares < 2 ? `<button class="ucv ${s.votes2[v] === -1 ? "on" : ""}" data-t="-1"><span class="ucn">🤝</span><b>Spare all</b></button>` : "")}`; $$(el, ".ucv").forEach(b => b.onclick = () => { sfx.play("tap"); act({ a: "vote2", t: +b.dataset.t }); }); }
        else el.innerHTML = (v >= 0 && s.alive[v] && s.votes2[v] !== undefined) ? `<p class="sub">Vote cast. ${wait().replace('<p class="sub">', "").replace("</p>", "")}</p>` : wait();
        banner(root, "Final vote");
      } else if (s.phase === "result") {
        const l = s.last; el.innerHTML = `<h3>${l && l.elim >= 0 ? `${TEAM_ICON[l.role]} ${esc(s.players[l.elim].n)} is out` : "😮 Nobody goes home"}</h3><p class="sub">${l && l.elim >= 0 ? `They were ${/^[AEIOU]/.test(TEAMS[l.role]) ? "an" : "a"} ${TEAMS[l.role]} with the word "${esc(l.word)}".` : "Everyone was spared this round."}</p>${list.length ? `<button class="btn" id="ucnext">Next round</button>` : `<p class="sub">Next round starting…</p>`}`; const nb = $(el, "#ucnext"); if (nb) nb.onclick = () => act({ a: "next" });
        banner(root, l && l.elim >= 0 ? `${esc(s.players[l.elim].n)} was ${TEAMS[l.role]}` : "No one was voted out");
      }
    }
    function paint(s) {
      S = s; const hs = humans(s), solo = local && hs.length === 1; if (solo) unlocked = hs[0];
      const list = actors(s), cur = local && !solo && list.length && s.phase !== "result" ? list[0] : -1;
      if (!solo) { if (local && cur !== -1 && unlocked !== -1 && !list.includes(unlocked)) unlocked = -1; if (local && cur === -1) unlocked = -1; }
      const v = viewer(s); drawStrip(s); drawHeader(s, v); drawLog(s);
      const sig = JSON.stringify([s.phase, s.round, s.turn, v, cur, unlocked, s.phase === "vote1" ? s.votes[v] : s.phase === "vote2" ? s.votes2[v] : 0, s.accused, s.spares, s.ready[v], list.includes(v), s.over]);
      if (sig !== lastSig) { lastSig = sig; drawPanel(s, v, cur); }
      if (s.over && !celebrated) { celebrated = true; const mineWin = s.winner.some(i => ctx.mine(i)); if (mineWin || local) { sfx.play("win"); confetti(); } else sfx.play("lose"); ctx.finished(s.winner.find(i => ctx.mine(i)) ?? s.winner[0] ?? -1); }
    }
    const q = queue(async (s, ev) => {
      for (const e of ev) {
        if (e.t === "reset") { celebrated = false; lastSig = ""; unlocked = -1; }
        if (e.t === "clue") sfx.play("pop"); if (e.t === "vote") sfx.play("tap"); if (e.t === "tally") sfx.play("up");
        if (e.t === "elim") { sfx.play("bonk"); const c = $$(root, ".pcell")[e.p]; if (c) { burst(c, ["💥", TEAM_ICON[e.role]], 6); floatText(c, TEAMS[e.role], "#FF8A96"); } }
        if (e.t === "defend") sfx.play("pop"); if (e.t === "left") floatText(root.querySelector(".strip"), `${esc(s.players[e.p].n)} left`, "#FF8A96");
        if (e.ms) await sleep(Math.min(e.ms, 600));
      }
      paint(s);
    });
    paint(ctx.state);
    return { push: (s, e) => q.push(s, e), get busy() { return q.busy; }, destroy() { } };
  },
};
