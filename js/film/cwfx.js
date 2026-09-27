// Effects inside the code world — each is what one of his commands *looks like* in there.
//   search (Ctrl+F)      → a searchlight sweeping the code, matches glow
//   console.log('here')  → a lantern post; when the bug passes it shouts "here!" and leaves glowing footprints
//   breakpoint           → a red gate slams down from above
//   the wrong keystroke  → a brace door vanishes, the code collapses, error blocks rain down
//   Ctrl+Z               → everything plays backwards (a rewind)
import { T } from './times.js';
import { TYPE } from './code.js';
import { BUG_PATH, bugCW, cubeCW, jarState, collapseK, CUBE_SIZE } from './cw.js';
import { evalPath } from './path.js';
import { LINES, charCX, charX, CW, toScreen } from '../codeworld.js';
import { shape, line, rect, rectPts, ellipsePts, text, brush, circle, MONO_FONT, HAND_FONT, ZH_FONT } from '../draw.js';
import { Fig } from '../figure.js';
import { key, ease, clamp, lerp, hash2, TAU } from '../core.js';

const K = key;

// ------------------------------------------------------------------ lantern + footprints
const LANTERN = { line: 20, col: 10 };
export function drawLantern(ctx, t) {
  if (t < TYPE.logEnd) return;
  const [x, y] = [charCX(LANTERN.col), LINES[LANTERN.line].ground + 6];
  const pop = K(t - TYPE.logEnd, [[0, 0], [0.25, 1.15, 'out'], [0.45, 1]]);
  const flash = K(t, [[117.45, 0], [117.55, 1, 'out'], [118.6, 0.6], [121, 0.25]]);
  ctx.save();
  ctx.translate(x, y); ctx.scale(pop, pop);
  // glow
  const r = 170 + flash * 130;
  const g = ctx.createRadialGradient(0, -170, 0, 0, -170, r);
  g.addColorStop(0, `rgba(255,214,120,${0.35 + 0.4 * flash})`); g.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = g; ctx.fillRect(-r, -170 - r, r * 2, r * 2);
  const fig = new Fig(ctx, { lw: 3.2, seed: 2201, ink: '#0d0e14' });
  fig.add('post', [[-6, 0], [6, 0], [5, -150], [-5, -150]], { fill: '#8a6a4a', z: 0 });
  fig.add('arm', [[-4, -150], [44, -150], [44, -142], [-4, -142]], { fill: '#8a6a4a', z: 0.1 });
  fig.add('lamp', [[30, -140], [58, -140], [62, -104], [26, -104]], { fill: `rgb(255,${Math.round(214 + 30 * flash)},${Math.round(120 + 80 * flash)})`, z: 0.2 });
  fig.add('cap', [[26, -146], [62, -146], [58, -138], [30, -138]], { fill: '#3b3f58', z: 0.3 });
  fig.add('sign', rectPts(-86, -92, 172, 44, 8, 8), { fill: '#2b2e44', z: 0.4 });
  fig.draw();
  ctx.font = `bold 22px ${MONO_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#82aaff'; ctx.fillText("log('here')", 0, -70);
  if (flash > 0.05) {
    const s = 0.6 + flash * 0.5;
    ctx.save(); ctx.translate(40, -250); ctx.scale(s, s);
    const f2 = new Fig(ctx, { lw: 3, seed: 2210, ink: '#0d0e14' });
    f2.add('bubble', [[-80, -40], [80, -40], [80, 30], [10, 30], [-10, 58], [-14, 30], [-80, 30]], { fill: '#fff4d6', z: 0, sharp: false });
    f2.draw();
    ctx.font = `bold 40px ${HAND_FONT}`; ctx.fillStyle = '#e8743b'; ctx.fillText('here!', 0, -4);
    ctx.restore();
  }
  ctx.restore();
}
// glowing footprints along the bug's route after it passed the lantern
const PRINTS = [];
for (let t = 117.4; t < 119.9; t += 0.09) { const p = evalPath(BUG_PATH, t); if (!p.air) PRINTS.push({ t, x: p.x, y: p.y, i: PRINTS.length }); }
export function drawFootprints(ctx, t) {
  for (const P of PRINTS) {
    const age = t - P.t;
    if (age < 0 || age > 8.5) continue;
    const a = age < 0.2 ? age / 0.2 : Math.max(0, 1 - (age - 3) / 5.5);
    const side = P.i % 2 ? -1 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(255,209,102,0.9)'; ctx.shadowBlur = 14;
    for (const [dx, dy, r] of [[0, 0, 5], [-7, -6, 2.5], [0, -9, 2.5], [7, -6, 2.5]]) { ctx.beginPath(); ctx.arc(P.x + dx + side * 6, P.y - 4 + dy, r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ breakpoint gates
export const GATES = [{ line: 9, col: 8, t: T.bp1 + 0.5 }, { line: 4, col: 13, t: T.bp2 + 0.5 }];
export function drawGates(ctx, t) {
  for (const G of GATES) {
    if (t < G.t - 0.3 || t > T.green + 1.5) continue;
    const x = charCX(G.col), y = LINES[G.line].ground + 6;
    const d = t - G.t;
    const drop = d < 0 ? -900 * (1 + d / 0.3 * 0) : 0;
    const fall = d < 0 ? lerp(-900, 0, ease.in(clamp((d + 0.3) / 0.3))) : -Math.abs(Math.sin(d * 18)) * 40 * Math.exp(-d * 6);
    const out = t > T.green ? clamp((t - T.green) / 1.2) : 0;
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(x, y + fall);
    const H = 250, Wd = 120;
    const glow = ctx.createRadialGradient(0, -H / 2, 0, 0, -H / 2, H);
    glow.addColorStop(0, 'rgba(255,90,90,0.28)'); glow.addColorStop(1, 'rgba(255,90,90,0)');
    ctx.fillStyle = glow; ctx.fillRect(-H, -H * 1.5, H * 2, H * 2);
    const fig = new Fig(ctx, { lw: 3.4, seed: 2300 + G.line, ink: '#0d0e14' });
    for (let i = 0; i < 4; i++) fig.add('bar' + i, rectPts(-Wd / 2 + i * (Wd / 3) - 7, -H, 14, H, 5, 10), { fill: '#e05252', z: 0 });
    fig.add('top', rectPts(-Wd / 2 - 14, -H - 10, Wd + 28, 26, 8, 10), { fill: '#b93b3b', z: 1 });
    fig.add('mid', rectPts(-Wd / 2 - 6, -H * 0.55, Wd + 12, 16, 6, 10), { fill: '#b93b3b', z: 1 });
    fig.add('dot', ellipsePts(0, -H - 42, 22, 22, 20), { fill: '#ff5b5b', z: 2 });
    fig.draw();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-7, -H - 49, 6, 0, TAU); ctx.fill();
    ctx.font = `bold 26px ${MONO_FONT}`; ctx.fillStyle = '#ffd0d0'; ctx.textAlign = 'center'; ctx.fillText(`● ${G.line + 1}`, 0, -H - 84);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ searchlight (screen-space cone from above, aimed in world space)
export function searchAim(t) {
  if (t >= T.search + 2.0 && t < T.lunge1 + 0.3) {
    const sweep = [[T.search + 2.0, [charCX(8), LINES[4].ground]], [T.search + 3.2, [charCX(30), LINES[7].ground]], [T.search + 4.2, [charCX(10), LINES[10].ground]], [T.searchHit, [charCX(25), LINES[10].ground], 'inOut']];
    return { p: K(t, sweep), k: K(t, [[T.search + 2.0, 0], [T.search + 2.4, 1], [T.lunge1, 1], [T.lunge1 + 0.3, 0]]), w: t < T.searchHit ? 200 : 120 };
  }
  if (t >= T.pin + 1.0 && t < T.caught + 0.5) return { p: [charCX(20), LINES[6].ground + 100], k: K(t, [[T.pin + 1.0, 0], [T.pin + 1.5, 1], [T.caught, 1], [T.caught + 0.5, 0]]), w: 520 };
  return null;
}
export function drawSearchlight(ctx, cam, t) {
  const A = searchAim(t);
  if (!A || A.k <= 0.01) return;
  const [sx, sy] = toScreen(cam, A.p[0], A.p[1]);
  const src = [sx * 0.6 + 380, -80];
  const w = A.w * cam.zoom;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(src[0], src[1], sx, sy);
  g.addColorStop(0, `rgba(255,235,170,${0.05 * A.k})`); g.addColorStop(1, `rgba(255,225,150,${0.22 * A.k})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(src[0] - 20, src[1]); ctx.lineTo(src[0] + 20, src[1]); ctx.lineTo(sx + w, sy + 30); ctx.lineTo(sx - w, sy + 30); ctx.closePath(); ctx.fill();
  const r = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 1.1);
  r.addColorStop(0, `rgba(255,235,170,${0.3 * A.k})`); r.addColorStop(1, 'rgba(255,235,170,0)');
  ctx.fillStyle = r; ctx.beginPath(); ctx.ellipse(sx, sy, w * 1.1, w * 0.55, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
// the find widget at the top of the world view
export function drawFindBar(ctx, t) {
  let q = null, count = '';
  if (t >= T.search + 1.2 && t < T.log - 2) { q = 'total'.slice(0, Math.floor(clamp((t - T.search - 1.2) / 1.0) * 5)); count = t > T.search + 3 ? '5 matches' : ''; }
  if (t >= T.pin && t < T.caught) { const n = Math.floor(clamp((t - T.pin - 0.25) / 0.72) * 8.999); q = 'items[i]'.slice(0, n); count = n >= 8 ? '1 match' : ''; }
  if (q === null) return;
  ctx.save();
  const x = 1920 - 560, y = 40;
  ctx.fillStyle = 'rgba(30,31,44,0.92)'; ctx.beginPath(); ctx.roundRect(x, y, 500, 64, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,209,102,0.7)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = `28px ${MONO_FONT}`; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9aa0c0'; ctx.fillText('⌕', x + 22, y + 33);
  ctx.fillStyle = '#e6e1d6'; ctx.fillText(q + (Math.floor(t * 2) % 2 ? '▏' : ''), x + 60, y + 33);
  ctx.fillStyle = '#ffd166'; ctx.textAlign = 'right'; ctx.fillText(count, x + 480, y + 33);
  ctx.restore();
}

// ------------------------------------------------------------------ the error rain (and its rewind)
const BLOCKS = [
  { x: charCX(12), line: 20, txt: 'SyntaxError', t: 135.0, w: 300 },
  { x: charCX(24), line: 22, txt: "'}' expected", t: 135.25, w: 290 },
  { x: charCX(19), line: 20, txt: 'Unexpected end of input', t: 136.25, w: 520, hitsCube: true },
  { x: charCX(34), line: 20, txt: '99+', t: 135.6, w: 130 },
  { x: charCX(8), line: 23, txt: 'Error', t: 135.8, w: 170 },
  { x: charCX(30), line: 19, txt: "')' expected", t: 136.0, w: 280 },
  { x: charCX(14), line: 18, txt: '✕ ✕ ✕', t: 136.6, w: 180 },
];
export function drawErrorRain(ctx, t) {
  if (t < 134.9 || t > T.rewind + 2.4) return;
  for (const B of BLOCKS) {
    const landY = LINES[B.line].ground + 6 - 70 - (B.hitsCube ? CUBE_SIZE * 0.84 * 0.38 : 0);
    let y, a = 1, rot;
    const fallDur = 0.45;
    if (t < T.rewind) {
      const d = t - B.t;
      if (d < 0) continue;
      y = d < fallDur ? lerp(landY - 1400, landY, ease.in(d / fallDur)) : landY - Math.abs(Math.sin((d - fallDur) * 16)) * 30 * Math.exp(-(d - fallDur) * 6);
      rot = (hash2(B.t * 10, 3) - 0.5) * 0.3 * clamp(d / fallDur);
    } else {
      // rewind: fly back up in reverse order
      const d = t - T.rewind - (B.t - 135.0) * 0.4;
      y = d < 0 ? landY : lerp(landY, landY - 1500, ease.in(clamp(d / 0.6)));
      a = 1 - clamp((d - 0.5) / 0.3);
      rot = (hash2(B.t * 10, 3) - 0.5) * 0.3;
    }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(B.x, y); ctx.rotate(rot);
    rect(ctx, -B.w / 2, 0, B.w, 70, { r: 10, fill: '#e05252', lw: 3.4, seed: 2400 + B.t * 10, stroke: '#0d0e14' });
    ctx.font = `bold 34px ${MONO_FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(B.txt, 0, 37);
    ctx.restore();
  }
}
// screen-space rewind overlay
export function drawRewind(ctx, t) {
  const k = K(t, [[T.rewind - 0.15, 0], [T.rewind, 1], [T.rewind + 2.2, 1], [T.rewind + 2.5, 0]]);
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(80,120,255,0.08)'; ctx.fillRect(0, 0, 1920, 1080);
  // VHS tracking bands rolling upward
  for (let i = 0; i < 3; i++) {
    const y = 1080 - ((t * 700 + i * 380) % 1300);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(0, y, 1920, 26);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y + 26, 1920, 10);
  }
  ctx.font = `bold 64px ${MONO_FONT}`; ctx.fillStyle = '#e6e1d6'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('⏪ Ctrl+Z', 80, 110);
  ctx.restore();
}

// ------------------------------------------------------------------ the green wave when the tests pass
export function greenK(line, t) {
  const d = t - T.green - 0.4 - line * 0.07;
  return d < 0 ? 0 : Math.max(0, 1 - d / 1.2) * clamp(d / 0.15);
}
export function drawGreenWave(ctx, t) {
  if (t < T.green || t > T.green + 5) return;
  for (const L of LINES) {
    const k = greenK(L.i, t);
    if (k <= 0 || L.empty || L.isComment) continue;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(120,230,140,${0.35 * k})`;
    ctx.beginPath(); ctx.roundRect(L.x0, L.ground, L.x1 - L.x0, L.bottom - L.ground, 14); ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------------------------ the jar shelf at the end of the file
const OLD_JARS = [['off-by-one', '01:13'], ['undefined', '23:40'], ['typo', '02:05']];
export function drawShelf(ctx, t) {
  if (t < 230) return;
  const x0 = charCX(8) + 120, y = LINES[25].ground + 6;
  const fig = new Fig(ctx, { lw: 3.2, seed: 2500, ink: '#0d0e14' });
  fig.add('plank', rectPts(x0 - 40, y, 820, 18, 4, 10), { fill: '#8a6a4a', z: 0, sharp: true });
  fig.draw();
  OLD_JARS.forEach(([name, time], i) => drawJar(ctx, x0 + 230 + i * 170, y, { lid: 1, label: `${name}`, time, bug: 'old', seed: i }));
}
export function drawJar(ctx, x, y, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  const s = o.s ?? 1;
  ctx.scale(s, s);
  // glass
  const fig = new Fig(ctx, { lw: 3, seed: 2600 + (o.seed || 0), ink: '#0d0e14' });
  fig.add('glass', [[-52, 0], [52, 0], [56, -12], [56, -118], [44, -130], [-44, -130], [-56, -118], [-56, -12]], { fill: 'rgba(170,210,255,0.16)', z: 0 });
  if (o.lid > 0) fig.add('lid', rectPts(-50, -150 - (1 - o.lid) * 60, 100, 24, 6, 10), { fill: '#e8743b', z: 1 });
  fig.draw();
  if (o.bug === 'old') {
    // a sleepy old bug, drawn simply
    const col = ['#6fbf73', '#e0b44c', '#7fb2ff'][(o.seed || 0) % 3];
    shape(ctx, ellipsePts(0, -40, 30, 22, 18), { fill: col, lw: 2.6, seed: 2610 + (o.seed || 0), stroke: '#0d0e14' });
    line(ctx, [[-10, -44], [-4, -42]], { lw: 2, stroke: '#0d0e14', seed: 2620 });
    line(ctx, [[4, -42], [10, -44]], { lw: 2, stroke: '#0d0e14', seed: 2621 });
    text(ctx, 'z', 26, -76, { size: 22, color: 'rgba(230,225,214,0.7)', font: HAND_FONT });
  }
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-42, -112, 10, 80);
  if (o.label) {
    rect(ctx, -46, -96, 92, 50, { r: 4, fill: '#fbf6ea', lw: 2.2, seed: 2630 + (o.seed || 0), stroke: '#0d0e14' });
    ctx.fillStyle = '#3b3530'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${o.big ? 16 : 14}px ${MONO_FONT}`; ctx.fillText(o.label, 0, -80);
    ctx.font = `13px ${MONO_FONT}`; ctx.fillStyle = o.big ? '#2e8b3e' : '#6d645a'; ctx.fillText(o.time || '', 0, -60);
  }
  ctx.restore();
}
export function drawNewJar(ctx, t) {
  const J = jarState(t);
  if (!J) return;
  drawJar(ctx, J.x, J.y, { lid: J.lid, label: J.label ? 'FIXED ✓' : null, time: '04:52', big: true, s: J.k, seed: 9 });
}

// dizzy stars around the little friend
export function drawStars(ctx, S, t) {
  if (!S || !(S.stars > 0.05)) return;
  for (let i = 0; i < 3; i++) {
    const a = t * 5 + (i * TAU) / 3;
    text(ctx, '★', S.x + Math.cos(a) * 70, S.y - CUBE_SIZE * 0.7 + Math.sin(a) * 14, { size: 34 * S.stars, color: '#ffd166', still: true });
  }
}
