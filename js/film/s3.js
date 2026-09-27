// Section 3 · working together.
// The screen glitches him awake; he sees the two tiny figures running through his editor. Every command he
// types turns into something the little friend can use: search → a searchlight, console.log → a lantern,
// a slip on backspace → the code collapses, Ctrl+Z → it rewinds. Then a quiet moment between the two of them.
import { T } from './times.js';
import { TYPE, LOG_AT, screenLight } from './code.js';
import { D, K, idle, withSecondary, strokes, evalTracks, onTwos, room, lightsBack, lightsSide, lightsFront, proxySide, proxyFront, proxyBack } from './perfkit.js';
import { shot, otsCam, backArms, chord, perfDown } from './s1.js';
import { drawCW, followCube, camPath } from './cwshot.js';
import { drawMonitorShot } from './screen_content.js';
import { cubePos, bugPos } from './cw.js';
import { LINES, charCX } from '../codeworld.js';
import { drawBackSet } from '../sets/back.js';
import { drawSideSet } from '../sets/side.js';
import { drawFrontSet } from '../sets/front.js';
import { drawKeysSet, typingState } from '../sets/keys.js';
import { Cam } from '../world.js';
import { ease, clamp, lerp, hash2 } from '../core.js';

const g = (i) => LINES[i].ground;
const kk = (t, a, b, e = 'inOut') => ease[e](clamp((t - a) / (b - a)));
const KB_F = (side) => [side * 10, -19.6];
const EL_F = (side) => [side * 21, -27.5];

// ------------------------------------------------------------------ front-view arm helpers
export function fArm(side, hand, elbow, hp, up = true) {
  return { hand, elbow, z: 'front', persp: up ? 1 : 1.14, fs: up ? 1 : 0.5, hp };
}
export function fTyping(side, t, seed, wins = [], amp = 1) {
  let s = 0;
  for (const [a, b, c] of wins) s += strokes(t, seed + side, a, b, c || 7);
  s *= amp;
  return fArm(side, [side * 10, -19.6 - s * 0.4], EL_F(side), { view: 'front', scale: 1.16, press: [s, 0, 0, 0] }, false);
}
// blend two front arms (hand/elbow positions); the hand pose switches at the midpoint
export function fBlend(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const L = (p, q) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  return { ...(k < 0.5 ? a : b), hand: L(a.hand, b.hand), elbow: L(a.elbow, b.elbow) };
}
export const keysLights = (t) => [{ rgb: screenLight(t).map((v) => Math.min(255, v + 15)).join(','), a: 0.6, vs: [[0, -3]] }, { rgb: '255,210,160', a: 0.35, vs: [[3, 0]] }];
export function keysCam(t, t0, t1, o = {}) {
  const k = ease.inOut(clamp((t - t0) / (t1 - t0)));
  return new Cam({ x: lerp(o.x0 ?? -2, o.x1 ?? 2, k), y: lerp(o.y0 ?? 122, o.y1 ?? 119, k), z: lerp(o.z0 ?? -33, o.z1 ?? -30, k), f: lerp(1950, 2080, k), hy: lerp(-1600, -1720, k) });
}
export function keysShot(name, t0, t1, fill, o = {}) {
  return shot(t0, t1, name, (ctx, t) => {
    const tc = onTwos(t, 24);
    const st = fill(tc);
    drawKeysSet(ctx, { t, tod: 0.1, ...st, D, screen: 1, lamp: 1, screenRGB: screenLight(t).join(','), handScale: 0.86, lights: keysLights(t) }, keysCam(t, t0, t1, o.cam || {}));
  }, { dissolve: 0 });
}

