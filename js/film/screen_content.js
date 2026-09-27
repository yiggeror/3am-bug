// Everything drawn on his monitor (1920 x 1080 virtual pixels): editor, terminal, the little friend living
// on the terminal's prompt line, and — while it is inside the code — tiny versions of the little friend and
// the bug running through the editor at exactly their code-world positions.
import { drawScreen, TERM, SCR } from '../screen.js';
import { editorState, terminalState, TYPE, LOG_AT } from './code.js';
import { cubeCW, bugCW, inCodeWorld } from './cw.js';
import { LINES, CW } from '../codeworld.js';
import { drawCube2 } from '../cube2.js';
import { drawBug } from '../bug.js';
import { T } from './times.js';
import { key, ease, clamp, lerp, TAU } from '../core.js';
import { blinksAt } from '../anim.js';
import { setEmoteInk, MONO_FONT } from '../draw.js';

const K = key;
// editor geometry (must match screen.js ED)
const ED = { x: 0, y: 44, lh: 38.5, fs: 25, gut: 80, cw: 15.0 };
const PROMPT_Y = TERM.y + TERM.h - 70 - 26; // top of the prompt box: where the little friend stands
const TSIZE = 74;
export const LEAP_END = 64.9;                          // it dives into the text here
export const LAND = [238.5, 208];                      // editor: line 4, col 9 (where the code world begins)

