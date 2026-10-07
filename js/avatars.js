/* Original cute characters, drawn as SVG. Every one blinks and bobs. */
const INK = "#2b1d2e";
const eye = (x, y, r = 6.5) =>
  `<g class="eye"><ellipse cx="${x}" cy="${y}" rx="${r * .82}" ry="${r}" fill="${INK}"/><circle cx="${x - r * .3}" cy="${y - r * .32}" r="${r * .36}" fill="#fff"/><circle cx="${x + r * .3}" cy="${y + r * .36}" r="${r * .16}" fill="#fff"/></g>`;
const aeye = (x, y, iris, r = 8) =>
  `<g class="eye"><ellipse cx="${x}" cy="${y}" rx="${r * .85}" ry="${r}" fill="${INK}"/><ellipse cx="${x}" cy="${y + r * .12}" rx="${r * .66}" ry="${r * .8}" fill="${iris}"/><ellipse cx="${x}" cy="${y + r * .35}" rx="${r * .5}" ry="${r * .4}" fill="#fff" opacity=".25"/><circle cx="${x - r * .3}" cy="${y - r * .35}" r="${r * .32}" fill="#fff"/><circle cx="${x + r * .28}" cy="${y + r * .38}" r="${r * .15}" fill="#fff"/></g>`;
const blush = (x, y, c = "#ff7f9a") => `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="3.8" fill="${c}" opacity=".55"/>`;
const smile = (x, y, w = 6) => `<path d="M${x - w} ${y}q${w / 2} ${w * .9} ${w} 0q${w / 2} ${w * .9} ${w} 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const grin = (x, y) => `<path d="M${x - 8} ${y}q8 11 16 0z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M${x - 4} ${y + 5.5}q4 3.5 8 0q-4-2-8 0" fill="#ff7f9a"/>`;
const dot = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const ell = (x, y, rx, ry, c, extra = "") => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" ${extra}/>`;
const OUT = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;

