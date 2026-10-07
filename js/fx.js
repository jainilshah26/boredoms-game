/* Sound, 3D dice, confetti and little bursts of joy. */
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
};
export const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

/* ---------- sound (all synthesized, no files) ---------- */
let ctx = null, noiseBuf = null;
export const sfx = {
  on: store.get("bf_sound", true) !== false,
  _c() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  },
  tone(f, d = .1, type = "sine", v = .06, at = 0, slide = 0) {
    if (!this.on) return; const c = this._c(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .02);
  },
  noise(d = .08, v = .08, at = 0, hp = 1200) {
    if (!this.on) return; const c = this._c(); if (!c) return;
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate * .5, c.sampleRate); const a = noiseBuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + at;
    s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = hp; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + d + .02);
  },
  play(n) {
    switch (n) {
      case "tap": this.tone(620, .05, "triangle", .04); break;
      case "dice": for (let i = 0; i < 9; i++) this.noise(.05, .07, i * .075, 1800 + (i % 3) * 600); this.tone(180, .1, "sine", .08, .7, -60); break;
      case "hop": this.tone(420, .09, "sine", .06, 0, 260); break;
      case "pop": this.tone(700, .08, "triangle", .07, 0, 300); break;
      case "card": this.noise(.07, .1, 0, 900); this.tone(260, .06, "triangle", .04); break;
      case "bonk": this.tone(220, .18, "square", .06, 0, -140); this.noise(.1, .06, 0, 300); break;
      case "up": [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .14, "triangle", .06, i * .07)); break;
      case "down": [700, 560, 440, 330, 240].forEach((f, i) => this.tone(f, .14, "sawtooth", .04, i * .08)); break;
      case "coin": this.tone(988, .07, "square", .05); this.tone(1319, .18, "square", .05, .07); break;
      case "cash": [0, 1, 2].forEach(i => this.tone(900 + i * 150, .06, "square", .04, i * .05)); break;
      case "win": [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, .22, "triangle", .08, i * .11)); break;
      case "lose": [330, 262, 196].forEach((f, i) => this.tone(f, .24, "triangle", .06, i * .15)); break;
      case "err": this.tone(150, .14, "square", .05); break;
      case "turn": this.tone(880, .08, "sine", .05); this.tone(1175, .12, "sine", .05, .08); break;
      case "sparkle": [1568, 2093, 2637].forEach((f, i) => this.tone(f, .1, "sine", .035, i * .05)); break;
    }
  },
};
export function setSound(v) { sfx.on = v; store.set("bf_sound", v); }

