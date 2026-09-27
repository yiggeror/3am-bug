// Section 6 · dawn.
// The sun comes up behind the roofs. He rubs his neck, leans back … and falls asleep on his arms. The little
// friend walks home to the terminal, types him a message, and dozes off against the cursor.
import { T } from './times.js';
import { D, K, idle, withSecondary, evalTracks, onTwos, room, lightsBack, lightsSide, proxyBack } from './perfkit.js';
import { shot, backArms } from './s1.js';
import { drawMonitorShot } from './screen_content.js';
import { drawBackSet } from '../sets/back.js';
import { drawSideSet } from '../sets/side.js';
import { sideHeadContact } from '../human/body.js';
import { Cam } from '../world.js';
import { ease, clamp, lerp } from '../core.js';

const kk = (t, a, b, e = 'inOut') => ease[e](clamp((t - a) / (b - a)));

// ================================================================== WIDE (back): sunrise; rubbing his neck, rolling his shoulders
function perfSunrise(t) {
  const P = evalTracks({
    'head.tilt': [[245, 0], [245.8, 0.22, 'inOut'], [246.9, 0.2], [247.6, -0.18, 'inOut'], [248.4, -0.15], [249.0, 0, 'inOut']],
    'head.nod': [[245, 0.1], [246.0, 0.3, 'inOut'], [247.2, 0.28], [248.9, -0.25, 'inOut'], [249.8, -0.2], [251, -0.05]],
    shrug: [[245, 0], [248.6, 0.1], [249.2, 0.45, 'inOut'], [249.9, 0.4], [250.5, -0.1, 'inOut'], [251, -0.05]],
    breath: [[248.6, 0], [249.3, 1.3, 'inOut'], [250.0, 1.2], [250.8, -1, 'inOut']],
    slump: [[245, 0.2], [249, 0.1], [250.6, 0.3]],
    lean: [[245, 0], [246, 0.03], [247.6, -0.03], [248.6, 0]],
  }, t);
  backArms(P, t, []);
  // right hand at the back of his neck, kneading
  const up = K(t, [[245.1, 0], [245.7, 1, 'inOut'], [248.3, 1], [248.9, 0, 'inOut']]);
  const kn = t > 245.7 && t < 248.3 ? Math.sin((t - 245.7) * 7) : 0;
  if (up > 0) {
    const B = P.armR;
    const A = { hand: [4.5 + kn * 0.8, -53 + kn * 0.6], elbow: [23 + kn * 0.4, -60], hp: { view: 'back', curl: 0.45 + kn * 0.1, rot: 2.6 } };
    P.armR = { ...A, z: up > 0.6 ? 'front' : 'back', hand: [lerp(B.hand[0], A.hand[0], up), lerp(B.hand[1], A.hand[1], up)], elbow: [lerp(B.elbow[0], A.elbow[0], up), lerp(B.elbow[1], A.elbow[1], up)] };
  }
  // the other arm drops into his lap as he leans back
  const lap = K(t, [[249.8, 0], [250.6, 1, 'inOut']]);
  if (lap > 0) P.armL = { hand: [lerp(-9, -12, lap), lerp(-30, -14, lap)], elbow: [lerp(-21.9, -23, lap), lerp(-25.5, -26, lap)] };
  return idle(P, t, { seed: 61, rate: 0.2 });
}
const sunrise = shot(T.sunrise, T.sleep, 'wide-sunrise', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfSunrise, tc, proxyBack, 0.07);
  const k = kk(t, T.sunrise, T.sleep);
  const back = K(tc, [[249.6, 0], [250.6, 1, 'inOut']]);
  const cam = new Cam({ x: lerp(30, 42, k), y: lerp(150, 146, k), z: lerp(-230, -205, k), f: 1180, hy: lerp(420, 430, k) });
  drawBackSet(ctx, { ...room(t), chairTilt: back * 0.2, human: { P, D, dz: -back * 3, lights: lightsBack(t) } }, cam);
}, { fadeIn: 0.8 });

