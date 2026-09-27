// Section 4 · closing in.
// An idea: breakpoints. Each click in the gutter drops a gate in the code world; the bug is fenced into the
// loop. A search for "items[i]" floods the trap with light. The bug hides as the "=" of "<=" — its feet give
// it away — and the little friend pounces. Without the "=", the loop stops one step earlier: that was the bug.
import { T } from './times.js';
import { TYPE, PIN_TYPE, screenLight } from './code.js';
import { D, K, idle, withSecondary, strokes, evalTracks, onTwos, room, lightsBack, lightsFront, proxyFront, proxyBack } from './perfkit.js';
import { shot, otsCam, backArms, chord } from './s1.js';
import { fArm, fTyping, fBlend, keysShot } from './s3.js';
import { drawCW, camPath } from './cwshot.js';
import { cubePos, bugPos } from './cw.js';
import { mouseAt } from './screen_content.js';
import { LINES, charCX } from '../codeworld.js';
import { drawBackSet } from '../sets/back.js';
import { drawFrontSet } from '../sets/front.js';
import { typingState } from '../sets/keys.js';
import { emote } from '../draw.js';
import { Cam } from '../world.js';
import { ease, clamp, lerp } from '../core.js';

const g = (i) => LINES[i].ground;
const kk = (t, a, b, e = 'inOut') => ease[e](clamp((t - a) / (b - a)));

// ================================================================== FRONT: the idea
function perfIdea(t) {
  const P = evalTracks({
    'face.look': [[178, [0.05, 0.3]], [178.9, [0.1, 0.3]], [179.05, [0.35, -0.2], 'out5'], [179.8, [0.3, -0.15]], [180.0, [0.0, 0.3], 'out5']],
    'face.lid': [[178, 0.15], [178.9, 0.2], [179.0, 0, 'out']],
    'face.brow': [[178, 0.3], [178.9, 0.25], [179.05, 0.95, 'out'], [179.9, 0.8], [180.3, -0.35, 'out']],
    'head.nod': [[178, 0.02], [178.9, 0.04], [179.05, -0.12, 'outBack'], [179.9, -0.08], [180.4, 0.14, 'inOut']],
    'head.tilt': [[178, 0.06], [179.0, 0.0], [179.9, -0.04], [180.3, 0]],
    shrug: [[178.9, 0], [179.05, 0.35, 'out'], [179.6, 0.25], [180.1, 0]],
    slump: [[178, 0.12], [179.05, -0.05], [180.2, -0.12], [180.8, -0.15]],
  }, t);
  P.face.eyes = t > 179.0 && t < 179.9 ? 'wide' : 'open';
  P.face.mouth = t < 178.9 ? 'smile' : t < 179.6 ? 'o' : 'smirk';
  P.face.mouthK = t < 178.9 ? 0.7 : 0.5;
  // his right hand (image left) goes for the mouse
  const m = K(t, [[179.9, 0], [180.5, 1, 'inOut']]);
  P.armL = fBlend(fTyping(-1, t, 101), fArm(-1, [-27, -21.5], [-26, -28], { view: 'back', curl: 0.35, rot: -0.3, scale: 1.12 }, false), m);
  P.armR = fTyping(1, t, 101);
  return idle(P, t, { seed: 43 });
}
const idea = shot(T.idea, 180.8, 'front-idea', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfIdea, tc, proxyFront, 0.06);
  const k = K(tc, [[179.0, 0], [179.2, 1, 'outBack'], [179.9, 1], [180.2, 0]]);
  drawFrontSet(ctx, { ...room(t), human: { P, D, lights: lightsFront(t) } }, { x: 0, y: -60, zoom: lerp(10.6, 11.4, kk(t, 178, 180.8)) }, {
    after: (c) => { if (k > 0.01) emote(c, 'bulb', 9, -86, 9, k, 7); },
  });
}, { dissolve: 0 });

