// Section 1 · 02:50 — red again, and again. (story time = film time)
// Wide back shot → over the shoulder → keys → the TypeError → his face → the little friend's worry →
// rubbing his eyes → forehead onto the keyboard → the keyboard types garbage.
import { T } from './times.js';
import { TYPE } from './code.js';
import { D, K, idle, withSecondary, strokes, evalTracks, onTwos, room, lightsBack, lightsSide, lightsFront, proxySide, proxyFront, proxyBack, follow } from './perfkit.js';
import { drawMonitorShot } from './screen_content.js';
import { drawBackSet } from '../sets/back.js';
import { drawSideSet } from '../sets/side.js';
import { drawFrontSet } from '../sets/front.js';
import { drawKeysSet, typingState, KEYS } from '../sets/keys.js';
import { sideHeadContact } from '../human/body.js';
import { Cam } from '../world.js';
import { ease, clamp, lerp } from '../core.js';
import { screenLight } from './code.js';

export const shot = (t0, t1, name, draw, o = {}) => ({ t0, t1, name, draw, ...o });
const kk = (t, a, b, e = 'inOut') => ease[e](clamp((t - a) / (b - a)));

// ------------------------------------------------------------------ back-view typing arms
export function backArms(P, t, wins, seed = 5, o = {}) {
  let sL = 0, sR = 0;
  for (const [a, b, cps] of wins) { sL += strokes(t, seed, a, b, cps || 7); sR += strokes(t, seed + 1, a, b, cps || 7); }
  if (!P.armL) P.armL = { hand: [-9, -30], elbow: [-21.9 - sL * 0.3, -25.5 - sL * 0.5] };
  if (!P.armR) P.armR = { hand: [9, -30], elbow: [21.9 + sR * 0.3, -25.5 - sR * 0.5] };
  return P;
}

// ------------------------------------------------------------------ WIDE (back): typing, stop, scratch the back of his head
function perfWide1(t) {
  const lt = t - 6.6;
  const P = evalTracks({
    slump: [[0, 0.25], [2.6, 0.25], [3.0, 0.12], [5.2, 0.15], [5.8, 0.3], [8, 0.28]],
    lean: [[2.6, 0], [3.1, -0.035], [5.2, -0.03], [5.7, 0.01], [6.2, 0]],
    'head.tilt': [[2.5, 0], [2.9, -0.04], [3.45, 0.16, 'outBack'], [5.1, 0.12], [5.6, -0.03], [6.1, 0]],
    'head.nod': [[2.5, 0.05], [3.0, -0.08], [3.5, 0.18], [5.1, 0.15], [5.6, 0.06]],
    'head.turn': [[2.5, 0], [3.3, 0.18], [5.2, 0.14], [5.8, 0]],
    'hair.mess': [[3.3, 0.35], [5.0, 0.6]],
  }, lt);
  const scr = lt > 3.4 && lt < 5.05 ? 1 : 0;
  const osc = scr * Math.sin((lt - 3.4) * 13);
  const hand = K(lt, [[2.65, [9, -30]], [2.95, [12, -36], 'in'], [3.4, [5.5, -75], 'outBack'], [5.05, [5.5, -75]], [5.45, [11, -38], 'in'], [5.8, [9, -30], 'out']]);
  const elbow = K(lt, [[2.65, [21.9, -25.5]], [2.95, [23, -30], 'in'], [3.4, [26, -60], 'outBack'], [5.05, [26, -60]], [5.45, [24, -32], 'in'], [5.8, [21.9, -25.5], 'out']]);
  const up = lt > 3.05 && lt < 5.4;
  if (lt > 2.65 && lt < 5.8) P.armR = { hand: [hand[0] + osc * 1.2, hand[1] + Math.cos((lt - 3.4) * 13) * scr * 0.9], elbow: [elbow[0] + osc * 0.5, elbow[1]], z: up ? 'front' : 'back', hp: { view: 'back', curl: up ? 0.62 + osc * 0.2 : 0.3, rot: up ? -0.2 : 0 } };
  P.shrug = K(lt, [[2.7, 0], [3.1, 0.15], [5.2, 0.12], [5.7, -0.05], [6.2, 0]]);
  backArms(P, t, [[6.6, 9.2], [12.6, 15.1, 6]], 5);
  return idle(P, t, { seed: 5 });
}
function wide1(t0, t1) {
  return shot(t0, t1, 'wide1', (ctx, t) => {
    const tc = onTwos(t);
    const P = withSecondary(perfWide1, tc, (p) => (p.head?.tilt || 0) * 30 + (p.hair?.mess || 0) * 4 + (p.armR?.hand?.[1] || 0) * 0.05, 0.08);
    const k = ease.inOut(clamp((t - t0) / (t1 - t0)));
    const cam = new Cam({ x: lerp(66, 50, k), y: lerp(150, 140, k), z: lerp(-215, -170, k), f: 1180, hy: lerp(405, 428, k) });
    drawBackSet(ctx, { ...room(t), human: { P, D, lights: lightsBack(t) } }, cam);
  }, { fadeInDelay: 0.5, fadeIn: 2.6 });
}

