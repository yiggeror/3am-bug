// Action test reel (phase 2): the programmer's key actions in the real sets with real lighting,
// and the little friend's key actions. Each segment is labelled on screen.
import { makeFilm } from './film.js';
import { DESIGNS } from './human/design.js';
import { drawSideSet } from './sets/side.js';
import { drawFrontSet } from './sets/front.js';
import { drawBackSet } from './sets/back.js';
import { drawKeysSet, typingState } from './sets/keys.js';
import { Cam } from './world.js';
import { CODE, TEST_FAIL, TEST_PASS } from './screen.js';
import { cube } from './cube.js';
import { drawCube2, cubeTop2 } from './cube2.js';
import { text, brush, dust, speedLines, ZH_FONT, HAND_FONT, MONO_FONT, setBoil, rect } from './draw.js';
import { key, ease, clamp, lerp, noise1, hash2, TAU } from './core.js';
import { onTwos, evalTracks, merge, follow, lagOf, blink, blinksAt, breathe, drift } from './anim.js';

const D = DESIGNS.A;
const K = key;

// ------------------------------------------------------------------ shared layers
function idle(P, t, o = {}) {
  const br = breathe(t, o.rate ?? 0.24, o.phase ?? 0) * (o.amp ?? 1);
  P.breath = (P.breath || 0) + br * 0.7;
  P.shrug = (P.shrug || 0) + br * 0.05;
  const h = P.head || {};
  P.head = { ...h, nod: (h.nod || 0) + br * 0.015 + drift(t, 11, 0.025, 0.4), turn: (h.turn || 0) + drift(t, 12, 0.035, 0.22), tilt: (h.tilt || 0) + drift(t, 13, 0.018, 0.3) };
  if (!o.noBlink) {
    const bl = blink(t, o.seed ?? 3, o.every ?? 3.3);
    const f = P.face || {};
    P.face = { ...f, lid: clamp((f.lid ?? 0) + bl * (1 - (f.lid ?? 0))) };
  }
  return P;
}
// hair / cowlick / strings follow-through from a scalar "head position" proxy of a performance
function secondary(perf, t, proxy, gain = 0.05) {
  const f = (tt) => proxy(perf(tt));
  const lag = lagOf(f, t, 2.3, 0.26, 1.2);
  const lag2 = lagOf(f, t, 1.6, 0.2, 1.4);
  return { sway: clamp(lag * gain, -1.3, 1.3), strings: clamp(lag2 * gain * 0.8, -1, 1) };
}
function withSecondary(perf, t, proxy, gain) {
  const P = perf(t);
  const s = secondary(perf, t, proxy, gain);
  P.hair = { ...(P.hair || {}), sway: (P.hair?.sway || 0) + s.sway };
  P.strings = (P.strings || 0) + s.strings;
  return P;
}
// keystroke rhythm for body views: returns 0..1 "press" pulses for a hand
function strokes(t, seed, t0, t1, cps = 7) {
  if (t < t0 || t > t1) return 0;
  // bursts of typing separated by little pauses
  const burst = noise1(t * 0.9, seed) > -0.35 ? 1 : 0;
  const ph = (t * cps + hash2(Math.floor(t * cps), seed) * 0.3) % 1;
  return burst * Math.max(0, 1 - ph * 3.2);
}

function label(ctx, n, zh, en) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(20,18,26,0.72)';
  ctx.beginPath(); ctx.roundRect(36, 972, 1040, 76, 18); ctx.fill();
  ctx.restore();
  text(ctx, `动作测试 ${n} ·`, 62, 1010, { size: 34, font: ZH_FONT, color: '#f39a62', align: 'left', still: true });
  text(ctx, zh, 262, 1004, { size: 30, font: ZH_FONT, color: '#f3ead8', align: 'left', still: true });
  text(ctx, en, 264, 1036, { size: 22, font: HAND_FONT, color: '#b8ae9c', align: 'left', still: true });
}

const SCR_FAIL = (t, extra = {}) => ({ editor: { code: CODE, cursor: { line: 7, col: 22 }, errLine: 7 }, term: { lines: TEST_FAIL, cube: cube({ x: 1690, y: 1004, size: 64, lookX: -0.7, brows: 0.6 }) }, ...extra });

// ================================================================== 1. KEYBOARD: rhythm, pause, hesitation, Enter
const TYPE_EV = [];
const addWord = (t0, s, gaps) => { let t = t0; for (let i = 0; i < s.length; i++) { TYPE_EV.push([t, s[i]]); t += gaps[i % gaps.length]; } return t; };
{
  let t = addWord(0.55, 'item', [0.11, 0.09, 0.12, 0.1]);
  t = addWord(t + 0.42, '?.', [0.17, 0.2]);
  t = addWord(t + 0.25, 'pirce', [0.09, 0.1, 0.08, 0.11, 0.1]);
  t = addWord(t + 0.85, '\b\b\b\b', [0.16, 0.13, 0.12, 0.14]);
  t = addWord(t + 0.35, 'rice', [0.1, 0.11, 0.09, 0.12]);
  addWord(t + 0.3, ';', [0.1]);
  TYPE_EV.push([6.35, '\n']);
}
function keysShot(t0) {
  const dur = 8.2;
  return {
    t0, t1: t0 + dur, name: 'keys', fadeIn: 0.4,
    draw(ctx, t, lt) {
      const tc = onTwos(lt);
      const lift = (tt, h) => K(tt, [[0, 0.2], [0.5, 0], [0.95, 0], [1.15, 0.7], [1.35, 0.1], [2.3, 0], [2.55, 1.1, 'out'], [3.0, 0.5], [3.3, 0.2], [4.55, 0.1], [4.9, 1.0], [5.5, 0.7], [5.8, 1.1], [6.05, h > 0 ? 2.3 : 0.9, 'outBack'], [6.33, h > 0 ? -0.2 : 0.4, 'in'], [6.6, 0.3], [7.4, 0.1]]);
      const st = typingState(TYPE_EV, tc, { lift });
      // nervous finger drumming during the long pause (left hand, no key goes down)
      if (tc > 4.75 && tc < 5.75) { const k = Math.floor(tc * 12) % 4; st.hands[-1].press[3 - k] = 0.45; }
      // Enter: the right hand comes in from above with a little follow-through
      const sway = Math.sin(lt * 1.3) * 0.15;
      st.hands[1].a = (st.hands[1].a ?? -0.14) + K(tc, [[5.8, 0], [6.1, -0.12], [6.5, 0.02], [7, 0]]);
      st.hands[-1].x += sway * 0.3;
      const cam = new Cam({ x: lerp(2, 1, lt / dur), y: lerp(124, 120, ease.inOut(lt / dur)), z: lerp(-36, -31, ease.inOut(lt / dur)), f: lerp(1900, 2050, ease.inOut(lt / dur)), hy: lerp(-1560, -1740, ease.inOut(lt / dur)) });
      drawKeysSet(ctx, { t, tod: 0.05, ...st, D, screen: 1, lamp: 1, screenRGB: '205,212,245', handScale: 0.86, lights: [{ rgb: '210,220,255', a: 0.6, vs: [[0, -3]] }, { rgb: '255,210,160', a: 0.35, vs: [[3, 0]] }] }, cam);
    },
    overlay: (ctx) => label(ctx, 1, '键盘特写：打字的节奏、停顿、打错删掉、犹豫、敲回车', 'Keyboard close-up — rhythm, a typo, backspace, hesitation, Enter'),
  };
}