// ================================================================== A · SIDE: the screen flickers … he bolts upright
const upPT = (t) => (t < 85.0 ? 6.4 : 6.45 + (t - 85.0));
function perfWake(t) {
  const twitch = t > 82 && t < 85 ? Math.max(0, Math.sin((t - 82) * 7)) * 0.35 * (hash2(Math.floor(t * 12), 3) > 0.5 ? 1 : 0.3) : 0;
  const P = perfDown(upPT(t), t, { twitch });
  // after the jolt: leans in toward the screen, blinking
  const lean = K(t, [[86.4, 0], [87.6, 0.16, 'inOut']]);
  P.bend = (P.bend || 0) + lean;
  P.head.nod = (P.head.nod || 0) - lean * 0.4;
  if (t > 86.2) P.face.lid = K(t, [[86.9, 0], [87.0, 1], [87.1, 0], [87.35, 0], [87.45, 1], [87.55, 0]]);
  if (t > 86.4) P.face.mouth = 'o';
  return P;
}
function wake(t0, t1) {
  return shot(t0, t1, 'side-wake', (ctx, t) => {
    const tc = onTwos(t);
    const P = withSecondary(perfWake, tc, proxySide, 0.05);
    const jolt = K(t, [[85.18, 0], [85.26, 1], [85.6, 0]]);
    const cam = { x: 27 + jolt * 0.6, y: -38 - jolt * 1.2, zoom: lerp(9.2, 8.4, kk(t, 85.2, 86.4, 'out')) + jolt * 0.25 };
    drawSideSet(ctx, { ...room(t), kbPress: t < 85.2 ? [0.6, 0.9, 0.7, 0.3, 0] : null, human: { P, D, lights: lightsSide(t) } }, cam);
  }, { dissolve: 0 });
}

// ================================================================== B · OTS (left shoulder): two tiny figures running through his code
function perfSee(t) {
  const P = evalTracks({
    'head.tilt': [[88, 0], [89.2, 0.12, 'inOut'], [90.4, 0.1], [90.9, -0.1, 'inOut'], [92.2, -0.08]],
    'head.nod': [[88, 0.05], [89.0, -0.05], [91.0, 0.02]],
    'head.turn': [[88, 0], [90.0, 0.04], [91.5, -0.03]],
    slump: [[88, 0.1], [93, 0.05]],
    shrug: [[88, 0.1], [89.2, 0.2], [92, 0.15]],
  }, t);
  backArms(P, t, []);
  P.armL = { hand: [-12, -30], elbow: [-22.5, -25.5] }; P.armR = { hand: [11, -30], elbow: [22.5, -25.5] };
  return idle(P, t, { seed: 17 });
}
function see(t0, t1) {
  return shot(t0, t1, 'ots-see', (ctx, t) => {
    const tc = onTwos(t);
    const P = withSecondary(perfSee, tc, proxyBack, 0.07);
    const k = ease.inOut(clamp((t - t0) / (t1 - t0)));
    const dz = K(tc, [[88, 2], [89.5, 6, 'inOut'], [93, 7]]);
    drawBackSet(ctx, { ...room(t), lampGlow: 0, human: { P, D, dz, lights: lightsBack(t) } }, otsCam(-1, k, k * 0.6, { y: 147, hy: -30 }));
  }, { dissolve: 0 });
}