// over-the-shoulder camera: an off-axis lens (no yaw) keeps the screen a true rectangle.
// side +1: over his right shoulder (his head covers the editor's left part, the terminal reads);
// side -1: over his left shoulder (the editor reads).
export function otsCam(side, k = 0, push = 0, o = {}) {
  // close behind and above his head, looking down past it at the monitor: the screen fills the upper
  // frame, the top of his head (hair, cowlick) sits in the bottom corner and carries his reactions
  const x = side * (o.x ?? 22), f = (o.f ?? 1480) * (1 + push * 0.1);
  return new Cam({ x: x - side * k * 2, y: (o.y ?? 150) - k * 2, z: (o.z ?? -52) + k * 3 + push * 3, f, hx: 960 + side * (o.hx ?? 190), hy: o.hy ?? -40 });
}

// ------------------------------------------------------------------ OTS: save, npm test, Enter … red
function perfOts1(t) {
  const P = evalTracks({
    slump: [[13.4, 0.28], [16.0, 0.2], [17.35, 0.1], [17.6, 0.12], [18.4, 0.34, 'out'], [19.6, 0.38]],
    'head.nod': [[13.4, 0.1], [15.9, 0.02], [17.3, -0.08], [17.45, -0.12], [18.3, 0.24, 'inOut'], [19.6, 0.28]],
    'head.turn': [[18.35, 0], [18.6, -0.12], [18.88, 0.11], [19.15, -0.08], [19.45, 0.02]],
    'head.tilt': [[13.4, 0], [14.9, 0.04], [16.0, -0.02], [18.3, -0.02], [18.6, 0.05]],
    shrug: [[16.9, 0], [17.35, 0.14], [17.5, 0.2, 'out'], [18.45, -0.12, 'inOut'], [19.6, -0.08]],
    breath: [[17.35, 0], [17.5, 0.9, 'out'], [18.6, -1.0, 'inOut'], [19.6, -0.6]],
    lean: [[18.3, 0], [18.8, 0.02]],
  }, t);
  // Enter: the right hand travels to the far key, lifts, stabs
  const eK = K(t, [[15.7, 0], [15.88, 1, 'out'], [16.02, 0.6, 'in'], [16.35, 0, 'inOut']]);
  const rx = K(t, [[15.6, 9], [15.85, 14, 'inOut'], [16.4, 14], [16.9, 9, 'inOut']]);
  P.armR = { hand: [rx, -30 - eK * 2], elbow: [21.9 + (rx - 9) * 0.5, -25.5 - eK * 3.2] };
  // ctrl+S: a small twitch of the left hand
  const sK = K(t, [[14.3, 0], [14.4, 1, 'out'], [14.55, 0]]);
  P.armL = { hand: [-10 - sK, -30], elbow: [-21.9 - sK * 0.5, -25.5 - sK * 1.2] };
  backArms(P, t, [[13.4, 14.15], [15.0, 15.7, 10]], 9);
  if (t < 15.6 || t > 16.9) { const s = strokes(t, 10, 15.0, 15.7, 10) + strokes(t, 10, 13.4, 14.15); P.armR = { hand: [9, -30], elbow: [21.9 + s * 0.3, -25.5 - s * 0.5] }; }
  const Q = idle(P, t, { seed: 13 });
  return Q;
}
function ots1(t0, t1) {
  return shot(t0, t1, 'ots1', (ctx, t) => {
    const tc = onTwos(t);
    const P = withSecondary(perfOts1, tc, proxyBack, 0.07);
    const k = ease.inOut(clamp((t - t0) / (t1 - t0)));
    const push = kk(t, 17.4, 19.6, 'out');
    const dz = K(tc, [[15.9, 0], [16.6, 3.5, 'inOut'], [17.4, 4.5], [18.4, 0.5, 'inOut']]);
    const cam = otsCam(1, k, push, { y: 146, hy: -40 + push * 90 });
    drawBackSet(ctx, { ...room(t), human: { P, D, dz, lights: lightsBack(t) } }, cam);
  }, { dissolve: 0 });
}