// ------------------------------------------------------------------ the little friend in the terminal
export function cubeTerm(t) {
  if (t >= LEAP_END && t < 262.2) return null;
  const S = { size: TSIZE, x: 1800, y: PROMPT_Y, ink: '#15110f', flip: -1 };
  S.blink = blinksAt(t, [2.1, 5.6, 9.3, 12.2, 15.1, 20.8, 26.3, 29.9, 31.6, 36.8, 40.2, 44.1, 47.9, 55.3, 57.0, 264.1, 266.9]);
  S.sq = Math.sin(t * 2.6) * 0.015;
  S.lookX = -0.6; S.lookY = 0.2;
  const at = (a, b) => t >= a && t < b;
  // the first failure (NaN) and the second (TypeError): flinch, worry
  for (const tf of [T.fail1, T.fail2]) if (at(tf, tf + 2.6)) { const d = t - tf; S.sq += K(d, [[0, 0], [0.08, 0.25, 'out'], [0.4, -0.06], [0.7, 0]]); S.eyes = d < 0.5 ? 'wide' : 'normal'; S.brows = 0.8; S.lookY = -0.4; }
  if (at(T.fail2 + 2.6, 33.0)) { S.brows = 0.7; S.lookX = -0.3; S.lookY = -0.8; }
  // looking up at him, worried; a little sweat drop
  if (at(33.0, 45.0)) { S.lookX = 0.1; S.lookY = -1; S.brows = 0.9; S.mouth = 'wave'; S.emote = { type: 'sweat', k: K(t, [[33.4, 0], [33.8, 1], [36.5, 1], [36.9, 0]]), dx: 0.42 }; S.sq += Math.sin(t * 5) * 0.01; }
  // his forehead types garbage: watches the letters crawl in, then looks up at him
  if (at(45.0, 58.4)) {
    S.lookX = K(t, [[50.6, -0.6], [53.0, -1], [55.6, -1], [56.2, 0.1]]); S.lookY = K(t, [[53.0, 0.3], [55.6, 0.3], [56.2, -1]]);
    S.brows = t > 56.2 ? 0.9 : 0.3; S.eyes = t > 53 && t < 53.6 ? 'wide' : 'normal';
    S.emote = { type: '?', k: K(t, [[53.4, 0], [53.6, 1, 'outBack'], [55.2, 1], [55.4, 0]]), dx: 0.3 };
  }
  // resolve: a deep breath, a nod, then it marches to the edge of the terminal
  if (at(58.4, LEAP_END)) {
    const d = t - 58.4;
    S.lookY = K(d, [[0, -1], [0.6, 0]]); S.lookX = 0;
    S.sq = K(d, [[0.4, 0], [1.4, -0.16, 'inOut'], [1.8, -0.16], [2.4, 0.08, 'out'], [2.7, 0]]);
    S.eyes = d > 1.0 && d < 2.4 ? 'closed' : 'normal';
    S.brows = d > 2.6 ? -0.8 : 0;
    S.armL = { a: K(d, [[0.4, 0], [1.4, 0.5], [2.4, -0.3], [2.7, 0]]) }; S.armR = S.armL;
    if (d > 2.8 && d < 3.2) S.sq += Math.sin((d - 2.8) / 0.4 * Math.PI) * 0.12; // nod (squash)
    // march left along the prompt
    const x = K(d, [[3.3, 1800], [5.0, 1236, 'inOut']]);
    if (d > 3.3 && d < 5.0) { const dist = 1800 - x; S.walk = dist / (TSIZE * 0.34); S.walkAmt = 0.9; S.lean = -0.08; S.y -= Math.abs(Math.sin(S.walk * Math.PI)) * 5; S.armL = { a: Math.sin(S.walk * TAU) * 0.7 }; S.armR = { a: -Math.sin(S.walk * TAU) * 0.7 }; }
    S.x = x;
    S.flip = -1;
    // at the edge: a look down at the code, crouch… and leap into the editor (lands in line 4, where
    // the code world begins)
    if (d >= 5.0) {
      const j = d - 5.0;
      S.lookX = K(j, [[0, 0.9], [0.3, 0.9]]); S.lookY = K(j, [[0, 0.5], [0.35, 0.9]]);
      S.sq = K(j, [[0, 0], [0.2, 0.05], [0.55, 0.42, 'in']]);
      S.lean = K(j, [[0.2, 0], [0.55, 0.12]]);
      S.armL = { a: K(j, [[0.2, 0], [0.55, -0.8]]) }; S.armR = S.armL;
      S.eyes = j > 0.4 ? 'squeeze' : 'wide';
      if (j > 0.6) {
        const k = clamp((j - 0.6) / (LEAP_END - 64.0));
        const e = k;
        S.x = lerp(1236, LAND[0], e);
        S.y = lerp(PROMPT_Y, LAND[1], e) - 330 * 4 * e * (1 - e);
        S.sq = k < 0.2 ? -0.3 : k > 0.8 ? -0.28 : -0.1;
        S.rot = lerp(-0.25, 0.55, k) * -S.flip * -1;
        S.bend = lerp(0.35, -0.2, k);
        S.armL = { a: lerp(1.4, 2.2, k) }; S.armR = { a: lerp(1.2, 2.3, k) }; S.legSpread = Math.sin(k * Math.PI) * 1.1;
        S.eyes = k < 0.3 ? 'squeeze' : 'wide';
        S.size = TSIZE * (1 - 0.3 * k);
        S.lean = 0;
      }
    }
  }
  // the end: back home, types the message, falls asleep against the cursor
  if (t >= 262.2) {
    const d = t - 262.2;
    S.x = K(d, [[0, 1180], [1.6, 1440, 'inOut']]);
    if (d < 1.6) { const dist = S.x - 1180; S.walk = dist / (TSIZE * 0.34); S.walkAmt = 0.8; S.flip = 1; }
    else S.flip = 1;
    S.lookX = K(d, [[1.6, 0.6], [1.9, 0.1], [2.2, -0.3]]); S.lookY = K(d, [[1.6, 0], [1.9, -1], [3.4, -1], [3.6, 0.6]]);
    S.eyes = d > 1.9 && d < 3.4 ? 'happy' : 'normal';
    // typing: a little hop per character
    if (d > 3.6 && d < 8.0) { const ph = ((d - 3.6) * 2.6) % 1; S.sq = ph < 0.25 ? 0.12 : 0; S.y -= ph > 0.25 && ph < 0.7 ? 10 : 0; S.lookY = 0.7; S.armR = { a: ph < 0.3 ? -0.5 : 0.2 }; }
    // settles down on top of its message like a loaf, legs tucked in, and dozes off
    if (d > 8.4) {
      const s2 = ease.inOut(clamp((d - 8.4) / 1.2));
      S.lookX = K(d, [[8.4, -0.3], [8.9, -0.5]]); S.lookY = K(d, [[8.4, 0.6], [8.9, 0.8]]);
      S.tuck = s2; S.sq = 0.1 * s2 + Math.sin(d * 1.4) * 0.025 * s2;
      S.rot = K(d, [[8.4, 0], [8.9, 0.08, 'out'], [9.6, -0.04, 'inOut']]);
      S.x += 10 * s2;
      S.eyes = d > 9.4 ? 'content' : d > 8.9 ? 'closed' : 'normal';
      S.blink = d > 8.9 && d < 9.4 ? 0.6 : 0;
      S.armL = { a: -0.9 * s2 }; S.armR = { a: -0.9 * s2 };
      S.emote = { type: 'zzz', k: clamp((d - 10.2) / 1.5), dx: 0.3 };
      S.blush = 0.3;
    }
  }
  return S;
}

// world position → editor pixels (tiny versions in the editor)
function toEditor(x, y, t) {
  const col = x / CW.cw;
  let row = (y - (LINES[0].ground + 6)) / CW.lh;
  if (t >= TYPE.logStart && row >= LOG_AT - 0.5) row += 1;
  return [ED.x + ED.gut + 16 + col * ED.cw, ED.y + 26 + row * ED.lh - ED.lh * 0.42];
}
const MINI = ED.cw / CW.cw;