// ================================================================== C · FRONT: the double take … then an idea
function perfTake(t) {
  const P = evalTracks({
    'face.look': [[93, [0.1, 0.2]], [93.6, [0.18, 0.28], 'out5'], [94.1, [-0.05, 0.3], 'out5'], [95.4, [0.05, 0.25]], [96.3, [0.05, 0.25]], [96.45, [-0.5, 0.35], 'out5'], [96.9, [-0.5, 0.36]], [97.05, [0.1, 0.25], 'out5'], [98, [0, 0.45]]],
    'face.lid': [[93, 0.05], [94.1, 0], [95.4, 0], [95.8, 0.08], [97.3, 0.1], [97.7, 0.3], [98, 0.2]],
    'face.brow': [[93, 0.8], [94.1, 0.85], [95.3, 0.6], [96.3, 0.7], [97.2, 0.4], [97.6, -0.45, 'out'], [98, -0.4]],
    'head.nod': [[93, -0.05], [93.9, -0.1], [95.4, 0.08], [95.9, 0.16, 'inOut'], [96.4, 0.14], [97.2, 0.1], [97.5, 0.18, 'outBack'], [97.7, 0.1], [98, 0.26, 'inOut']],
    'head.tilt': [[93, 0], [93.5, 0.1, 'outBack'], [94.1, 0.08], [95.4, 0], [96.3, -0.02], [96.5, 0.05]],
    'head.turn': [[96.3, 0], [96.45, -0.22, 'out'], [96.95, -0.22], [97.1, 0.02, 'out']],
    slump: [[93, 0.05], [95.4, 0.0], [95.9, -0.18, 'inOut'], [97.2, -0.15], [98, 0.1]],
    shrug: [[93, 0.25], [94.1, 0.2], [95.4, 0.3], [97.4, 0.15], [97.6, 0.3], [98, 0]],
    breath: [[97.0, 0], [97.4, 1.0, 'inOut'], [98, 0]],
  }, t);
  const F = P.face;
  F.eyes = t > 94.15 && t < 94.95 ? 'closed' : t > 93 && t < 94.1 || (t > 95.4 && t < 96.4) ? 'wide' : 'open';
  F.mouth = t < 94.1 ? 'o' : t < 95.3 ? 'line' : t < 96.4 ? 'o' : t < 97.2 ? 'line' : 'smirk';
  F.mouthK = t < 94.1 ? 0.5 : 0.35;
  // one hand rubs his eyes (quick), then both hands ready over the keys
  const r = K(t, [[94.0, 0], [94.25, 1, 'out'], [94.9, 1], [95.2, 0, 'in']]);
  const rub = t > 94.25 && t < 94.9 ? Math.sin((t - 94.25) * 22) : 0;
  P.armR = fBlend(fTyping(1, t, 51), fArm(1, [4.6 + rub * 0.8, -63.2 + rub * 0.5], [15.5, -38], { view: 'fist', rot: 1.2, scale: 1.05 }), r);
  P.armL = fTyping(-1, t, 51);
  // the knuckle crack before he gets to work
  const c = K(t, [[97.25, 0], [97.45, 1, 'out'], [97.8, 1], [98.0, 0, 'in']]);
  if (c > 0) {
    const L = fArm(-1, [-2.5, -36], [-17, -30], { view: 'fist', rot: -0.9, scale: 1.05 });
    const R = fArm(1, [2.5, -37], [17, -30], { view: 'back', curl: 0.7, rot: 2.2, scale: 1.05 });
    P.armL = fBlend(P.armL, L, c); P.armR = fBlend(P.armR, R, c);
  }
  return idle(P, t, { seed: 19, noBlink: t > 94 && t < 95 });
}
function take(t0, t1) {
  return shot(t0, t1, 'front-take', (ctx, t) => {
    const tc = onTwos(t);
    const P = withSecondary(perfTake, tc, proxyFront, 0.06);
    const lean = kk(t, 95.4, 96.0, 'inOut') * (1 - kk(t, 97.2, 97.8));
    const cam = { x: 0, y: -60 - lean * 2, zoom: lerp(10.6, 11.2, kk(t, t0, t1)) + lean * 1.4 };
    drawFrontSet(ctx, { ...room(t), human: { P, D, lights: lightsFront(t) } }, cam);
  }, { dissolve: 0 });
}

// ================================================================== D · KEYS: Ctrl+F "total"
export const EV_F = [];
{ let t = T.search + 1.2; for (const ch of 'total') { EV_F.push([t, ch]); t += 0.2; } }
const keysFind = keysShot('keys-find', T.search, 100.4, (tc) => {
  const st = typingState(EV_F, tc, { lift: (tt, h) => K(tt, [[98.0, 0.9], [98.3, 0.2], [100.2, 0.1], [100.4, 0.6]]) });
  chord(st, tc, T.search + 0.45, 'f', 0, 0.2);
  return st;
});