// ------------------------------------------------------------------ KEYS: undo the ?. edit, npm test, a hard Enter
export const EV1 = [];
{
  let t = TYPE.run2Type;
  for (const ch of 'npm test') { EV1.push([t, ch]); t += 0.1; }
  EV1.push([22.95, '\n']);
}
// a two-key chord held by the left hand (ctrl + key): the hand shifts back toward the modifier row
export function chord(st, t, t0, key2, finger2 = 2, dur = 0.22) {
  const d = t - t0;
  if (d < -0.25 || d > dur + 0.35) return;
  const k = K(d, [[-0.25, 0], [-0.05, 1, 'out'], [dur + 0.05, 1], [dur + 0.35, 0, 'inOut']]);
  const H = st.hands[-1];
  H.x -= 2.2 * k; H.z -= 3.0 * k; H.a = (H.a ?? 0.14) + 0.1 * k;
  const dn = K(d, [[-0.05, 0], [0.02, 1], [dur, 1], [dur + 0.06, 0]]);
  const dn2 = K(d, [[0.03, 0], [0.08, 1], [dur - 0.05, 1], [dur, 0]]);
  H.press[3] = Math.max(H.press[3], dn * 0.9);
  H.press[finger2] = Math.max(H.press[finger2], dn2);
  st.keysDown.ctrl = Math.max(st.keysDown.ctrl || 0, dn);
  st.keysDown[key2] = Math.max(st.keysDown[key2] || 0, dn2);
}
function keys1(t0, t1) {
  return shot(t0, t1, 'keys1', (ctx, t) => {
    const tc = onTwos(t, 24);
    const lift = (tt, h) => K(tt, [[19.6, 0.3], [19.9, 0.1], [21.0, 0.2], [21.3, 0.9, 'out'], [21.6, 0.2], [22.7, 0.1], [22.82, h > 0 ? 2.4 : 0.8, 'outBack'], [22.95, h > 0 ? -0.3 : 0.4, 'in'], [23.2, 0.3]]);
    const st = typingState(EV1, tc, { lift });
    chord(st, tc, 20.35, 'z', 2, 0.16);
    chord(st, tc, 20.62, 'z', 2, 0.16);
    const k = ease.inOut(clamp((t - t0) / (t1 - t0)));
    const cam = new Cam({ x: lerp(-3, 2, k), y: lerp(122, 119, k), z: lerp(-33, -30, k), f: lerp(1950, 2080, k), hy: lerp(-1600, -1720, k) });
    drawKeysSet(ctx, { t, tod: 0.05, ...st, D, screen: 1, lamp: 1, screenRGB: screenLight(t).join(','), handScale: 0.86, lights: [{ rgb: '210,220,255', a: 0.6, vs: [[0, -3]] }, { rgb: '255,210,160', a: 0.35, vs: [[3, 0]] }] }, cam);
  }, { dissolve: 0 });
}

// ------------------------------------------------------------------ SCREEN: the TypeError
function scr1(t0, t1) {
  return shot(t0, t1, 'scr1', (ctx, t) => {
    const k = kk(t, t0, t1, 'inOut');
    // the terminal fills in, a push toward the red block and the little friend flinching
    drawMonitorShot(ctx, t, { x: lerp(1480, 1530, k), y: lerp(600, 660, k), zoom: lerp(1.28, 1.5, k) });
  }, { dissolve: 0 });
}

