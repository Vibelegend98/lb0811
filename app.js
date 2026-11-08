'use strict';
(() => {
/* =========================================================
   Vlucht LB0811 · een verjaardagsreis voor Schatjepoepie
   ========================================================= */
const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('s');
const stage = document.getElementById('stage');
const $ = (s, r = document) => r.querySelector(s);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const wait = ms => new Promise(r => setTimeout(r, ms));
const E = {
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  lin: t => t,
};

// every scene change bumps RUN; running sequences of the old scene stop themselves
let RUN = 0;
class Cancelled extends Error {}
const alive = run => { if (run !== RUN) throw new Cancelled(); };
const sleep = (run, ms) => new Promise((res, rej) => setTimeout(() => (run === RUN ? res() : rej(new Cancelled())), ms));
function tween(run, ms, fn, ease = E.inOut) {
  return new Promise((res, rej) => {
    const t0 = performance.now();
    const step = now => {
      if (run !== RUN) return rej(new Cancelled());
      const p = clamp((now - t0) / ms, 0, 1);
      fn(ease(p), p);
      p < 1 ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  });
}
const quiet = p => p.catch(() => {});

/* ---------------- data ---------------- */
const PH = {
  lowlands: { img: 'img/lowlands.webp', map: 'img/lowlands-map.png', w: 1080, h: 1440 },
  lift:     { img: 'img/lift.webp',     map: 'img/lift-map.png',     w: 1080, h: 1440 },
  safari:   { img: 'img/safari.webp',   map: 'img/safari-map.png',   w: 1620, h: 1080 },
  kenya:    { img: 'img/kenya.webp',    map: 'img/kenya-map.png',    w: 1200, h: 1600, edit: 'img/kenya-edit.webp', rev: 'img/kenya-reveal.png' },
  lamu:     { img: 'img/lamu.webp',     map: 'img/lamu-map.png',     w: 1080, h: 1440 },
  frankrijk:   { img: 'img/frankrijk.webp',   map: 'img/frankrijk-map.png',   w: 1080, h: 1440 },
  griekenland: { img: 'img/griekenland.webp', map: 'img/griekenland-map.png', w: 1080, h: 1440 },
  parijs:  { img: 'img/parijs.webp',   map: 'img/parijs-map.png',   w: 1080, h: 1440 },
};
const PAGES = [
  { id: 'cover' },
  { id: 'lowlands', photo: 'lowlands', c: [.5, .56], title: 'Lowlands', date: '15 aug 2025',
    cap: 'Zon, een Gig en een strandstoel. Meer hadden we niet nodig.', fx: 'leak',
    stamp: { shape: 'oval', color: '#6A3FA0', lines: ['LOWLANDS', '15 AUG 2025', 'BIDDINGHUIZEN'] }, sp: { left: '50%', top: '-13%', rot: 9 },
    mrz: 'LOWLANDS<<BIDDINGHUIZEN<<2025' },
  { id: 'lift', photo: 'lift', c: [.5, .42], title: 'Ergens in een lift', date: '23 aug 2025',
    cap: 'Dresscode: badjas. Altijd en overal.', fx: 'doors',
    stamp: { shape: 'rect', color: '#1F7A6E', lines: ['BADJAS-CLUB', 'LID SINDS 23·08·25', '★ ★ ★ ★ ★'] }, sp: { left: '-9%', top: '-11%', rot: -8 },
    mrz: 'BADJAS<<CLUB<<LIFT<<2025' },
  { id: 'safari', photo: 'safari', c: [.33, .5], title: 'Kenia', date: '17 nov 2025',
    cap: 'Jij spotte de olifanten. Ik spotte jou.', fx: 'bino',
    stamp: { shape: 'circle', color: '#A8482A', lines: ['REPUBLIC OF KENYA', 'SAFARI', '17 NOV 2025', 'ARRIVAL'] }, sp: { left: '58%', top: '-11%', rot: 14 },
    mrz: 'KENYA<<SAFARI<<OLIFANTEN<<2025' },
  { id: 'kenya', photo: 'kenya', c: [.5, .5], title: 'Mount Kenya', date: '23 nov 2025',
    cap: '4.985 meter. Koud, kapot en toch die glimlach. (Op het echte bord stond trouwens iets anders.)',
    stamp: { shape: 'rect', color: '#2E6B3A', lines: ['POINT LENANA', '4.985 M', '23·11·2025'] }, sp: { left: '-10%', top: '-10%', rot: -9 },
    mrz: 'MOUNT<<KENYA<<4985M<<2025' },
  { id: 'lamu', photo: 'lamu', c: [.5, .5], water: 1, title: 'Lamu', date: '27 nov 2025',
    cap: 'Pizza aan het zwembad. Verdiend, na die berg.',
    stamp: { shape: 'oval', color: '#1E5AA8', lines: ['LAMU', '27 NOV 2025', 'KENYA'] }, sp: { left: '56%', top: '-10%', rot: 12 },
    mrz: 'LAMU<<KENYA<<PIZZA<<2025' },
  { id: 'frankrijk', photo: 'frankrijk', c: [.5, .5], title: 'Frankrijk', date: 'mei 2026',
    cap: 'Eén lange tafel, de hele vriendengroep. Niemand wilde als eerste opstaan.', fx: 'leak',
    stamp: { shape: 'rect', color: '#8A2D3B', lines: ['FRANCE', 'ENTRE AMIS', 'MAI 2026'] }, sp: { left: '-8%', top: '-10%', rot: -9 },
    mrz: 'FRANCE<<ENTRE<<AMIS<<2026' },
  { id: 'griekenland', photo: 'griekenland', c: [.48, .5], water: 1, sea: 1, title: 'Griekenland', date: 'jul 2026',
    cap: 'Zeilen met jouw familie. Ik mocht zelfs even aan het roer.',
    stamp: { shape: 'oval', color: '#1A4F9C', lines: ['HELLAS', 'JUL 2026', 'PER ZEILBOOT'] }, sp: { left: '56%', top: '-11%', rot: 11 },
    mrz: 'HELLAS<<ZEILEN<<FAMILIE<<2026' },
  { id: 'parijs', photo: 'parijs', c: [.5, .55], title: 'Parijs', date: '14 sep 2026',
    cap: 'Koffie in de ene hand, Parijs in de andere.', fx: 'leak',
    stamp: { shape: 'circle', color: '#B8322A', lines: ['RÉPUBLIQUE FRANÇAISE', 'PARIS', '14·09·2026', 'ENTRÉE'] }, sp: { left: '54%', top: '-9%', rot: -10 },
    mrz: 'PARIS<<LUXEMBOURG<<2026' },
  { id: 'thai', title: 'Thailand', date: 'nu',
    cap: 'Deze pagina schrijven we op dit moment.', fx: 'thai',
    stamp: { shape: 'rect', color: '#C46A12', lines: ['THAILAND', 'ADMITTED', '31 OCT 2026'] }, sp: { left: '-7%', top: '-8%', rot: -10 },
    mrz: 'THAILAND<<NU<<HIER<<2026' },
  { id: 'empty', title: 'Binnenkort', date: '?', cap: 'Er is nog één pagina leeg.', fx: 'empty',
    stamp: { shape: 'circle', color: '#1F3A68', lines: ['UNITED KINGDOM', 'EDINBURGH', 'VOORJAAR 2027', 'SCHATJEPOEPIE & BEAU'] }, sp: { left: '12%', top: '16%', rot: -12, w: '76%' },
    mrz: '<<<<<<<<<<<<<<<<<<<<<<<<<<' },
];
const PARTY = ['#F7C948', '#FF6B6B', '#4ECDC4', '#FFFFFF', '#C77DFF', '#FF9F43'];
const SCOT = ['#1F3A68', '#0065BD', '#FFFFFF', '#E2B33C', '#B1262E'];
const DROP = 16.05;     // seconds into reveal.m4a where the beat drops
const LAND = 5.0;       // seconds into the board sequence where EDINBURGH lands
const PARTY_VOL = .8;

/* ---------------- svg helpers ---------------- */
let inkId = 0;
function stampSVG({ shape, color, lines }) {
  const id = 'ink' + (++inkId);
  const filt = `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${inkId * 7}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="${inkId * 13}" result="n2"/>
    <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.72" result="m"/>
    <feComposite in="d" in2="m" operator="in"/></filter>`;
  const T = (txt, x, y, size, ls = 1) => `<text x="${x}" y="${y}" font-size="${size}" letter-spacing="${ls}" text-anchor="middle" fill="${color}" stroke="none">${txt}</text>`;
  let vb, body;
  if (shape === 'circle') {
    vb = '0 0 200 200';
    const fit = (s, max) => Math.min(max, 186 / (s.length * 0.62 + 1.5));
    body = `<circle cx="100" cy="100" r="92" stroke-width="5"/><circle cx="100" cy="100" r="81" stroke-width="1.8"/><circle cx="100" cy="100" r="53" stroke-width="1.8"/>
      <path id="${id}t" d="M 36 100 A 64 64 0 0 1 164 100" fill="none" stroke="none"/>
      <path id="${id}b" d="M 26 100 A 74 74 0 0 0 174 100" fill="none" stroke="none"/>
      <text font-size="${fit(lines[0], 14).toFixed(1)}" letter-spacing="1.5" fill="${color}" stroke="none" text-anchor="middle"><textPath href="#${id}t" xlink:href="#${id}t" startOffset="50%">${lines[0]}</textPath></text>
      <text font-size="12" letter-spacing="2" fill="${color}" stroke="none" text-anchor="middle"><textPath href="#${id}b" xlink:href="#${id}b" startOffset="50%">${lines[3] || ''}</textPath></text>
      ${T(lines[1], 100, 104, lines[1].length > 8 ? 19 : lines[1].length > 6 ? 24 : 30, 1)}${T(lines[2], 100, 126, 11, 1)}
      <path d="M58 76 h84 M58 134 h84" stroke-width="1.5"/>`;
  } else if (shape === 'oval') {
    vb = '0 0 240 150';
    body = `<ellipse cx="120" cy="75" rx="113" ry="67" stroke-width="5"/><ellipse cx="120" cy="75" rx="102" ry="56" stroke-width="1.6"/>
      ${T(lines[2], 120, 50, 11, 2)}${T(lines[0], 120, 86, lines[0].length > 6 ? 27 : 34, 1)}${T(lines[1], 120, 110, 13, 1)}`;
  } else {
    vb = '0 0 240 132';
    body = `<rect x="5" y="5" width="230" height="122" rx="9" stroke-width="4.5"/><rect x="14" y="14" width="212" height="104" rx="4" stroke-width="1.5"/>
      ${T(lines[0], 120, 54, lines[0].length > 11 ? 21 : 25, 1)}${T(lines[1], 120, 80, 14, 1)}${T(lines[2], 120, 104, 13, 2)}`;
  }
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs>${filt}</defs>
    <g filter="url(#${id})" fill="none" stroke="${color}" font-family="'Space Mono', monospace" font-weight="700">${body}</g></svg>`;
}
function guillocheURI(color = '#c9b78f') {
  let p = '';
  for (let i = 0; i < 24; i++) {
    let d = `M0 ${18 + i * 32}`;
    for (let x = 0; x <= 400; x += 8) {
      const y = 18 + i * 32 + Math.sin(x * 0.034 + i * 0.7) * 9 + Math.sin(x * 0.012 + i) * 6;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    p += `<path d="${d}"/>`;
  }
  let r = '';
  for (let k = 0; k < 36; k++) r += `<ellipse cx="200" cy="560" rx="130" ry="38" transform="rotate(${k * 5} 200 560)"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 760" preserveAspectRatio="none"><g fill="none" stroke="${color}" stroke-width=".6" opacity=".5">${p}</g><g fill="none" stroke="${color}" stroke-width=".5" opacity=".28">${r}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
// one sett of a dark Black Watch-style tartan with a red and gold overcheck; tiles seamlessly
const TARTAN_SVG = (() => {
  const bands = [[8, 34, '#1F5640', .55], [58, 34, '#1F5640', .55], [42, 16, '#0B1220', .5], [24, 2, '#0B1220', .6], [74, 2, '#0B1220', .6],
    [49, 2, '#C3343C', .95], [-1, 2, '#E2B33C', .9], [99, 2, '#E2B33C', .9]];
  const v = bands.map(([x, w, c, o]) => `<rect x="${x}" y="0" width="${w}" height="100" fill="${c}" opacity="${o}"/>`).join('');
  const h = bands.map(([y, w, c, o]) => `<rect x="0" y="${y}" width="100" height="${w}" fill="${c}" opacity="${o}"/>`).join('');
  let twill = '';
  for (let k = -100; k < 100; k += 4) twill += `M${k} 0L${k + 100} 100`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" shape-rendering="crispEdges"><rect width="100" height="100" fill="#1C2D4F"/>
    ${v}${h}<path d="${twill}" stroke="#000" stroke-width="1.1" opacity=".12" shape-rendering="auto"/></svg>`;
})();
const TARTAN_URI = `url("data:image/svg+xml,${encodeURIComponent(TARTAN_SVG)}")`;
// a piper marching to the left; legs and bob are animated in CSS
const PIPER_SVG = (() => {
  const leg = (cx, hose, cls) => `<g class="leg ${cls}">
    <rect x="${cx - 5}" y="144" width="10" height="9" fill="#EDC2A0"/>
    <rect x="${cx - 5.5}" y="151" width="11" height="37" rx="3" fill="${hose}"/>
    <rect x="${cx + 2}" y="154" width="4" height="8" fill="#B1262E"/>
    <path d="M${cx + 5.5} 186V196H${cx - 13}Q${cx - 13} 189 ${cx - 5.5} 186Z" fill="#111"/></g>`;
  const dice = [0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${40 + i * 5}" y="${40 + (i % 2) * 3.5}" width="5" height="3.5" fill="#B1262E"/>`).join('');
  return `<svg viewBox="0 0 120 206" xmlns="http://www.w3.org/2000/svg">
  <defs><pattern id="kilt" width="14" height="14" patternUnits="userSpaceOnUse">
    <rect width="14" height="14" fill="#B1262E"/><rect x="4" width="4" height="14" fill="#1F4D3A" opacity=".75"/><rect y="4" width="14" height="4" fill="#1F4D3A" opacity=".75"/>
    <rect x="11" width="1" height="14" fill="#E2B33C"/><rect y="11" width="14" height="1" fill="#E2B33C"/><rect x="5.5" width="1" height="14" fill="#1B2A4A"/></pattern></defs>
  <ellipse cx="58" cy="199" rx="32" ry="4.5" fill="#000" opacity=".28"/>
  <g class="bob">
    ${leg(66, '#D8CFBC', 'b')}${leg(50, '#EFE8D8', 'a')}
    <g stroke="#2B1A12" stroke-width="3.4" stroke-linecap="round"><path d="M70 86L86 22"/><path d="M76 86L98 12"/><path d="M82 88L106 28"/></g>
    <g fill="#EFE6D0"><circle cx="86" cy="22" r="2.6"/><circle cx="98" cy="12" r="3"/><circle cx="106" cy="28" r="2.6"/><circle cx="80" cy="46" r="2"/><circle cx="89" cy="40" r="2"/><circle cx="96" cy="54" r="2"/></g>
    <path d="M86 34Q93 44 101 38" fill="none" stroke="#C3343C" stroke-width="1.5"/><path d="M99 38l2 9h-3z" fill="#C3343C"/>
    <path d="M68 70Q78 92 56 104" fill="none" stroke="#16223A" stroke-width="7" stroke-linecap="round"/>
    <path d="M44 66Q57 61 72 66L77 112H41Z" fill="#1D2B45"/>
    <g fill="#D9D9D9"><circle cx="49" cy="76" r="1.4"/><circle cx="49" cy="86" r="1.4"/><circle cx="49" cy="96" r="1.4"/></g>
    <path d="M64 63L76 69L50 111L42 105Z" fill="url(#kilt)"/><circle cx="69" cy="67" r="3" fill="#D9D9D9"/>
    <ellipse cx="76" cy="91" rx="13" ry="11" fill="url(#kilt)"/><path d="M64 98q12 6 25-2" fill="none" stroke="#2a0f12" stroke-width="1.6"/>
    <path d="M40 112H78L81 147H37Z" fill="url(#kilt)"/>
    <path d="M37 147l3-6 3 6 3-6 3 6 3-6 3 6 3-6 3 6 3-6 3 6 3-6 3 6 3-6 3 6" fill="none" stroke="#7d1a22" stroke-width="1"/>
    <path d="M40 107H78V113H40Z" fill="#111"/><rect x="55" y="107.5" width="7" height="5" fill="none" stroke="#D9D9D9" stroke-width="1.2"/>
    <path d="M49 113h14v10q0 10-7 11q-7-1-7-11z" fill="#F4F1EA"/><g stroke="#111" stroke-width="1.6" stroke-linecap="round"><path d="M53 123v8"/><path d="M56 123v9"/><path d="M59 123v8"/></g>
    <path d="M46 61L68 84" stroke="#2B1A12" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="57" cy="55" rx="10" ry="11" fill="#F1C7A5"/><path d="M47.5 52l-3.5 4 3.6 1.2" fill="#F1C7A5"/><circle cx="48.6" cy="60" r="4.2" fill="#F1C7A5"/>
    <circle cx="51" cy="52" r="1.1" fill="#2a1a12"/>
    <path d="M40 46C37 22 43 4 57 3C71 2 77 20 75 46Z" fill="#141414"/>
    <path d="M73 18q9-3 7 11q-2 7-7 5z" fill="#F2F2F2"/>
    <rect x="40" y="40" width="35" height="7" fill="#fff"/>${dice}
    <path d="M61 70Q72 96 50 120" fill="none" stroke="#1D2B45" stroke-width="8" stroke-linecap="round"/>
    <path d="M59 95L44 142" stroke="#2B1A12" stroke-width="3.8" stroke-linecap="round"/><circle cx="44" cy="142" r="3" fill="#EFE6D0"/>
    <circle cx="56" cy="104" r="4.6" fill="#F1C7A5"/><circle cx="50" cy="121" r="4.6" fill="#F1C7A5"/>
  </g></svg>`;
})();
const THAI_SVG = `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B1B4D"/><stop offset=".42" stop-color="#B8436E"/><stop offset=".72" stop-color="#F2955A"/><stop offset="1" stop-color="#FFD48A"/></linearGradient>
  <linearGradient id="tsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0A06A"/><stop offset=".35" stop-color="#9C4F6E"/><stop offset="1" stop-color="#2E1E48"/></linearGradient></defs>
  <rect width="400" height="330" fill="url(#tsky)"/>
  <g fill="#fff" opacity=".7"><circle cx="40" cy="40" r="1.2"/><circle cx="120" cy="22" r="1"/><circle cx="210" cy="56" r="1.1"/><circle cx="330" cy="30" r="1.3"/><circle cx="370" cy="90" r="1"/></g>
  <circle cx="246" cy="300" r="58" fill="#FFE2A6"/>
  <rect y="318" width="400" height="182" fill="url(#tsea)"/>
  <g fill="#FFE2A6" opacity=".75"><rect x="196" y="328" width="100" height="3" rx="1.5"/><rect x="210" y="340" width="72" height="3" rx="1.5"/><rect x="222" y="352" width="48" height="2.5" rx="1.2"/><rect x="232" y="364" width="28" height="2" rx="1"/></g>
  <path d="M0 330V188C12 160 30 152 40 182C50 140 70 132 82 170C92 206 98 262 114 330Z" fill="#2A1838"/>
  <path d="M286 330C296 262 306 232 328 226C344 182 368 176 380 210C392 238 400 248 400 258V330Z" fill="#33203F"/>
  <path d="M122 330C128 302 140 292 150 302C158 288 168 290 174 330Z" fill="#3F2648"/>
  <path d="M0 330H400" stroke="#FFD48A" stroke-width="1.5" opacity=".5"/>
  <g transform="translate(118 368)" fill="#1b1026"><path d="M0 22Q66 36 138 18L150 4Q104 14 18 12Z"/><path d="M26 13L34-9H100L108 15Z"/><path d="M138 18L170 38" stroke="#1b1026" stroke-width="3"/></g>
  <g fill="#FFE2A6" opacity=".25"><rect x="40" y="420" width="90" height="2" rx="1"/><rect x="250" y="440" width="110" height="2" rx="1"/><rect x="150" y="468" width="70" height="2" rx="1"/></g></svg>`;
const EMBLEM = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/><ellipse cx="50" cy="50" rx="17" ry="40"/><path d="M10 50h80M15 31h70M15 69h70"/>
  <path d="M50 64C38 54 35 46 41 41.5C45.5 38.5 50 41 50 45C50 41 54.5 38.5 59 41.5C65 46 62 54 50 64Z" fill="#D9B56A" stroke="#4a1222" stroke-width="2"/></svg>`;
function posterSVG() {
  let s = 11;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const stone = ['#CDBCA2', '#BCAA8F', '#D9CBB2', '#AE9F88', '#C4B49A', '#E0D3BC'];
  // Old Town: tall tenements stepping down the Royal Mile, from the castle (right) towards Holyrood (left)
  const ridge = x => 438 + (230 - x) * .16;
  const row = r => {
    let out = '';
    for (let x = -14; x < 236;) {
      const w = 13 + rnd() * 13, top = ridge(x + w / 2) + r * 22 - rnd() * 16;
      out += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="60" fill="${stone[Math.floor(rnd() * stone.length)]}"/>`;
      out += `<path d="M${(x - 1).toFixed(1)} ${top.toFixed(1)}L${(x + w / 2).toFixed(1)} ${(top - 7 - rnd() * 4).toFixed(1)}L${(x + w + 1).toFixed(1)} ${top.toFixed(1)}Z" fill="${rnd() < .7 ? '#5E6470' : '#4E5360'}"/>`;
      if (rnd() < .6) out += `<rect x="${(x + w * .7).toFixed(1)}" y="${(top - 10).toFixed(1)}" width="3" height="8" fill="#6B5E55"/>`;
      const nw = w > 20 ? 2 : 1;
      for (let c = 0; c < nw; c++) for (let k = 0; k < 3; k++) out += `<rect x="${(x + (c + 1) * w / (nw + 1) - 1.5).toFixed(1)}" y="${(top + 6 + k * 11).toFixed(1)}" width="3" height="5" fill="#4a3f38" opacity=".55"/>`;
      x += w + rnd() * 1.5;
    }
    return out;
  };
  const stGiles = `<g fill="#9C8C78"><rect x="143" y="395" width="14" height="60"/><path d="M148.5 384L150 366L151.5 384Z"/></g>
    <g fill="none" stroke="#9C8C78" stroke-width="2.2"><path d="M143 395Q150 376 157 395"/><path d="M146.5 395Q150 380 153.5 395"/></g>`;
  const rock = `<path d="M196 540C206 492 214 452 230 418C236 404 244 398 252 396L404 390V540Z" fill="#7B6A77"/>
    <g fill="#6A5966"><path d="M214 470l10-30 4 34-8 26z"/><path d="M238 430l8-18 3 30-6 24z"/><path d="M262 420l6-12 2 40-5 18z"/><path d="M300 404l7 26-4 30z"/><path d="M350 398l5 30-3 34z"/></g>`;
  const merlons = (x0, x1, y) => { let m = ''; for (let x = x0; x < x1 - 2; x += 6) m += `<rect x="${x}" y="${y - 4}" width="3.5" height="4"/>`; return m; };
  const castle = `<g fill="#D6C1A0">
      <path d="M246 398V372Q268 362 292 368V398Z"/><rect x="290" y="374" width="114" height="24"/><rect x="262" y="350" width="18" height="18"/>
      <rect x="300" y="346" width="44" height="30"/><rect x="312" y="324" width="15" height="24"/><rect x="346" y="356" width="54" height="20"/>
      ${merlons(246, 292, 369)}${merlons(262, 280, 350)}${merlons(290, 404, 374)}${merlons(300, 344, 346)}${merlons(312, 327, 324)}</g>
    <path d="M344 356L372 342L400 356Z" fill="#6D6874"/>
    <g fill="#BFA684"><rect x="246" y="388" width="158" height="10"/><rect x="300" y="346" width="6" height="30"/></g>
    <g fill="#5a4c44" opacity=".7">${[310, 320, 330].map(x => `<rect x="${x}" y="356" width="3" height="6"/>`).join('')}${[352, 362, 372, 382, 392].map(x => `<rect x="${x}" y="364" width="3" height="5"/>`).join('')}<rect x="318" y="332" width="3" height="6"/></g>
    <path d="M319.5 324V300" stroke="#5a4c44" stroke-width="1.4"/>
    <rect x="320" y="300" width="20" height="13" fill="#0065BD"/><path d="M320 300l20 13M340 300l-20 13" stroke="#fff" stroke-width="2.2"/>`;
  let trees = '';
  for (let x = -10; x < 410; x += 13 + rnd() * 8) trees += `<circle cx="${x.toFixed(1)}" cy="${(522 + rnd() * 14).toFixed(1)}" r="${(10 + rnd() * 8).toFixed(1)}" fill="${['#4C7449', '#3F6540', '#5A8452'][Math.floor(rnd() * 3)]}"/>`;
  // Scott Monument in Princes Street Gardens
  const m = 306;
  const scott = `<g fill="#4E4038">
      <rect x="${m - 20}" y="552" width="40" height="40"/><path d="M${m - 16} 552L${m - 13} 508H${m + 13}L${m + 16} 552Z"/>
      <path d="M${m - 11} 508L${m - 8} 468H${m + 8}L${m + 11} 508Z"/><path d="M${m - 6} 468L${m} 410L${m + 6} 468Z"/>
      ${[[-20, 552, 18], [20, 552, 18], [-15, 508, 15], [15, 508, 15], [-10, 468, 12], [10, 468, 12]].map(([dx, y, h]) => `<path d="M${m + dx - 2.2} ${y}L${m + dx} ${y - h}L${m + dx + 2.2} ${y}Z"/>`).join('')}</g>
    <g fill="#F2C6B6" opacity=".55"><path d="M${m - 8} 592V572Q${m} 560 ${m + 8} 572V592Z"/><path d="M${m - 6} 548V528Q${m} 518 ${m + 6} 528V548Z"/><path d="M${m - 4} 504V488Q${m} 481 ${m + 4} 488V504Z"/></g>`;
  const phone = `<path d="M344 600V558Q344 548 355 547Q366 548 366 558V600Z" fill="#C8102E"/><rect x="346" y="556" width="18" height="4" fill="#1b1b1b"/>
    <g fill="#F6E7B8" opacity=".9">${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${348 + c * 5}" y="${564 + r * 8}" width="4" height="6.5"/>`).join('')).join('')}</g>
    <rect x="343" y="598" width="24" height="3" fill="#8f0b20"/>`;
  let pave = '';
  for (let i = 0; i < 12; i++) {
    let d = `M-10 ${612 + i * 14}`;
    for (let x = -10; x <= 410; x += 10) d += ` L${x} ${(612 + i * 14 + Math.sin(x * 0.05 + i * 0.9) * 4).toFixed(1)}`;
    pave += `<path d="${d}"/>`;
  }
  return `<svg viewBox="0 0 400 760" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="psky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6DCF0"/><stop offset=".5" stop-color="#F3CFC2"/><stop offset=".75" stop-color="#F2B39A"/></linearGradient></defs>
  <rect width="400" height="760" fill="url(#psky)"/>
  <circle cx="300" cy="268" r="58" fill="#FFF1DE"/>
  <g fill="#F0D0C6"><rect x="230" y="290" width="150" height="5"/><rect x="230" y="304" width="150" height="5"/><rect x="230" y="317" width="150" height="4"/></g>
  <g fill="none" stroke="#6E4A5C" stroke-width="2" stroke-linecap="round"><path d="M60 210q7-6 14 0q7-6 14 0"/><path d="M110 180q5-4 10 0q5-4 10 0"/><path d="M350 160q5-4 10 0q5-4 10 0"/></g>
  <path d="M-10 480V430C10 420 28 392 44 380C52 374 60 372 66 376L74 396C90 400 120 404 150 414C180 422 200 432 214 450V480Z" fill="#B99AB4"/>
  ${row(0)}${stGiles}${row(1)}${row(2)}${row(3)}
  ${rock}${castle}
  <rect y="512" width="400" height="80" fill="#5E8758"/>${trees}
  ${scott}
  <rect y="590" width="400" height="170" fill="#EBDCC4"/>
  <g fill="none" stroke="#D8C6A8" stroke-width="3">${pave}</g>
  <path d="M0 662H400M0 676H400" stroke="#9c8a6a" stroke-width="2"/>
  ${phone}</svg>`;
}
function barcodeSVG() {
  let x = 0, bars = '';
  let s = 811;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  while (x < 280) { const w = 1 + Math.floor(rnd() * 3.2); if (rnd() > .38) bars += `<rect x="${x}" y="0" width="${w}" height="46"/>`; x += w + 1; }
  return `<svg viewBox="0 0 280 46" preserveAspectRatio="none" width="100%" height="100%"><g fill="#1b1914">${bars}</g></svg>`;
}

/* ---------------- sound ---------------- */
const Sound = {
  ctx: null, buffers: {}, tracks: {}, muted: false, lastFlap: 0,
  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.connect(c.destination);
    this.music = c.createGain(); this.music.gain.value = .9; this.music.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = .9; this.sfx.connect(this.master);
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  async load(name, url) {
    if (!this.ctx) return;
    const ab = await (await fetch(url)).arrayBuffer();
    this.buffers[name] = await new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej));
  },
  unlock() {
    if (!this.ctx) return;
    this.ctx.resume();
    const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.ctx.destination); s.start(0);
  },
  get on() { return !!this.ctx && this.ctx.state === 'running'; },
  play(name, { offset = 0, fade = .8, loop = true, loopStart = 0, vol = PARTY_VOL, when = 0 } = {}) {
    if (!this.on || !this.buffers[name]) return;
    this.stop(name, .05);
    const c = this.ctx, src = c.createBufferSource();
    src.buffer = this.buffers[name]; src.loop = loop;
    if (loop) { src.loopStart = loopStart; src.loopEnd = src.buffer.duration; }
    const g = c.createGain(), t = Math.max(when, c.currentTime);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.max(.02, fade));
    src.connect(g).connect(this.music); src.start(t, offset % src.buffer.duration);
    this.tracks[name] = { src, g };
  },
  stop(name, fade = .6) {
    const tr = this.tracks[name]; if (!tr) return;
    const t = this.ctx.currentTime;
    tr.g.gain.cancelScheduledValues(t); tr.g.gain.setValueAtTime(Math.max(tr.g.gain.value, .0001), t);
    tr.g.gain.exponentialRampToValueAtTime(.0001, t + fade);
    try { tr.src.stop(t + fade + .05); } catch (e) {}
    delete this.tracks[name];
  },
  level(name, vol, time = .5) {
    const tr = this.tracks[name]; if (!tr) return;
    const t = this.ctx.currentTime;
    tr.g.gain.cancelScheduledValues(t); tr.g.gain.setValueAtTime(Math.max(tr.g.gain.value, .0001), t);
    tr.g.gain.exponentialRampToValueAtTime(Math.max(vol, .0001), t + time);
  },
  playing(name) { return !!this.tracks[name]; },
  setMuted(m) { this.muted = m; if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, .05); },
  tone(f, dur, { type = 'sine', vol = .2, a = .005, when = 0, slideTo = 0 } = {}) {
    if (!this.on) return;
    const c = this.ctx, t = when || c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + dur + .05);
  },
  noise({ dur = .2, vol = .3, type = 'bandpass', f = 1200, fTo = 0, q = 1, a = .003, when = 0 } = {}) {
    if (!this.on) return;
    const c = this.ctx, t = when || c.currentTime, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (fTo) fl.frequency.exponentialRampToValueAtTime(fTo, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl).connect(g).connect(this.sfx); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  },
  chime() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    [[659.25, 0], [523.25, .55]].forEach(([f, d]) => {
      this.tone(f, 1.9, { vol: .22, when: t + d }); this.tone(f * 2, 1.2, { vol: .05, when: t + d }); this.tone(f * 3.01, .6, { vol: .02, when: t + d });
    });
  },
  tick(p) { this.tone(500 + p * 900, .05, { type: 'triangle', vol: .05 }); },
  thud(big) {
    this.tone(big ? 92 : 120, big ? .4 : .24, { vol: big ? .75 : .5, slideTo: 45 });
    this.noise({ dur: .13, vol: big ? .5 : .32, type: 'lowpass', f: 900 });
    this.noise({ dur: .05, vol: .18, type: 'bandpass', f: 2600, q: .8 });
  },
  flap() {
    if (!this.on) return;
    const n = this.ctx.currentTime; if (n - this.lastFlap < .02) return; this.lastFlap = n;
    this.noise({ dur: .028, vol: .2, type: 'bandpass', f: 1700 + Math.random() * 1500, q: 1.4, a: .001 });
    this.tone(170 + Math.random() * 60, .03, { type: 'square', vol: .025, a: .001 });
  },
  whoosh() { this.noise({ dur: .5, vol: .14, type: 'bandpass', f: 450, fTo: 2400, q: .7, a: .14 }); },
  ding() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    this.tone(1046.5, 1.5, { vol: .18, when: t }); this.tone(2093, .7, { vol: .04, when: t }); this.tone(1318.5, 1.7, { vol: .16, when: t + .32 });
  },
  pipes(dur = 3.2) {
    if (!this.on) return;
    const c = this.ctx, t = c.currentTime, end = t + dur;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(this.sfx);
    const voice = (f, vol, t0, t1, a = .02) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + a);
      g.gain.setValueAtTime(vol, Math.max(t0 + a, t1 - .08)); g.gain.exponentialRampToValueAtTime(.0001, t1);
      o.connect(g).connect(lp); o.start(t0); o.stop(t1 + .05);
    };
    // drones: bass and two slightly beating tenors
    voice(120, .045, t, end, .4); voice(240, .03, t, end, .4); voice(240.7, .025, t, end, .4);
    // chanter: a few notes, each with a high-G grace note
    let k = t + .45;
    for (const [f, d] of [[720, .32], [480, .42], [600, .3], [720, .6]]) {
      voice(840, .035, k, k + .035, .005); voice(f, .04, k + .035, k + d);
      k += d;
    }
  },
  pop() { this.noise({ dur: .09, vol: .32, type: 'highpass', f: 1200, a: .001 }); this.tone(320, .14, { vol: .14, slideTo: 110 }); },
  rip() { this.noise({ dur: .45, vol: .3, type: 'bandpass', f: 2600, fTo: 800, q: .6, a: .01 }); },
  sparkle() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    [0, .08, .16, .24, .32].forEach((d, i) => this.tone(1318.5 * Math.pow(1.19, i), .4, { vol: .045, when: t + d, type: 'triangle' }));
  },
  brush(dur) { this.noise({ dur, vol: .05, type: 'bandpass', f: 3200, fTo: 2200, q: .9, a: .2 }); },
  tileTick() { this.noise({ dur: .03, vol: .07, type: 'bandpass', f: 2800 + Math.random() * 1600, q: 2, a: .001 }); },
  doors() { this.noise({ dur: 1.3, vol: .08, type: 'lowpass', f: 320, a: .25 }); },
};
function ensureMusic(name) {
  if (!Sound.on) return;
  if (name === 'party' && !Sound.playing('party')) { Sound.stop('reveal', .8); Sound.play('party', { fade: 1.2 }); }
  if (name === 'reveal' && !Sound.playing('reveal')) { Sound.stop('party', .8); Sound.play('reveal', { offset: DROP, loopStart: DROP, fade: 1 }); }
}

/* ---------------- tilt (gyro / mouse) ---------------- */
const Tilt = {
  x: 0, y: 0, tx: 0, ty: 0, base: null,
  onOrient(e) {
    if (e.gamma == null) return;
    if (!this.base) this.base = { b: e.beta, g: e.gamma };
    this.tx = clamp((e.gamma - this.base.g) / 16, -1, 1);
    this.ty = clamp((e.beta - this.base.b) / 16, -1, 1);
    this.base.b += (e.beta - this.base.b) * .003; this.base.g += (e.gamma - this.base.g) * .003;
  },
  request() {
    const add = () => addEventListener('deviceorientation', e => this.onOrient(e));
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        return DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') add(); }).catch(() => {});
      }
      add();
    } catch (e) {}
    return Promise.resolve();
  },
  pointer(e) {
    const r = stage.getBoundingClientRect();
    this.tx = clamp(((e.clientX - r.left) / r.width - .5) * 2, -1, 1);
    this.ty = clamp(((e.clientY - r.top) / r.height - .5) * 2, -1, 1);
  },
  vec(t) {
    this.x += (this.tx - this.x) * .07; this.y += (this.ty - this.y) * .07;
    return [this.x + Math.sin(t * .6) * .3, this.y + Math.cos(t * .45) * .22];
  },
};

/* ---------------- WebGL living photos ---------------- */
const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;
varying vec2 v;
uniform sampler2D uImg,uMap,uEdit,uRev;
uniform vec2 uRes,uImgSize,uCenter,uTilt;
uniform float uZoom,uTime,uStrength,uFocus,uProg,uEditOn,uWater,uSea,uFade,uBino,uBinoR,uGrain;
vec2 frameUV(vec2 st){
  float ca=uRes.x/uRes.y, ia=uImgSize.x/uImgSize.y;
  vec2 sz = ca<ia ? vec2(ca/ia,1.0) : vec2(1.0,ia/ca);
  sz/=uZoom;
  vec2 c=clamp(uCenter,sz*.5,1.0-sz*.5);
  return c+(st-.5)*sz;
}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 st=vec2(v.x,1.0-v.y);
  vec2 uv=frameUV(st);
  vec2 sh=uTilt*uStrength/uZoom;
  vec2 p=uv;
  for(int i=0;i<5;i++){float d=texture2D(uMap,p).r;p=uv+sh*(d-uFocus);}
  float w=texture2D(uMap,p).g*uWater;
  vec2 q=p;
  if(w>.002) q+=w*vec2(sin(p.y*150.+uTime*2.3),cos(p.x*120.+uTime*1.8))*.0016;
  vec3 col=texture2D(uImg,q).rgb;
  if(uEditOn>.5){
    float r=texture2D(uRev,p).r*255.;
    if(r>.5){
      float tt=(r-1.)/254.;
      float k=smoothstep(tt-.010,tt+.004,uProg);
      col=mix(col,texture2D(uEdit,p).rgb,k);
      float g=exp(-pow((uProg-tt)/.014,2.))*step(.02,uProg)*(1.-step(.999,uProg));
      col+=g*vec3(1.,.93,.8)*.28;
    }
  }
  if(w>.002){float cs=pow(max(0.,sin(q.x*300.+uTime*3.)*sin(q.y*240.-uTime*2.2)),6.);
    if(uSea>.5){vec2 g=floor(q*vec2(170.,460.));float tw=fract(hash(g)+uTime*.4);cs=step(.988,hash(g+3.7))*pow(sin(tw*3.1416),10.)*1.6;}  // open sea: scattered sun glints instead of pool caustics
    col+=w*cs*.25;}
  if(uBino>0.){
    vec2 b=(st-.5)*vec2(uRes.x/uRes.y,1.);
    float d=min(length(b-vec2(-.17,0.)),length(b-vec2(.17,0.)));
    float lens=1.-smoothstep(uBinoR-.006,uBinoR+.006,d);
    float inner=mix(.5,1.,1.-smoothstep(uBinoR*.45,uBinoR,d));
    col=mix(col,col*lens*inner,uBino);
  }
  vec2 vg=st-.5; col*=1.-dot(vg,vg)*.32;
  col+=(hash(st*uRes+fract(uTime)*91.)-.5)*uGrain;
  gl_FragColor=vec4(col*uFade,1.);
}`;
const CAM0 = { zoom: 1, cx: .5, cy: .5, prog: 0, edit: 0, water: 0, sea: 0, bino: 0, binoR: .2, strength: .034, focus: .5, fade: 1, grain: .035 };
const GL = {
  ok: false, cam: { ...CAM0 }, key: null, active: false, tex: {}, slot: null,
  init() {
    const c = this.canvas = document.createElement('canvas');
    const gl = this.gl = c.getContext('webgl', { alpha: false, antialias: false, depth: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    try {
      const pr = this.prog = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    } catch (e) { console.error(e); return; }
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(this.prog);
    this.u = {};
    for (const n of ['uImg', 'uMap', 'uEdit', 'uRev', 'uRes', 'uImgSize', 'uCenter', 'uTilt', 'uZoom', 'uTime', 'uStrength', 'uFocus', 'uProg', 'uEditOn', 'uWater', 'uSea', 'uFade', 'uBino', 'uBinoR', 'uGrain']) this.u[n] = gl.getUniformLocation(this.prog, n);
    gl.uniform1i(this.u.uImg, 0); gl.uniform1i(this.u.uMap, 1); gl.uniform1i(this.u.uEdit, 2); gl.uniform1i(this.u.uRev, 3);
    c.addEventListener('webglcontextlost', e => { e.preventDefault(); this.ok = false; });
    this.ok = true;
  },
  makeTex(img, data) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, data ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  },
  prepare(key) {
    if (!this.ok || this.tex[key]) return;
    const ph = PH[key];
    if (!images[ph.img] || !images[ph.map]) return;
    this.tex[key] = {
      img: this.makeTex(images[ph.img]), map: this.makeTex(images[ph.map], true),
      edit: ph.edit && images[ph.edit] ? this.makeTex(images[ph.edit]) : null,
      rev: ph.rev && images[ph.rev] ? this.makeTex(images[ph.rev], true) : null,
    };
  },
  attach(slot, key, cam = {}) {
    if (!this.ok) return;
    this.prepare(key);
    if (!this.tex[key]) return;
    if (this.canvas.parentNode !== slot) { this.canvas.classList.remove('vis'); slot.appendChild(this.canvas); }
    this.slot = slot; this.key = key;
    this.cam = Object.assign({ ...CAM0 }, cam);
    this.resize(); this.active = true;
    requestAnimationFrame(() => requestAnimationFrame(() => this.canvas.classList.add('vis')));
  },
  detach() { this.active = false; this.canvas.classList.remove('vis'); },
  resize() {
    if (!this.slot) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(this.slot.clientWidth * dpr)), h = Math.max(2, Math.round(this.slot.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  },
  render(t) {
    if (!this.ok || !this.active) return;
    const gl = this.gl, u = this.u, c = this.cam, T = this.tex[this.key], ph = PH[this.key];
    const [tx, ty] = Tilt.vec(t);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.img);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T.map);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, T.edit || T.img);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, T.rev || T.map);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uImgSize, ph.w, ph.h);
    gl.uniform2f(u.uCenter, c.cx, c.cy);
    gl.uniform2f(u.uTilt, tx, ty);
    gl.uniform1f(u.uZoom, c.zoom); gl.uniform1f(u.uTime, t); gl.uniform1f(u.uStrength, c.strength); gl.uniform1f(u.uFocus, c.focus);
    gl.uniform1f(u.uProg, c.prog); gl.uniform1f(u.uEditOn, c.edit && T.edit ? 1 : 0); gl.uniform1f(u.uWater, c.water); gl.uniform1f(u.uSea, c.sea);
    gl.uniform1f(u.uFade, c.fade); gl.uniform1f(u.uBino, c.bino); gl.uniform1f(u.uBinoR, c.binoR); gl.uniform1f(u.uGrain, c.grain);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  },
};