// ================================================================== E · CODE WORLD: the searchlight, the fake "o", the lunge
const search = [
  // wide: the beam sweeps across the code
  shot(100.4, 103.1, 'cw-search', (ctx, t) => drawCW(ctx, t, camPath(t, [[100.4, 820, g(7) - 40, 0.44], [103.1, 900, g(9) - 20, 0.52]])), { dissolve: 0.25 }),
  // two-shot on line 10: the light rests on an "o" that is not quite an "o"
  shot(103.1, 106.9, 'cw-fake-o', (ctx, t) => {
    const c = cubePos(t), b = bugPos(t);
    const cx = (c.x + b.x) / 2 + 40;
    drawCW(ctx, t, { x: lerp(cx, cx + 60, kk(t, 103.1, 106.9)), y: g(10) - 120, zoom: lerp(0.95, 1.1, kk(t, 103.1, 106.9)) });
  }, { dissolve: 0 }),
  // the lunge: the bug springs out of the text, the little friend belly-flops onto the empty spot
  shot(106.9, 109.6, 'cw-lunge', (ctx, t) => {
    const cam = camPath(t, [[106.9, charCX(22), g(10) - 110, 1.2], [107.5, charCX(24), g(10) - 90, 1.15, 'out'], [109.6, charCX(22), g(11) - 60, 0.8, 'inOut']]);
    const hit = K(t, [[107.55, 0], [107.6, 1], [107.9, 0]]);
    cam.y += hit * 10 * Math.sin(t * 95);
    drawCW(ctx, t, cam);
  }, { dissolve: 0 }),
  shot(109.6, 112.0, 'cw-dazed', (ctx, t) => drawCW(ctx, t, { x: charCX(25) + 30, y: g(10) - 100, zoom: lerp(1.35, 1.5, kk(t, 109.6, 112)) }), { dissolve: 0 }),
];

// ================================================================== F · FRONT → OTS: console.log('here') — leave a light
function perfLogThink(t) {
  const P = evalTracks({
    'face.look': [[112, [0.0, 0.3]], [112.6, [0.2, 0.38], 'out5'], [113.1, [0.25, 0.4]], [113.4, [0, 0.55], 'out5']],
    'face.brow': [[112, 0.6], [112.7, 0.2], [113.2, -0.3, 'out'], [114.3, -0.35]],
    'face.lid': [[112, 0.1], [113.2, 0.2]],
    'head.nod': [[112, 0.05], [112.6, 0.0], [113.2, 0.14, 'outBack'], [113.5, 0.1], [114.3, 0.25]],
    'head.tilt': [[112, 0.06], [112.8, -0.08, 'inOut'], [113.3, 0]],
    shrug: [[112, 0.1], [113.2, 0.25, 'out'], [113.6, 0.05]],
  }, t);
  P.face.mouth = t < 112.8 ? 'bite' : t < 113.3 ? 'line' : 'smirk';
  // tapping his chin with a finger, then back to the keys
  const c = K(t, [[112.05, 0], [112.35, 1, 'out'], [113.05, 1], [113.4, 0, 'in']]);
  const tap = t > 112.35 && t < 113.05 ? Math.max(0, Math.sin((t - 112.35) * 18)) : 0;
  P.armR = fBlend(fTyping(1, t, 61), fArm(1, [3.8, -53.5 - tap * 0.8], [15, -34], { view: 'point', curl: 0.1, rot: 0.25, scale: 1.05 }), c);
  P.armL = fTyping(-1, t, 61, [[113.6, 114.3, 8]]);
  if (t > 113.4) P.armR = fTyping(1, t, 61, [[113.6, 114.3, 8]]);
  return idle(P, t, { seed: 23 });
}
const logThink = shot(112.0, 114.2, 'front-log', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfLogThink, tc, proxyFront, 0.06);
  drawFrontSet(ctx, { ...room(t), human: { P, D, lights: lightsFront(t) } }, { x: 1, y: -60, zoom: lerp(11.4, 12.2, kk(t, 112, 114.2)) });
}, { dissolve: 0 });
function perfLogType(t) {
  const P = evalTracks({ 'head.nod': [[114.2, 0.12], [116.8, 0.16], [117.1, 0.02, 'out']], 'head.tilt': [[114.2, 0], [116.9, 0.04]], slump: [[114.2, 0.05]], shrug: [[116.75, 0.05], [116.9, 0.18, 'out'], [117.2, 0.1]] }, t);
  backArms(P, t, [[114.3, 116.8, 9]], 71);
  const e = K(t, [[116.7, 0], [116.82, 1, 'out'], [116.95, 0.6], [117.2, 0]]);
  P.armR = { hand: [9 + e * 3, -30 - e * 1.5], elbow: [21.9 + e * 2, -25.5 - e * 2.5] };
  return idle(P, t, { seed: 29 });
}
const logType = shot(114.2, 117.0, 'ots-log', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfLogType, tc, proxyBack, 0.07);
  const k = ease.inOut(clamp((t - 114.2) / 2.8));
  drawBackSet(ctx, { ...room(t), lampGlow: 0, human: { P, D, dz: 3, lights: lightsBack(t) } }, otsCam(-1, k, 0.3 + k * 0.4, { y: 148, hy: -120 + k * 30, hx: 150 }));
}, { dissolve: 0 });