// ================================================================== 2. BACK (wide): typing, then scratching the back of his head
function perfBackScratch(t) {
  const P = evalTracks({
    slump: [[0, 0.25], [2.6, 0.25], [3.0, 0.12], [5.2, 0.15], [5.8, 0.3], [8, 0.28]],
    lean: [[2.6, 0], [3.1, -0.035], [5.2, -0.03], [5.7, 0.01], [6.2, 0]],
    'head.tilt': [[2.5, 0], [2.9, -0.04], [3.45, 0.16, 'outBack'], [5.1, 0.12], [5.6, -0.03], [6.1, 0]],
    'head.nod': [[2.5, 0.05], [3.0, -0.08], [3.5, 0.18], [5.1, 0.15], [5.6, 0.06]],
    'head.turn': [[2.5, 0], [3.3, 0.18], [5.2, 0.14], [5.8, 0]],
    'hair.mess': [[3.3, 0.25], [5.0, 0.6]],
  }, t);
  // right arm (screen right): typing → up to the back of the head → scratch → back down
  const scr = t > 3.4 && t < 5.05 ? 1 : 0;
  const osc = scr * Math.sin((t - 3.4) * 13);
  const hand = K(t, [[2.65, [9, -30]], [2.95, [12, -36], 'in'], [3.4, [5.5, -75], 'outBack'], [5.05, [5.5, -75]], [5.45, [11, -38], 'in'], [5.8, [9, -30], 'out']]);
  const elbow = K(t, [[2.65, [21.9, -25.5]], [2.95, [23, -30], 'in'], [3.4, [26, -60], 'outBack'], [5.05, [26, -60]], [5.45, [24, -32], 'in'], [5.8, [21.9, -25.5], 'out']]);
  const up = t > 3.05 && t < 5.4;
  P.armR = { hand: [hand[0] + osc * 1.2, hand[1] + Math.cos((t - 3.4) * 13) * scr * 0.9], elbow: [elbow[0] + osc * 0.5, elbow[1]], z: up ? 'front' : 'back', hp: { view: up ? 'back' : 'back', curl: up ? 0.62 + osc * 0.2 : 0.3, rot: up ? -0.2 : 0 } };
  // left arm keeps typing, elbow twitching with keystrokes
  const sL = strokes(t, 5, 0, 2.6, 7) + strokes(t, 6, 6.0, 8.5, 5);
  const sR = strokes(t, 7, 0, 2.6, 7) + strokes(t, 8, 6.0, 8.5, 5);
  P.armL = { hand: [-9, -30], elbow: [-21.9 - sL * 0.3, -25.5 - sL * 0.5] };
  if (!up && t < 2.7) P.armR.elbow = [21.9 + sR * 0.3, -25.5 - sR * 0.5];
  P.shrug = (P.shrug || 0) + K(t, [[2.7, 0], [3.1, 0.15], [5.2, 0.12], [5.7, -0.05], [6.2, 0]]);
  return idle(P, t, { seed: 5 });
}
function backScratchShot(t0) {
  const dur = 8.4;
  return {
    t0, t1: t0 + dur, name: 'back-scratch', dissolve: 0.4,
    draw(ctx, t, lt) {
      const tc = onTwos(lt);
      const P = withSecondary(perfBackScratch, tc, (p) => (p.head?.tilt || 0) * 30 + (p.hair?.mess || 0) * 4 + (p.armR?.hand?.[1] || 0) * 0.05, 0.08);
      const k = ease.inOut(clamp(lt / dur));
      const cam = new Cam({ x: lerp(62, 48, k), y: lerp(144, 138, k), z: lerp(-195, -168, k), f: 1180, hy: lerp(415, 430, k) });
      drawBackSet(ctx, { t, tod: 0.02, lamp: 1, screen: 1, cups: 3, notes: 5, scr: SCR_FAIL(t), screenRGB: '185,195,245', human: { P, D, lights: [{ rgb: '170,185,240', a: 0.85, vs: [[0, -4], [-3, -1.5], [3, -1.5]] }] } }, cam);
    },
    overlay: (ctx) => label(ctx, 2, '背影远景：打字 → 停住 → 抓后脑勺（手到头、手指在头发里动、头发变乱）→ 放回', 'Back view — typing, stopping, scratching the back of his head'),
  };
}

