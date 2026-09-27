// KEYS set: a close-up of the keyboard from above and behind his hands (real perspective).
// Keys have legends; hands are drawn as one silhouette each, mapped onto the keyboard plane and projected,
// with touch-typing finger assignment so the key that goes down is the character that appears on screen.
import { C, curScale, text, MONO_FONT, HAND_FONT } from '../draw.js';
import { Fig, tube, lerpP } from '../figure.js';
import { Cam, projPoly } from '../world.js';
import { drawHand } from '../human/hand.js';
import { inkFor } from '../human/body.js';
import { LightMap, addGlow } from '../light.js';
import { ambient, rgbs } from './tod.js';
import { clamp, lerp, hash2 } from '../core.js';

export const U = 1.9;           // key pitch (cm)
export const KBY = 75.6;        // keyboard base height (desk 74)
const TOPY = KBY + 1.6;         // key tops
const ROWDEF = [
  { z: 7.4, keys: [['ctrl', 1.5], ['fn', 1], ['alt', 1.25], ['⌘', 1.25], [' ', 6.25], ['⌘', 1.25], ['alt', 1.25], ['←', 1], ['→', 1]] },
  { z: 9.3, keys: [['shift', 2.25], 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', ['shift', 2.75]] },
  { z: 11.2, keys: [['caps', 1.75], 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", ['enter', 2.25]] },
  { z: 13.1, keys: [['tab', 1.5], 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', ['\\', 1.5]] },
  { z: 15.0, keys: [['`', 1], '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', ['⌫', 2]] },
];
export const KEYS = {};
export const KB_W = 15 * U;
const X0 = -KB_W / 2;
for (const row of ROWDEF) {
  let x = X0;
  for (const k of row.keys) {
    const [name, w] = Array.isArray(k) ? k : [k, 1];
    const cx = x + (w * U) / 2;
    const id = KEYS[name] ? name + '2' : name;
    KEYS[id] = { name, x: cx, z: row.z, w: w * U - 0.25, d: U - 0.25 };
    x += w * U;
  }
}
// shifted characters share keys
const SHIFTED = { '?': '/', '>': '.', '<': ',', ':': ';', '"': "'", '{': '[', '}': ']', '(': '9', ')': '0', '_': '-', '+': '=', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '~': '`' };
export function keyFor(ch) {
  if (ch === '\n') return 'enter';
  if (ch === '\b') return '⌫';
  if (ch === ' ') return ' ';
  const c = SHIFTED[ch] || ch.toLowerCase();
  return KEYS[c] ? c : null;
}
// finger per key: [hand (-1 left, +1 right), finger 0 index .. 3 pinky, thumb = 4]
const FINGER = {};
const set = (keys, hand, f) => keys.forEach((k) => (FINGER[k] = [hand, f]));
set(['`', '1', 'q', 'a', 'z', 'tab', 'caps', 'shift', 'ctrl'], -1, 3);
set(['2', 'w', 's', 'x', 'fn'], -1, 2);
set(['3', 'e', 'd', 'c', 'alt'], -1, 1);
set(['4', '5', 'r', 't', 'f', 'g', 'v', 'b'], -1, 0);
set([' '], 1, 4);
set(['6', '7', 'y', 'u', 'h', 'j', 'n', 'm'], 1, 0);
set(['8', 'i', 'k', ','], 1, 1);
set(['9', 'o', 'l', '.'], 1, 2);
set(['0', '-', '=', 'p', '[', ']', '\\', ';', "'", '/', 'enter', '⌫', 'shift2', 'alt2', '⌘2', '←', '→'], 1, 3);
export function fingerFor(k) { return FINGER[k] || [1, 0]; }

// home: wrist positions (world x, z) and the finger tips' rest positions
export const HOME = { [-1]: { x: -6.9, z: 1.4, a: 0.14 }, [1]: { x: 4.3, z: 1.4, a: -0.14 } };

// Map hand-local (fingers along +x, thumb on -y) to world for hand `h` at wrist (wx, wz), yaw a, lift
export function handToWorld(h, wx, wz, a, lift = 0, press = null) {
  const c = Math.cos(a), s = Math.sin(a);
  return ([hx, hy]) => {
    const rx = hx * c - hy * s, ry = hx * s + hy * c;
    const X = wx + (h < 0 ? -ry : ry);
    const Z = wz + rx;
    const Y = TOPY + 0.4 + lift + clamp((9 - hx) / 9) * 3.2;
    return [X, Y, Z];
  };
}

// S: { t, keysDown: {keyId: 0..1}, hands: { [-1]: {x, z, a, lift, press:[..], curl}, [1]: {...} }, D, lights }
export function drawKeysSet(ctx, S, cam) {
  const P = (x, y, z) => cam.project(x, y, z);
  const ups = P(0, TOPY, 11).s;
  // desk
  ctx.fillStyle = '#c9a57b'; ctx.fillRect(0, 0, 1920, 1080);
  ctx.strokeStyle = 'rgba(120,80,50,0.25)'; ctx.lineWidth = 3;
  for (let z = -10; z < 60; z += 7) { const a = P(-80, 74, z), b = P(80, 74, z + 3); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  // keyboard case
  const fig = new Fig(ctx, { lw: inkFor(ups) * 0.8, seed: 901 });
  const kx0 = X0 - 0.9, kx1 = -X0 + 0.9, kz0 = 6.2, kz1 = 16.2;
  const q = (pts) => projPoly(cam, pts);
  fig.add('front', q([[kx0, 74, kz0], [kx1, 74, kz0], [kx1, KBY, kz0], [kx0, KBY, kz0]]), { fill: '#d9d1c3', z: 0, sharp: true });
  fig.add('top', q([[kx0, KBY, kz0], [kx1, KBY, kz0], [kx1, KBY + 0.3, kz1], [kx0, KBY + 0.3, kz1]]), { fill: '#e9e2d6', z: 0.1, sharp: true, edge: true });
  // keys: real keycaps (sloped front / side faces + top), painted back-to-front from the camera
  const down = S.keysDown || {};
  fig.add('plate', q([[kx0 + 0.6, KBY + 0.32, kz0 + 0.5], [kx1 - 0.6, KBY + 0.32, kz0 + 0.5], [kx1 - 0.6, KBY + 0.32, kz1 - 0.5], [kx0 + 0.6, KBY + 0.32, kz1 - 0.5]]), { fill: '#8f877c', z: 0.15, sharp: true, noOutline: true });
  fig.after((c) => {
    const ids = Object.keys(KEYS).sort((a, b) => (KEYS[b].z - KEYS[a].z) || (Math.abs(KEYS[b].x - cam.x) - Math.abs(KEYS[a].x - cam.x)));
    const face = (pts, fill) => {
      const pp = q(pts);
      c.beginPath(); pp.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
      c.fillStyle = fill; c.fill();
      c.strokeStyle = 'rgba(43,38,34,0.75)'; c.lineWidth = Math.max(1, ups * 0.045); c.lineJoin = 'round'; c.stroke();
    };
    for (const id of ids) {
      const k = KEYS[id];
      const dn = clamp(down[id] || 0);
      const yT = TOPY - dn * 0.5, yB = KBY + 0.3;
      const x0 = k.x - k.w / 2, x1 = k.x + k.w / 2, z0 = k.z - k.d / 2, z1 = k.z + k.d / 2;
      const i = 0.22; // the cap narrows toward its top
      const t0 = [x0 + i, yT, z0 + i * 1.3], t1 = [x1 - i, yT, z0 + i * 1.3], t2 = [x1 - i, yT, z1 - i * 0.6], t3 = [x0 + i, yT, z1 - i * 0.6];
      if (cam.x < x0) face([[x0, yB, z1], [x0, yB, z0], t0, t3], dn > 0.05 ? '#d9d1c3' : '#e4dccf');
      if (cam.x > x1) face([[x1, yB, z0], [x1, yB, z1], t2, t1], dn > 0.05 ? '#d9d1c3' : '#e4dccf');
      face([[x0, yB, z0], [x1, yB, z0], t1, t0], dn > 0.05 ? '#c9c0b1' : '#d6cdbe');
      face([t0, t1, t2, t3], dn > 0.05 ? '#ece5d8' : '#faf6ef');
      const cp = P(k.x - k.w * 0.2, yT, k.z + 0.1);
      const lab = k.name.length > 1 ? k.name : k.name.toUpperCase();
      if (lab.trim()) text(c, lab, cp.x, cp.y, { size: Math.max(8, cp.s * (lab.length > 1 ? 0.4 : 0.6)), font: MONO_FONT, color: '#5b534b', still: true });
    }
  }, 0.2);
  fig.draw();
  // hands (left then right), each with its sleeve coming from the camera side
  for (const h of [-1, 1]) {
    const H = S.hands?.[h] || {};
    const home = HOME[h];
    const wx = H.x ?? home.x, wz = H.z ?? home.z, a = H.a ?? home.a;
    const hsc = S.handScale ?? 1;
    const toW0 = handToWorld(h, wx, wz, a, H.lift || 0);
    const toW = ([x, y]) => toW0([x * hsc, y * hsc]);
    const proj = (pts) => pts.map((p) => { const w = toW(p); const pp = P(w[0], w[1], w[2]); return [pp.x, pp.y]; });
    const hf = new Fig(ctx, { lw: inkFor(ups * 0.8), seed: 910 + h });
    // sleeve: forearm lies along the wrist direction toward the camera
    const back = [[-14, 0], [-7, 0.2], [-1.2, 0]];
    const sl = tube(back, [[0, 5.6], [0.7, 5.0], [1, 4.6]], { capStart: 'flat', capEnd: 'round', capEndK: 0.3, step: 1.2 });
    hf.add('sleeve', proj(sl.outline), { fill: S.D.hoodie, z: 1, edge: true, per: 2 });
    const cuff = tube([[-2.8, 0], [-0.3, 0]], [[0, 4.9], [1, 4.6]], { capStart: 'round', capStartK: 0.25, capEnd: 'round', capEndK: 0.35, step: 0.6 });
    hf.add('cuff', proj(cuff.outline), { fill: S.D.hoodieShade, z: 1.5, edge: true, per: 2 });
    drawHand(hf, proj, S.D, { view: 'back', curl: H.curl ?? 0.4, spread: H.spread ?? 0.25, thumb: H.thumb ?? 0.2, press: H.press || [0, 0, 0, 0] }, 0, 'h');
    hf.shade((c) => {
      const a0 = proj([[-2, 0]])[0], a1 = proj([[9, 0]])[0];
      const g = c.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
      g.addColorStop(0, 'rgba(120,70,60,0.28)'); g.addColorStop(0.5, 'rgba(120,70,60,0.08)'); g.addColorStop(1, 'rgba(120,70,60,0)');
      c.fillStyle = g; c.fillRect(0, 0, 1920, 1080);
    }, (hf.parts || []).filter((p) => p.name.startsWith('h')).map((p) => p.name), 0.5);
    if (S.lights) S.lights.forEach((L) => hf.edgeLight(L));
    hf.draw();
  }
  // light
  const tod = S.tod ?? 0;
  const amb = ambient(tod).map((v, i) => Math.min(255, v + [40, 34, 22][i]));
  const L = new LightMap(ctx, `rgb(${amb.join(',')})`);
  const sRGB = S.screenRGB || '170,190,255';
  const sp = P(0, 90, 40);
  L.point(sp.x, sp.y + 200, 1500, sRGB, 0.85 * (S.screen ?? 1), 1.3, 0.9);
  const lp = P(30, 74, 20);
  L.point(lp.x + 300, lp.y, 1400, '255,214,160', 0.75 * (S.lamp ?? 1), 1.2, 1);
  L.point(960, 700, 900, '255,225,200', 0.25 * (S.lamp ?? 1), 1.4, 1);
  L.apply();
}

// ------------------------------------------------------------------ typing performance
// events: [[t, char], ...]. Returns { keysDown, hands } at time t: fingers press, hands drift toward keys.
export function typingState(events, t, o = {}) {
  const keysDown = {};
  const hands = { [-1]: { ...HOME[-1], press: [0, 0, 0, 0], curl: 0.4 }, [1]: { ...HOME[1], press: [0, 0, 0, 0], curl: 0.4 } };
  const DOWN = 0.045, UP = 0.09;
  // hand offsets: weighted average of recent / upcoming keys for that hand
  for (const h of [-1, 1]) {
    let wx = 0, wz = 0, wsum = 0;
    for (const [te, ch] of events) {
      const id = keyFor(ch); if (!id) continue;
      const [hh, f] = fingerFor(id); if (hh !== h || f === 4) continue;
      const dt = t - te;
      // anticipation: hand starts moving 0.12s before the stroke, relaxes back over 0.35s after
      const w = dt < -0.14 ? 0 : dt < 0 ? 1 + dt / 0.14 : Math.max(0, 1 - dt / 0.35);
      if (w <= 0) continue;
      const k = KEYS[id];
      const tip = fingerRestTip(h, f);
      wx += (k.x - tip.x) * w; wz += (k.z - tip.z) * w; wsum += w;
    }
    if (wsum > 0) { const k = Math.min(1, wsum); hands[h].x += (wx / wsum) * 0.8 * k; hands[h].z += (wz / wsum) * 0.8 * k; }
  }
  for (const [te, ch] of events) {
    const id = keyFor(ch); if (!id) continue;
    const dt = t - te;
    if (dt < -0.06 || dt > DOWN + UP + 0.05) continue;
    const dn = dt < 0 ? 0 : dt < DOWN ? dt / DOWN : dt < DOWN + UP ? 1 - (dt - DOWN) / UP : 0;
    keysDown[id] = Math.max(keysDown[id] || 0, dn);
    const [h, f] = fingerFor(id);
    const hk = ch === '\n' ? 1.4 : 1;
    if (f < 4) hands[h].press[f] = Math.max(hands[h].press[f], (dt < 0 ? (dt + 0.06) / 0.06 * 0.3 : dn) * hk);
    hands[h].lift = (hands[h].lift || 0) - dn * 0.25 * hk;
    if (id.startsWith('shift') || SHIFTED[ch]) { keysDown.shift = Math.max(keysDown.shift || 0, dn); hands[-1].press[3] = Math.max(hands[-1].press[3], dn * 0.8); }
  }
  // hover / hesitation: raise the hands between bursts
  if (o.lift) for (const h of [-1, 1]) hands[h].lift = (hands[h].lift || 0) + o.lift(t, h);
  return { keysDown, hands };
}
function fingerRestTip(h, f) {
  const home = HOME[h];
  const bases = [-2.5, -0.84, 0.84, 2.45], lens = [4.7, 5.3, 5.0, 4.0];
  const L = lens[f] * (1 - 0.62 * 0.4);
  const lx = 6.1 + L, ly = bases[f];
  const c = Math.cos(home.a), s = Math.sin(home.a);
  const rx = lx * c - ly * s, ry = lx * s + ly * c;
  return { x: home.x + (h < 0 ? -ry : ry), z: home.z + rx };
}