// ================================================================== OTS (left shoulder): click, click — breakpoints
function perfClick(t) {
  const P = evalTracks({
    'head.tilt': [[180.8, 0], [182.0, -0.05], [185.4, -0.04], [186.4, 0.03]],
    'head.nod': [[180.8, 0.1], [182.5, 0.14], [185.4, 0.12]],
    slump: [[180.8, -0.05]],
    shrug: [[180.8, 0.1]],
  }, t);
  backArms(P, t, []);
  // right hand on the mouse, following the pointer; a click is a small dip
  const mp = mouseAt(t);
  const mx = mp ? (mp[0] - 300) / 300 : 0, my = mp ? (mp[1] - 400) / 400 : 0;
  const click = mp && mp[2] ? 1 : 0;
  P.armR = { hand: [27 + mx * 1.5, -29 + my * 0.8 + click * 0.5], elbow: [31.5 + mx * 0.8, -22.5], hp: { view: 'back', curl: 0.35 + click * 0.15, rot: -0.1 } };
  return idle(P, t, { seed: 47 });
}
const otsClick = (t0, t1) => shot(t0, t1, 'ots-click', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfClick, tc, proxyBack, 0.07);
  const k = kk(t, t0, t1);
  drawBackSet(ctx, { ...room(t), lampGlow: 0, mouse: [37 + ((mouseAt(tc)?.[0] ?? 300) - 300) * 0.01, 13], human: { P, D, dz: 4, lights: lightsBack(t) } }, otsCam(-1, k, 0.4, { y: 148, hy: -90, hx: 170 }));
}, { dissolve: 0 });

// ================================================================== CODE WORLD: gates
const gate1 = shot(182.45, 185.4, 'cw-gate1', (ctx, t) => {
  const hit = K(t, [[182.5, 0], [182.55, 1], [182.9, 0]]);
  const cam = camPath(t, [[182.45, charCX(10), g(9) - 170, 0.9], [185.4, charCX(14), g(8) - 120, 0.72]]);
  cam.y += hit * 16 * Math.sin(t * 90);
  drawCW(ctx, t, cam);
}, { dissolve: 0 });
const gate2 = shot(186.45, 189.0, 'cw-gate2', (ctx, t) => {
  const hit = K(t, [[186.5, 0], [186.55, 1], [186.9, 0]]);
  const cam = camPath(t, [[186.45, charCX(14), g(4) - 150, 0.85], [187.8, charCX(18), g(6) - 100, 0.6, 'inOut'], [189.0, charCX(24), g(7) - 60, 0.62]]);
  cam.y += hit * 16 * Math.sin(t * 90);
  drawCW(ctx, t, cam);
}, { dissolve: 0 });

// ================================================================== KEYS: Ctrl+F  items[i]
export const EV_PIN = [];
{ let t = PIN_TYPE; for (const ch of 'items[i]') { EV_PIN.push([t, ch]); t += 0.09; } }
const keysPin = keysShot('keys-pin', T.pin, 190.0, (tc) => {
  const st = typingState(EV_PIN, tc, { lift: (tt) => K(tt, [[189.0, 0.8], [189.2, 0.1]]) });
  chord(st, tc, T.pin + 0.04, 'f', 0, 0.14);
  return st;
}, { cam: { x0: 1, x1: 3 } });