// ================================================================== 3. FRONT: reading, red again, rubbing eyes, the big sigh
const TYPE_ELBOW_F = [[-21, -27.5], [21, -27.5]];
function perfFront(t) {
  const P = evalTracks({
    'face.look': [[0, [0, 0.15]], [0.35, [-0.35, 0.2], 'out5'], [0.8, [-0.35, 0.22]], [0.9, [0.25, 0.25], 'out5'], [1.3, [0.25, 0.28]], [1.4, [-0.4, 0.38], 'out5'], [1.75, [-0.4, 0.4]], [1.85, [0.3, 0.45], 'out5'], [2.2, [0.1, 0.35], 'out5'], [3.0, [0, 0.1]], [6.4, [0, 0.35]], [9, [0, 0.4]]],
    'face.lid': [[0, 0.22], [2.2, 0.22], [2.32, 0.0, 'out'], [2.6, 0.28], [3.2, 0.35], [6.3, 0.2], [6.6, 0.48], [9, 0.55]],
    'face.brow': [[0, -0.1], [2.25, -0.1], [2.35, 0.45, 'out'], [2.75, -0.65, 'inOut'], [3.5, -0.7], [6.3, 0.2], [6.8, 0.35], [8.8, 0.55]],
    'face.bags': [[0, 0.5], [6, 0.8]],
    'head.nod': [[0, 0.12], [2.3, 0.12], [2.45, 0.02], [2.95, 0.08], [3.25, -0.2, 'outBack'], [3.6, -0.1], [4.1, 0.12], [5.8, 0.15], [6.4, 0.08], [6.8, 0.08], [7.6, -0.16, 'inOut'], [7.85, -0.16], [8.75, 0.52, 'out'], [9.3, 0.46], [12, 0.48]],
    'head.tilt': [[3.9, 0], [4.3, 0.05], [5.6, -0.04], [6.2, 0]],
    breath: [[6.8, 0], [7.6, 1.3, 'inOut'], [7.85, 1.3], [8.9, -1.2, 'out'], [9.6, -0.8]],
    shrug: [[0, 0], [2.3, 0], [2.4, 0.2], [2.8, 0], [6.8, 0], [7.6, 0.55, 'inOut'], [7.85, 0.55], [8.7, -0.3, 'out'], [9.3, -0.2]],
    slump: [[0, 0.18], [2.3, 0.15], [6.8, 0.2], [7.6, 0.02, 'inOut'], [7.85, 0.02], [8.85, 0.9, 'out'], [9.3, 0.82], [12, 0.85]],
    sy: [[6.8, 1], [7.6, 1.035, 'inOut'], [7.85, 1.035], [8.8, 0.985, 'out'], [9.3, 1]],
    'hair.mess': [[0, 0.45], [12, 0.55]],
  }, t);
  const F = P.face;
  F.mouth = t < 2.7 ? 'line' : t < 3.3 ? 'grit' : t < 3.9 ? 'wavy' : t < 6.3 ? 'frown' : t < 7.0 ? 'flat' : t < 7.6 ? 'o' : t < 7.85 ? 'o' : t < 8.9 ? 'sigh' : 'frown';
  F.mouthK = t > 7.0 && t < 7.85 ? 0.35 : 0.8;
  if (t > 4.0 && t < 6.05) F.eyes = 'closed';
  if (t > 7.9 && t < 8.95) F.eyes = 'closed';
  // rubbing the eyes: hands leave the keyboard (left slightly later), fists to the eyes, circles, back down
  for (const [nm, side, delay, ph] of [['armL', -1, 0.08, 0], ['armR', 1, 0, 1.7]]) {
    const tt = t - delay;
    const rub = tt > 4.2 && tt < 5.6 ? Math.sin((tt - 4.2) * Math.PI / 1.4) : 0;
    const cx = Math.cos((tt - 4.2) * 10 + ph) * rub, cy = Math.sin((tt - 4.2) * 10 + ph) * rub;
    const kb = [side * 10, -19.6];
    const hand = K(tt, [[3.6, kb], [3.72, [side * 10.5, -18.5], 'out'], [4.0, [side * 7, -46], 'in'], [4.22, [side * 5.2, -63.5], 'outBack'], [5.6, [side * 5.2, -63.5]], [5.85, [side * 8, -44], 'in'], [6.15, [side * 10.4, -18.9], 'in'], [6.3, kb, 'out']]);
    const elbow = K(tt, [[3.6, TYPE_ELBOW_F[side < 0 ? 0 : 1]], [4.22, [side * 16.5, -37], 'out'], [5.6, [side * 16.5, -37]], [6.3, TYPE_ELBOW_F[side < 0 ? 0 : 1], 'inOut']]);
    const upV = tt > 3.9 && tt < 5.95;
    const typ = strokes(t, 21 + side, 0, 2.2, 6.5) * (side < 0 ? 1 : 0.8) + strokes(t, 31 + side, 9.8, 12, 3);
    P[nm] = {
      hand: [hand[0] + cx * 0.9, hand[1] + cy * 0.7 - typ * 0.4], elbow: [elbow[0] + cx * 0.4, elbow[1] + cy * 0.3],
      z: 'front', persp: upV ? 1 : 1.14, fs: upV ? 1 : 0.5,
      hp: upV ? { view: 'fist', rot: side * 1.15 + cx * 0.15, scale: 1.05 } : { view: 'front', scale: 1.16, press: [typ, 0, 0, 0] },
    };
  }
  if (t > 4.2 && t < 5.6) P.head.tilt += Math.sin((t - 4.2) * 10) * 0.025;
  return idle(P, t, { seed: 8, every: t > 9 ? 4.8 : 3.2, amp: t > 9 ? 1.3 : 1, rate: t > 9 ? 0.18 : 0.24 });
}
function frontShot(t0) {
  const dur = 12.2;
  return {
    t0, t1: t0 + dur, name: 'front', dissolve: 0.4,
    draw(ctx, t, lt) {
      const tc = onTwos(lt);
      const P = withSecondary(perfFront, tc, (p) => (p.head?.nod || 0) * -18 + (p.slump || 0) * -10 + (p.shrug || 0) * -6 + (p.head?.tilt || 0) * 25, 0.06);
      const k = ease.inOut(clamp(lt / dur));
      const flashA = K(lt, [[2.15, 0], [2.24, 0.8, 'out'], [3.1, 0.25], [4, 0.1]]);
      const cam = { x: 0, y: lerp(-57, -60, k), zoom: lerp(10.2, 11.6, k) };
      drawFrontSet(ctx, { t, tod: 0.05, lamp: 1, screen: 1, cups: 3, flashRGB: '255,70,70', flashA, screenRGB: '195,205,245', human: { P, D, lights: [{ rgb: '255,205,150', a: 0.35, vs: [[-3, 0]] }] } }, cam);
    },
    overlay: (ctx) => label(ctx, 3, '正面：扫读代码 → 又是红的 → 揉眼睛 → 深吸一口气 → 长叹、塌下去', 'Front — reading, red again, rubbing eyes, the big sigh'),
  };
}