/* ---------- 3D dice ---------- */
const PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const FACE_ROT = { 1: "rotateX(0deg) rotateY(0deg)", 6: "rotateX(0deg) rotateY(180deg)", 3: "rotateX(0deg) rotateY(-90deg)", 4: "rotateX(0deg) rotateY(90deg)", 2: "rotateX(-90deg) rotateY(0deg)", 5: "rotateX(90deg) rotateY(0deg)" };
const faceHTML = (n, cls) => `<div class="face ${cls}">${Array.from({ length: 9 }, (_, i) => `<i${PIPS[n - 1].includes(i) ? ' class="p"' : ""}></i>`).join("")}</div>`;
export class Dice3D {
  constructor(parent, size = 64) {
    this.el = document.createElement("div"); this.el.className = "dice3d"; this.el.style.setProperty("--ds", size + "px");
    this.el.innerHTML = `<div class="hop"><div class="cube">${[[1, "f1"], [6, "f6"], [3, "f3"], [4, "f4"], [2, "f2"], [5, "f5"]].map(([n, c]) => faceHTML(n, c)).join("")}</div></div>`;
    this.cube = this.el.querySelector(".cube"); this.hop = this.el.querySelector(".hop");
    this.set(1, true); parent.appendChild(this.el); this.v = 1; this.k = 0;
  }
  set(v, instant) {
    this.v = v; if (instant) this.cube.style.transition = "none";
    this.cube.style.transform = FACE_ROT[v] || FACE_ROT[1];
    if (instant) { void this.cube.offsetWidth; this.cube.style.transition = ""; }
  }
  async roll(v, ms = 900) {
    if (reduced()) { this.set(v, true); return; }
    sfx.play("dice"); buzz([20, 30, 20]);
    this.k++; const sx = 360 * (2 + (this.k % 2)), sy = 360 * 2;
    const base = FACE_ROT[v].match(/-?\d+/g).map(Number);
    this.cube.style.transition = `transform ${ms}ms cubic-bezier(.15,.7,.2,1)`;
    this.cube.style.transform = `rotateX(${base[0] + sx}deg) rotateY(${base[1] + sy}deg) rotateZ(${this.k % 2 ? 0 : 0}deg)`;
    this.hop.animate([{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-46px) scale(1.25)", offset: .35 }, { transform: "translateY(0) scale(.92)", offset: .72 }, { transform: "translateY(-8px) scale(1.04)", offset: .86 }, { transform: "translateY(0) scale(1)" }], { duration: ms, easing: "ease-out" });
    await sleep(ms);
    this.cube.style.transition = "none"; this.cube.style.transform = FACE_ROT[v]; void this.cube.offsetWidth; this.cube.style.transition = "";
    this.v = v;
  }
}

/* ---------- confetti, bursts, floating text ---------- */
const CONF = ["#FF5468", "#E8C766", "#3FD08F", "#4DA3FF", "#B070FF", "#FF9A3D", "#fff"];
export function confetti(n = 160) {
  if (reduced()) return;
  const c = document.createElement("canvas"); c.className = "confetti"; document.body.appendChild(c);
  const x = c.getContext("2d"); const W = c.width = innerWidth, H = c.height = innerHeight;
  const ps = Array.from({ length: n }, (_, i) => ({ x: W * (i % 2 ? .15 : .85), y: H * .85, vx: (i % 2 ? 1 : -1) * (4 + Math.random() * 10), vy: -(10 + Math.random() * 14), s: 6 + Math.random() * 8, c: CONF[Math.random() * CONF.length | 0], r: Math.random() * 6, vr: (Math.random() - .5) * .5, shape: Math.random() < .3 }));
  let f = 0; (function tick() {
    x.clearRect(0, 0, W, H);
    ps.forEach(p => { p.vy += .42; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; if (p.shape) { x.beginPath(); x.arc(0, 0, p.s / 2, 0, 7); x.fill(); } else x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .55); x.restore(); });
    if (++f < 170) requestAnimationFrame(tick); else c.remove();
  })();
}
const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
export function burst(target, glyphs = ["✨", "⭐", "💫"], n = 10) {
  if (reduced() || !target) return;
  const [cx, cy] = Array.isArray(target) ? target : center(target);
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span"); p.className = "bit"; p.textContent = glyphs[i % glyphs.length];
    p.style.left = cx + "px"; p.style.top = cy + "px"; document.body.appendChild(p);
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
    p.animate([{ transform: "translate(-50%,-50%) scale(.4)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d - 20}px)) scale(1.1) rotate(${Math.random() * 90}deg)`, opacity: 0 }], { duration: 700 + Math.random() * 300, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => p.remove();
  }
}
export function floatText(target, text, color = "#E8C766") {
  if (!target) return; const [cx, cy] = Array.isArray(target) ? target : center(target);
  const p = document.createElement("div"); p.className = "floaty"; p.textContent = text; p.style.cssText = `left:${cx}px;top:${cy}px;color:${color}`; document.body.appendChild(p);
  p.animate([{ transform: "translate(-50%,0) scale(.6)", opacity: 0 }, { transform: "translate(-50%,-26px) scale(1.15)", opacity: 1, offset: .25 }, { transform: "translate(-50%,-70px) scale(1)", opacity: 0 }], { duration: 1300, easing: "ease-out" }).onfinish = () => p.remove();
}
export function shake(el, ms = 450) { if (!el || reduced()) return; el.animate([{ transform: "translate(0)" }, { transform: "translate(-6px,3px) rotate(-.6deg)" }, { transform: "translate(6px,-3px) rotate(.6deg)" }, { transform: "translate(-4px,-2px)" }, { transform: "translate(3px,2px)" }, { transform: "translate(0)" }], { duration: ms }); }
export function toast(msg) {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
}
/* A reaction emoji floating up the screen. */
export function floatEmoji(emoji, who) {
  const p = document.createElement("div"); p.className = "react"; p.innerHTML = `<b>${emoji}</b>${who ? `<small>${who.replace(/[<>&]/g, "")}</small>` : ""}`;
  p.style.left = (12 + Math.random() * 70) + "%"; document.body.appendChild(p);
  p.animate([{ transform: "translateY(0) scale(.5)", opacity: 0 }, { transform: "translateY(-80px) scale(1.2)", opacity: 1, offset: .2 }, { transform: "translateY(-340px) scale(1) rotate(8deg)", opacity: 0 }], { duration: 2200, easing: "ease-out" }).onfinish = () => p.remove();
}
/* FLIP-style flight of a clone from one rect to another. */
export function fly(html, from, to, { ms = 480, cls = "", scaleTo = 1, rot = 0 } = {}) {
  return new Promise(res => {
    if (reduced()) return res();
    const d = document.createElement("div"); d.className = "flyer " + cls; d.innerHTML = html;
    d.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;--cw:${from.width}px`; document.body.appendChild(d);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const a = d.animate([{ transform: "translate(0,0) scale(1) rotate(0)" }, { transform: `translate(${dx * .5}px,${dy * .5 - 40}px) scale(${(1 + scaleTo) / 2 + .1}) rotate(${rot / 2}deg)`, offset: .5 }, { transform: `translate(${dx}px,${dy}px) scale(${scaleTo}) rotate(${rot}deg)` }], { duration: ms, easing: "cubic-bezier(.3,.7,.3,1)", fill: "forwards" });
    a.onfinish = () => { d.remove(); res(); };
  });
}