// ================================================================== G · CODE WORLD: the lantern, the footprints, lost among the braces
const lantern = [
  shot(117.0, 119.5, 'cw-lantern', (ctx, t) => drawCW(ctx, t, camPath(t, [[117.0, charCX(16), g(19) + 20, 0.7], [119.5, charCX(14), g(20) - 40, 0.8]])), { dissolve: 0.2 }),
  shot(119.5, 122.2, 'cw-follow', (ctx, t) => drawCW(ctx, t, followCube(t, { zoom: 0.95, dy: -100, freq: 1.1 })), { dissolve: 0 }),
  shot(122.2, 128.0, 'cw-maze', (ctx, t) => {
    // the nested braces around him like a maze: pull out to show how deep he is
    const c = cubePos(t);
    drawCW(ctx, t, camPath(t, [[122.2, c.x, g(20) - 90, 1.0], [124.4, charCX(30), g(20) - 110, 0.85], [128.0, charCX(24), g(20) - 180, 0.62]]));
  }, { dissolve: 0 }),
];

// ================================================================== H · FRONT: he wants to clear the way for it
function perfEager(t) {
  const P = evalTracks({
    'face.look': [[128, [0.05, 0.35]], [129.0, [0.2, 0.42]], [129.8, [-0.1, 0.4]], [130.6, [0, 0.55], 'out5']],
    'face.brow': [[128, 0.7], [129.5, 0.8], [130.3, -0.5, 'out'], [131.4, -0.55]],
    'face.lid': [[128, 0], [131.4, 0.05]],
    'head.nod': [[128, -0.02], [129.4, -0.06], [130.3, 0.12, 'outBack'], [130.7, 0.2], [131.4, 0.3]],
    'head.tilt': [[128, 0.05], [129.2, -0.06], [130, 0.02]],
    slump: [[128, -0.12], [129.6, -0.2], [130.4, 0.0], [131.4, 0.1]],
    shrug: [[128, 0.2], [130.2, 0.3], [130.5, 0.1]],
  }, t);
  P.face.mouth = t < 129.8 ? 'wavy' : t < 130.3 ? 'line' : 'grit';
  P.face.mouthK = 0.6;
  const drum = t < 130.2 ? 1 : 0;
  P.armL = fTyping(-1, t, 81, [[128.0, 130.1, 12]], 0.5 * drum);
  P.armR = fTyping(1, t, 81, [[128.0, 130.1, 12]], 0.5 * drum);
  // reaches for the far right of the keyboard (backspace)
  const r = K(t, [[130.6, 0], [131.3, 1, 'inOut']]);
  P.armR.hand = [lerp(10, 16.5, r), -19.6 - r * 1.2]; P.armR.elbow = [lerp(21, 25, r), -27.5 - r * 1.5];
  return idle(P, t, { seed: 31 });
}
const eager = shot(128.0, 131.4, 'front-eager', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfEager, tc, proxyFront, 0.06);
  drawFrontSet(ctx, { ...room(t), human: { P, D, lights: lightsFront(t) } }, { x: 0, y: -59, zoom: lerp(10.8, 11.6, kk(t, 128, 131.4)) });
}, { dissolve: 0 });