// ================================================================== 4. SIDE: forehead slowly down onto the keyboard … then bolt upright
function perfSideDown(t) {
  const P = evalTracks({
    bend: [[0, 0.06], [1.0, 0.08], [3.55, 0.84, 'inOut'], [3.72, 0.88, 'out'], [3.9, 0.86], [6.4, 0.86], [6.55, 0.8, 'out'], [6.66, 0.84, 'in'], [6.95, -0.13, 'outBack'], [7.35, -0.05], [8.2, 0.12, 'inOut'], [10.5, 0.13]],
    slump: [[0, 0.55], [3.6, 0.72], [6.6, 0.72], [6.95, 0.0, 'out'], [10.5, 0.06]],
    sy: [[6.66, 1], [6.9, 1.075, 'out'], [7.25, 0.99, 'inOut'], [7.5, 1]],
    'head.nod': [[0, 0.3], [1.2, 0.35], [3.55, 0.78, 'inOut'], [3.75, 0.82, 'out'], [6.5, 0.8], [6.95, -0.25, 'outBack'], [7.4, -0.06], [8.2, 0.12], [10.5, 0.12]],
    'face.lid': [[0, 0.45], [2.0, 0.7], [2.6, 1]],
    'face.brow': [[0, 0.3], [6.8, 0.3], [6.95, 0.7], [8.5, 0.55]],
    'hair.mess': [[0, 0.55], [4, 0.62]],
  }, t);
  P.face.eyes = t < 2.6 ? 'open' : t < 6.85 ? 'closed' : 'wide';
  if (t > 6.85) P.face.lid = K(t, [[6.85, 0], [8.8, 0], [8.9, 1], [9.0, 0], [9.12, 1], [9.22, 0]]);
  P.face.mouth = t < 1.5 ? 'flat' : t < 6.85 ? 'frown' : t < 8.4 ? 'o' : 'line';
  P.face.mouthK = 0.7;
  // arms: from the keyboard, sliding back over the desk edge, slipping off and dangling; snap back up
  const swing = t > 3.35 && t < 6.5 ? Math.sin((t - 3.35) * 5.5) * Math.exp(-(t - 3.35) * 1.6) : 0;
  for (const [nm, dx, dy, lagT] of [['armR', 0, 0, 0], ['armL', 3, -1.2, 0.07]]) {
    const tt = t - lagT;
    const hand = K(tt, [[1.3, [35 + dx, -29.5 + dy]], [2.5, [26 + dx, -28.9 + dy], 'inOut'], [3.25, [17 + dx * 0.4, -5], 'in'], [3.55, [18.5, -1.5], 'out'], [6.62, [18, -2]], [6.95, [30 + dx, -29.2 + dy], 'outBack'], [7.5, [35 + dx, -29.5 + dy], 'inOut']]);
    const dang = tt > 3.25 && tt < 6.62;
    P[nm] = { hand: [hand[0] + swing * 3.2, hand[1] - Math.abs(swing) * 0.8], bend: dang ? 1 : -1, hp: { view: 'side', curl: dang ? 0.25 : 0.8, rot: dang ? 0.5 : 0 } };
  }
  const br = t > 3.9 && t < 6.5 ? 1.6 : 1;
  return idle(P, t, { seed: 11, amp: br, rate: 0.2, noBlink: t > 2.4 && t < 6.9 });
}
function sideDownShot(t0) {
  const dur = 10.6;
  return {
    t0, t1: t0 + dur, name: 'side-down', dissolve: 0.4,
    draw(ctx, t, lt) {
      const tc = onTwos(lt);
      const P = withSecondary(perfSideDown, tc, (p) => (p.bend || 0) * 45 + (p.head?.nod || 0) * 12 + (p.slump || 0) * 10 - ((p.sy || 1) - 1) * 80, 0.05);
      const k = ease.inOut(clamp(lt / dur));
      const push = K(lt, [[0, 0], [3.8, 1, 'inOut'], [6.6, 1], [6.9, 0.6, 'out'], [10.6, 0.75]]);
      const cam = { x: lerp(24, 26, push), y: lerp(-44, -38, push), zoom: lerp(7.6, 9.2, push) + (lt > 6.66 && lt < 6.8 ? 0.25 : 0) };
      const faceDown = lt > 3.72 && lt < 6.8;
      drawSideSet(ctx, { t, tod: 0.05, lamp: 1, screen: 1, cups: 3, screenRGB: '190,200,245', kbPress: faceDown ? [0.6, 0.9, 0.7, 0.3, 0] : null, human: { P, D, lights: [{ rgb: '190,205,255', a: 0.6, vs: [[3.5, 0]] }] } }, cam);
      if (faceDown) text(ctx, 'hhhjjjjjjjjjjjjjkkkkkkkkk', 1500, 150, { size: 26, font: MONO_FONT, color: 'rgba(255,255,255,0.0)', still: true });
    },
    overlay: (ctx) => label(ctx, 4, '侧面：额头慢慢贴到键盘上、手臂滑落垂下 → 突然坐直（预备、过冲、头发跟随）', 'Side — forehead slowly onto the keyboard, arms slide off… then he bolts upright'),
  };
}