// ================================================================== CODE WORLD: the trap, the disguise, the pounce
const trap = [
  // bounced off the gate; the light floods in; the little friend drops in from above
  shot(190.0, 193.4, 'cw-trap', (ctx, t) => drawCW(ctx, t, camPath(t, [[190.0, charCX(12), g(8) - 60, 0.72], [191.4, charCX(16), g(6) - 60, 0.5, 'inOut'], [193.4, charCX(17), g(6) - 50, 0.52]])), { dissolve: 0 }),
  // the bug panics between the gates
  shot(193.4, 197.2, 'cw-panic', (ctx, t) => { const b = bugPos(t); drawCW(ctx, t, { x: lerp(b.x, charCX(14), 0.35), y: g(6) - 120, zoom: 0.95 }); }, { dissolve: 0 }),
  // … and hides: it flattens into the "=" of "<="
  shot(197.2, T.disguise, 'cw-hide', (ctx, t) => drawCW(ctx, t, { x: charCX(21) + 10, y: g(5) - 50, zoom: lerp(1.5, 1.75, kk(t, 197.2, 200)) }), { dissolve: 0 }),
];
const hunt = [
  // step, step … where did it go?
  shot(T.disguise, 204.1, 'cw-hunt', (ctx, t) => drawCW(ctx, t, camPath(t, [[T.disguise, charCX(15), g(5) - 110, 1.0], [204.1, charCX(18), g(5) - 100, 1.12]])), { dissolve: 0 }),
  // the "=" has feet
  shot(204.1, 205.35, 'cw-feet', (ctx, t) => drawCW(ctx, t, { x: charCX(21), y: g(5) + 10, zoom: lerp(2.3, 2.5, kk(t, 204.1, 205.35)) }), { dissolve: 0 }),
  // a sly look; wind-up
  shot(205.35, T.pounce, 'cw-sly', (ctx, t) => drawCW(ctx, t, { x: charCX(16) + 20, y: g(5) - 70, zoom: lerp(1.9, 2.1, kk(t, 205.35, T.pounce, 'in')) }), { dissolve: 0 }),
];
const pounce = shot(T.pounce, 210.6, 'cw-pounce', (ctx, t) => {
  const cam = camPath(t, [[T.pounce, charCX(18), g(5) - 110, 1.2], [207.3, charCX(21), g(5) - 110, 1.05, 'out'], [208.4, charCX(23), g(5) - 130, 1.1], [210.6, charCX(23) + 10, g(5) - 150, 1.25]]);
  const hit = K(t, [[207.25, 0], [207.3, 1], [207.7, 0]]);
  cam.y += hit * 14 * Math.sin(t * 95);
  drawCW(ctx, t, cam);
}, { dissolve: 0 });

// ================================================================== FRONT: yes! … and "<=" should have been "<"
function perfYes(t) {
  const P = evalTracks({
    'face.look': [[210.6, [0, 0.35]], [212.2, [0.05, 0.4]], [212.5, [-0.1, 0.45]]],
    'face.lid': [[210.6, 0], [213.4, 0.1]],
    'face.brow': [[210.6, 0.9], [211.0, 0.6], [212.2, 0.4], [212.45, 0.95, 'out'], [213.2, 0.6], [214, 0.3]],
    'head.nod': [[210.6, -0.12], [211.0, 0.12, 'out'], [211.3, -0.05], [212.4, 0.05], [212.6, -0.18, 'outBack'], [213.3, 0.1, 'inOut'], [214, 0.05]],
    'head.tilt': [[212.5, 0], [213.0, 0.1], [214, 0.05]],
    shrug: [[210.6, 0.2], [210.95, 0.5, 'out'], [211.4, 0.1], [212.5, 0.4, 'outBack'], [213.4, 0.1]],
    slump: [[210.6, -0.2], [211.0, 0.05], [212.4, 0.0], [213.3, 0.15]],
    breath: [[212.4, 0], [212.9, 1.1, 'out'], [213.3, 0.3], [213.6, 0.9], [214, 0.2]],
  }, t);
  P.face.eyes = t < 211.0 ? 'wide' : t < 211.6 ? 'squeeze' : t < 212.4 ? 'open' : t < 213.5 ? 'happy' : 'open';
  P.face.mouth = t < 210.9 ? 'o' : t < 211.6 ? 'grit' : t < 212.4 ? 'smile' : t < 213.5 ? 'open' : 'smile';
  P.face.mouthK = t < 210.9 ? 0.5 : t < 213.5 ? 0.9 : 0.8;
  P.face.blush = K(t, [[212.5, 0], [213.2, 0.4]]);
  // a small fist pump (image right hand), then the heel of his hand to his forehead: of course
  const f = K(t, [[210.7, 0], [210.95, 1, 'outBack'], [211.5, 1], [211.8, 0, 'in']]);
  const pump = t > 210.95 && t < 211.5 ? Math.sin((t - 210.95) * 17) * 0.6 : 0;
  P.armR = fBlend(fTyping(1, t, 111), fArm(1, [11, -42 - pump * 1.5], [18, -28], { view: 'fist', rot: 1.3, scale: 1.1 }), f);
  const h = K(t, [[212.3, 0], [212.55, 1, 'outBack'], [213.3, 1], [213.7, 0, 'in']]);
  P.armL = fBlend(fTyping(-1, t, 111), fArm(-1, [-4.5, -74], [-17, -41], { view: 'back', curl: 0.25, rot: -0.2, scale: 1.08 }), h);
  return idle(P, t, { seed: 53 });
}
const yes = shot(210.6, T.fixed, 'front-yes', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfYes, tc, proxyFront, 0.06);
  drawFrontSet(ctx, { ...room(t), human: { P, D, lights: lightsFront(t) } }, { x: 0, y: -60, zoom: lerp(11.0, 11.6, kk(t, 210.6, 214)) });
}, { dissolve: 0 });