// ================================================================== I · KEYS: holding backspace … a bit too long
const keysBS = keysShot('keys-backspace', TYPE.bsStart, T.collapse, (tc) => {
  const st = typingState([], tc, {});
  const hold = K(tc, [[131.55, 0], [131.7, 1, 'out'], [134.45, 1], [134.6, 0.4]]);
  const H = st.hands[1];
  const reach = K(tc, [[131.4, 0.6], [131.6, 1, 'out']]);
  H.x += 9.5 * reach; H.z += 3.2 * reach; H.a = -0.3 * reach - 0.14;
  H.press[3] = hold; H.lift = (H.lift || 0) - hold * 0.35 + (tc > 133.8 ? Math.sin(tc * 30) * 0.05 : 0);
  H.curl = 0.25;
  st.keysDown['⌫'] = hold;
  // the other fingers lift, tense
  H.spread = 0.45;
  st.hands[-1].lift = 0.5 + Math.sin(tc * 2) * 0.1;
  return st;
}, { cam: { x0: 6, x1: 8, z0: -31, z1: -29 } });

// ================================================================== J · CODE WORLD: the floor gives way, error rain
const collapse = [
  shot(T.collapse, T.hit, 'cw-collapse', (ctx, t) => {
    const cam = camPath(t, [[T.collapse, charCX(22), g(20) - 60, 0.7], [T.hit, charCX(20), g(20) - 150, 0.6, 'out']]);
    cam.y += Math.sin(t * 70) * 8 * kk(t, T.collapse, T.collapse + 0.3) * (1 - kk(t, T.collapse + 1.0, T.hit));
    drawCW(ctx, t, cam);
  }, { dissolve: 0 }),
  shot(T.hit, 139.0, 'cw-hit', (ctx, t) => {
    const hit = K(t, [[T.hit, 1], [T.hit + 0.35, 0]]);
    drawCW(ctx, t, { x: charCX(19) + 20 + Math.sin(t * 90) * 12 * hit, y: g(20) - 110, zoom: lerp(1.2, 1.35, kk(t, T.hit, 139)) });
  }, { dissolve: 0 }),
];

// ================================================================== K · FRONT: oops
function perfOops(t) {
  const P = evalTracks({
    'face.look': [[139, [0, 0.4]], [140.2, [0, 0.45]], [140.6, [0, 0.9], 'out5'], [141.4, [0, 0.95]]],
    'face.brow': [[139, 0.9], [141.4, 0.9]],
    'face.lid': [[139, 0], [141.4, 0.1]],
    'head.nod': [[139, -0.12], [139.3, -0.18, 'outBack'], [140.3, -0.1], [140.7, 0.35, 'out'], [142, 0.4]],
    'head.tilt': [[139, 0], [139.6, 0.08], [140.4, 0.06]],
    shrug: [[139, 0.5], [139.3, 0.7, 'outBack'], [140.3, 0.6], [140.8, 0.3]],
    slump: [[139, -0.2], [140.4, -0.1], [141, 0.2]],
    sy: [[139, 1.02], [140.4, 1.02], [140.8, 1]],
  }, t);
  P.face.eyes = t < 140.4 ? 'wide' : 'open';
  P.face.mouth = t < 140.4 ? 'grit' : 'wavy';
  P.face.sweat = K(t, [[139.3, 0], [139.6, 1]]);
  // both hands to his mouth, then down to the keyboard in a hurry
  const up = K(t, [[139.0, 0.7], [139.25, 1, 'outBack'], [140.3, 1], [140.75, 0, 'in']]);
  for (const side of [-1, 1]) {
    const m = fArm(side, [side * 3.4, -55.5], [side * 15.5, -35], { view: 'back', curl: 0.35, spread: 0.1, rot: side * 0.15, scale: 1.04 });
    P[side < 0 ? 'armL' : 'armR'] = fBlend(fTyping(side, t, 91), m, up);
  }
  return idle(P, t, { seed: 37, noBlink: true });
}
const oops = shot(139.0, T.undo, 'front-oops', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfOops, tc, proxyFront, 0.06);
  drawFrontSet(ctx, { ...room(t), human: { P, D, lights: lightsFront(t) } }, { x: 0, y: -60, zoom: lerp(11.8, 11.2, kk(t, 139, 142)) });
}, { dissolve: 0 });