/* ---------------- confetti ---------------- */
const Confetti = {
  c: $('#confetti'), parts: [], w: 0, h: 0, dpr: 1, dirty: false,
  resize() {
    this.dpr = Math.min(devicePixelRatio || 1, 2); this.w = stage.clientWidth; this.h = stage.clientHeight;
    this.c.width = this.w * this.dpr; this.c.height = this.h * this.dpr; this.x = this.c.getContext('2d');
  },
  add(p) { this.parts.push(Object.assign({ rot: Math.random() * 6, vr: (Math.random() - .5) * .4, r: 4 + Math.random() * 5, shape: Math.random() < .7 ? 0 : 1, tilt: Math.random() * 6 }, p)); },
  burst({ x = .5, y = .45, n = 140, colors = PARTY, power = 1, spread = Math.PI * 2, angle = -Math.PI / 2 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - .5) * spread, v = (5 + Math.random() * 11) * power;
      this.add({ x: x * this.w, y: y * this.h, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, c: colors[i % colors.length] });
    }
  },
  rain(ms, colors = PARTY) {
    const end = performance.now() + ms;
    const tick = () => {
      if (performance.now() > end) return;
      for (let i = 0; i < 2; i++) this.add({ x: Math.random() * this.w, y: -12, vx: (Math.random() - .5) * 1.2, vy: 1 + Math.random() * 2, c: colors[Math.floor(Math.random() * colors.length)] });
      setTimeout(tick, 45);
    };
    tick();
  },
  step(dt) {
    const x = this.x; if (!x) return;
    if (!this.parts.length) { if (this.dirty) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, this.c.width, this.c.height); this.dirty = false; } return; }
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); x.clearRect(0, 0, this.w, this.h); this.dirty = true;
    const k = Math.min(3, dt * 60);
    this.parts = this.parts.filter(p => {
      p.vx *= Math.pow(.97, k); p.vy = p.vy * Math.pow(.955, k) + .2 * k;
      p.x += p.vx * k + Math.sin(p.tilt) * .6; p.y += p.vy * k; p.rot += p.vr * k; p.tilt += .09 * k;
      if (p.y > this.h + 20) return false;
      x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.scale(1, Math.cos(p.tilt)); x.fillStyle = p.c;
      if (p.shape) { x.beginPath(); x.arc(0, 0, p.r * .55, 0, 7); x.fill(); } else x.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
      x.restore();
      return true;
    });
  },
};