// ================================================================== SIDE (sunrise): heavy eyelids … asleep on his arms
const SL = T.sleep; // performance time 0
export function perfSleep(tt) {
  const t = tt - SL;
  const P = evalTracks({
    'face.lid': [[0, 0.5], [1.0, 0.72], [1.45, 0.96, 'in'], [1.58, 0.15, 'out'], [2.3, 0.5], [3.6, 0.82], [4.1, 1]],
    'head.nod': [[0, 0.08], [1.0, 0.2], [1.45, 0.62, 'in'], [1.6, -0.06, 'outBack'], [2.2, 0.08], [3.6, 0.3], [4.3, 0.4], [5.9, 0.62, 'inOut'], [10, 0.62]],
    bend: [[0, -0.18], [3.8, -0.1], [4.8, 0.32, 'inOut'], [5.9, 0.76, 'inOut'], [6.15, 0.79, 'out'], [8.2, 0.79], [8.45, 0.82], [8.8, 0.78, 'inOut'], [11, 0.78]],
    slump: [[0, 0.2], [5.9, 0.45]],
  }, t);
  P.face.eyes = t < 4.4 ? 'open' : 'closed';
  P.face.mouth = t < 6.5 ? 'line' : 'o';
  P.face.mouthK = 0.3;
  P.face.drool = K(t, [[12, 0], [16, 0.6]]);
  P.face.blush = 0.25;
  for (const [nm, dx, dy, lag] of [['armR', 0, 0, 0], ['armL', -2, -0.8, 0.12]]) {
    const u = t - lag;
    const hand = K(u, [[0, [15.5, -18.5 + dy]], [4.2, [16, -19 + dy]], [4.9, [27 + dx, -29.4 + dy], 'inOut'], [5.9, [40 + dx, -29.6 + dy], 'inOut'], [11, [40 + dx, -29.6 + dy]]]);
    const ek = K(u, [[4.4, 0], [5.6, 1, 'inOut']]);
    P[nm] = { hand, bend: -1, elbowTo: [20.5 + dx * 0.4, -28.4 + dy], elbowK: ek, hp: u < 4.3 ? { view: 'side', curl: 0.3, rot: 0.8 } : { view: 'back', curl: 0.35, rot: 0 } };
  }
  const deep = t > 6.2;
  const Q = idle(P, tt, { seed: 23, rate: deep ? 0.17 : 0.22, amp: deep ? 1.6 : 1, noBlink: t > 3.8 });
  // resting on his forearms (their top ≈ 4.5 cm above the desk)
  return t > 4.9 ? sideHeadContact(Q, D, -32.6) : Q;
}
const proxySleep = (p) => (p.bend || 0) * 45 + (p.head?.nod || 0) * 14;
const sleep = shot(T.sleep, T.goodnight, 'side-sleep', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfSleep, tc, proxySleep, 0.05);
  const k = kk(t, T.sleep, T.goodnight);
  drawSideSet(ctx, { ...room(t), human: { P, D, lights: lightsSide(t) } }, { x: lerp(20, 27, k), y: lerp(-46, -40, k), zoom: lerp(7.4, 8.8, k) });
}, { dissolve: 0.6 });

// ================================================================== SCREEN: home again; "辛苦了，晚安 :)"; asleep against the cursor
const goodnight = shot(T.goodnight, T.final, 'scr-goodnight', (ctx, t) => {
  const k = kk(t, 270.0, 273.5);
  const cam = { x: lerp(1400, 1440, kk(t, 262, 266)) + k * 10, y: lerp(870, 900, kk(t, 262, 266)) + k * 20, zoom: lerp(2.2, 2.4, kk(t, 262, 270)) + k * 0.8 };
  drawMonitorShot(ctx, t, cam);
  // morning light on the glass
  const s = clamp((t - 262) / 12);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const gr = ctx.createLinearGradient(1920, 0, 900, 1080);
  gr.addColorStop(0, `rgba(255,200,140,${0.18 * s})`); gr.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 1920, 1080);
  ctx.restore();
}, { dissolve: 0.6 });

// ================================================================== SIDE WIDE: the room in the morning
const finalWide = shot(T.final, T.end, 'side-final', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfSleep, tc, proxySleep, 0.05);
  const k = kk(t, T.final, T.end);
  drawSideSet(ctx, { ...room(t), human: { P, D, lights: lightsSide(t) } }, { x: lerp(30, 34, k), y: lerp(-52, -62, k), zoom: lerp(6.0, 4.7, k) });
}, { dissolve: 0.8, fadeOut: 1.4 });

export const S6 = [sunrise, sleep, goodnight, finalWide];