// ------------------------------------------------------------------ FRONT: reading the error, hands into his hair, face in his palms
const TYPE_ELBOW_F = [[-21, -27.5], [21, -27.5]];
function perfFace1(t) {
  const P = evalTracks({
    'face.look': [[26.2, [-0.3, 0.3]], [26.6, [-0.1, 0.32], 'out5'], [27.0, [-0.35, 0.36], 'out5'], [27.4, [-0.12, 0.38], 'out5'], [27.8, [-0.36, 0.4], 'out5'], [28.3, [-0.2, 0.3], 'out5'], [28.6, [0, 0.1]], [33, [0, 0.2]]],
    'face.lid': [[26.2, 0.25], [28.2, 0.3], [28.5, 0.55], [28.7, 0.2], [33, 0.3]],
    'face.brow': [[26.2, -0.3], [27.8, -0.55], [28.3, 0.3, 'out'], [28.8, -0.85, 'inOut'], [30.6, -0.8], [31.1, 0.4, 'out'], [33, 0.3]],
    'face.bags': [[26.2, 0.55], [33, 0.65]],
    'head.nod': [[26.2, 0.14], [28.3, 0.16], [28.9, -0.3, 'outBack'], [30.3, -0.26], [31.0, 0.24, 'inOut'], [32.2, 0.28], [32.8, 0.14, 'inOut']],
    'head.tilt': [[28.9, 0], [29.2, 0.06], [29.5, -0.06], [29.8, 0.05], [30.1, -0.04], [30.4, 0]],
    'head.turn': [[28.9, 0], [29.25, 0.1], [29.6, -0.1], [29.95, 0.08], [30.3, -0.05], [30.6, 0]],
    shrug: [[26.2, 0], [28.4, 0], [28.9, 0.45, 'out'], [30.4, 0.4], [31.1, 0.1, 'inOut'], [32.4, 0.05], [33, 0]],
    breath: [[28.3, 0], [28.8, 1.2, 'out'], [30.5, 1.0], [31.3, -1.2, 'inOut'], [33, -0.6]],
    slump: [[26.2, 0.2], [28.4, 0.12], [28.9, 0.0], [30.5, 0.05], [31.3, 0.45, 'inOut'], [33, 0.4]],
    sy: [[28.4, 1], [28.9, 1.03, 'out'], [30.5, 1.02], [31.3, 0.99]],
  }, t);
  const F = P.face;
  F.mouth = t < 27.6 ? 'line' : t < 28.4 ? 'frown' : t < 30.6 ? 'grit' : t < 31.3 ? 'wavy' : t < 32.8 ? 'wavy' : 'frown';
  F.mouthK = t > 28.4 && t < 30.6 ? 0.9 : 0.7;
  if (t > 28.95 && t < 30.4) F.eyes = 'squeeze';
  if (t > 31.1 && t < 32.7) F.eyes = 'closed';
  // arms: keyboard → both hands into his hair (fingers up the temples) → slide down over his face → drag down → back
  for (const [nm, side, lag] of [['armL', -1, 0.07], ['armR', 1, 0]]) {
    const tt = t - lag;
    const kb = [side * 10, -19.6];
    const hair = [side * 9.2, -72.5], face = [side * 3.8, -63], chin = [side * 5.5, -53];
    const hand = K(tt, [[28.35, kb], [28.5, [side * 10.6, -18.4], 'out'], [28.75, [side * 12, -48], 'in'], [28.95, hair, 'outBack'], [30.55, hair], [31.05, face, 'inOut'], [32.1, face], [32.55, chin, 'in'], [32.85, [side * 9, -30], 'in'], [33.05, kb, 'out']]);
    const elbow = K(tt, [[28.35, TYPE_ELBOW_F[side < 0 ? 0 : 1]], [28.95, [side * 21.5, -44], 'out'], [30.55, [side * 21.5, -44]], [31.05, [side * 15.5, -36], 'inOut'], [32.1, [side * 15.5, -35]], [32.55, [side * 17, -32]], [33.05, TYPE_ELBOW_F[side < 0 ? 0 : 1], 'inOut']]);
    const g = tt > 28.95 && tt < 30.55 ? Math.sin((tt - 28.95) * 9 + (side > 0 ? 1 : 0)) : 0; // fingers raking
    const up = tt > 28.7 && tt < 32.9;
    const onFace = tt > 30.9 && tt < 32.7;
    const typ = strokes(t, 41 + side, 26.2, 26.5, 5);
    P[nm] = {
      hand: [hand[0] + g * 0.5 * side, hand[1] + g * 0.9 - typ * 0.4], elbow,
      z: 'front', persp: up ? 1 : 1.14, fs: up ? 1 : 0.5,
      hp: !up ? { view: 'front', scale: 1.16, press: [typ, 0, 0, 0] } : onFace ? { view: 'back', curl: 0.12, spread: 0.2, rot: 0, scale: 1.05 } : { view: 'side', curl: 0.55 + g * 0.2, rot: side * 0.2, scale: 1.05 },
    };
  }
  if (t > 28.9 && t < 30.6) P.hair = { mess: 0.2 + (t - 28.9) * 0.2 };
  return idle(P, t, { seed: 8, every: 3.4 });
}
function face1(t0, t1) {
  return shot(t0, t1, 'face1', (ctx, t) => {
    const tc = onTwos(t);
    const P = withSecondary(perfFace1, tc, proxyFront, 0.06);
    const k = ease.inOut(clamp((t - t0) / (t1 - t0)));
    const cam = { x: lerp(-1, 0.5, k), y: lerp(-58, -60, k), zoom: lerp(10.4, 11.6, k) };
    const rgb = screenLight(t).join(',');
    drawFrontSet(ctx, { ...room(t), screenRGB: rgb, human: { P, D, lights: lightsFront(t) } }, cam);
  }, { dissolve: 0 });
}