/* ---------------- split-flap display ---------------- */
const FLAP_CHARS = 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789';
class Flap {
  constructor(parent) {
    this.el = document.createElement('div'); this.el.className = 'flap';
    this.el.innerHTML = '<div class="t"><span></span></div><div class="b"><span></span></div><div class="ft"><span></span></div><div class="fb"><span></span></div>';
    const d = this.el.children;
    this.t = d[0].firstChild; this.b = d[1].firstChild; this.ftd = d[2]; this.fbd = d[3]; this.ft = d[2].firstChild; this.fb = d[3].firstChild;
    this.ch = ' '; parent.appendChild(this.el);
  }
  set(ch) {
    (this.anims || []).forEach(a => a.cancel()); this.anims = null; this.gen = (this.gen || 0) + 1;
    this.ftd.style.visibility = this.fbd.style.visibility = 'hidden';
    this.ch = ch; this.t.textContent = this.b.textContent = ch;
  }
  flip(ch, dur = 40) {
    const old = this.ch; if (old === ch) return Promise.resolve();
    this.ch = ch;
    this.t.textContent = ch; this.ft.textContent = old; this.fb.textContent = ch; this.b.textContent = old;
    this.ftd.style.visibility = this.fbd.style.visibility = 'visible';
    Sound.flap();
    const a1 = this.ftd.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], { duration: dur, easing: 'ease-in', fill: 'both' });
    const a2 = this.fbd.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: dur, delay: dur, easing: 'ease-out', fill: 'both' });
    this.anims = [a1, a2];
    return a2.finished.then(() => {
      if (this.ch === ch) this.b.textContent = ch;
      this.ftd.style.visibility = this.fbd.style.visibility = 'hidden'; a1.cancel(); a2.cancel();
    }).catch(() => {});
  }
}
class FlapRow {
  constructor(el, n) { this.cells = [...Array(n)].map(() => new Flap(el)); }
  setAll(text) { this.cells.forEach((c, i) => { c.set(text[i] || ' '); c.el.classList.remove('lit', 'hl'); }); }
  spin(text, steps = 2) {
    return Promise.all(this.cells.map(async (c, i) => {
      const target = text[i] || ' ';
      await wait(i * 14);
      const n = steps + Math.floor(Math.random() * 2);
      if (target === ' ' && c.ch === ' ') return;
      const g = c.gen;
      for (let k = 0; k < n; k++) { if (c.gen !== g) return; await c.flip(FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)]); }
      if (c.gen === g) await c.flip(target);
    }));
  }
}
const pad = (w, n) => { const l = Math.floor((n - w.length) / 2); return (' '.repeat(l) + w).padEnd(n, ' '); };