// ================================================================== L · KEYS: Ctrl+Z, Ctrl+Z
const keysUndo = keysShot('keys-undo', T.undo, T.rewind, (tc) => {
  const st = typingState([], tc, { lift: (tt) => K(tt, [[142, 1.4], [142.25, 0.3]]) });
  chord(st, tc, TYPE.undo, 'z', 2, 0.18);
  chord(st, tc, TYPE.undo + 0.55, 'z', 2, 0.18);
  return st;
});

// ================================================================== M · CODE WORLD: rewind; shaking it off
const rewind = [
  shot(T.rewind, 147.4, 'cw-rewind', (ctx, t) => drawCW(ctx, t, camPath(t, [[T.rewind, charCX(20), g(20) - 150, 0.6], [146.6, charCX(19) + 20, g(20) - 110, 1.05, 'inOut'], [147.4, charCX(19) + 20, g(20) - 110, 1.1]])), { dissolve: 0 }),
  shot(147.4, 152.0, 'cw-after', (ctx, t) => drawCW(ctx, t, { x: charCX(19) + 40, y: g(20) - 120, zoom: lerp(1.1, 0.95, kk(t, 147.4, 152)) }), { dissolve: 0 }),
];

// ================================================================== N · CODE WORLD: near miss #2
const near2 = [
  shot(152.0, 156.0, 'cw-near2', (ctx, t) => {
    const cam = camPath(t, [[152.0, charCX(14), g(19) - 150, 0.72], [154.8, charCX(12), g(18) - 60, 0.85, 'inOut'], [156.0, charCX(14), g(18) - 40, 0.8]]);
    const hit = K(t, [[155.5, 0], [155.55, 1], [155.85, 0]]);
    cam.y += hit * 10 * Math.sin(t * 95);
    drawCW(ctx, t, cam);
  }, { dissolve: 0 }),
  // the bug bounces away up through the code, back into the loop
  shot(156.0, 158.4, 'cw-escape', (ctx, t) => { const b = bugPos(t); drawCW(ctx, t, { x: lerp(charCX(30), b.x, 0.6), y: lerp(g(17), b.y, 0.55) - 80, zoom: 0.62 }); }, { dissolve: 0 }),
  shot(158.4, 160.0, 'cw-sulk', (ctx, t) => drawCW(ctx, t, { x: charCX(9) + 20, y: g(18) - 100, zoom: lerp(1.3, 1.4, kk(t, 158.4, 160)) }), { dissolve: 0 }),
];

