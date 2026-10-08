/* Cricket rules (Nokia style, one batter). No screen code, so it can be tested on its own.
   12 legal balls, 3 wickets. Every player faces the same deliveries (same seed). */
import { rng } from "./arcade.js";

export const BALLS = 12, WICKETS = 3;
export const WIN = { perfect: 70, good: 130, ok: 220 }; /* ms either side of the moment the ball reaches the bat */
export const EARLY = 400; /* taps earlier than this before the ball arrives are ignored */

/* the planned delivery number i of this match: line -1 left, 0 straight, 1 right, +-2 wide */
export function delivery(seed, i) {
  const r = rng((seed >>> 0) * 31 + i * 977 + 7), k = r(), wide = r() < .09;
  const kind = k < .38 ? "fast" : k < .72 ? "medium" : "spin";
  const T = kind === "fast" ? 640 + r() * 120 : kind === "medium" ? 820 + r() * 140 : 960 + r() * 140;
  const L = r() < .3 ? -1 : r() < .55 ? 0 : 1, end = wide ? (L < 0 ? -2 : 2) : L;
  /* spin turns late: it starts in a different lane and drifts to the final one */
  const start = kind === "spin" && !wide ? (r() < .5 ? 0 : -L || 1) : end;
  return { i, kind, T: Math.round(T - Math.min(i, 11) * 6), start, line: end, wide };
}

export function newMatch(seed) { return { seed: seed >>> 0, idx: 0, balls: 0, runs: 0, wk: 0, fours: 0, sixes: 0, log: [], over: false }; }
export const next = m => delivery(m.seed, m.idx);

/* shot: -1, 0, 1 or null for no swing. err: ms (negative = early) between the tap and the ball reaching the bat. */
export function play(m, shot, err) {
  if (m.over) return null;
  const d = next(m), r = rng((m.seed >>> 0) * 7919 + m.idx * 104729 + 13); let o;
  const out = (how, text) => ({ kind: "out", runs: 0, out: true, how, text });
  const ad = Math.abs(err || 0);
  if (shot == null) o = d.wide ? { kind: "wide", runs: 1, text: "Wide! +1" } : out("bowled", "Bowled!");
  else if (d.wide) o = r() < .35 ? out("caught", "Caught behind!") : { kind: "dot", runs: 0, text: "Missed the wide" };
  else if (err > WIN.ok) o = out("bowled", "Bowled!");
  else if (err < -WIN.ok) o = r() < .5 ? out("caught", "Caught! Too early") : { kind: "dot", runs: 0, text: "Too early" };
  else {
    const diff = Math.abs(shot - d.line);
    if (diff === 2) o = out("bowled", "Bowled!");
    else if (diff === 1) o = ad <= WIN.good && r() > .38 ? { kind: "runs", runs: r() < .5 ? 1 : 2, text: "Edged for runs" } : r() < .55 ? out("caught", "Caught on the edge!") : { kind: "dot", runs: 0, text: "Edged. No run" };
    else if (ad <= WIN.perfect) o = { kind: "six", runs: 6, text: "SIX!" };
    else if (ad <= WIN.good) o = { kind: "four", runs: 4, text: "FOUR!" };
    else o = r() < .12 ? out("caught", "Caught in the deep!") : { kind: "runs", runs: r() < .4 ? 2 : 1, text: "Mistimed" };
  }
  o.shot = shot; o.err = err; o.d = d; m.idx++;
  m.runs += o.runs; if (o.kind === "six") m.sixes++; if (o.kind === "four") m.fours++; if (o.out) m.wk++;
  if (o.kind !== "wide") m.balls++;
  m.log.push(o.kind);
  if (m.wk >= WICKETS || m.balls >= BALLS) m.over = true;
  return o;
}