// ================================================================== 5. SIDE (dawn): silent cheer, leaning back, chair tilts
function perfCheer(t) {
  const P = evalTracks({
    bend: [[0, 0.04], [1.45, 0.06], [1.85, 0.16, 'inOut'], [2.28, -0.4, 'outBack'], [4.3, -0.34], [5.4, -0.2, 'inOut'], [7.5, -0.2]],
    sy: [[1.45, 1], [1.85, 0.965], [2.28, 1.065, 'out'], [2.8, 1.02], [5.4, 1]],
    shrug: [[1.3, 0], [1.85, 0.45], [2.28, 0.15], [4.3, 0.1], [5.3, -0.1], [6, 0]],
    breath: [[1.3, 0], [1.85, 1.2], [2.4, 0.6], [4.4, 0.5], [5.4, -1.1], [6.2, -0.5]],
    'head.nod': [[0, 0.08], [1.85, 0.2], [2.28, -0.6, 'outBack'], [4.3, -0.55], [5.4, -0.12, 'inOut'], [7.5, -0.1]],
    'face.lid': [[0, 0.1], [0.6, 0.0]],
    'face.brow': [[0, 0.1], [1.0, 0.45], [1.85, -0.3], [2.3, 0.5]],
  }, t);
  P.face.eyes = t < 1.8 ? 'wide' : t < 2.22 ? 'squeeze' : t < 5.2 ? 'happy' : 'happy';
  P.face.mouth = t < 0.9 ? 'o' : t < 1.8 ? 'smile' : t < 2.22 ? 'grit' : t < 4.5 ? 'open' : 'smile';
  P.face.mouthK = t < 0.9 ? 0.5 : t < 4.5 ? K(t, [[2.22, 0.6], [2.5, 1.35, 'out'], [4.4, 1.2]]) : 1;
  P.face.blush = K(t, [[2.2, 0], [2.8, 0.7]]);
  const jig = t > 2.5 && t < 4.3 ? Math.sin((t - 2.5) * 22) * 0.6 : 0;
  for (const [nm, dx, lag, far] of [['armR', 0, 0, 0], ['armL', -8, 0.06, 1]]) {
    const tt = t - lag;
    const hand = K(tt, [[1.45, [35 + far * 3, -29.5 - far * 1.2]], [1.85, [21, -42 - far * 2], 'inOut'], [2.26, [12 + dx, -87 - far * 3], 'outBack'], [4.3, [11 + dx, -88 - far * 3]], [5.2, [15, -19 - far], 'inOut'], [7.5, [15.5, -18.5 - far]]]);
    const up = tt > 2.0 && tt < 4.9;
    P[nm] = { hand: [hand[0] + jig, hand[1] + jig * 0.6], bend: up ? 1 : -1, hp: tt < 1.8 ? { view: 'side', curl: 0.8 } : tt < 2.12 ? { view: 'fist', rot: -1.2 } : up ? { view: 'palm', spread: 0.95, thumb: 0.9, rot: 0.1 } : { view: 'side', curl: 0.3, rot: 0.8 } };
  }
  return idle(P, t, { seed: 17, rate: 0.26 });
}
function cheerShot(t0) {
  const dur = 7.6;
  return {
    t0, t1: t0 + dur, name: 'cheer', dissolve: 0.4,
    draw(ctx, t, lt) {
      const tc = onTwos(lt);
      const P = withSecondary(perfCheer, tc, (p) => (p.bend || 0) * 50 + (p.head?.nod || 0) * 14 - ((p.sy || 1) - 1) * 90, 0.05);
      // the chair's backrest takes his weight and springs back
      const b = (tt) => Math.max(0, -perfCheer(onTwos(tt)).bend);
      const tilt = follow(b, lt, 1.4, 0.35, 1.5) * 1.6 + 0.02;
      const green = clamp(lt / 1.2);
      const cam = { x: 18, y: lerp(-48, -52, ease.inOut(clamp((lt - 1.8) / 1.2))), zoom: lerp(7.6, 7.2, ease.inOut(clamp((lt - 1.8) / 1.2))) };
      drawSideSet(ctx, { t, tod: 0.83, lamp: 1, screen: 1, cups: 6, chairTilt: tilt, screenRGB: `${Math.round(lerp(210, 170, green))},${Math.round(lerp(190, 245, green))},${Math.round(lerp(200, 175, green))}`, human: { P, D, lights: [{ rgb: '180,245,190', a: 0.55 * green, vs: [[3.5, 0]] }, { rgb: '255,200,150', a: 0.45, vs: [[2, -2]] }] } }, cam);
    },
    overlay: (ctx) => label(ctx, 5, '侧面·黎明：全绿 → 蓄力（前倾、握拳）→ 往后一仰、双手举起无声欢呼、椅子跟着弹 → 放松', 'Side at dawn — all green: wind-up, throw back, silent cheer, the chair springs'),
  };
}

