import ludo from "./ludo.js";
import snl from "./snl.js";
import tyc from "./tycoon.js";
import clash from "./clash.js";
import ttt from "./ttt.js";
import sdk from "./sudoku.js";
import snake from "./snake.js";
import bounce from "./bounce.js";
import teenpatti from "./teenpatti.js";

export const GAME = { ludo, snl, tyc, clash, ttt, sdk, snake, bounce, teenpatti };

/* Menu info: playing-card style tiles */
export const LIST = [
  { id: "ludo", rank: "A", suit: "♦", red: 1, pl: "2–4 players", time: "15 min", tag: "Race your tokens home", how: ["Roll a 6 to bring a token out of your yard.", "Move clockwise. Land on a rival and they go back home.", "★ squares and your start square are safe.", "A 6, a capture or reaching home gives another roll. Three 6s in a row loses the turn.", "Get all 4 tokens into the center to win."] },
  { id: "snl", rank: "K", suit: "♠", pl: "2–10 players", time: "10 min", tag: "Climb ladders, dodge snakes", how: ["Roll the dice and walk that many squares.", "Ladders 🪜 lift you up. Snakes 🐍 slide you down.", "You must land exactly on 100. A 6 gives you another roll."] },
  { id: "tyc", rank: "Q", suit: "♥", red: 1, pl: "2–10 players", time: "30 min", tag: "Own the wonders of the world", how: ["Roll two dice and travel around a 40-square world tour of 30 UNESCO World Heritage Sites.", "Land on a free site to buy it. Land on someone else's and pay rent. Own all 3 sites of a colour for double rent.", "Tap any square to read about it. Passing GO pays ₹200. Taxes feed the Jackpot. Chance can even fly you to a wonder.", "Doubles roll again. Run out of cash and you're out. Last player standing wins. When the rounds run out (or someone taps Finish) the richest player wins."] },
  { id: "clash", rank: "J", suit: "♣", pl: "2–10 players", time: "10 min", tag: "Match, skip, reverse, +4", how: ["Play a card matching the color or symbol on top.", "⊘ skips, ⇄ reverses, +2 and +4 make the next player draw.", "Wild cards let you pick the color.", "Can't play? Draw a card. Empty your hand first to win."] },
  { id: "ttt", rank: "10", suit: "♦", red: 1, pl: "2 players", time: "1 min", tag: "Three in a row", how: ["Take turns placing X and O.", "Three in a row wins."] },
  { id: "sdk", rank: "9", suit: "♠", pl: "1+ players", time: "10 min", tag: "Race or relax", how: ["Fill the grid so every row, column and 3×3 box has 1–9.", "Tap a square, then a number. Red means wrong. 💡 gives a hint.", "In a room, everyone gets the same puzzle. First to finish wins."] },
  { id: "snake", rank: "8", suit: "♣", pl: "1–10 players", time: "3 min", tag: "The classic Nokia game", raceText: "Everyone plays the same board at the same time. Highest score wins.", how: ["Swipe, tap the arrows or use your keyboard to steer.", "Eat apples to grow and score. Stars are worth extra but vanish fast.", "Hit a wall or your own tail and the run is over. The longer you live, the faster you go."] },
  { id: "bounce", rank: "7", suit: "♥", red: 1, pl: "1–10 players", time: "5 min", tag: "Roll the red ball", raceText: "Everyone plays the same levels at the same time. Highest score wins.", how: ["Hold ◀ ▶ to roll and ⤒ to jump. Hold jump longer to jump higher.", "Collect rings, bounce on springs and touch flags to save your place.", "Spikes and pits cost a life. Reach the checkered gate to clear the level. You have 3 lives."] },
  { id: "teenpatti", rank: "3", suit: "♠", pl: "2–10 players", time: "15 min", tag: "Classic 3-card showdown", how: ["Everyone puts in the 10 chip boot and gets 3 cards. This game uses play chips only, no real money.", "On your turn: Pack (fold), Chaal (match the stake), Raise (double the stake) or See your cards. Playing blind costs the stake. Once you have seen your cards you pay double.", "When only 2 players are left, either can pay for a Show and the better hand wins the pot. If hands tie, whoever asked for the show loses.", "Best hands: Trail (three of a kind), Pure sequence, Sequence, Color (flush), Pair, High card. A-K-Q is the top sequence, then A-2-3.", "Play 8 rounds. The most chips at the end wins."] },
];
export const META = Object.fromEntries(LIST.map(g => [g.id, { ...g, ...GAME[g.id] }]));

const IV = "#F8F1DE";
export const ICON = {
  ludo: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="11" fill="${IV}"/><g fill="currentColor" stroke="none"><circle cx="21" cy="21" r="4"/><circle cx="43" cy="21" r="4"/><circle cx="32" cy="32" r="4"/><circle cx="21" cy="43" r="4"/><circle cx="43" cy="43" r="4"/></g></svg>`,
  snl: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 8v48M26 8v48M10 18h16M10 30h16M10 42h16M10 54h16"/><path d="M48 56C34 48 60 40 48 32C36 24 60 18 48 11"/><circle cx="48" cy="9" r="3.5" fill="currentColor"/></svg>`,
  tyc: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="32" cy="46" rx="21" ry="8" fill="${IV}"/><ellipse cx="32" cy="34" rx="21" ry="8" fill="${IV}"/><ellipse cx="32" cy="22" rx="21" ry="8" fill="${IV}"/></svg>`,
  clash: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="10" width="30" height="42" rx="5" transform="rotate(-14 23 31)" fill="${IV}"/><rect x="26" y="12" width="30" height="42" rx="5" transform="rotate(12 41 33)" fill="${IV}"/><text x="41" y="42" font-size="22" text-anchor="middle" fill="currentColor" stroke="none" font-family="Georgia,serif">♠&#xFE0E;</text></svg>`,
  ttt: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8v48M40 8v48M8 24h48M8 40h48"/><path d="M11 11l10 10M21 11l-10 10M43 43l10 10M53 43l-10 10"/><circle cx="32" cy="32" r="5"/></svg>`,
  snake: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 50h26a8 8 0 000-16H26a8 8 0 010-16h24"/><circle cx="52" cy="18" r="4" fill="currentColor"/><path d="M56 18h4"/></svg>`,
  bounce: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="30" cy="26" r="13" fill="currentColor"/><path d="M24 20a8 8 0 018-4" stroke="#F8F1DE"/><path d="M8 54h14l4-6 4 6h26"/></svg>`,
  teenpatti: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="14" width="22" height="32" rx="4" transform="rotate(-16 17 30)" fill="#F8F1DE"/><rect x="21" y="10" width="22" height="32" rx="4" fill="#F8F1DE"/><rect x="36" y="14" width="22" height="32" rx="4" transform="rotate(16 47 30)" fill="#F8F1DE"/><text x="32" y="33" font-size="18" text-anchor="middle" fill="currentColor" stroke="none" font-family="Georgia,serif">♠</text><circle cx="32" cy="54" r="5" fill="currentColor"/></svg>`,
  sdk: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="6"/><path d="M24 8v48M40 8v48M8 24h48M8 40h48"/><g fill="currentColor" stroke="none" font-family="Georgia,serif" font-weight="700" font-size="14" text-anchor="middle"><text x="16" y="20">5</text><text x="48" y="36">3</text><text x="32" y="52">9</text></g></svg>`,
};