// ------------------------------------------------------------------ the whole screen
export function screenContent(ctx, t, o = {}) {
  const ed = editorState(t);
  const term = terminalState(t);
  const cube = cubeTerm(t);
  term.cube = null;
  drawScreen(ctx, { editor: ed, term }, t);
  // tiny friends running through the editor
  if (inCodeWorld(t) && !o.noMini) {
    ctx.save();
    ctx.beginPath(); ctx.rect(ED.x + ED.gut, ED.y, 1160 - ED.gut, 1036); ctx.clip();
    const c = cubeCW(t), b = bugCW(t);
    // glow so they read at this size
    for (const a of [b, c]) {
      if (!a) continue;
      const [x, y] = toEditor(a.x, a.y, t);
      const g = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, 46);
      g.addColorStop(0, a === c ? 'rgba(255,150,80,0.45)' : 'rgba(210,100,255,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 50, y - 60, 100, 100);
    }
    if (b && (b.disguise ?? 0) < 0.6) { const [x, y] = toEditor(b.x, b.y, t); drawBug(ctx, { ...b, x, y, size: b.size * MINI * 1.35, emote: null }); }
    if (c) { const [x, y] = toEditor(c.x, c.y, t); drawCube2(ctx, { ...c, x, y, size: c.size * MINI * 1.35, emote: null, lw: 2 }); }
    ctx.restore();
  }
  // the dive: the text splashes like water where it went in
  if (t >= LEAP_END && t < LEAP_END + 1.6) drawSplash(ctx, t - LEAP_END);
  // the little friend at home on the prompt line (or leaping out of it)
  if (cube) { setEmoteInk('#efe5d3'); drawCube2(ctx, cube); setEmoteInk(null); }
  // mouse pointer for the breakpoints
  const mp = mouseAt(t);
  if (mp) drawPointer(ctx, mp[0], mp[1], mp[2]);
}

function drawSplash(ctx, d) {
  const x = LAND[0], y = LAND[1] + 6;
  ctx.save();
  for (let r = 0; r < 3; r++) {
    const k = clamp((d - r * 0.18) / 1.1);
    if (k <= 0 || k >= 1) continue;
    ctx.strokeStyle = `rgba(243,154,98,${0.7 * (1 - k)})`; ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath(); ctx.ellipse(x, y, 20 + k * 150, 4 + k * 22, 0, 0, TAU); ctx.stroke();
  }
  // characters knocked up out of the line, falling back
  const chars = 'let{};()=+<i0';
  ctx.font = `bold 22px ${MONO_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 13; i++) {
    const a = -Math.PI / 2 + (i / 12 - 0.5) * 2.2;
    const v = 260 + (i % 4) * 70;
    const tt = Math.min(d, 1.2);
    const px = x + Math.cos(a) * v * tt * 0.6, py = y + Math.sin(a) * v * tt + 520 * tt * tt;
    const al = clamp(1 - d / 1.3);
    ctx.fillStyle = `rgba(230,225,214,${al})`;
    ctx.save(); ctx.translate(px, py); ctx.rotate(i * 0.7 + d * 6 * (i % 2 ? 1 : -1)); ctx.fillText(chars[i], 0, 0); ctx.restore();
  }
  ctx.restore();
}

// mouse: goes to the gutter and clicks for each breakpoint
export function mouseAt(t) {
  for (const [tb, row] of [[T.bp1, 9], [T.bp2, 4]]) {
    if (t >= tb - 1.2 && t < tb + 1.4) {
      const y = ED.y + 26 + row * ED.lh;
      const x = K(t - tb, [[-1.2, 620], [0.3, 22, 'inOut']]);
      const yy = K(t - tb, [[-1.2, y + 160], [0.3, y, 'inOut']]);
      const click = t - tb > 0.4 && t - tb < 0.55 ? 1 : 0;
      return [x, yy, click];
    }
  }
  return null;
}
function drawPointer(ctx, x, y, click) {
  ctx.save();
  ctx.translate(x, y);
  if (click) { ctx.strokeStyle = 'rgba(255,209,102,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(8, 23); ctx.lineTo(14, 35); ctx.lineTo(19, 33); ctx.lineTo(13, 21); ctx.lineTo(23, 21); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// full-frame view of the monitor. cam: { x, y, zoom } in screen pixels (centre of view)
export function drawMonitorShot(ctx, t, cam, o = {}) {
  ctx.save();
  ctx.fillStyle = '#0c0c10'; ctx.fillRect(0, 0, 1920, 1080);
  ctx.translate(960, 540); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
  // bezel
  ctx.fillStyle = '#26241f'; ctx.fillRect(-60, -60, SCR.w + 120, SCR.h + 120);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SCR.w, SCR.h); ctx.clip();
  screenContent(ctx, t, o);
  ctx.restore();
  ctx.restore();
  // glass: faint reflection band + vignette + subtle pixel grid when very close
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.beginPath(); ctx.moveTo(1200, 0); ctx.lineTo(1560, 0); ctx.lineTo(960, 1080); ctx.lineTo(600, 1080); ctx.closePath(); ctx.fill();
  ctx.restore();
  const v = ctx.createRadialGradient(960, 540, 380, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, 1920, 1080);
  if (cam.zoom > 1.6) {
    ctx.save(); ctx.globalAlpha = Math.min(0.12, (cam.zoom - 1.6) * 0.1); ctx.fillStyle = '#000';
    const step = 3 * cam.zoom;
    for (let y = 0; y < 1080; y += step) ctx.fillRect(0, y, 1920, step * 0.25);
    ctx.restore();
  }
}
