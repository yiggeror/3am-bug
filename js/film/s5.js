// Section 5 · all green.
// npm test, a hesitation over Enter … every test passes. He throws himself back in a silent cheer; inside
// the code, the little friend bounces on the green line and then puts the bug in a jar on the shelf, next to
// the other bugs of other nights.
import { T } from './times.js';
import { TYPE, screenLight } from './code.js';
import { D, K, idle, withSecondary, evalTracks, onTwos, room, lightsSide, follow } from './perfkit.js';
import { shot } from './s1.js';
import { keysShot } from './s3.js';
import { drawCW, camPath } from './cwshot.js';
import { drawMonitorShot } from './screen_content.js';
import { LINES, charCX } from '../codeworld.js';
import { drawSideSet } from '../sets/side.js';
import { typingState } from '../sets/keys.js';
import { ease, clamp, lerp } from '../core.js';

const g = (i) => LINES[i].ground;
const kk = (t, a, b, e = 'inOut') => ease[e](clamp((t - a) / (b - a)));

// ================================================================== KEYS: npm test … the finger hovers … Enter
const EV = [];
{ let t = TYPE.finalType; for (const ch of 'npm test') { EV.push([t, ch]); t += 0.1; } EV.push([TYPE.finalEnter, '\n']); }
const keysEnter = keysShot('keys-enter', T.enter, T.green, (tc) => {
  const lift = (tt, h) => K(tt, [[218.0, 0.4], [218.1, 0.1], [218.9, 0.1], [219.3, h > 0 ? 1.6 : 0.5, 'out'], [220.2, h > 0 ? 1.7 : 0.5], [220.55, h > 0 ? 2.6 : 0.6, 'out'], [TYPE.finalEnter, h > 0 ? -0.35 : 0.5, 'in'], [221.0, 0.2]]);
  const st = typingState(EV, tc, { lift });
  // the right hand drifts over to Enter and hangs there, a finger trembling
  const H = st.hands[1];
  const over = K(tc, [[218.85, 0], [219.3, 1, 'inOut']]);
  H.x += 5.5 * over; H.z += 0.9 * over; H.a = (H.a ?? -0.14) - 0.12 * over;
  if (tc > 219.3 && tc < 220.6) H.press[3] = Math.max(H.press[3], 0.12 + Math.sin(tc * 38) * 0.08);
  return st;
}, { cam: { x0: 3, x1: 6, z0: -32, z1: -29 } });