// ================================================================== O · the quiet moment
const quietCW1 = shot(160.0, 166.0, 'cw-quiet', (ctx, t) => {
  // it trudges to the end of the line and sits on the edge, legs dangling over the dark
  drawCW(ctx, t, camPath(t, [[160, charCX(12), g(18) - 90, 1.0], [163.0, charCX(16) + 60, g(18) - 30, 0.92, 'inOut'], [166, charCX(16) + 80, g(18) - 20, 0.86]]));
}, { dissolve: 0.3 });
function perfChin(t) {
  const P = evalTracks({
    'face.look': [[166, [0.0, 0.35]], [168.2, [0.05, 0.35]], [168.5, [-0.55, -0.1], 'out5'], [169.3, [-0.55, -0.1]], [169.55, [0, 0.35], 'out5'], [175.0, [0, 0.35]], [175.3, [0.05, 0.28], 'out5']],
    'face.lid': [[166, 0.4], [168, 0.5], [168.4, 0.2], [169.6, 0.35], [175.0, 0.4], [175.2, 0.0, 'out'], [176.0, 0.1], [178, 0.15]],
    'face.brow': [[166, 0.35], [168.4, 0.55], [169.6, 0.4], [175.0, 0.4], [175.3, 0.75, 'out'], [176.2, 0.3], [178, 0.2]],
    'face.bags': [[166, 0.8]],
    'head.nod': [[166, 0.24], [168.3, 0.26], [168.5, 0.12, 'out'], [169.5, 0.14], [169.7, 0.26], [175.0, 0.26], [175.3, 0.02, 'out'], [178, 0.02]],
    'head.tilt': [[166, -0.18], [168.4, -0.16], [168.6, -0.1], [169.6, -0.17], [175.0, -0.18], [175.4, -0.02, 'out'], [176.4, 0.08, 'inOut'], [178, 0.06]],
    'head.turn': [[168.3, 0], [168.5, -0.2, 'out'], [169.4, -0.2], [169.6, 0, 'out']],
    slump: [[166, 0.45], [175.0, 0.45], [175.4, 0.15, 'out'], [178, 0.12]],
    shrug: [[166, 0.1], [175.3, 0.25, 'out'], [175.8, 0.05]],
  }, t);
  P.face.mouth = t < 175.3 ? 'flat' : t < 175.9 ? 'o' : 'smile';
  P.face.mouthK = t < 175.9 ? 0.3 : K(t, [[175.9, 0.3], [176.6, 1.0]]);
  P.face.blush = K(t, [[176, 0], [177, 0.35]]);
  // the yawn
  const yawn = K(t, [[166.5, 0], [167.0, 1, 'inOut'], [167.9, 1], [168.3, 0, 'inOut']]);
  if (yawn > 0.05) { P.face.mouth = 'yawn'; P.face.mouthK = yawn; P.face.eyes = yawn > 0.5 ? 'squeeze' : 'open'; P.head.nod -= yawn * 0.2; P.breath = (P.breath || 0) + yawn * 1.2; }
  // chin in his left palm, elbow on the desk; right hand idles on the keys, then comes up in a small wave
  P.armL = fArm(-1, [-3.2 + (P.head.tilt || 0) * 6, -54.5 + (P.head.nod - 0.24) * 5], [-12.5, -25.5], { view: 'back', curl: 0.55, rot: -0.4, scale: 1.05 });
  const lift = K(t, [[175.0, 0], [175.4, 0.35]]);
  P.armL = fBlend(P.armL, fArm(-1, [-8, -40], [-14, -25.5], { view: 'fist', rot: -1.1, scale: 1.04 }), lift / 0.35 * 0.8);
  const w = K(t, [[176.1, 0], [176.5, 1, 'outBack'], [177.5, 1], [177.9, 0, 'in']]);
  const wig = Math.sin((t - 176.5) * 12) * w;
  P.armR = fBlend(fTyping(1, t, 97), fArm(1, [15.5 + wig * 1.2, -60], [17, -27], { view: 'palm', spread: 0.7, thumb: 0.8, rot: -0.15 + wig * 0.2, scale: 1.15 }), w);
  return idle(P, t, { seed: 41, rate: 0.19, every: 4.5 });
}
const chin1 = shot(166.0, 170.4, 'front-chin', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfChin, tc, proxyFront, 0.06);
  drawFrontSet(ctx, { ...room(t), human: { P, D, lights: lightsFront(t) } }, { x: -2, y: -58, zoom: lerp(9.6, 10.2, kk(t, 166, 170.4)) });
}, { dissolve: 0 });
const quietCW2 = shot(170.4, 174.6, 'cw-wave', (ctx, t) => drawCW(ctx, t, { x: charCX(16) + 40, y: g(18) - 90, zoom: lerp(1.3, 1.45, kk(t, 170.4, 174.6)) }), { dissolve: 0 });
const chin2 = shot(174.6, T.idea, 'front-wave', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfChin, tc, proxyFront, 0.06);
  drawFrontSet(ctx, { ...room(t), human: { P, D, lights: lightsFront(t) } }, { x: 0, y: -58, zoom: lerp(10.4, 10.8, kk(t, 174.6, 178)) });
}, { dissolve: 0 });

// his point of view: the editor, and two tiny figures running through it
const pov = shot(90.3, T.face3, 'pov-minis', (ctx, t) => {
  const k = kk(t, 90.3, T.face3);
  drawMonitorShot(ctx, t, { x: lerp(470, 430, k), y: lerp(430, 445, k), zoom: lerp(2.3, 2.75, k) });
}, { dissolve: 0 });

export const S3 = [
  wake(T.glitch, T.otsSee),
  see(T.otsSee, 90.3), pov,
  take(T.face3, T.search),
  keysFind,
  ...search,
  logThink, logType,
  ...lantern,
  eager, keysBS,
  ...collapse,
  oops, keysUndo,
  ...rewind,
  ...near2,
  quietCW1, chin1, quietCW2, chin2,
];