// ------------------------------------------------------------------ SCREEN: the little friend, worried, looks up at him
function worry(t0, t1) {
  return shot(t0, t1, 'worry', (ctx, t) => {
    const k = kk(t, t0, t1, 'inOut');
    drawMonitorShot(ctx, t, { x: lerp(1700, 1740, k), y: lerp(880, 900, k), zoom: lerp(3.0, 3.5, k) });
  }, { dissolve: 0 });
}

// ------------------------------------------------------------------ FRONT: rubbing his eyes, the big sigh (the tested performance, shifted in time)
function perfFace2(t) {
  const lt = t - 33.6;
  const P = evalTracks({
    'face.look': [[3.6, [0, 0.12]], [6.4, [0, 0.35]], [9, [0, 0.4]]],
    'face.lid': [[3.6, 0.35], [6.3, 0.2], [6.6, 0.48], [9, 0.55]],
    'face.brow': [[3.6, -0.6], [6.3, 0.2], [6.8, 0.35], [8.8, 0.55]],
    'face.bags': [[3.6, 0.7], [6, 0.8]],
    'head.nod': [[3.6, 0.14], [4.1, 0.12], [5.8, 0.15], [6.4, 0.08], [6.8, 0.08], [7.6, -0.16, 'inOut'], [7.85, -0.16], [8.75, 0.52, 'out'], [9.3, 0.46], [12, 0.48]],
    'head.tilt': [[3.9, 0], [4.3, 0.05], [5.6, -0.04], [6.2, 0]],
    breath: [[6.8, 0], [7.6, 1.3, 'inOut'], [7.85, 1.3], [8.9, -1.2, 'out'], [9.6, -0.8]],
    shrug: [[3.6, 0], [6.8, 0], [7.6, 0.55, 'inOut'], [7.85, 0.55], [8.7, -0.3, 'out'], [9.3, -0.2]],
    slump: [[3.6, 0.35], [4.2, 0.2], [6.8, 0.2], [7.6, 0.02, 'inOut'], [7.85, 0.02], [8.85, 0.9, 'out'], [9.3, 0.82], [12, 0.85]],
    sy: [[6.8, 1], [7.6, 1.035, 'inOut'], [7.85, 1.035], [8.8, 0.985, 'out'], [9.3, 1]],
  }, lt);
  const F = P.face;
  F.mouth = lt < 3.9 ? 'wavy' : lt < 6.3 ? 'frown' : lt < 7.0 ? 'flat' : lt < 7.85 ? 'o' : lt < 8.9 ? 'sigh' : 'frown';
  F.mouthK = lt > 7.0 && lt < 7.85 ? 0.35 : 0.8;
  if (lt > 4.0 && lt < 6.05) F.eyes = 'closed';
  if (lt > 7.9 && lt < 8.95) F.eyes = 'closed';
  for (const [nm, side, delay, ph] of [['armL', -1, 0.08, 0], ['armR', 1, 0, 1.7]]) {
    const tt = lt - delay;
    const rub = tt > 4.2 && tt < 5.6 ? Math.sin((tt - 4.2) * Math.PI / 1.4) : 0;
    const cx = Math.cos((tt - 4.2) * 10 + ph) * rub, cy = Math.sin((tt - 4.2) * 10 + ph) * rub;
    const kb = [side * 10, -19.6];
    const hand = K(tt, [[3.6, kb], [3.72, [side * 10.5, -18.5], 'out'], [4.0, [side * 7, -46], 'in'], [4.22, [side * 5.2, -63.5], 'outBack'], [5.6, [side * 5.2, -63.5]], [5.85, [side * 8, -44], 'in'], [6.15, [side * 10.4, -18.9], 'in'], [6.3, kb, 'out']]);
    const elbow = K(tt, [[3.6, TYPE_ELBOW_F[side < 0 ? 0 : 1]], [4.22, [side * 16.5, -37], 'out'], [5.6, [side * 16.5, -37]], [6.3, TYPE_ELBOW_F[side < 0 ? 0 : 1], 'inOut']]);
    const upV = tt > 3.9 && tt < 5.95;
    const typ = strokes(lt, 31 + side, 9.8, 12, 3) * 0.6;
    P[nm] = {
      hand: [hand[0] + cx * 0.9, hand[1] + cy * 0.7 - typ * 0.4], elbow: [elbow[0] + cx * 0.4, elbow[1] + cy * 0.3],
      z: 'front', persp: upV ? 1 : 1.14, fs: upV ? 1 : 0.5,
      hp: upV ? { view: 'fist', rot: side * 1.15 + cx * 0.15, scale: 1.05 } : { view: 'front', scale: 1.16, press: [typ, 0, 0, 0] },
    };
  }
  if (lt > 4.2 && lt < 5.6) P.head.tilt += Math.sin((lt - 4.2) * 10) * 0.025;
  return idle(P, t, { seed: 8, every: lt > 9 ? 4.8 : 3.2, amp: lt > 9 ? 1.3 : 1, rate: lt > 9 ? 0.18 : 0.24 });
}
function face2(t0, t1) {
  return shot(t0, t1, 'face2', (ctx, t) => {
    const tc = onTwos(t);
    const P = withSecondary(perfFace2, tc, proxyFront, 0.06);
    const k = ease.inOut(clamp((t - t0) / (t1 - t0)));
    const cam = { x: 0, y: lerp(-57, -60, k), zoom: lerp(10.0, 11.4, k) };
    drawFrontSet(ctx, { ...room(t), human: { P, D, lights: lightsFront(t) } }, cam);
  }, { dissolve: 0 });
}