// ================================================================== SCREEN: PASS
const pass = shot(T.green, T.cheer, 'scr-pass', (ctx, t) => {
  const cam = camPath(t, [[T.green, 1500, 470, 1.45], [224.8, 1480, 520, 1.5], [226.8, 1020, 540, 1.02, 'inOut'], [T.cheer, 990, 540, 1.0]]);
  drawMonitorShot(ctx, t, cam);
  // the green light spills out of the screen
  const k = clamp((t - T.green - 0.8) / 1.5);
  if (k > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(60,160,80,${0.07 * k})`; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }
}, { dissolve: 0 });

// ================================================================== SIDE (dawn): the silent cheer
const CH = 227.0; // performance time 0
export function perfCheer(tt) {
  const t = tt - CH;
  const P = evalTracks({
    bend: [[0, 0.04], [1.45, 0.06], [1.85, 0.16, 'inOut'], [2.28, -0.4, 'outBack'], [4.3, -0.34], [5.4, -0.2, 'inOut'], [8, -0.2]],
    sy: [[1.45, 1], [1.85, 0.965], [2.28, 1.065, 'out'], [2.8, 1.02], [5.4, 1]],
    shrug: [[1.3, 0], [1.85, 0.45], [2.28, 0.15], [4.3, 0.1], [5.3, -0.1], [6, 0]],
    breath: [[1.3, 0], [1.85, 1.2], [2.4, 0.6], [4.4, 0.5], [5.4, -1.1], [6.2, -0.5]],
    'head.nod': [[0, 0.08], [1.85, 0.2], [2.28, -0.6, 'outBack'], [4.3, -0.55], [5.4, -0.12, 'inOut'], [8, -0.1]],
    'face.lid': [[0, 0.1], [0.6, 0.0]],
    'face.brow': [[0, 0.1], [1.0, 0.45], [1.85, -0.3], [2.3, 0.5]],
  }, t);
  P.face.eyes = t < 1.8 ? 'wide' : t < 2.22 ? 'squeeze' : 'happy';
  P.face.mouth = t < 0.9 ? 'o' : t < 1.8 ? 'smile' : t < 2.22 ? 'grit' : t < 4.5 ? 'open' : 'smile';
  P.face.mouthK = t < 0.9 ? 0.5 : t < 4.5 ? K(t, [[2.22, 0.6], [2.5, 1.35, 'out'], [4.4, 1.2]]) : 1;
  P.face.blush = K(t, [[2.2, 0], [2.8, 0.7]]);
  const jig = t > 2.5 && t < 4.3 ? Math.sin((t - 2.5) * 22) * 0.6 : 0;
  for (const [nm, dx, lag, far] of [['armR', 0, 0, 0], ['armL', -8, 0.06, 1]]) {
    const u = t - lag;
    const hand = K(u, [[1.45, [35 + far * 3, -29.5 - far * 1.2]], [1.85, [21, -42 - far * 2], 'inOut'], [2.26, [12 + dx, -87 - far * 3], 'outBack'], [4.3, [11 + dx, -88 - far * 3]], [4.85, [29 + dx * 0.3, -60 - far * 2], 'inOut'], [5.35, [17, -21 - far], 'inOut'], [8, [16, -19 - far]]]);
    const up = u > 2.0 && u < 4.9;
    P[nm] = { hand: [hand[0] + jig, hand[1] + jig * 0.6], hp: u < 1.8 ? { view: 'side', curl: 0.8 } : u < 2.12 ? { view: 'fist', rot: -1.2 } : up ? { view: 'palm', spread: 0.95, thumb: 0.9, rot: 0.1 } : { view: 'side', curl: 0.3, rot: 0.8 } };
  }
  return idle(P, tt, { seed: 17, rate: 0.26 });
}
const cheer = shot(T.cheer, T.jar, 'side-cheer', (ctx, t) => {
  const tc = onTwos(t);
  const P = withSecondary(perfCheer, tc, (p) => (p.bend || 0) * 50 + (p.head?.nod || 0) * 14 - ((p.sy || 1) - 1) * 90, 0.05);
  // the backrest takes his weight and springs back
  const b = (tt) => Math.max(0, -perfCheer(onTwos(tt)).bend);
  const tilt = follow(b, t, 1.4, 0.35, 1.5) * 1.6 + 0.02;
  const lt = t - CH;
  const cam = { x: 18, y: lerp(-48, -52, ease.inOut(clamp((lt - 1.8) / 1.2))), zoom: lerp(7.6, 7.2, ease.inOut(clamp((lt - 1.8) / 1.2))) };
  drawSideSet(ctx, { ...room(t), chairTilt: tilt, human: { P, D, lights: lightsSide(t, [{ rgb: '180,245,190', a: 0.3, vs: [[3.5, -1]] }]) } }, cam);
}, { dissolve: 0 });

// ================================================================== CODE WORLD: into the jar, onto the shelf
const jar = [
  shot(T.jar, 239.6, 'cw-jar', (ctx, t) => drawCW(ctx, t, camPath(t, [[T.jar, charCX(7), g(25) - 190, 1.2], [236.4, charCX(7) + 30, g(25) - 110, 1.45, 'inOut'], [239.6, charCX(8) + 90, g(25) - 100, 1.5]])), { dissolve: 0.3 }),
  // pushed along the shelf, next to the others
  shot(239.6, T.sunrise, 'cw-shelf', (ctx, t) => drawCW(ctx, t, camPath(t, [[239.6, charCX(8) + 200, g(25) - 110, 1.2], [242.4, charCX(8) + 420, g(25) - 110, 0.95, 'inOut'], [T.sunrise, charCX(8) + 460, g(25) - 120, 0.88]])), { dissolve: 0, fadeOut: 0.6 }),
];

export const S5 = [keysEnter, pass, cheer, ...jar];