/* ---------------- the passport book ---------------- */
const Book = {
  el: $('#book'), pages: [], cur: -1, pending: null,
  build() {
    this.el.style.setProperty('--guil', guillocheURI());
    PAGES.forEach((P, i) => {
      const el = document.createElement('article');
      el.className = 'page' + (P.id === 'cover' ? ' cover' : '');
      el.style.zIndex = 100 - i;
      if (P.id === 'cover') {
        el.innerHTML = `<div class="cv-inner"><p class="cv-top">REISPAS</p><div class="cv-emblem">${EMBLEM}</div><h2 class="cv-title">SCHATJEPOEPIE<br>&amp; BEAU</h2><p class="cv-sub">Geldig voor altijd</p></div><div class="cv-chip"></div><p class="cv-hint">Laten we even terugbladeren.</p>`;
      } else {
        let inner = '';
        if (P.photo) inner += `<img class="ph" src="${PH[P.photo].img}" alt="" style="object-position:${P.c[0] * 100}% ${P.c[1] * 100}%">`;
        if (P.fx === 'leak') inner += '<div class="fx leak"></div>';
        if (P.fx === 'doors') inner += '<div class="doors"><div class="door l"></div><div class="door r"></div></div><div class="lift-ind">▲ 4</div>';
        if (P.fx === 'bino') inner += '<div class="lenscap"></div>';
        if (P.fx === 'thai') inner += `<div class="thai">${THAI_SVG}</div><div class="pin"><b></b></div><div class="pin-label">JE BENT HIER</div>`;
        if (P.fx === 'empty') inner += '<div class="empty-box"><span>?</span></div>';
        const sp = P.sp;
        el.innerHTML = `<header class="pg-head"><span>BLZ. ${String(i).padStart(2, '0')}</span><span>SCHATJEPOEPIE &amp; BEAU</span></header>
          <div class="pg-body">
            <div class="pg-wrap"><div class="pg-frame${P.fx === 'empty' ? ' noframe' : ''}">${inner}</div>
              <div class="stamp" style="left:${sp.left};top:${sp.top};--rot:rotate(${sp.rot}deg);${sp.w ? 'width:' + sp.w : ''}">${stampSVG(P.stamp)}</div></div>
            <div class="pg-meta"><h2 class="pg-title">${P.title}</h2><p class="pg-date">${P.date}</p></div>
            <p class="pg-cap">${P.cap}</p>
          </div>
          <footer class="pg-mrz">P&lt;NLD${P.mrz.replace(/</g, '&lt;')}${'&lt;'.repeat(40)}</footer>`;
      }
      this.el.appendChild(el);
      this.pages.push({ el, P, frame: el.querySelector('.pg-frame'), stamp: el.querySelector('.stamp') });
    });
  },
  settle() { if (this.pending) { const p = this.pending; this.pending = null; p.anim.finish(); p.done(); } },
  layout(p) {
    this.pages.forEach((pg, i) => { pg.el.classList.toggle('gone', i < p || i > p + 1); });
  },
  jump(p) {
    this.settle();
    this.pages.forEach(pg => { pg.el.getAnimations().forEach(a => a.cancel()); });
    this.layout(p); this.cur = p;
  },
  turnTo(p) {
    this.settle();
    const from = this.cur;
    if (from < 0 || Math.abs(p - from) !== 1) { this.jump(p); return Promise.resolve(); }
    this.cur = p;
    Sound.whoosh();
    if (p > from) {
      const el = this.pages[from].el;
      this.pages.forEach((pg, i) => pg.el.classList.toggle('gone', i < from || i > p + 1));
      const anim = el.animate([{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(-62deg)', opacity: 1, offset: .55 }, { transform: 'rotateY(-104deg)', opacity: 0 }],
        { duration: 760, easing: 'cubic-bezier(.5,.05,.4,1)', fill: 'forwards' });
      const done = () => { el.classList.add('gone'); anim.cancel(); this.layout(p); };
      this.pending = { anim, done };
      return anim.finished.then(() => { if (this.pending && this.pending.anim === anim) { this.pending = null; done(); } }).catch(() => {});
    }
    const el = this.pages[p].el;
    el.classList.remove('gone');
    const anim = el.animate([{ transform: 'rotateY(-104deg)', opacity: 0 }, { transform: 'rotateY(-50deg)', opacity: 1, offset: .45 }, { transform: 'rotateY(0deg)', opacity: 1 }],
      { duration: 680, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' });
    const done = () => { anim.cancel(); this.layout(p); };
    this.pending = { anim, done };
    return anim.finished.then(() => { if (this.pending && this.pending.anim === anim) { this.pending = null; done(); } }).catch(() => {});
  },
};
function resetPage(pg) {
  pg.el.classList.add('pre');
  if (pg.stamp) pg.stamp.classList.remove('in', 'static');
  const doors = $('.doors', pg.el); if (doors) doors.classList.remove('open');
  const ind = $('.lift-ind', pg.el); if (ind) { ind.style.opacity = 1; ind.textContent = '▲ 4'; }
  const cap = $('.lenscap', pg.el); if (cap) cap.classList.remove('off');
  if (pg.P.id === 'empty') setEmpty(pg, false);
}
function setEmpty(pg, edi) {
  $('.pg-title', pg.el).textContent = edi ? 'Edinburgh' : pg.P.title;
  $('.pg-date', pg.el).textContent = edi ? 'voorjaar 2027' : pg.P.date;
  $('.pg-cap', pg.el).textContent = edi ? 'Jij en ik. Dat wordt de volgende stempel.' : pg.P.cap;
  $('.empty-box', pg.el).classList.toggle('ta', edi);
  $('.pg-mrz', pg.el).innerHTML = edi ? 'P&lt;NLDEDINBURGH&lt;&lt;SCHATJEPOEPIE&lt;&lt;BEAU&lt;&lt;2027' + '&lt;'.repeat(40) : 'P&lt;NLD' + '&lt;'.repeat(60);
}
function stampIn(pg, big) {
  if (!pg.stamp) return;
  pg.stamp.classList.remove('in', 'static'); void pg.stamp.offsetWidth; pg.stamp.classList.add('in');
  setTimeout(() => {
    Sound.thud(big);
    pg.el.classList.remove('shake'); void pg.el.offsetWidth; pg.el.classList.add('shake');
    if (navigator.vibrate) navigator.vibrate(big ? 35 : 18);
  }, 150);
}

/* ---------------- scenes ---------------- */
const SEC = {
  checkin: $('.s-checkin'), bday: $('.s-bday'), book: $('.s-book'), board: $('.s-board'),
  tartan: $('.s-tartan'), pass: $('.s-pass'), poster: $('.s-poster'),
};
function show(sec) { Object.values(SEC).forEach(s => s.classList.toggle('on', s === sec)); }
const hintEl = $('#hint');
let allowAt = Infinity, cur = -1;
function ready(run, ms = 0, hint = true) {
  allowAt = performance.now() + ms;
  if (hint && cur < SCENES.length - 1) setTimeout(() => { if (run === RUN) hintEl.classList.add('on'); }, ms + 2400);
}

async function enterBirthday(run) {
  show(SEC.bday);
  const text = $('#bdText'), shade = $('.bd-shade');
  text.classList.remove('on'); shade.classList.remove('on');
  GL.attach($('#bdSlot'), 'kenya', { zoom: 2.3, cx: .70, cy: .12, edit: 1, prog: 0, strength: .022, fade: 0, grain: .03 });
  const cam = GL.cam;
  await tween(run, 1000, e => { cam.fade = e; }, E.out);
  await sleep(run, 250);
  // the sign repaints itself, the camera follows the brush
  const p3y = x => (0.3154 * x + 200) / 1600, p4y = x => (0.3306 * x + 352) / 1600;
  let sx = cam.cx, sy = cam.cy;
  Sound.sparkle(); Sound.brush(3.4);
  await tween(run, 3600, (e, raw) => {
    const prog = .1 + .9 * raw;
    cam.prog = prog;
    let x;
    if (prog < .45) x = 130 + clamp(prog / .42, 0, 1) * 1070; else x = 130 + clamp((prog - .48) / .52, 0, 1) * 1070;
    const tx = x / 1200, ty = prog < .45 ? p3y(x) : p4y(x);
    sx = lerp(sx, tx, .06); sy = lerp(sy, ty, .06);
    cam.cx = sx; cam.cy = sy; cam.zoom = lerp(2.3, 1.85, E.out(Math.min(1, raw * 3)));
  }, E.lin);
  cam.prog = 1;
  await sleep(run, 300);
  const z0 = cam.zoom, x0 = cam.cx, y0 = cam.cy;
  await tween(run, 2100, e => { cam.zoom = lerp(z0, 1, e); cam.cx = lerp(x0, .56, e); cam.cy = lerp(y0, .5, e); }, E.inOut);
  shade.classList.add('on'); text.classList.add('on');
  Sound.pop();
  Confetti.burst({ x: .5, y: .62, n: 170, power: 1.15 });
  ready(run, 700);
}

async function enterPage(run, p, prev) {
  const pg = Book.pages[p];
  const fromBook = prev && prev.sec === SEC.book && prev.page !== undefined && Book.cur >= 0;
  if (!fromBook) { GL.detach(); Book.jump(p); show(SEC.book); }
  resetPage(pg);
  if (fromBook) await Book.turnTo(p);
  alive(run);
  const P = pg.P;
  pg.el.classList.remove('pre');
  if (P.photo) GL.attach(pg.frame, P.photo, { zoom: 1, cx: P.c[0], cy: P.c[1], water: P.water || 0, sea: P.sea || 0 });
  else GL.detach();
  if (P.id === 'cover' || P.id === 'empty') { ready(run, 300); return; }
  if (P.fx === 'doors') {
    await sleep(run, 300);
    Sound.ding();
    if (Sound.playing('party')) Sound.level('party', .08, .6);
    Sound.play('lift', { loop: false, fade: .6, vol: .9 });
    await sleep(run, 380);
    $('.doors', pg.el).classList.add('open'); Sound.doors();
    setTimeout(() => { const ind = $('.lift-ind', pg.el); if (ind) ind.style.opacity = 0; }, 1400);
    await sleep(run, 1100);
  }
  if (P.fx === 'bino') {
    const cam = GL.cam;
    Object.assign(cam, { bino: 1, binoR: .2, zoom: 3.4, cx: .80, cy: .43 });
    await sleep(run, 120);
    $('.lenscap', pg.el).classList.add('off');
    await tween(run, 1500, e => { cam.cx = lerp(.80, .497, e); cam.cy = lerp(.43, .42, e); });
    await sleep(run, 400);
    await tween(run, 1100, e => { cam.cx = lerp(.497, .3, e); cam.cy = lerp(.42, .3, e); cam.zoom = lerp(3.4, 2.3, e); });
    await sleep(run, 250);
    await tween(run, 1300, e => { cam.binoR = lerp(.2, 1.1, E.in(e)); cam.zoom = lerp(2.3, 1, e); cam.cx = lerp(.3, .33, e); cam.cy = lerp(.3, .5, e); });
    cam.bino = 0;
  }
  await sleep(run, 350);
  stampIn(pg);
  ready(run, 450);
}
function leavePage(p) {
  if (PAGES[p].fx === 'doors') { Sound.stop('lift', .5); if (Sound.playing('party')) Sound.level('party', PARTY_VOL, .9); }
}

const dest = new FlapRow($('#destFlaps'), 11), gate = new FlapRow($('#gateFlaps'), 5), status = new FlapRow($('#statusFlaps'), 8);
const quipEl = $('#quip');
function quip(t) { quipEl.style.opacity = 0; setTimeout(() => { quipEl.textContent = t; quipEl.style.opacity = 1; }, 180); }
async function enterBoard(run) {
  GL.detach(); show(SEC.board);
  dest.setAll(pad('', 11)); gate.setAll('08·11'); status.setAll('WACHTEN '); quipEl.innerHTML = '&nbsp;';
  Sound.stop('party', .9); Sound.stop('reveal', .2);
  const useA = Sound.on;
  const now = () => (useA ? Sound.ctx.currentTime : performance.now() / 1000);
  const t0 = now() + .5;
  if (useA) Sound.play('reveal', { offset: DROP - LAND, when: t0, fade: .5, loop: true, loopStart: DROP });
  const at = s => new Promise((res, rej) => { const f = () => { if (run !== RUN) return rej(new Cancelled()); now() >= t0 + s ? res() : requestAnimationFrame(f); }; f(); });
  const seq = [['PARIJS', .2, 'Al geweest.'], ['BANGKOK', .95, 'Daar komen we net vandaan.'], ['KILIMANJARO', 1.7, 'Volgende keer.'], ['IJMUIDEN', 2.5, 'Grapje.'], ['TOKYO', 3.25, 'Ooit.']];
  for (const [w, s, q] of seq) { await at(s); quiet(dest.spin(pad(w, 11), 2)); setTimeout(() => run === RUN && quip(q), 280); }
  await at(4.0);
  quip('…');
  quiet(dest.spin(pad('EDINBURGH', 11), 2));
  await at(LAND);
  const fin = pad('EDINBURGH', 11);
  dest.cells.forEach((c, i) => { if (c.ch !== fin[i]) c.set(fin[i]); });
  $('#flash').classList.remove('go'); void $('#flash').offsetWidth; $('#flash').classList.add('go');
  dest.cells.forEach(c => { if (c.ch !== ' ') c.el.classList.add('lit'); });
  quiet(status.spin('BOARDING', 1).then(() => status.cells.forEach(c => c.el.classList.add('hl'))));
  quip('Edinburgh. Jij en ik.');
  Confetti.burst({ x: .5, y: .4, n: 200, colors: SCOT, power: 1.3 });
  if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
  ready(run, 1300);
}

async function enterEdinburgh(run) {
  GL.detach();
  const p = PAGES.length - 1, pg = Book.pages[p];
  Book.jump(p); show(SEC.book);
  pg.el.classList.remove('pre'); pg.stamp.classList.remove('in', 'static');
  setEmpty(pg, false);
  await sleep(run, 700);
  stampIn(pg, true);
  await sleep(run, 260);
  setEmpty(pg, true);
  Confetti.burst({ x: .5, y: .42, n: 110, colors: SCOT, power: .9 });
  ready(run, 800);
}

let tiles = [], tilesFor = '';
function buildTiles() {
  const W = stage.clientWidth, H = stage.clientHeight, key = W + 'x' + H;
  if (tilesFor === key) return;
  tilesFor = key;
  const el = $('#tiles'); el.innerHTML = ''; tiles = [];
  const cols = 6, s = W / cols, rows = Math.ceil(H / s);
  const ph = PH.parijs, scale = Math.max(W / ph.w, H / ph.h), bw = ph.w * scale, bh = ph.h * scale;
  const ox = (W - bw) / 2, oy = clamp(H / 2 - bh * .55, H - bh, 0);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const t = document.createElement('div'); t.className = 'tile';
    t.style.cssText = `left:${c * s}px;top:${r * s}px;width:${s + .6}px;height:${s + .6}px`;
    t.innerHTML = `<i class="f" style="background:url(${ph.img}) ${(ox - c * s).toFixed(1)}px ${(oy - r * s).toFixed(1)}px / ${bw.toFixed(1)}px ${bh.toFixed(1)}px no-repeat"></i><i class="b"></i>`;
    t.lastChild.style.backgroundImage = TARTAN_URI;
    t.dataset.d = r + c * .9;
    tiles.push(t); el.appendChild(t);
  }
}
async function enterTartan(run) {
  GL.detach(); buildTiles();
  tiles.forEach(t => { t.style.transitionDelay = '0ms'; t.classList.remove('flip'); });
  const from = $('#taFrom'), plaque = $('#plaque'), sub = $('#taSub'), piper = $('#piper');
  from.style.opacity = 1; plaque.classList.remove('on'); sub.classList.remove('on');
  piper.getAnimations().forEach(a => a.cancel());
  show(SEC.tartan);
  await sleep(run, 1500);
  from.style.opacity = 0;
  let maxD = 0;
  tiles.forEach(t => { const d = +t.dataset.d; maxD = Math.max(maxD, d); t.style.transitionDelay = (d * 70 + Math.random() * 60).toFixed(0) + 'ms'; t.classList.add('flip'); });
  const flipMs = maxD * 70 + 800;
  for (let k = 0; k < flipMs; k += 55) setTimeout(() => run === RUN && Sound.tileTick(), k);
  await sleep(run, Math.min(1400, flipMs * .6));
  plaque.classList.add('on'); Sound.sparkle();
  await sleep(run, 800);
  sub.classList.add('on');
  await sleep(run, 500);
  const W = stage.clientWidth;
  piper.animate([{ transform: 'translateX(0)' }, { transform: `translateX(-${W + piper.offsetWidth + 40}px)` }], { duration: 9000, easing: 'linear', fill: 'forwards' });
  setTimeout(() => run === RUN && Sound.pipes(), 900);
  ready(run, 900);
}

let torn = false;
async function enterPass(run) {
  GL.detach(); show(SEC.pass);
  const bp = $('#bp'), stub = $('#stub'), after = $('#psAfter');
  torn = false; stub.style.transition = 'none'; stub.style.transform = ''; stub.style.opacity = 1; after.classList.remove('on');
  $('#tearHint').style.visibility = 'visible';
  bp.animate([{ transform: 'translateY(30%) rotate(4deg)', opacity: 0 }, { transform: 'translateY(-46%) rotate(0deg)', opacity: 1 }], { duration: 950, easing: 'cubic-bezier(.2,1.25,.3,1)' });
  Sound.whoosh();
  ready(run, 1000);
}
(function stubDrag() {
  const stub = $('#stub');
  let sx = 0, dx = 0, dragging = false;
  stub.addEventListener('pointerdown', e => { if (torn) return; dragging = true; sx = e.clientX; dx = 0; stub.setPointerCapture(e.pointerId); stub.style.transition = 'none'; });
  stub.addEventListener('pointermove', e => {
    if (!dragging) return;
    dx = e.clientX - sx;
    stub.style.transform = `translateX(${dx}px) rotate(${dx * .04}deg)`;
  });
  const end = () => {
    if (!dragging) return; dragging = false;
    if (Math.abs(dx) > 70) {
      torn = true; const dir = Math.sign(dx);
      Sound.rip(); if (navigator.vibrate) navigator.vibrate(25);
      stub.style.transition = 'transform .9s cubic-bezier(.3,.6,.4,1), opacity .9s';
      stub.style.transform = `translate(${dir * 420}px, 160px) rotate(${dir * 38}deg)`; stub.style.opacity = 0;
      $('#tearHint').style.visibility = 'hidden';
      const r = stub.getBoundingClientRect(), s = stage.getBoundingClientRect();
      Confetti.burst({ x: (r.left + r.width / 2 - s.left) / s.width, y: (r.top - s.top) / s.height, n: 120, colors: SCOT, power: .9 });
      setTimeout(() => $('#psAfter').classList.add('on'), 400);
      allowAt = Math.min(allowAt, performance.now() + 600);
    } else {
      stub.style.transition = 'transform .45s cubic-bezier(.3,1.6,.5,1)'; stub.style.transform = '';
    }
  };
  stub.addEventListener('pointerup', end); stub.addEventListener('pointercancel', end);
})();

async function enterPoster(run) {
  GL.detach();
  const sec = SEC.poster, couple = $('#poCouple');
  sec.classList.remove('go'); couple.classList.remove('on');
  show(sec);
  await sleep(run, 500);
  sec.classList.add('go'); couple.classList.add('on');
  Sound.pop();
  await sleep(run, 400);
  Confetti.rain(4200, SCOT);
  ready(run, 1200, false);
}

const SCENES = [];
SCENES.push({ id: 'checkin', sec: SEC.checkin, enter: async () => show(SEC.checkin) });
SCENES.push({ id: 'birthday', sec: SEC.bday, music: 'party', enter: enterBirthday });
for (let p = 0; p < PAGES.length; p++) SCENES.push({ id: 'page-' + PAGES[p].id, sec: SEC.book, page: p, music: 'party', enter: (run, prev) => enterPage(run, p, prev), leave: () => leavePage(p) });
SCENES.push({ id: 'board', sec: SEC.board, enter: enterBoard });
SCENES.push({ id: 'edinburgh', sec: SEC.book, music: 'reveal', enter: enterEdinburgh });
SCENES.push({ id: 'tartan', sec: SEC.tartan, music: 'reveal', enter: enterTartan });
SCENES.push({ id: 'pass', sec: SEC.pass, music: 'reveal', enter: enterPass });
SCENES.push({ id: 'poster', sec: SEC.poster, music: 'reveal', enter: enterPoster });

const progressEl = $('#progress'), muteEl = $('#mute');
progressEl.innerHTML = '<i></i>'.repeat(SCENES.length - 1);
function updateChrome() {
  [...progressEl.children].forEach((b, i) => b.classList.toggle('done', i < cur));
  progressEl.classList.toggle('on', cur > 0);
  progressEl.classList.toggle('dark', SCENES[cur].id === 'poster');
  muteEl.classList.toggle('on', cur > 0);
}
async function go(i) {
  if (i < 0 || i >= SCENES.length) return;
  const prev = SCENES[cur], next = SCENES[i];
  const run = ++RUN;
  allowAt = Infinity; hintEl.classList.remove('on');
  if (prev && prev.leave) { try { prev.leave(next); } catch (e) {} }
  cur = i; updateChrome();
  if (next.music) ensureMusic(next.music);
  try { await next.enter(run, prev); } catch (e) { if (!(e instanceof Cancelled)) console.error(e); }
}

/* ---------------- input ---------------- */
let downX = 0, downY = 0;
stage.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
stage.addEventListener('pointerup', e => {
  if (cur <= 0) return;
  if (e.target.closest('button, a, .no-tap')) return;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 16) return;
  const r = stage.getBoundingClientRect();
  if ((e.clientX - r.left) / r.width < .25) { if (cur > 1) go(cur - 1); return; }
  if (performance.now() < allowAt) return;
  if (cur < SCENES.length - 1) go(cur + 1);
});
stage.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') Tilt.pointer(e); });
addEventListener('keydown', e => {
  if (cur <= 0) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { if (performance.now() >= allowAt) go(cur + 1); }
  if (e.key === 'ArrowLeft' && cur > 1) go(cur - 1);
});
muteEl.addEventListener('click', () => { Sound.setMuted(!Sound.muted); muteEl.classList.toggle('muted', Sound.muted); });
$('#btnAgain').addEventListener('click', () => go(1));
$('#btnReply').href = 'https://wa.me/?text=' + encodeURIComponent('EDINBURGH!!! 🏴󠁧󠁢󠁳󠁣󠁴󠁿✈️💛');
document.addEventListener('visibilitychange', () => {
  if (!Sound.ctx || !unlocked) return;
  document.hidden ? Sound.ctx.suspend() : Sound.ctx.resume();
});
addEventListener('resize', () => { Confetti.resize(); GL.resize(); });

/* ---------------- check-in ---------------- */
const finger = $('#finger'), label = $('#fingerLabel'), ring = $('#ring'), prints = [...$('#print').children];
let loaded = false, holding = false, verified = false, unlocked = false, holdStart = 0, lastTick = 0;
const HOLD = 1100;
function setRing(p) { ring.style.strokeDashoffset = 1 - p; }
function resetScan(msg) {
  holding = false; finger.classList.remove('holding');
  prints.forEach(p => p.classList.remove('lit')); setRing(1);
  if (msg) label.textContent = msg;
}
function scanLoop() {
  if (!holding) return;
  const p = clamp((performance.now() - holdStart) / HOLD, 0, 1);
  prints.forEach((pa, i) => pa.classList.toggle('lit', p > (i + .5) / prints.length));
  ring.style.transition = 'none'; setRing(p);
  if (p - lastTick > .14) { lastTick = p; Sound.tick(p); }
  if (p >= 1) {
    holding = false; verified = true;
    finger.classList.remove('holding'); finger.classList.add('ok');
    label.textContent = 'Identiteit bevestigd · laat los'; label.classList.add('ok');
    if (navigator.vibrate) navigator.vibrate(40);
    return;
  }
  requestAnimationFrame(scanLoop);
}
finger.addEventListener('contextmenu', e => e.preventDefault());
finger.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!loaded || verified) return;
  try { finger.setPointerCapture(e.pointerId); } catch (err) {}
  holding = true; holdStart = performance.now(); lastTick = 0;
  finger.classList.add('holding'); label.classList.remove('ok'); label.textContent = 'Scannen…';
  scanLoop();
});
const release = () => {
  if (verified && !unlocked) { unlocked = true; boardPlane(); return; }
  if (holding) resetScan('Iets langer vasthouden');
};
finger.addEventListener('pointerup', release);
finger.addEventListener('pointercancel', () => { if (holding) resetScan('Iets langer vasthouden'); });
finger.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && loaded && !unlocked) { e.preventDefault(); verified = true; unlocked = true; finger.classList.add('ok'); boardPlane(); }
});
async function boardPlane() {
  Sound.unlock();
  const perm = Tilt.request();
  label.textContent = 'Welkom aan boord, Schatjepoepie.';
  await Promise.race([perm, wait(10000)]);
  Sound.chime();
  await wait(1900);
  go(1);
}