// ------------------------------------------------------------------ SIDE: forehead down onto the keyboard (and, later, bolt upright)
export const KB_TOP = -29.3;
// pt: performance time (0..10.5, the tested timing); t: story time for breathing / blinks
export function perfDown(pt, t, o = {}) {
  const P = evalTracks({
    bend: [[0, 0.06], [2.0, 0.08], [3.85, 0.34, 'inOut'], [6.4, 0.34], [6.55, 0.3, 'out'], [6.66, 0.32, 'in'], [6.95, -0.13, 'outBack'], [7.35, -0.05], [8.2, 0.08, 'inOut'], [10.5, 0.1]],
    slump: [[0, 0.55], [2.0, 0.6], [3.85, 0.5], [6.6, 0.5], [6.95, 0.0, 'out'], [10.5, 0.06]],
    sy: [[6.66, 1], [6.9, 1.075, 'out'], [7.25, 0.99, 'inOut'], [7.5, 1]],
    'head.nod': [[0, 0.3], [1.3, 0.35], [2.4, 0.9, 'inOut'], [3.85, 2.2, 'inOut'], [3.98, 2.26, 'out'], [4.15, 2.2], [6.45, 2.2], [6.6, 2.0, 'out'], [6.95, -0.25, 'outBack'], [7.4, -0.06], [8.2, 0.08], [10.5, 0.08]],
    'face.lid': [[0, 0.45], [2.0, 0.7], [2.6, 1]],
    'face.brow': [[0, 0.3], [6.8, 0.3], [6.95, 0.7], [8.5, 0.55]],
  }, pt);
  P.face.eyes = pt < 2.6 ? 'open' : pt < 6.85 ? 'closed' : 'wide';
  if (pt > 6.85) P.face.lid = K(pt, [[6.85, 0], [8.8, 0], [8.9, 1], [9.0, 0], [9.12, 1], [9.22, 0]]);
  P.face.mouth = pt < 1.5 ? 'flat' : pt < 6.85 ? 'frown' : pt < 8.4 ? 'o' : 'line';
  P.face.mouthK = 0.7;
  // head down: tiny twitches of the brow as the screen flickers (he is not really asleep)
  if (o.twitch && pt < 6.5) P.face.brow += o.twitch;
  for (const [nm, dx, dy, lagT] of [['armR', 0, 0, 0], ['armL', 3, -1.2, 0.07]]) {
    const tt = pt - lagT;
    const kb = [35 + dx, -29.5 + dy];
    const hand = K(tt, [[1.3, kb], [2.5, [25 + dx, -28.9 + dy], 'inOut'], [2.9, [19.5 + dx * 0.4, -27.8 + dy], 'in'], [6.62, [19.5 + dx * 0.4, -27.8 + dy]], [6.95, [30 + dx, -29.2 + dy], 'outBack'], [7.5, kb, 'inOut']]);
    const hangK = K(tt, [[2.85, 0], [3.2, 1, 'in'], [6.62, 1], [6.88, 0, 'out']]);
    const ts = tt - 3.2;
    const phi = ts > 0 ? 0.32 * Math.sin(ts * 4.3) * Math.exp(-ts * 1.25) + 0.04 * Math.sin(t * 1.3) : 0.25;
    const L = 39.5;
    P[nm] = { hand, hang: [2 + Math.sin(phi) * L, Math.cos(phi) * L], hangK, hp: hangK > 0.5 ? { view: 'side', curl: 0.25, rot: 0.15 } : { view: 'side', curl: 0.8 } };
  }
  const down = pt > 3.9 && pt < 6.5;
  const Q = idle(P, t, { seed: 11, amp: down ? 1.6 : 1, rate: 0.2, noBlink: pt > 2.4 && pt < 6.9 });
  return sideHeadContact(Q, D, KB_TOP);
}
const downPT = (t) => Math.min(6.4, t - 46.75);
function side1(t0, t1) {
  return shot(t0, t1, 'side1', (ctx, t) => {
    const tc = onTwos(t);
    const perf = (tt) => perfDown(downPT(tt), tt);
    const P = withSecondary(perf, tc, proxySide, 0.05);
    const push = kk(t, 45.5, 50.8, 'inOut');
    const cam = { x: lerp(22, 27, push), y: lerp(-46, -38, push), zoom: lerp(7.3, 9.4, push) };
    const faceDown = downPT(tc) > 3.85;
    drawSideSet(ctx, { ...room(t), kbPress: faceDown ? [0.6, 0.9, 0.7, 0.3, 0] : null, human: { P, D, lights: lightsSide(t) } }, cam);
  }, { dissolve: 0.5 });
}

// ------------------------------------------------------------------ SCREEN: his forehead types garbage; the little friend watches, then looks up
function garbage(t0, t1) {
  return shot(t0, t1, 'garbage', (ctx, t) => {
    const k = kk(t, t0, t1, 'inOut');
    const pull = kk(t, 55.6, 57.8, 'inOut');
    drawMonitorShot(ctx, t, { x: lerp(1500, 1680, pull), y: lerp(930, 860, pull), zoom: lerp(2.3, 2.6, k) - pull * 0.2 });
  }, { dissolve: 0 });
}

export const S1 = [
  wide1(T.wide1, T.ots1),
  ots1(T.ots1, T.keys1),
  keys1(T.keys1, T.run2),
  scr1(T.run2, T.face1),
  face1(T.face1, T.cubeWorry),
  worry(T.cubeWorry, T.face2),
  face2(T.face2, T.side1),
  side1(T.side1, T.garbage),
  garbage(T.garbage, T.resolve),
];