export const AVATARS = [
  { id: "cat", name: "Mochi Cat", bg: "#FFD9A8", svg:
    `<path d="M20 44 24 14l22 14zM80 44 76 14 54 28z" fill="#ffa24d" ${OUT}/><path d="M26 36 27 22l11 8zM74 36 73 22 62 30z" fill="#ffb3c1"/>
     ${ell(50, 58, 34, 30, "#ffa24d", OUT)}<path d="M50 30v9M42 31l2 7M58 31l-2 7" stroke="#d9741f" stroke-width="3" stroke-linecap="round"/>
     ${ell(50, 66, 14, 10, "#fff2e0")}${eye(36, 56)}${eye(64, 56)}${blush(28, 66)}${blush(72, 66)}
     <path d="M47 62h6l-3 3.5z" fill="#ff7f9a"/>${smile(50, 68, 5)}<path d="M18 62l-12-3M18 68l-12 3M82 62l12-3M82 68l12 3" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` },
  { id: "bunny", name: "Snow Bunny", bg: "#FFD3E4", svg:
    `<g class="sway">${ell(36, 22, 9, 22, "#fff", OUT)}${ell(36, 24, 4.5, 15, "#ffb3c8")}${ell(64, 22, 9, 22, "#fff", OUT)}${ell(64, 24, 4.5, 15, "#ffb3c8")}</g>
     ${ell(50, 62, 33, 29, "#fff", OUT)}${eye(37, 60)}${eye(63, 60)}${blush(27, 69)}${blush(73, 69)}
     <path d="M46.5 66h7l-3.5 4z" fill="#ff7f9a"/><path d="M50 70v3M50 73q-4 4-8 1M50 73q4 4 8 1" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` },
  { id: "panda", name: "Boba Panda", bg: "#D7F5E3", svg:
    `${dot(24, 28, 12, INK)}${dot(76, 28, 12, INK)}${ell(50, 56, 35, 31, "#fff", OUT)}
     <ellipse cx="35" cy="54" rx="10" ry="13" fill="${INK}" transform="rotate(20 35 54)"/><ellipse cx="65" cy="54" rx="10" ry="13" fill="${INK}" transform="rotate(-20 65 54)"/>
     <g class="eye"><circle cx="35" cy="53" r="5" fill="#fff"/><circle cx="36" cy="54" r="3" fill="${INK}"/><circle cx="35" cy="52" r="1.3" fill="#fff"/></g><g class="eye"><circle cx="65" cy="53" r="5" fill="#fff"/><circle cx="64" cy="54" r="3" fill="${INK}"/><circle cx="65" cy="52" r="1.3" fill="#fff"/></g>
     ${ell(50, 67, 6, 4.2, INK)}${smile(50, 72, 4.5)}${blush(24, 68)}${blush(76, 68)}` },
  { id: "fox", name: "Sunny Fox", bg: "#FFE3C9", svg:
    `<path d="M16 50 20 10l26 20zM84 50 80 10 54 30z" fill="#f5731f" ${OUT}/><path d="M23 38 24 20l12 9zM77 38 76 20 64 29z" fill="${INK}"/>
     <path d="M12 58Q50 30 88 58Q82 90 50 92Q18 90 12 58z" fill="#f5731f" ${OUT}/><path d="M12 58Q30 62 50 78Q70 62 88 58Q82 90 50 92Q18 90 12 58z" fill="#fff"/>
     ${eye(36, 56)}${eye(64, 56)}${blush(28, 68)}${blush(72, 68)}${dot(50, 74, 4.3, INK)}<path d="M50 78v2.5M50 80.5q-4 3-8 .5M50 80.5q4 3 8 .5" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  { id: "penguin", name: "Waddle", bg: "#CFE8FF", svg:
    `${ell(50, 56, 34, 36, "#2f3b5c", OUT)}<path d="M50 40Q22 42 22 66Q24 90 50 90Q76 90 78 66Q78 42 50 40z" fill="#fff"/>
     ${eye(38, 52)}${eye(62, 52)}${blush(30, 62)}${blush(70, 62)}<path d="M42 58Q50 56 58 58Q56 68 50 68Q44 68 42 58z" fill="#ffae2e" ${OUT}/>
     <path d="M17 62q-8 8-2 20q6-4 6-14zM83 62q8 8 2 20q-6-4-6-14z" fill="#2f3b5c"/>` },
  { id: "frog", name: "Hop Frog", bg: "#E1F7C4", svg:
    `${ell(50, 62, 36, 28, "#6dd26a", OUT)}${dot(30, 36, 14, "#6dd26a")}${dot(70, 36, 14, "#6dd26a")}<circle cx="30" cy="36" r="14" fill="none" ${OUT}/><circle cx="70" cy="36" r="14" fill="none" ${OUT}/>
     ${dot(30, 36, 9, "#fff")}${dot(70, 36, 9, "#fff")}${eye(31, 37, 6)}${eye(69, 37, 6)}${blush(24, 68, "#ff6f91")}${blush(76, 68, "#ff6f91")}
     <path d="M30 66Q50 82 70 66" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>${dot(46, 58, 1.6, "#2b6b2a")}${dot(54, 58, 1.6, "#2b6b2a")}` },
  { id: "bear", name: "Honey Bear", bg: "#F8E2C8", svg:
    `${dot(22, 30, 12, "#b9733a")}${dot(78, 30, 12, "#b9733a")}${dot(22, 30, 6, "#e9a76a")}${dot(78, 30, 6, "#e9a76a")}${ell(50, 57, 34, 31, "#c98443", OUT)}
     ${ell(50, 67, 15, 11.5, "#f3d3a4")}${eye(36, 53)}${eye(64, 53)}${ell(50, 62, 5.5, 4, INK)}<path d="M50 66v3M50 69q-4 3-8 0M50 69q4 3 8 0" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>${blush(26, 63)}${blush(74, 63)}` },
  { id: "dino", name: "Dino Bean", bg: "#D5F2E6", svg:
    `<path d="M32 30l6-14 8 12 6-16 6 16 8-12 6 14z" fill="#ff9b54" ${OUT}/>${ell(50, 60, 35, 31, "#4cc38a", OUT)}${ell(50, 72, 20, 12, "#c8f3d9")}
     ${eye(35, 54)}${eye(65, 54)}${blush(26, 66, "#ff8d6b")}${blush(74, 66, "#ff8d6b")}${dot(44, 66, 1.8, "#25805a")}${dot(56, 66, 1.8, "#25805a")}${smile(50, 74, 6)}` },
  { id: "chick", name: "Peep", bg: "#FFF1B3", svg:
    `<path d="M44 26q-2-12 4-14M50 26q2-14 10-14M56 27q6-8 12-6" fill="none" stroke="#f5b400" stroke-width="3.5" stroke-linecap="round"/>${ell(50, 60, 36, 32, "#ffd93d", OUT)}
     ${eye(36, 55)}${eye(64, 55)}${blush(27, 66)}${blush(73, 66)}<path d="M42 62q8-5 16 0q-2 9-8 9q-6 0-8-9z" fill="#ff8a1f" ${OUT}/><path d="M16 62q-9 2-8 12q9 0 10-8zM84 62q9 2 8 12q-9 0-10-8z" fill="#ffc21f" ${OUT}/>` },
  { id: "pig", name: "Piggy Pop", bg: "#FFD6E0", svg:
    `<path d="M22 40 18 16l22 10zM78 40 82 16 60 26z" fill="#ff9cb5" ${OUT}/>${ell(50, 58, 35, 31, "#ffb3c6", OUT)}${ell(50, 66, 15, 11, "#ff8fab", OUT)}
     ${dot(45, 66, 2.6, "#c2456b")}${dot(55, 66, 2.6, "#c2456b")}${eye(34, 52)}${eye(66, 52)}${blush(24, 62)}${blush(76, 62)}` },
  { id: "koala", name: "Koko", bg: "#E2E8F5", svg:
    `${dot(18, 36, 15, "#9aa4b8")}${dot(82, 36, 15, "#9aa4b8")}${dot(18, 36, 8, "#f1d6e0")}${dot(82, 36, 8, "#f1d6e0")}${ell(50, 58, 33, 31, "#b3bccd", OUT)}
     ${eye(37, 54)}${eye(63, 54)}<path d="M42 56Q50 52 58 56Q60 72 50 74Q40 72 42 56z" fill="#3a3550"/><ellipse cx="47" cy="59" rx="2.5" ry="1.5" fill="#fff" opacity=".6"/>${blush(27, 66)}${blush(73, 66)}` },
  { id: "ghost", name: "Boo", bg: "#E3DCFF", svg:
    `<path d="M16 88V50Q16 14 50 14Q84 14 84 50V88l-11-8-11 8-12-8-12 8-11-8z" fill="#fff" ${OUT}/><g class="sway">${eye(38, 50, 7)}${eye(62, 50, 7)}</g>${blush(28, 62, "#ff9ec2")}${blush(72, 62, "#ff9ec2")}<ellipse cx="50" cy="64" rx="5" ry="6" fill="${INK}"/><ellipse cx="50" cy="67" rx="3" ry="2.4" fill="#ff7f9a"/>` },
  { id: "robot", name: "Beep-0", bg: "#D8E6F2", svg:
    `<path d="M50 22V10" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>${dot(50, 9, 5, "#ff5d73")}<rect x="16" y="22" width="68" height="60" rx="18" fill="#c9d6e3" ${OUT}/>
     <rect x="24" y="34" width="52" height="32" rx="12" fill="#1f2a44"/><g class="eye"><rect x="31" y="42" width="14" height="16" rx="6" fill="#59f0ff"/><rect x="55" y="42" width="14" height="16" rx="6" fill="#59f0ff"/></g>
     <path d="M42 72q8 5 16 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><rect x="8" y="42" width="8" height="18" rx="4" fill="#9db1c6" ${OUT}/><rect x="84" y="42" width="8" height="18" rx="4" fill="#9db1c6" ${OUT}/>${blush(22, 70, "#ff8fa3")}${blush(78, 70, "#ff8fa3")}` },
  { id: "alien", name: "Zorp", bg: "#E4D9FF", svg:
    `<path d="M36 26 28 8M64 26 72 8" stroke="#3aa86a" stroke-width="3" stroke-linecap="round"/>${dot(28, 8, 4.5, "#ffe14d")}${dot(72, 8, 4.5, "#ffe14d")}
     <path d="M50 24Q88 24 84 58Q80 90 50 90Q20 90 16 58Q12 24 50 24z" fill="#7be495" ${OUT}/>
     <g class="eye"><ellipse cx="34" cy="55" rx="11" ry="14" fill="${INK}" transform="rotate(15 34 55)"/><ellipse cx="66" cy="55" rx="11" ry="14" fill="${INK}" transform="rotate(-15 66 55)"/><circle cx="30" cy="49" r="3.6" fill="#fff"/><circle cx="62" cy="49" r="3.6" fill="#fff"/></g>
     <path d="M43 76q7 5 14 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` },
  { id: "axolotl", name: "Axo", bg: "#FFE0EC", svg:
    `<g stroke="#ff6f9e" stroke-width="4" stroke-linecap="round" fill="none"><path d="M20 44 6 34M20 52 4 52M21 60 8 70M80 44 94 34M80 52 96 52M79 60 92 70"/></g>${dot(6, 34, 3, "#ff6f9e")}${dot(4, 52, 3, "#ff6f9e")}${dot(8, 70, 3, "#ff6f9e")}${dot(94, 34, 3, "#ff6f9e")}${dot(96, 52, 3, "#ff6f9e")}${dot(92, 70, 3, "#ff6f9e")}
     ${ell(50, 58, 33, 30, "#ffc2d6", OUT)}${eye(37, 54, 6)}${eye(63, 54, 6)}${blush(28, 65, "#ff6f9e")}${blush(72, 65, "#ff6f9e")}<path d="M42 64q8 8 16 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` },
  { id: "unicorn", name: "Sparkle", bg: "#F6DDFF", svg:
    `<path d="M50 4 43 30h14z" fill="#ffd84d" ${OUT}/><path d="M25 44 18 18l20 14zM75 44 82 18 62 32z" fill="#fff" ${OUT}/><path d="M28 38 18 52q-8 14 6 24 0-14 8-22zM72 38 82 52q8 14-6 24 0-14-8-22z" fill="#ff8fd6"/><path d="M26 44Q20 60 28 74 28 60 34 50zM74 44Q80 60 72 74 72 60 66 50z" fill="#8fd3ff"/>
     ${ell(50, 60, 30, 28, "#fff", OUT)}${eye(38, 58)}${eye(62, 58)}${blush(30, 68)}${blush(70, 68)}${smile(50, 70, 5)}<path d="M80 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd84d"/>` },
  /* anime-style originals */
  { id: "sakura", name: "Sakura", bg: "#FFD9EA", svg:
    `${dot(18, 40, 13, "#ff8fb8")}${dot(82, 40, 13, "#ff8fb8")}<path d="M14 50q-6 28 6 40 4-18 2-36zM86 50q6 28-6 40-4-18-2-36z" fill="#ff8fb8"/>
     ${ell(50, 56, 29, 31, "#ffe3cf", OUT)}<path d="M20 52Q18 14 50 14Q82 14 80 52Q72 30 54 30Q38 36 20 52z" fill="#ff8fb8" ${OUT}/><path d="M50 14Q44 28 34 38Q44 30 54 30Q62 30 70 38Q58 28 50 14z" fill="#ff6fa0"/>
     ${aeye(38, 56, "#8a5cf6", 8.4)}${aeye(62, 56, "#8a5cf6", 8.4)}${blush(30, 68)}${blush(70, 68)}<path d="M46 70q4 3 8 0" fill="none" stroke="#c2456b" stroke-width="2.2" stroke-linecap="round"/>
     <g transform="translate(70 24)">${dot(0, 0, 3, "#ffe14d")}${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-5.6" rx="3.4" ry="4.6" fill="#fff" stroke="#ff9ec2" stroke-width="1" transform="rotate(${a})"/>`).join("")}${dot(0, 0, 2.4, "#ffd84d")}</g>` },
  { id: "hero", name: "Blaze Kid", bg: "#FFE5B8", svg:
    `<path d="M16 46 10 18l16 10-2-20 16 14 8-18 8 18 16-14-2 20 16-10-6 28Q50 20 16 46z" fill="#ffa21f" ${OUT}/>${ell(50, 60, 29, 29, "#ffe0c4", OUT)}
     <path d="M21 52Q26 32 50 32Q74 32 79 52Q70 42 50 44Q30 42 21 52z" fill="#ffa21f" ${OUT}/><rect x="19" y="39" width="62" height="9" rx="4" fill="#e63950" ${OUT}/><rect x="44" y="39" width="12" height="9" rx="2" fill="#c9cdd6" ${OUT}/>
     ${aeye(38, 61, "#2b8cff", 7.5)}${aeye(62, 61, "#2b8cff", 7.5)}${grin(50, 73)}${blush(27, 70, "#ff8d6b")}${blush(73, 70, "#ff8d6b")}<path d="M31 53l8 2M69 53l-8 2" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` },
  { id: "ninja", name: "Shadow", bg: "#CAD3EA", svg:
    `${ell(50, 56, 36, 36, "#2e3a63", OUT)}<path d="M18 52h64v18Q50 80 18 70z" fill="#ffe0c4" ${OUT}/><path d="M17 40h66v9H17z" fill="#e63950" ${OUT}/><path d="M83 44l12-8M83 46l14 6" stroke="#e63950" stroke-width="5" stroke-linecap="round"/>
     ${aeye(37, 60, "#3b2a1a", 7.5)}${aeye(63, 60, "#3b2a1a", 7.5)}${blush(28, 69)}${blush(72, 69)}<path d="M18 70Q50 84 82 70" fill="none" stroke="${INK}" stroke-width="0"/>${smile(50, 72, 4.5)}` },
  { id: "mage", name: "Star Witch", bg: "#E3D5FF", svg:
    `${ell(50, 64, 28, 28, "#ffe3cf", OUT)}<path d="M22 66Q14 40 30 30Q50 24 70 30Q86 40 78 66Q74 44 50 42Q26 44 22 66z" fill="#c9a6ff" ${OUT}/>
     ${aeye(38, 64, "#ff6fa8", 8)}${aeye(62, 64, "#ff6fa8", 8)}${blush(29, 74)}${blush(71, 74)}<path d="M46 77q4 3 8 0" fill="none" stroke="#c2456b" stroke-width="2.2" stroke-linecap="round"/>
     <path d="M4 40Q50 24 96 40Q50 46 4 40z" fill="#6a3fd1" ${OUT}/><path d="M26 36Q38 6 62 2Q56 20 74 34z" fill="#7b4df0" ${OUT}/><path d="M32 33Q50 38 72 32" stroke="#ffd84d" stroke-width="4" fill="none"/>
     <path d="M52 16l2.2 5 5.2.6-4 3.4 1.2 5.2-4.6-2.8-4.6 2.8 1.2-5.2-4-3.4 5.2-.6z" fill="#ffd84d"/>` },
  { id: "boba", name: "Boba Boy", bg: "#F6E6D6", svg:
    `<path d="M36 6 44 24M44 24h12" stroke="#ff6f91" stroke-width="5" stroke-linecap="round"/><rect x="20" y="22" width="60" height="9" rx="4" fill="#fff" ${OUT}/><path d="M24 31h52l-6 58q-1 6-8 6H38q-7 0-8-6z" fill="#f2cfa5" ${OUT}/><path d="M26 44h48l-3 40q-1 6-8 6H37q-7 0-8-6z" fill="#c98f5a"/>
     ${dot(38, 84, 4, INK)}${dot(50, 88, 4, INK)}${dot(62, 84, 4, INK)}${dot(44, 78, 4, INK)}${dot(57, 78, 4, INK)}${eye(40, 58, 5.5)}${eye(60, 58, 5.5)}${blush(33, 66)}${blush(67, 66)}${smile(50, 66, 4.5)}` },
  { id: "onigiri", name: "Onigiri", bg: "#E9F5E1", svg:
    `<path d="M50 10Q60 10 86 74Q90 88 74 88H26Q10 88 14 74Q40 10 50 10z" fill="#fff" ${OUT}/><path d="M32 66h36v22H26z" fill="#1f3a2d" ${OUT} transform="translate(0 0)"/>
     ${eye(38, 50, 5.5)}${eye(62, 50, 5.5)}${blush(30, 58)}${blush(70, 58)}${smile(50, 58, 4.5)}<path d="M32 66h36l4 22H28z" fill="#1f3a2d"/>` },
  { id: "star", name: "Twinkle", bg: "#FFF3B8", svg:
    `<path d="M50 6l12 28 30 3-23 20 7 30-26-16-26 16 7-30L8 37l30-3z" fill="#ffd84d" ${OUT}/>${eye(40, 50, 5.5)}${eye(60, 50, 5.5)}${blush(33, 59)}${blush(67, 59)}${smile(50, 58, 4.5)}` },
];
const BY = Object.fromEntries(AVATARS.map(a => [a.id, a]));
export const avatarInfo = id => BY[id] || BY.cat;
export const isImg = id => typeof id === "string" && id.startsWith("data:image/");

/* HTML for a round avatar. `ring` is the player's colour. */
export function avatar(id, size = 44, ring = "") {
  const sty = `--s:${size}px;${ring ? `--ring:${ring};` : ""}`;
  if (isImg(id)) return `<span class="avatar${ring ? " ringed" : ""}" style="${sty}background:#fff"><img src="${id}" alt=""></span>`;
  const a = avatarInfo(id);
  const dly = (id.length * 0.37 % 3).toFixed(2);
  return `<span class="avatar${ring ? " ringed" : ""}" style="${sty}background:${a.bg};--d:${dly}s"><svg viewBox="0 0 100 100" aria-hidden="true">${a.svg}</svg></span>`;
}

/* Crop a chosen photo to a small round-able square (data URL). */
export function photoToAvatar(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const S = 96, c = document.createElement("canvas"); c.width = c.height = S;
      const x = c.getContext("2d"), m = Math.min(img.width, img.height);
      x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", .72));
    };
    img.onerror = () => rej(new Error("Couldn't read that picture."));
    img.src = url;
  });
}