/* ---------------- boot ---------------- */
const images = {};
const loadImage = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; })
  .then(i => (images[url] = i)).catch(() => {});
function greet() {
  const h = new Date().getHours();
  $('#greet').textContent = (h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond') + ', passagier.';
}
async function boot() {
  greet();
  Book.build();
  $('#piper').innerHTML = PIPER_SVG;
  $('#poArt').innerHTML = posterSVG();
  $('#barcode').innerHTML = barcodeSVG();
  $('.ps-bg').style.backgroundImage = TARTAN_URI;
  document.documentElement.style.setProperty('--ta', TARTAN_URI);
  Confetti.resize();
  GL.init();
  Sound.init();
  const urls = [];
  for (const k in PH) { const p = PH[k]; urls.push(p.img, p.map); if (p.edit) urls.push(p.edit, p.rev); }
  urls.push('img/samen-cutout.webp');
  const audio = [['party', 'audio/party.m4a'], ['reveal', 'audio/reveal.m4a'], ['lift', 'audio/lift.m4a']];
  const total = urls.length + audio.length + 1;
  let done = 0;
  const tick = () => { done++; ring.style.transition = 'stroke-dashoffset .3s'; setRing(done / total); };
  await Promise.all([
    ...urls.map(u => loadImage(u).then(tick)),
    ...audio.map(([n, u]) => Sound.load(n, u).catch(() => {}).then(tick)),
    document.fonts.ready.then(tick),
  ]);
  for (const k in PH) GL.prepare(k);
  loaded = true;
  finger.classList.add('ready');
  label.textContent = 'Houd je duim op de scanner';
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (DEBUG) { window.__go = go; window.__GL = GL; window.__state = () => ({ cur, ready: performance.now() >= allowAt, audio: Sound.ctx && Sound.ctx.state, tracks: Object.keys(Sound.tracks) }); const s = +Q.get('s') || 0; if (s > 0) go(s); else go(0); }
  else go(0);
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  GL.render(now / 1000);
  Confetti.step(dt);
  requestAnimationFrame(frame);
}
boot();
})();