// ================================================================== 6. SIDE (sunrise): nodding off, then asleep on his arms
function perfSleep(t) {
  const P = evalTracks({
    'face.lid': [[0, 0.5], [1.0, 0.72], [1.45, 0.96, 'in'], [1.58, 0.15, 'out'], [2.3, 0.5], [3.6, 0.82], [4.1, 1]],
    'head.nod': [[0, 0.08], [1.0, 0.2], [1.45, 0.62, 'in'], [1.6, -0.06, 'outBack'], [2.2, 0.08], [3.6, 0.3], [4.3, 0.4], [5.9, 0.62, 'inOut'], [10, 0.62]],
    bend: [[0, -0.18], [3.8, -0.1], [4.8, 0.32, 'inOut'], [5.9, 0.76, 'inOut'], [6.15, 0.79, 'out'], [8.2, 0.79], [8.45, 0.82], [8.8, 0.78, 'inOut'], [11, 0.78]],
    slump: [[0, 0.2], [5.9, 0.45]],
    'hair.mess': [[0, 0.9]],
  }, t);
  P.face.eyes = t < 4.4 ? 'open' : 'closed';
  P.face.mouth = t < 6.5 ? 'line' : 'o';
  P.face.mouthK = 0.3;
  P.face.drool = K(t, [[8.5, 0], [10, 0.6]]);
  P.face.blush = 0.25;
  for (const [nm, dx, dy, lag] of [['armR', 0, 0, 0], ['armL', -2, -0.8, 0.12]]) {
    const tt = t - lag;
    const hand = K(tt, [[0, [15.5, -18.5 + dy]], [4.2, [16, -19 + dy]], [4.9, [27 + dx, -29.4 + dy], 'inOut'], [5.9, [40 + dx, -29.6 + dy], 'inOut'], [11, [40 + dx, -29.6 + dy]]]);
    const ek = K(tt, [[4.4, 0], [5.6, 1, 'inOut']]);
    P[nm] = { hand, bend: -1, elbowTo: [20.5 + dx * 0.4, -28.4 + dy], elbowK: ek, hp: tt < 4.3 ? { view: 'side', curl: 0.3, rot: 0.8 } : { view: 'back', curl: 0.35, rot: 0 } };
  }
  const deep = t > 6.2;
  return idle(P, t, { seed: 23, rate: deep ? 0.17 : 0.22, amp: deep ? 1.6 : 1, noBlink: t > 3.8 });
}
function sleepShot(t0) {
  const dur = 10.4;
  return {
    t0, t1: t0 + dur, name: 'sleep', dissolve: 0.5, fadeOut: 0.6,
    draw(ctx, t, lt) {
      const tc = onTwos(lt);
      const P = withSecondary(perfSleep, tc, (p) => (p.bend || 0) * 45 + (p.head?.nod || 0) * 14, 0.05);
      const k = ease.inOut(clamp(lt / dur));
      const cam = { x: lerp(20, 27, k), y: lerp(-46, -40, k), zoom: lerp(7.4, 8.8, k) };
      drawSideSet(ctx, { t, tod: lerp(0.9, 1, k), lamp: 1, screen: 0.9, cups: 7, screenRGB: '200,210,240', human: { P, D, lights: [{ rgb: '255,205,150', a: 0.6, vs: [[3, -1.5]] }] } }, cam);
    },
    overlay: (ctx) => label(ctx, 6, '侧面·日出：眼皮越来越沉 → 点头惊醒 → 再沉下去 → 把手臂叠在桌上、慢慢趴下睡着（呼吸变慢）', 'Side at sunrise — heavy eyelids, a nod-off jerk, folding his arms, falling asleep'),
  };
}