// ================================================================== OTS: hands behind his head, leaning back; the line is fixed
function perfRelief(t) {
  const P = evalTracks({
    'head.tilt': [[214, 0], [215.2, 0.05], [216.5, -0.04]],
    'head.nod': [[214, 0.05], [214.8, -0.45, 'inOut'], [216.8, -0.4], [217.4, 0.1, 'inOut']],
    lean: [[214.8, 0], [215.4, 0.05, 'inOut'], [216.1, -0.05, 'inOut'], [216.8, 0, 'inOut']],
    slump: [[214, 0.0], [214.8, -0.1], [217.2, -0.1], [217.6, 0.05]],
    shrug: [[214, 0], [214.8, 0.35, 'inOut'], [216.9, 0.3], [217.4, 0.05]],
    breath: [[214.6, 0], [215.2, 1.2, 'inOut'], [216.2, -0.8, 'inOut'], [217, 0]],
  }, t);
  backArms(P, t, [[217.4, 218, 6]], 131);
  const up = K(t, [[214.1, 0], [214.8, 1, 'inOut'], [216.9, 1], [217.45, 0, 'inOut']]);
  if (up > 0) for (const [nm, side] of [['armL', -1], ['armR', 1]]) {
    // a long stretch, arms up in a V, fists loose
    const A = { hand: [side * 15, -97], elbow: [side * 21, -73], z: up > 0.55 ? 'front' : 'back', hp: { view: 'fist', rot: side * 0.2 } };
    const B = P[nm];
    P[nm] = { ...A, hand: [lerp(B.hand[0], A.hand[0], up), lerp(B.hand[1], A.hand[1], up)], elbow: [lerp(B.elbow[0], A.elbow[0], up), lerp(B.elbow[1], A.elbow[1], up)] };
  }
  return idle(P, t, { seed: 59 });
}
const relief = shot(T.fixed, T.enter, 'ots-relief', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfRelief, tc, proxyBack, 0.07);
  const back = K(tc, [[214.1, 0], [214.9, 1, 'inOut'], [216.9, 1], [217.5, 0, 'inOut']]);
  const k = kk(t, T.fixed, T.enter);
  // a medium shot from behind: his silhouette leaning back, the fixed line glowing green on the screen
  const cam = new Cam({ x: lerp(44, 38, k), y: 140, z: lerp(-178, -165, k), f: 1300, hy: 440 });
  drawBackSet(ctx, { ...room(t), chairTilt: back * 0.35, human: { P, D, dz: -back * 6, lights: lightsBack(t) } }, cam);
}, { dissolve: 0 });

export const S4 = [
  idea,
  otsClick(180.8, 182.45), gate1,
  otsClick(185.4, 186.45), gate2,
  keysPin,
  ...trap, ...hunt, pounce, yes, relief,
];