// ================================================================== 7. THE LITTLE FRIEND: jump, land, run, brake, turn, hit, dizzy, pounce
function codePlatforms(ctx, t) {
  ctx.fillStyle = '#16171f'; ctx.fillRect(-2000, -2000, 6000, 5000);
  // soft grid + distant code for depth
  ctx.save();
  ctx.globalAlpha = 0.18; ctx.font = `28px ${MONO_FONT}`; ctx.fillStyle = '#6f7386';
  const far = ['for (let i = 0; i <= items.length; i++) {', '  const item = items[i];', '  total += item.price * item.qty;', '}', 'return formatPrice(total);'];
  far.forEach((s, i) => ctx.fillText(s, 80 + (i % 2) * 300 - t * 6, 120 + i * 48));
  ctx.restore();
  const plats = [
    { x: 160, y: 760, s: [['k', 'let '], ['v', 'total'], ['o', ' = '], ['n', '0'], ['p', ';']] },
    { x: 700, y: 560, s: [['k', 'for '], ['p', '('], ['k', 'let '], ['v', 'i'], ['o', ' = '], ['n', '0'], ['p', '; '], ['v', 'i'], ['o', ' <= '], ['v', 'n'], ['p', ') {']] },
  ];
  const col = { k: '#c792ea', v: '#e6e1d6', o: '#89ddff', n: '#f78c6c', p: '#89ddff' };
  ctx.font = `bold 64px ${MONO_FONT}`; ctx.textBaseline = 'alphabetic';
  for (const p of plats) {
    let x = p.x;
    for (const [k, s] of p.s) { ctx.fillStyle = col[k]; ctx.fillText(s, x, p.y); x += ctx.measureText(s).width; }
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(p.x - 20, p.y + 8, x - p.x + 40, 6);
  }
}
// cube choreography: returns state at time t (pixels)
function perfCube(t) {
  const G1 = 710, G2 = 512; // ground lines (tops of the code glyphs)
  const V = 450, X_END = 860 + V * (0.175 + 0.9 + 0.225);
  const S = { size: 150, x: 360, y: G1, flip: 1 };
  const land1 = 2.95;
  // 0-1.5 idle, 1.5 notice, 1.8-2.3 wind-up, 2.3-2.95 jump to the second line
  S.lookX = K(t, [[0, 0], [0.6, -0.6, 'out5'], [1.1, -0.6], [1.2, 0.5, 'out5'], [1.5, 0.8, 'out5']]);
  S.blink = blinksAt(t, [0.9, 3.4, 9.2]);
  S.eyes = t > 1.5 && t < 2.0 ? 'wide' : 'normal';
  S.emote = { type: '!', k: K(t, [[1.5, 0], [1.62, 1, 'outBack'], [2.0, 1], [2.2, 0]]), dx: 0.1 };
  const breathSq = Math.sin(t * 3) * 0.02;
  if (t < 2.3) {
    S.sq = K(t, [[0, 0], [1.8, 0], [2.18, 0.38, 'out'], [2.3, 0.3]]) + breathSq;
    S.lean = K(t, [[1.8, 0], [2.18, 0.12]]);
    S.armL = { a: K(t, [[1.8, 0], [2.18, -0.7]]) }; S.armR = { a: K(t, [[1.8, 0], [2.18, -0.7]]) };
    S.x = 360 + K(t, [[1.8, 0], [2.18, -10]]);
  } else if (t < land1) {
    const k = (t - 2.3) / (land1 - 2.3);
    S.x = lerp(350, 860, ease.inOut(k) * 0.3 + k * 0.7);
    S.y = lerp(G1, G2, k) - 330 * 4 * k * (1 - k);
    S.sq = k < 0.25 ? lerp(-0.32, -0.15, k / 0.25) : k < 0.7 ? lerp(-0.15, 0.02, (k - 0.25) / 0.45) : lerp(0.02, -0.18, (k - 0.7) / 0.3);
    S.rot = lerp(-0.25, 0.18, k);
    S.bend = lerp(0.35, -0.2, k);
    S.legSpread = Math.sin(k * Math.PI) * 1.2;
    S.armL = { a: lerp(1.3, 0.6, k) }; S.armR = { a: lerp(1.5, 0.8, k) };
    S.eyes = k < 0.5 ? 'squeeze' : 'wide';
  } else if (t < 4.6) {
    // land → squash & spring, dust; then run to the right
    const dl = t - land1;
    S.x = 860;
    S.y = G2;
    const sp = Math.exp(-dl * 7) * Math.cos(dl * 26);
    S.sq = 0.42 * sp;
    S.armL = { a: -0.9 * sp }; S.armR = { a: -0.9 * sp };
    if (t > 3.35) {
      const rt = t - 3.35;
      const v = Math.min(1, rt / 0.35);
      S.x = 860 + (rt < 0.35 ? rt * rt / 0.35 * 0.5 * V : (0.175 + (rt - 0.35)) * V);
      S.walk = rt * 5.2; S.walkAmt = v;
      S.lean = -0.1 * v; S.rot = 0.12 * v; S.bend = 0.18 * v;
      S.y = G2 - Math.abs(Math.sin(rt * 5.2 * Math.PI)) * 14 * v;
      S.armL = { a: Math.sin(rt * 16) * 0.8 }; S.armR = { a: -Math.sin(rt * 16) * 0.8 };
      S.eyes = 'normal'; S.lookX = 1;
    }
  } else if (t < 5.5) {
    // brake: skid, lean back, legs forward, arms windmill, teeter at the end
    const bt = t - 4.6;
    const x0 = 860 + (0.175 + (4.6 - 3.35 - 0.35)) * V;
    const v = Math.max(0, 1 - bt / 0.45);
    S.x = bt < 0.45 ? x0 + V * (bt - bt * bt / 0.9) : x0 + V * 0.225;
    S.y = G2;
    const tt = Math.min(1, bt / 0.45);
    S.lean = lerp(-0.1, -0.42, ease.out(tt)) * (bt < 0.6 ? 1 : Math.exp(-(bt - 0.6) * 6));
    S.rot = -0.18 * Math.sin(Math.min(1, bt / 0.45) * Math.PI) - Math.sin(bt * 20) * 0.06 * Math.exp(-bt * 3) * (bt > 0.45 ? 1 : 0);
    S.bend = -0.35 * v;
    S.legs = [0, 1, 2, 3].map(() => ({ fx: 0.1 * v }));
    S.eyes = 'wide'; S.lookX = 1;
    S.armL = { a: 1.2 + Math.sin(bt * 30) * 0.6 }; S.armR = { a: 1.0 + Math.cos(bt * 30) * 0.6 };
    S.sq = -0.05 * v;
  } else if (t < 6.4) {
    // turn around: squash, flip with a smear, look back
    const x0 = X_END;
    S.x = x0; S.y = G2;
    const ft = t - 5.5;
    S.flip = ft < 0.3 ? 1 : -1;
    S.sq = K(ft, [[0, 0], [0.22, 0.25], [0.3, -0.15], [0.45, 0.05], [0.6, 0]]);
    S.sx = K(ft, [[0.22, 1], [0.3, 0.4], [0.38, 1.12], [0.5, 1]]);
    S.eyes = 'normal'; S.lookX = K(ft, [[0.3, 0.8], [0.5, 0.2]]);
  } else {
    const x0 = X_END;
    S.x = x0; S.y = G2; S.flip = -1;
    // hit by a falling error block at 7.0 → flattened, dizzy, shake it off at 8.6
    const ht = t - 7.0;
    if (ht < 0) { S.lookY = K(t, [[6.4, 0], [6.8, -1]]); S.eyes = t > 6.75 ? 'wide' : 'normal'; S.lookX = 0; }
    else if (ht < 1.6) {
      const sp = Math.exp(-ht * 3.5);
      S.sq = 0.62 * sp + 0.18;
      S.sx = 1 + 0.25 * sp;
      S.eyes = 'dizzy'; S.spin = t * 6; S.mouth = 'wave';
      S.rot = Math.sin(ht * 7) * 0.08;
    } else if (ht < 2.1) {
      const st = ht - 1.6;
      S.shake = st * 60; S.sq = lerp(0.18, 0, st / 0.5);
      S.eyes = 'squeeze'; S.emote = { type: 'puff', k: 1, dx: 0.3 };
    } else if (t < 10.6) {
      // sees the target on the left → crouch
      const ct = t - 9.1;
      S.eyes = t < 9.9 ? 'wide' : 'squeeze';
      S.lookX = 0.8;
      S.sq = K(ct, [[0, 0], [0.8, 0.05], [1.5, 0.45, 'inOut']]);
      S.lean = K(ct, [[0.8, 0], [1.5, 0.22]]);
      S.rot = K(ct, [[0.8, 0], [1.5, 0.12]]);
      S.armL = { a: K(ct, [[0.8, 0], [1.5, -0.9]]) }; S.armR = { a: K(ct, [[0.8, 0], [1.5, -0.9]]) };
      S.emote = { type: '!', k: K(t, [[9.1, 0], [9.2, 1, 'outBack'], [9.7, 1], [9.9, 0]]), dx: 0.1 };
    } else {
      // pounce: long stretch dive, belly landing, slide, hug
      const pt = t - 10.6;
      const k = Math.min(1, pt / 0.55);
      const xL = 800;
      S.x = lerp(x0, xL, ease.out(k));
      S.y = G2 - 150 * 4 * k * (1 - k) * (pt < 0.55 ? 1 : 0);
      if (pt < 0.55) {
        S.sx = 1.4; S.sy = 0.72; S.rot = -0.08 + k * 0.15; S.bend = 0.3;
        S.armL = { a: 0.15, len: 1.4 }; S.armR = { a: 0.25, len: 1.4 }; S.eyes = 'squeeze';
      } else {
        const lt2 = pt - 0.55;
        const slide = Math.min(1, lt2 / 0.35);
        S.x = xL - 60 * ease.out(slide);
        S.sq = 0.35 * Math.exp(-lt2 * 5) * Math.cos(lt2 * 18) + 0.05;
        S.armL = { a: -0.2, len: 1.2, front: true }; S.armR = { a: -0.2, len: 1.2, front: true };
        S.eyes = lt2 > 0.6 ? 'happy' : 'squeeze';
        S.emote = { type: 'heart', k: K(lt2, [[0.7, 0], [0.9, 1, 'outBack']]), dx: -0.1 };
        S.y = G2 - (lt2 > 1.3 ? Math.max(0, Math.sin((lt2 - 1.3) * Math.PI * 1.8)) * 40 * Math.exp(-(lt2 - 1.3) * 1.5) : 0);
      }
    }
  }
  return S;
}
function cubeShot(t0) {
  const dur = 14.4;
  return {
    t0, t1: t0 + dur, name: 'cube', dissolve: 0.4, fadeOut: 0.8,
    draw(ctx, t, lt) {
      const tc = onTwos(lt);
      ctx.fillStyle = '#16171f'; ctx.fillRect(0, 0, 1920, 1080);
      // follow camera: lags behind the little friend, zoomed in so its acting reads
      const cx = follow((tt) => perfCube(tt).x, lt, 0.9, 0.9, 1.6);
      const cy = follow((tt) => perfCube(tt).y, lt, 0.7, 0.9, 1.6);
      const Z = 1.65;
      ctx.save();
      ctx.translate(960, 600); ctx.scale(Z, Z); ctx.translate(-cx, -cy + 60);
      codePlatforms(ctx, lt);
      const S = perfCube(tc);
      // dust on landing / braking
      if (tc > 2.95 && tc < 3.5) dust(ctx, 860, 512, 90, (tc - 2.95) / 0.55, 4, 1, 'rgba(120,130,170,0.6)');
      if (tc > 4.6 && tc < 5.3) dust(ctx, S.x - 40, 512, 70, (tc - 4.6) / 0.7, 9, 0.6, 'rgba(120,130,170,0.6)');
      if (tc > 3.5 && tc < 4.6) speedLines(ctx, S.x - 60, S.y - 60, 90, 1, 1, 13, 3, 1.2);
      // the error block
      const ft = tc - 6.55;
      if (ft > 0 && tc < 10) {
        const rest = cubeTop2({ ...S, size: 150 }) - 70;
        const fy = ft < 0.45 ? lerp(-120, rest, ft * ft / 0.2025) : rest + (tc < 8.6 ? 0 : -(tc - 8.6) * 0) + (tc > 8.6 ? (tc - 8.6) * (tc - 8.6) * 2400 : 0);
        const fx = S.x - 110;
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(ft < 0.45 ? 0.1 : -0.05);
        rect(ctx, 0, 0, 220, 70, { r: 8, fill: '#e05252', lw: 4, seed: 71 });
        text(ctx, 'Error!', 110, 37, { size: 40, font: MONO_FONT, color: '#fff', still: true });
        ctx.restore();
      }
      // the target (a placeholder red glyph — the real bug comes in the film)
      if (tc > 8.8) {
        const bx = 770, by = 480;
        const hide = tc > 11.15;
        if (!hide) text(ctx, '¤', bx, by, { size: 70, font: MONO_FONT, color: `rgba(255,107,107,${0.6 + 0.4 * Math.sin(tc * 12)})` });
      }
      if (S.eyes === 'dizzy') {
        for (let i = 0; i < 3; i++) {
          const a = tc * 5 + (i * TAU) / 3;
          text(ctx, '★', S.x + Math.cos(a) * 80, S.y - 150 + Math.sin(a) * 18, { size: 34, color: '#ffd166', still: true });
        }
      }
      drawCube2(ctx, { ...S, ink: '#1a1512' });
      ctx.restore();
    },
    overlay: (ctx) => label(ctx, 7, '小方块：好奇 → 蓄力起跳 → 落地挤压 → 奔跑 → 急刹车 → 转身 → 被报错砸扁、晕 → 甩头 → 伏低 → 飞扑', 'The little friend — notice, wind-up, jump, land, run, brake, turn, hit, dizzy, pounce'),
  };
}

// ------------------------------------------------------------------ assemble
const shots = [];
let T0 = 0;
for (const mk of [keysShot, backScratchShot, frontShot, sideDownShot, cheerShot, sleepShot, cubeShot]) {
  const s = mk(T0);
  shots.push(s);
  T0 = s.t1;
}
export const { SHOTS, DURATION, renderFrame, shotAt } = makeFilm(shots);
