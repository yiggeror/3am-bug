// The programmer's head in three views (front, back, side). Everything is added to a Fig so the face,
// ears and hair mass share one continuous outline; features are drawn as brush lines on top.
// Head-local units are centimetres (before headScale); origin = middle of the face; +y down.
import { apAll, ap, scaleOf } from '../mat.js';
import { tube, tufts, rotP } from '../figure.js';
import { ellipsePts, rectPts } from '../draw.js';
import { clamp, lerp, TAU } from '../core.js';

const MOUTH_DARK = '#7a2e22';
const TONGUE = '#e4776a';

export const FACE_DEFAULT = {
  eyes: 'open', lid: 0, lidL: null, lidR: null, look: [0, 0], brow: 0, browY: 0, browL: 0, browR: 0,
  mouth: 'line', mouthK: 1, mouthX: 0, blush: 0, bags: 0, sweat: 0, drool: 0, glare: null, glareA: 0, squint: 0,
};

const FACES = {
  oval: [[0, -12.2], [5.2, -11.6], [8.5, -8.6], [9.5, -3.6], [9.4, 1.6], [8.6, 5.8], [6.6, 9.3], [3.5, 11.7], [0, 12.4], [-3.5, 11.7], [-6.6, 9.3], [-8.6, 5.8], [-9.4, 1.6], [-9.5, -3.6], [-8.5, -8.6], [-5.2, -11.6]],
  squircle: [[0, -11.2], [6.5, -11], [9.4, -9.4], [10.3, -5.5], [10.4, 1], [10, 6.5], [8.6, 9.6], [5.5, 11.1], [0, 11.5], [-5.5, 11.1], [-8.6, 9.6], [-10, 6.5], [-10.4, 1], [-10.3, -5.5], [-9.4, -9.4], [-6.5, -11]],
};
const PROFILES = {
  oval: [[0.5, -12.6], [5, -11.8], [7.9, -9.2], [9.1, -5.6], [9.2, -3.3], [8.9, -1.6], [9.5, 0.6], [10.9, 2.5], [10.2, 3.5], [9.1, 3.9], [9.3, 5.4], [9.0, 6.5], [9.1, 7.6], [8.4, 9.4], [6.9, 10.9], [4.2, 11.5], [1.4, 10.6], [-0.6, 8.6], [-4.5, 8.8], [-8.2, 6.2], [-10.4, 1.4], [-10.6, -4.8], [-8.4, -9.8], [-4.4, -12.2]],
  squircle: [[0.5, -11.6], [6, -11.3], [9, -9.6], [10.1, -5.6], [10.2, -2.2], [10.0, -0.6], [10.7, 1.6], [11.4, 3], [10.4, 3.8], [9.9, 4.4], [10.1, 5.8], [9.9, 7.4], [9.2, 9.6], [7.4, 11.1], [4.2, 11.6], [1.4, 10.8], [-0.6, 8.6], [-4.5, 8.8], [-8.4, 6.6], [-10.6, 1.4], [-10.8, -4.8], [-9.2, -9.4], [-5, -11.4]],
};
const SKULL_BACK = [[0, -12.4], [6.2, -11.4], [9.4, -7.2], [10.1, -1], [9.2, 4.6], [6.4, 8.6], [3.4, 10], [-3.4, 10], [-6.4, 8.6], [-9.2, 4.6], [-10.1, -1], [-9.4, -7.2], [-6.2, -11.4]];

// spherical mapping for features on the face surface when the head turns (yaw)
const RF = 10.2;
function yawX(x, th) { return RF * Math.sin(Math.asin(clamp(x / RF, -0.999, 0.999)) + th); }
function yawDepth(x, th) { return Math.cos(Math.asin(clamp(x / RF, -0.999, 0.999)) + th); }

// line widths in local units → screen px with sensible limits
function W(ups, cm, lo = 1.6, hi = 12) { return clamp(cm * ups, lo, hi); }

// ============================================================== FRONT
// fig: Fig. M: head-local → figure matrix (already includes tilt & headScale). ups: screen px per head unit.
// H: { turn -1..1, nod -1..1 }, F: face, hair: { mess 0..1, sway, bob }, z0: base depth
export function headFront(fig, M, D, H, F0, hair, z0, ups) {
  const F = { ...FACE_DEFAULT, ...F0 };
  const X = (pts) => apAll(M, pts);
  const th = (H.turn || 0) * 0.62;
  const nod = H.nod || 0;
  const mess = hair?.mess || 0;
  const sway = hair?.sway || 0;
  const fy = nod * 2.2; // features move down when nodding
  const face = FACES[D.face] || FACES.oval;
  // --- face outline: lower face swings toward the turn, far cheek flattens a little
  const facePts = face.map(([x, y]) => {
    const low = clamp((y + 2) / 13);
    const sx = x * (1 - Math.abs(th) * 0.05) + Math.sin(th) * 1.7 * low;
    const ny = y > 0 ? y * (1 - nod * 0.06) : y;
    return [sx, ny];
  });
  // ears
  const earY = 1.6 + fy * 0.5;
  for (const i of [-1, 1]) {
    const ex = i * 9.6 * Math.cos(th) + Math.sin(th) * -1.2;
    const vis = i * th > 0 ? 1 - Math.min(1, i * th * 2.2) : 1;
    if (vis < 0.2) continue;
    fig.add('ear' + i, X(ellipsePts(ex, earY, 1.9 * vis + 0.2, 2.8, 16)), { fill: D.skin, z: z0 + 1 });
    fig.line(X([[ex + i * 0.2, earY - 1.5], [ex - i * 0.6, earY - 0.4], [ex + i * 0.1, earY + 1.2]]), { z: z0 + 1.1, lw: W(ups, 0.24), clip: ['ear' + i], color: D.skinShade, seed: 4 + i });
  }
  // back hair mass (behind face) + hats
  hairFrontBack(fig, X, D, th, mess, sway, z0, hair);
  fig.add('face', X(facePts), { fill: D.skin, z: z0 + 2 });
  // cheeks shading: soft cool side away from the lamp is handled by scene light; here a gentle jaw shade
  // --- features
  const eyeY = 0.6 + fy;
  const lk = F.look || [0, 0];
  const eyeSpread = D.eyes === 'rect' ? 3.9 : 3.75;
  const eyes = [];
  for (const i of [-1, 1]) {
    const bx = i * eyeSpread;
    const ex = yawX(bx, th) + lk[0] * 1.0;
    const depth = yawDepth(bx, th);
    const squash = clamp(0.55 + 0.45 * depth, 0.3, 1);
    eyes.push({ i, x: ex, y: eyeY + lk[1] * 0.7, sq: squash });
  }
  for (const e of eyes) drawEye(fig, X, D, F, e, z0 + 3, ups);
  // brows
  for (const e of eyes) {
    const b = F.brow + (e.i < 0 ? F.browL : F.browR);
    const by = -3.9 + fy - F.browY - (F.eyes === 'wide' ? 0.8 : 0);
    const inner = [e.x - e.i * 1.6 * e.sq, by + (b < 0 ? -b * 1.15 : -b * 1.05)];
    const outer = [e.x + e.i * 2.0 * e.sq, by + (b < 0 ? b * 0.35 : b * 0.45) + 0.25];
    const midp = [(inner[0] + outer[0]) / 2, (inner[1] + outer[1]) / 2 - 0.35];
    if (D.hairStyle === 'fringe' && by < -5.2) continue; // hidden under the fringe
    fig.line(X([inner, midp, outer]), { z: z0 + 3.2, lw: W(ups, 0.62, 2.4, 13), brush: 'soft', seed: 20 + e.i });
  }
  // nose
  const nx = yawX(0, th) + Math.sin(th) * 0.6, ny = 4.0 + fy;
  if (D.face === 'squircle') {
    fig.line(X([[nx - 0.35, ny], [nx + 0.35, ny + 0.1]]), { z: z0 + 3, lw: W(ups, 0.3), seed: 31 });
  } else {
    const sd = th >= 0 ? 1 : -1;
    fig.line(X([[nx - sd * 0.1, ny - 1.3], [nx + sd * 0.55, ny + 0.2], [nx - sd * 0.35, ny + 0.75]]), { z: z0 + 3, lw: W(ups, 0.3), seed: 31, color: D.skinShade === undefined ? null : '#9a5c48' });
  }
  // blush
  if (F.blush > 0.01) {
    for (const e of eyes) {
      const bx = yawX(e.i * 6.1, th);
      fig.line(X(ellipsePts(bx, 4.6 + fy, 1.7 * e.sq, 0.95, 14)), { z: z0 + 2.5, fill: D.blush, stroke: false, alpha: 0.7 * F.blush });
    }
  }
  // tired eye bags
  if (F.bags > 0.01) {
    for (const e of eyes) {
      fig.line(X([[e.x - 1.35 * e.sq, e.y + 2.5], [e.x, e.y + 3.15], [e.x + 1.35 * e.sq, e.y + 2.5]]), { z: z0 + 3.1, lw: W(ups, 0.22), color: '#a0705e', alpha: F.bags * 0.9, seed: 40 + e.i });
    }
  }
  // mouth
  const mx = yawX(F.mouthX || 0, th) + Math.sin(th) * 0.4, my = 7.3 + fy * 0.9;
  drawMouth(fig, X, D, F, mx, my, z0 + 3, ups, clamp(0.6 + 0.4 * Math.cos(th)));
  // front hair (fringe) over the forehead
  hairFrontFringe(fig, X, D, th, mess, sway, z0, fy, hair);
  // glasses
  if (D.glasses) glassesFront(fig, X, D, F, eyes, th, z0 + 6, ups);
  // sweat drop
  if (F.sweat > 0.01) {
    const sx = yawX(8.2, th), sy = -5.5 + fy + (1 - F.sweat) * -1;
    fig.line(X([[sx, sy - 2.2], [sx + 1.1, sy], [sx, sy + 0.9], [sx - 1.1, sy]]), { z: z0 + 7, fill: '#cfe8f5', lw: W(ups, 0.2), alpha: clamp(F.sweat * 1.5) });
  }
}

function drawEye(fig, X, D, F, e, z, ups) {
  const type = F.eyes;
  const lid = clamp(F.lid + (e.i < 0 ? (F.lidL ?? 0) : (F.lidR ?? 0)));
  const lwE = W(ups, 0.42, 2, 10);
  const ex = e.x, ey = e.y, sq = e.sq;
  if (type === 'happy') {
    fig.line(X([[ex - 1.8 * sq, ey + 0.9], [ex, ey - 1.1], [ex + 1.8 * sq, ey + 0.9]]), { z, lw: lwE * 1.1, brush: 'soft', seed: 50 + e.i });
    return;
  }
  if (type === 'closed') {
    fig.line(X([[ex - 1.9 * sq, ey + 0.1], [ex - 0.2, ey + 1.1], [ex + 1.9 * sq, ey + 0.1]]), { z, lw: lwE, brush: 'soft', seed: 50 + e.i });
    return;
  }
  if (type === 'squeeze') {
    const d = e.i;
    fig.line(X([[ex - d * 1.7, ey - 1.3], [ex + d * 1.1, ey], [ex - d * 1.7, ey + 1.3]]), { z, lw: lwE * 1.05, brush: 'soft', seed: 50 + e.i, smooth: false });
    return;
  }
  if (type === 'dot') {
    fig.line(X(ellipsePts(ex, ey, 0.55, 0.6, 10)), { z, fill: '#221c19', stroke: false });
    return;
  }
  let rx = 1.25, ry = 1.95;
  if (D.eyes === 'dot') { rx = 1.02; ry = 1.45; }
  const rect = D.eyes === 'rect';
  if (rect) { rx = 1.15; ry = 2.0; }
  if (type === 'wide') { rx *= 1.18; ry *= 1.16; }
  if (F.squint) ry *= 1 - F.squint * 0.45;
  rx *= sq;
  const top = ey - ry;
  const lidY = top + 2 * ry * lid;
  if (lid > 0.9) {
    fig.line(X([[ex - rx * 1.5, lidY - 0.1], [ex, lidY + 0.35], [ex + rx * 1.5, lidY - 0.1]]), { z, lw: lwE, brush: 'soft', seed: 55 + e.i });
    return;
  }
  let pts = rect ? rectPts(ex - rx, ey - ry, rx * 2, ry * 2, rx * 0.8, 0.5) : ellipsePts(ex, ey, rx, ry, 22);
  if (lid > 0.02) pts = pts.map(([x, y]) => [x, Math.max(y, lidY + (Math.abs(x - ex) / rx) * 0.15)]);
  fig.line(X(pts), { z, fill: '#221c19', lw: W(ups, 0.14, 1, 4), ampMul: 0.4 });
  // highlight
  if (lid < 0.55) {
    const hr = rect ? 0.42 : 0.45;
    fig.line(X(ellipsePts(ex - rx * 0.32, Math.max(ey - ry * 0.45, lidY + hr + 0.1), hr * (type === 'wide' ? 1.3 : 1), hr * (type === 'wide' ? 1.3 : 1), 10)), { z: z + 0.05, fill: '#fffaf0', stroke: false });
  }
  if (lid > 0.02) {
    // eyelid line — a little wider than the eye, heavier toward the outer corner
    fig.line(X([[ex - e.i * rx * 1.25, lidY + 0.25], [ex, lidY - 0.05], [ex + e.i * rx * 1.45, lidY + 0.35]]), { z: z + 0.1, lw: lwE, brush: e.i < 0 ? 'in' : 'out', seed: 57 + e.i });
  }
}

function drawMouth(fig, X, D, F, mx, my, z, ups, wk) {
  const k = F.mouthK ?? 1;
  const lw = W(ups, 0.36, 1.8, 9);
  const w = wk;
  const L = (pts, o = {}) => fig.line(X(pts.map(([x, y]) => [mx + x * w, my + y])), { z, lw, brush: 'soft', seed: 60, ...o });
  switch (F.mouth) {
    case 'none': break;
    case 'line': L([[-1.2, 0], [1.2, 0.05]]); break;
    case 'flat': L([[-0.8, 0], [0.8, 0]]); break;
    case 'smile': L([[-1.8, -0.45], [-0.9, 0.45 * k + 0.05], [0.9, 0.45 * k + 0.05], [1.8, -0.45]]); break;
    case 'smirk': L([[-1.4, 0.1], [0.4, 0.3], [1.6, -0.5]]); break;
    case 'frown': L([[-1.6, 0.55], [-0.8, -0.25], [0.8, -0.25], [1.6, 0.55]]); break;
    case 'wavy': L([[-2, 0], [-1, -0.45], [0, 0.2], [1, -0.45], [2, 0]]); break;
    case 'o': fig.line(X(ellipsePts(mx, my + 0.2, (0.55 * k + 0.35) * w, 0.75 * k + 0.45, 14)), { z, fill: MOUTH_DARK, lw: lw * 0.7 }); break;
    case 'sigh': fig.line(X(ellipsePts(mx + 0.6, my + 0.2, 0.55 * w, 0.45 + 0.25 * k, 12)), { z, fill: MOUTH_DARK, lw: lw * 0.7 }); break;
    case 'open': case 'grin': {
      const h = (F.mouth === 'grin' ? 1.4 : 2.1) * k + 0.3;
      const pts = [[-2.1, -0.35], [-1, -0.2], [1, -0.2], [2.1, -0.35], [1.4, h * 0.65], [0, h], [-1.4, h * 0.65]].map(([x, y]) => [mx + x * w, my + y]);
      fig.line(X(pts), { z, fill: MOUTH_DARK, lw: lw * 0.75 });
      if (h > 1.2) fig.line(X([[mx - 1.1 * w, my + h * 0.72], [mx, my + h * 0.45], [mx + 1.1 * w, my + h * 0.72], [mx, my + h * 0.98]].map((p) => p)), { z: z + 0.05, fill: TONGUE, stroke: false });
      break;
    }
    case 'yawn': {
      const pts = ellipsePts(mx, my + 0.8 * k, 1.35 * w, 0.6 + 2.0 * k, 18);
      fig.line(X(pts), { z, fill: MOUTH_DARK, lw: lw * 0.75 });
      fig.line(X(ellipsePts(mx, my + 1.9 * k, 0.9 * w, 0.4 + 0.7 * k, 12)), { z: z + 0.05, fill: TONGUE, stroke: false });
      break;
    }
    case 'grit': {
      const pts = rectPts(mx - 2 * w, my - 0.6, 4 * w, 1.4, 0.6, 0.4);
      fig.line(X(pts), { z, fill: '#fffaf0', lw: lw * 0.8 });
      fig.line(X([[mx - 1.9 * w, my + 0.1], [mx + 1.9 * w, my + 0.1]]), { z: z + 0.05, lw: lw * 0.55, brush: false });
      break;
    }
    case 'pout': L([[-0.9, 0.2], [0, -0.3], [0.9, 0.2]]); break;
    case 'bite': // chewing the lip: uneasy
      L([[-1.6, 0], [1.6, 0]]);
      fig.line(X([[mx - 0.5 * w, my + 0.1], [mx - 0.2 * w, my + 0.55], [mx + 0.2 * w, my + 0.1]]), { z, fill: '#fffaf0', lw: lw * 0.6 });
      break;
    default: L([[-1.2, 0], [1.2, 0]]);
  }
  if (F.drool > 0.01) {
    const dx = mx + 1.4 * w, dy = my + 0.3;
    fig.line(X([[dx, dy], [dx + 0.45, dy + 1.8 * F.drool], [dx, dy + 2.4 * F.drool], [dx - 0.45, dy + 1.8 * F.drool]]), { z: z + 0.1, fill: '#d9eef7', lw: lw * 0.5 });
  }
}

function hairFrontBack(fig, X, D, th, mess, sway, z0, hair) {
  const sh = -Math.sin(th) * 2.0; // back of the head shows on the far side
  if (D.hairStyle === 'fluffy') {
    const outer = [[-10.6, 4.5], [-11.9, -1.5], [-12.3, -7.5], [-10.8, -12.8], [-7, -16.6], [-1.5, -18.3], [4.5, -17.6], [9.4, -14.6], [12.1, -9.2], [12.3, -3], [11, 3.5]];
    const tf = openTufts(outer.map(([x, y]) => [x + sh, y]), 0.8 + mess * 1.7, 3 + Math.floor(mess * 3), [0 + sh, -3]);
    fig.add('hairB', X([...tf, [8.5, 1], [0, -2], [-8.5, 1]]), { fill: D.hair, z: z0 });
    fig.line(X([[-6.8 + sh, -13.6], [-4 + sh, -15.8], [-0.6 + sh, -16.5]]), { z: z0 + 0.2, lw: 2.2, color: D.hairHi, clip: ['hairB'], seed: 71 });
    fig.line(X([[3.4 + sh, -16], [7.2 + sh, -13.8]]), { z: z0 + 0.2, lw: 2.2, color: D.hairHi, clip: ['hairB'], seed: 72 });
    // ahoge: one strand on the crown with follow-through
    const root = [1.5 + sh * 0.6, -17.2];
    const a = sway * 0.9 + mess * 0.25;
    const sp = [root, rotP([2.2, -20.8], a, ...root), rotP([4.4, -22.3], a * 1.3, ...root), rotP([6.2, -21.4], a * 1.6, ...root)];
    const t = tube(sp.map(([x, y]) => [x, y]), [[0, 0.95], [0.5, 0.6], [1, 0.12]], { capStart: 'flat' });
    fig.add('ahoge', X(t.outline), { fill: D.hair, z: z0 + 0.1, raw: false, per: 2 });
    // messy strands (grow over the night)
    if (mess > 0.15) {
      const strands = [[[-11.2 + sh, -10], [-13.6 + sh, -11.4], [-14.4 + sh, -13.4]], [[10.9 + sh, -11], [13.4 + sh, -12], [14.2 + sh, -10.2]], [[-6 + sh, -16.5], [-7.8 + sh, -19.4], [-6.6 + sh, -21]]];
      strands.forEach((s, i) => {
        const k = clamp((mess - 0.15 - i * 0.2) * 3);
        if (k <= 0) return;
        const pts = s.map((p, j) => (j === 0 ? p : [s[0][0] + (p[0] - s[0][0]) * k, s[0][1] + (p[1] - s[0][1]) * k]));
        const tb = tube(pts, [[0, 0.8], [1, 0.1]], { capStart: 'flat' });
        fig.add('strand' + i, X(tb.outline), { fill: D.hair, z: z0 + 0.05, per: 2 });
      });
    }
  } else if (D.hairStyle === 'fringe') {
    const outer = [[-10.9, 6], [-12.1, -1], [-12.1, -8], [-10.3, -13.6], [-5.8, -17.2], [0, -18.2], [5.8, -17.2], [10.3, -13.6], [12.1, -8], [12.1, -1], [10.9, 6]];
    const tf = openTufts(outer.map(([x, y]) => [x + sh, y]), 0.55 + mess * 1.6, 7 + Math.floor(mess * 3), [sh, -3]);
    fig.add('hairB', X([...tf, [8, 5], [0, -2], [-8, 5]]), { fill: D.hair, z: z0 });
    fig.line(X([[-5.5 + sh, -14.5], [-2 + sh, -16.4], [2 + sh, -16.4]]), { z: z0 + 0.2, lw: 2.4, color: D.hairHi, clip: ['hairB'], seed: 73 });
    if (mess > 0.2) {
      const k = clamp((mess - 0.2) * 2.5);
      const s = [[3 + sh, -17.6], [4.4 + sh, -17.6 - 3 * k], [6.4 + sh, -18 - 3.6 * k]];
      fig.add('strand0', X(tube(s, [[0, 0.8], [1, 0.1]], { capStart: 'flat' }).outline), { fill: D.hair, z: z0 + 0.05, per: 2 });
      const s2 = [[-10.8 + sh, -9], [-13 + sh * 1, -9.8 - 1.5 * k], [-13.8, -8]];
      if (mess > 0.5) fig.add('strand1', X(tube(s2, [[0, 0.7], [1, 0.1]], { capStart: 'flat' }).outline), { fill: D.hair, z: z0 + 0.05, per: 2 });
    }
  } else if (D.hairStyle === 'beanie') {
    // hair tufts poking out under the beanie at the sides
    for (const i of [-1, 1]) {
      const tp = [[i * 8.6, -5], [i * 11.2, -3], [i * (11.6 + mess * 0.8), 1.6], [i * 10.4, 4.2], [i * 10.2, 1.2], [i * 9.2, 3.4], [i * 8.8, -0.5]].map(([x, y]) => [x + sh * 0.5, y]);
      fig.add('tuft' + i, X(tp), { fill: D.hair, z: z0 });
    }
  }
}

function hairFrontFringe(fig, X, D, th, mess, sway, z0, fy, hair) {
  const fx = (x) => yawX(x, th * 0.85);
  const z = z0 + 5;
  if (D.hairStyle === 'fluffy') {
    const m = mess;
    const j = (i) => (Math.sin(i * 12.7) * 0.6) * m;
    const f = fy * 0.3;
    const pts = [
      [fx(-10.1), -0.6 + fy * 0.2], [fx(-9.7), -5.4], [fx(-8.6) + j(1), -3.2 + f + j(2)], [fx(-7.4), -7.6],
      [fx(-5.0) + j(3), -4.1 + f + j(4)], [fx(-3.6), -8.2], [fx(-0.6) + j(5), -4.6 + f + j(6)], [fx(0.8), -8.9],
      [fx(3.6) + j(7), -5.6 + f + j(8)], [fx(5.2), -9.4], [fx(8.0) + j(9), -5.2 + f], [fx(9.3), -7.2], [fx(10.2), -1.8 + fy * 0.2],
      [11.9 - Math.sin(th) * 1.2, -8.2], [9.8 - Math.sin(th) * 1.5, -14.2], [4 - Math.sin(th) * 1.8, -17.3], [-2.5 - Math.sin(th) * 1.8, -17.6], [-8.5 - Math.sin(th) * 1.5, -15.1], [-11.9 - Math.sin(th) * 1.2, -8.6],
    ];
    fig.add('fringe', X(pts), { fill: D.hair, z, edge: ['face', 'ear-1', 'ear1'], per: 5 });
    fig.line(X([[fx(-5), -13], [fx(-3.2), -10.2]]), { z: z + 0.1, lw: 2, color: D.hairHi, clip: ['fringe'], seed: 81 });
    fig.line(X([[fx(3.6), -13.6], [fx(4.8), -10.8]]), { z: z + 0.1, lw: 2, color: D.hairHi, clip: ['fringe'], seed: 82 });
  } else if (D.hairStyle === 'fringe') {
    const f = fy * 0.3;
    const S = Math.sin(th);
    const pts = [
      [fx(-10.2), -0.2 + fy * 0.2], [fx(-9.6), -4.6 + f], [fx(-7.9), -4.2 + f], [fx(-6.2), -5.3 + f], [fx(-3.7), -6.0 + f], [fx(-1.5), -7.5 + f], [fx(0.3), -10.2 + f * 0.5],
      [fx(1.7), -7.9 + f], [fx(3.9), -6.4 + f], [fx(6.4), -5.5 + f], [fx(8.2), -4.0 + f], [fx(9.6), -4.6 + f], [fx(10.3), -0.2 + fy * 0.2],
      [12.1 - S * 1.2, -8.2], [10 - S * 1.5, -14.2], [4 - S * 1.8, -17.4], [-2.5 - S * 1.8, -17.6], [-8.5 - S * 1.5, -15.2], [-12.1 - S * 1.2, -8.6],
    ];
    fig.add('fringe', X(pts), { fill: D.hair, z, edge: ['face', 'ear-1', 'ear1'], per: 4 });
    fig.line(X([[fx(0.2), -15.5], [fx(-2.6), -11.6], [fx(-6.4), -8.4]]), { z: z + 0.1, lw: 2, color: D.hairHi, clip: ['fringe'], seed: 83 });
    fig.line(X([[fx(0.9), -15.2], [fx(3.6), -11.4], [fx(7), -8.0]]), { z: z + 0.1, lw: 2, color: D.hairHi, clip: ['fringe'], seed: 84 });
  } else if (D.hairStyle === 'beanie') {
    // a few strands under the brim
    const pts = [[fx(-4.8), -7], [fx(-3.6), -3.8 + fy * 0.3], [fx(-2.2), -6.4], [fx(-0.8), -4.4 + fy * 0.3], [fx(0.6), -6.6], [fx(2.3), -5.0 + fy * 0.3], [fx(3.4), -7.2]];
    fig.add('fringe', X(pts), { fill: D.hair, z, edge: ['face'], per: 4 });
    beanie(fig, X, D, th, sway, z + 1, hair);
  }
}

function beanie(fig, X, D, th, sway, z, hair) {
  const s = Math.sin(th);
  const dome = [[-11.4, -6], [-11.5, -10.5], [-9.2, -15.8], [-4.6, -19.2], [0, -20], [4.6, -19.2], [9.2, -15.8], [11.5, -10.5], [11.4, -6]].map(([x, y]) => [x - s * (y < -12 ? 1.2 : 0.4), y]);
  fig.add('beanie', X(dome), { fill: D.beanie, z, edge: ['face', 'fringe', 'tuft-1', 'tuft1'] });
  // folded brim
  const brim = [[-12, -9.6], [-6, -10.4], [0, -10.6], [6, -10.4], [12, -9.6], [12.2, -5.8], [6, -4.6], [0, -4.3], [-6, -4.6], [-12.2, -5.8]];
  fig.add('brim', X(brim), { fill: D.beanieShade, z: z + 0.2, edge: true });
  for (let i = -5; i <= 5; i++) {
    const x = yawX(i * 1.95, th * 0.9);
    if (Math.abs(i * 1.95) > 10.6) continue;
    fig.line(X([[x, -9.6 + Math.abs(i) * 0.08], [x, -5.2 - Math.abs(i) * 0.04]]), { z: z + 0.3, lw: 1.6, color: '#b98a26', clip: ['brim'], seed: 90 + i });
  }
  // pompom with follow-through
  const bob = hair?.bob || 0;
  const pc = [s * -1.4 + sway * 3.2, -21.6 + bob * 1.2];
  const pp = tufts(ellipsePts(pc[0], pc[1], 3.1, 2.9, 10), 0.55, 5, pc[0], pc[1]);
  fig.add('pompom', X(pp), { fill: D.beanieLight, z: z - 0.1, per: 3 });
}

function glassesFront(fig, X, D, F, eyes, th, z, ups) {
  const r = 3.25;
  const lw = W(ups, 0.3, 1.8, 7);
  const tint = F.glare;
  for (const e of eyes) {
    const pts = ellipsePts(e.x, e.y - 0.1, r * e.sq, r * 0.96, 26);
    fig.line(X(pts), { z, fill: tint ? `rgba(${tint},${0.22 + 0.4 * (F.glareA || 0)})` : 'rgba(235,245,255,0.18)', lw, ampMul: 0.5 });
    // glare streaks
    const gx = e.x + r * 0.35 * e.sq, gy = e.y - r * 0.45;
    fig.line(X([[gx - 0.5, gy + 1.3], [gx + 0.7, gy - 0.1]]), { z: z + 0.05, lw: W(ups, 0.28), color: 'rgba(255,255,255,0.85)', brush: 'taper', seed: 95 + e.i });
    if (tint && F.glareA > 0.05) {
      // tiny reflected lines of the screen (red failing tests / green passing)
      for (let k = 0; k < 4; k++) {
        const yy = e.y - 1.4 + k * 0.8;
        fig.line(X([[e.x - 1.6 * e.sq, yy], [e.x + (0.2 + (k % 2) * 0.8) * e.sq, yy]]), { z: z + 0.04, lw: W(ups, 0.16, 1, 3), color: `rgba(${tint},${0.75 * F.glareA})`, brush: false, seed: 97 + k });
      }
    }
  }
  const [a, b] = eyes[0].x < eyes[1].x ? eyes : [eyes[1], eyes[0]];
  fig.line(X([[a.x + r * a.sq, a.y - 0.6], [(a.x + b.x) / 2, a.y - 1.3], [b.x - r * b.sq, b.y - 0.6]]), { z, lw, brush: 'soft', seed: 98 });
  // temple arms toward the ears
  for (const e of [a, b]) {
    const side = e === a ? -1 : 1;
    const ear = side * 9.4 * Math.cos(th);
    if (side * th > 0.35) continue;
    fig.line(X([[e.x + side * r * e.sq, e.y - 0.8], [ear, e.y - 0.4]]), { z: z - 0.5, lw: lw * 0.9, brush: 'flat', seed: 99 + side });
  }
}

function openTufts(pts, amp, seed, c) {
  // tufts along an open arc (first and last points kept)
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dx = m[0] - c[0], dy = m[1] - c[1], d = Math.hypot(dx, dy) || 1;
    const k = amp * (0.55 + 0.9 * (((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1));
    out.push([m[0] + (dx / d) * k, m[1] + (dy / d) * k]);
    out.push(b);
  }
  return out;
}

// ============================================================== BACK
export function headBack(fig, M, D, H, hair, z0, ups) {
  const X = (pts) => apAll(M, pts);
  const th = (H.turn || 0) * 0.62;
  const mess = hair?.mess || 0;
  const sway = hair?.sway || 0;
  const nod = H.nod || 0;
  // ears (the one on the turned side slides back)
  for (const i of [-1, 1]) {
    const ex = i * 9.9 * Math.cos(th) - Math.sin(th) * 1.0;
    fig.add('ear' + i, X(ellipsePts(ex, 1.4 - nod * 0.6, 1.8, 2.8, 16)), { fill: D.skin, z: z0 });
  }
  const skull = SKULL_BACK.map(([x, y]) => [x - Math.sin(th) * (y > 3 ? 0.8 : 0), y]);
  fig.add('skull', X(skull), { fill: D.skin, z: z0 + 0.5 });
  // cheek + nose tip peeking out when the head turns
  if (Math.abs(th) > 0.08) {
    const s = Math.sign(th), k = clamp((Math.abs(th) - 0.08) / 0.5);
    const cheek = [[s * 7.5, -3], [s * (9.8 + 1.3 * k), -1], [s * (10.1 + 1.8 * k), 1.6], [s * (10.8 + 2.4 * k), 3.3], [s * (9.9 + 1.6 * k), 4.3], [s * (9.2 + 1.2 * k), 7], [s * 7, 8.6], [s * 6.5, 0]];
    fig.add('cheek', X(cheek), { fill: D.skin, z: z0 + 0.4 });
  }
  if (D.hairStyle === 'beanie') {
    fig.add('hair', X([[-11, -5], [11, -5], [11.2, 0.5], [10.2, 4.6], [8.2, 7.4], [5.8, 7.2], [4.2, 9.4], [1.8, 7.8], [-0.4, 9.8], [-2.6, 7.8], [-4.8, 9.2], [-7.4, 7.2], [-9.8, 4.8], [-11.2, 0.5]]), { fill: D.hair, z: z0 + 1 });
    fig.line(X([[-4.5, -2], [-5.4, 3], [-4.8, 6.5]]), { z: z0 + 1.1, lw: 2, color: D.hairHi, clip: ['hair'], seed: 121 });
    fig.line(X([[4.8, -2], [5.6, 3], [5.0, 6.2]]), { z: z0 + 1.1, lw: 2, color: D.hairHi, clip: ['hair'], seed: 122 });
    const dome = [[-11.6, -3.8], [-11.8, -10.2], [-9.4, -15.8], [-4.6, -19.2], [0, -20], [4.6, -19.2], [9.4, -15.8], [11.8, -10.2], [11.6, -3.8]];
    fig.add('beanie', X(dome), { fill: D.beanie, z: z0 + 2 });
    fig.add('brim', X([[-12.3, -8.4], [0, -9.4], [12.3, -8.4], [12.4, -3.6], [0, -2.4], [-12.4, -3.6]]), { fill: D.beanieShade, z: z0 + 2.2, edge: true });
    for (let i = -5; i <= 5; i++) fig.line(X([[i * 2.05, -8.5 - (5 - Math.abs(i)) * 0.18], [i * 2.05, -3.6 + (5 - Math.abs(i)) * 0.2]]), { z: z0 + 2.3, lw: 1.6, color: '#b98a26', clip: ['brim'], seed: 110 + i });
    const pc = [sway * 3.2, -21.6 + (hair?.bob || 0) * 1.2];
    fig.add('pompom', X(tufts(ellipsePts(pc[0], pc[1], 3.1, 2.9, 10), 0.55, 5, pc[0], pc[1])), { fill: D.beanieLight, z: z0 + 1.9, per: 3 });
    return;
  }
  const fluffy = D.hairStyle === 'fluffy';
  const top = fluffy
    ? [[-10.9, 3.6], [-12.3, -2.6], [-12.4, -8.6], [-10.5, -13.8], [-6.4, -17.2], [-0.4, -18.5], [5.6, -17.5], [10.1, -14.1], [12.3, -8.6], [12.3, -2.6], [10.9, 3.6]]
    : [[-10.6, 3.2], [-12.1, -2.4], [-12.2, -8.6], [-10.3, -14], [-5.8, -17.3], [0, -18.3], [5.8, -17.3], [10.3, -14], [12.2, -8.6], [12.1, -2.4], [10.6, 3.2]];
  const outer = openTufts(top.map(([x, y]) => [x + Math.sin(th) * 0.8, y]), (fluffy ? 0.85 : 0.6) + mess * 1.7, 11, [0, -4]);
  const nape = fluffy
    ? [[8.6, 7.2], [6.3, 7.4], [4.6, 9.6], [2.1, 8], [0.1, 10.2], [-2, 8], [-4.5, 9.6], [-6.2, 7.3], [-8.6, 7.2]]
    : [[8.4, 6.2], [6.0, 6.8], [4.6, 8.8], [2.4, 7.2], [0.3, 9.2], [-1.9, 7.2], [-4.2, 8.8], [-6.0, 6.8], [-8.4, 6.2]];
  fig.add('hair', X([...outer, ...nape.map(([x, y]) => [x + Math.sin(th) * 0.6, y - nod * 1.2])]), { fill: D.hair, z: z0 + 1 });
  // crown whorl + flow lines
  const cw = [1 + Math.sin(th) * 0.8, -10.5 - nod * 1.5];
  fig.line(X([[cw[0] - 1.2, cw[1] + 0.4], [cw[0], cw[1] - 0.9], [cw[0] + 1.3, cw[1] + 0.2], [cw[0] + 0.4, cw[1] + 1.4], [cw[0] - 2.5, cw[1] + 2.6]]), { z: z0 + 1.1, lw: 2.2, color: D.hairHi, clip: ['hair'], seed: 120 });
  fig.line(X([[-5.5, -9], [-6.8, -3.5], [-6.2, 2]]), { z: z0 + 1.1, lw: 2, color: D.hairHi, clip: ['hair'], seed: 121 });
  fig.line(X([[5.8, -8.5], [6.9, -3], [6.4, 2.2]]), { z: z0 + 1.1, lw: 2, color: D.hairHi, clip: ['hair'], seed: 122 });
  if (fluffy) {
    const root = [1.5, -17.2];
    const a = sway * 0.9 + mess * 0.25;
    const sp = [root, rotP([2.2, -20.8], a, ...root), rotP([4.4, -22.3], a * 1.3, ...root), rotP([6.2, -21.4], a * 1.6, ...root)];
    fig.add('ahoge', X(tube(sp, [[0, 0.95], [0.5, 0.6], [1, 0.12]], { capStart: 'flat' }).outline), { fill: D.hair, z: z0 + 1.05, per: 2 });
  }
  if (mess > 0.15) {
    const strands = [[[-11, -9], [-13.6, -10.8], [-14.6, -13]], [[11, -10], [13.8, -11], [14.6, -9]], [[-5.5, -16.8], [-7.2, -19.8], [-5.8, -21.4]]];
    strands.forEach((s, i) => {
      const k = clamp((mess - 0.15 - i * 0.2) * 3);
      if (k <= 0) return;
      const pts = s.map((p, j) => (j === 0 ? p : [s[0][0] + (p[0] - s[0][0]) * k, s[0][1] + (p[1] - s[0][1]) * k]));
      fig.add('strand' + i, X(tube(pts, [[0, 0.8], [1, 0.1]], { capStart: 'flat' }).outline), { fill: D.hair, z: z0 + 1.02, per: 2 });
    });
  }
}

// ============================================================== SIDE (facing +x)
export function headSide(fig, M, D, H, F0, hair, z0, ups) {
  const F = { ...FACE_DEFAULT, ...F0 };
  const X = (pts) => apAll(M, pts);
  const mess = hair?.mess || 0;
  const sway = hair?.sway || 0;
  const prof = PROFILES[D.face] || PROFILES.oval;
  const jaw = F.mouth === 'yawn' ? (F.mouthK ?? 1) * 1.6 : (F.mouth === 'open' || F.mouth === 'o') ? (F.mouthK ?? 1) * 0.6 : 0;
  const pts = prof.map(([x, y]) => (y > 6 && x > 0 ? [x - jaw * 0.25, y + jaw] : [x, y]));
  fig.add('face', X(pts), { fill: D.skin, z: z0 + 1 });
  // ear
  fig.add('ear', X(ellipsePts(-1.3, 1.6, 2.1, 2.9, 16)), { fill: D.skin, z: z0 + 1.2, edge: true });
  fig.line(X([[-0.4, 0.2], [-1.6, 0.6], [-1.3, 2.4], [-0.5, 2.8]]), { z: z0 + 1.3, lw: 1.8, color: '#b98870', clip: ['ear'], seed: 131 });
  // eye
  const ex = 6.3 + (F.look?.[0] || 0) * 0.4, ey = 0.5 + (F.look?.[1] || 0) * 0.6;
  const lwE = W(ups, 0.42, 2, 10);
  const lid = clamp(F.lid);
  if (F.eyes === 'happy') fig.line(X([[ex - 1.0, ey + 0.8], [ex + 0.1, ey - 1.0], [ex + 1.0, ey + 0.6]]), { z: z0 + 2, lw: lwE, brush: 'soft', seed: 132 });
  else if (F.eyes === 'closed' || lid > 0.9) fig.line(X([[ex - 1.1, ey + 0.2], [ex, ey + 1.0], [ex + 1.0, ey + 0.4]]), { z: z0 + 2, lw: lwE, brush: 'soft', seed: 132 });
  else if (F.eyes === 'squeeze') fig.line(X([[ex + 1, ey - 1.2], [ex - 0.8, ey], [ex + 1, ey + 1.2]]), { z: z0 + 2, lw: lwE, brush: 'soft', seed: 132, smooth: false });
  else {
    let rx = D.eyes === 'dot' ? 0.75 : 0.9, ry = D.eyes === 'dot' ? 1.45 : 1.95;
    if (D.eyes === 'rect') { rx = 0.85; ry = 2.0; }
    if (F.eyes === 'wide') { rx *= 1.15; ry *= 1.15; }
    const topY = ey - ry, lidY = topY + 2 * ry * lid;
    let ep = D.eyes === 'rect' ? rectPts(ex - rx, ey - ry, rx * 2, ry * 2, rx * 0.8, 0.5) : ellipsePts(ex, ey, rx, ry, 18);
    if (lid > 0.02) ep = ep.map(([x, y]) => [x, Math.max(y, lidY)]);
    fig.line(X(ep), { z: z0 + 2, fill: '#221c19', lw: 1, ampMul: 0.3 });
    if (lid < 0.55) fig.line(X(ellipsePts(ex + 0.1, Math.max(ey - ry * 0.45, lidY + 0.5), 0.35, 0.35, 8)), { z: z0 + 2.05, fill: '#fffaf0', stroke: false });
    if (lid > 0.02) fig.line(X([[ex - 1.1, lidY + 0.1], [ex + 0.2, lidY - 0.1], [ex + 1.2, lidY + 0.5]]), { z: z0 + 2.1, lw: lwE, brush: 'out', seed: 133 });
  }
  // brow
  const b = F.brow, by = -3.6 - F.browY - (F.eyes === 'wide' ? 0.7 : 0);
  if (!(D.hairStyle === 'fringe' && by < -5.2)) fig.line(X([[4.6, by + (b > 0 ? 0.5 : -0.2)], [6.3, by - 0.35], [8.0, by + (b < 0 ? 0.8 : -b * 0.9)]]), { z: z0 + 2.2, lw: W(ups, 0.6, 2.4, 12), brush: 'soft', seed: 134 });
  // mouth
  const mlw = W(ups, 0.34, 1.8, 8);
  const my = 6.7;
  switch (F.mouth) {
    case 'smile': fig.line(X([[9.0, my - 0.3], [8.1, my + 0.5], [7.1, my + 0.2]]), { z: z0 + 2, lw: mlw, brush: 'soft', seed: 135 }); break;
    case 'frown': fig.line(X([[9.0, my + 0.3], [8.1, my - 0.2], [7.3, my + 0.5]]), { z: z0 + 2, lw: mlw, brush: 'soft', seed: 135 }); break;
    case 'open': case 'grin': case 'o': case 'yawn': {
      const h = F.mouth === 'yawn' ? 3.2 * (F.mouthK ?? 1) : 1.6 * (F.mouthK ?? 1);
      fig.line(X([[9.2, my - 0.4], [7.2, my - 0.1], [6.8, my + h * 0.6], [8.6 - jaw * 0.2, my + h]]), { z: z0 + 2, fill: MOUTH_DARK, lw: mlw * 0.7 });
      break;
    }
    default: fig.line(X([[9.05, my], [7.7, my + 0.15]]), { z: z0 + 2, lw: mlw, brush: 'soft', seed: 135 });
  }
  if (F.drool > 0.01) fig.line(X([[8.8, my + 0.2], [9.3, my + 1.6 * F.drool], [8.9, my + 2.3 * F.drool], [8.4, my + 1.6 * F.drool]]), { z: z0 + 2.1, fill: '#d9eef7', lw: 1.4 });
  if (F.blush > 0.01) fig.line(X(ellipsePts(4.6, 4.3, 1.6, 0.9, 12)), { z: z0 + 1.5, fill: D.blush, stroke: false, alpha: 0.7 * F.blush });
  if (F.bags > 0.01) fig.line(X([[5.3, 3], [6.3, 3.5], [7.3, 3.1]]), { z: z0 + 2, lw: W(ups, 0.2), color: '#a0705e', alpha: F.bags * 0.9, seed: 136 });
  // hair
  const fz = z0 + 3;
  if (D.hairStyle === 'fluffy') {
    const outer = [[8.8, -9.4], [6.8, -13.1], [2.5, -15.8], [-3, -16.2], [-8, -14], [-11.7, -9.2], [-12.7, -3], [-11.9, 3], [-9.7, 7.8]];
    const tf = openTufts(outer, 0.85 + mess * 1.7, 21 + Math.floor(mess * 3), [-1, -3]);
    const inner = [[-7.6, 5.6], [-6.6, 8.3], [-4.2, 4.2], [-3.6, -1.8], [-1, -3.2], [1.6, -2.3], [2.4, 1.4], [3.5, -2.8], [5.6, -4.9], [6.9, -3.2], [7.4, -5.4], [8.4, -6.6]];
    fig.add('hair', X([...tf, ...inner]), { fill: D.hair, z: fz, edge: ['face', 'ear'], per: 5 });
    fig.line(X([[-2, -13.6], [-6.5, -11.6], [-9.3, -7.5]]), { z: fz + 0.1, lw: 2.2, color: D.hairHi, clip: ['hair'], seed: 141 });
    fig.line(X([[3.5, -12.6], [0.5, -10], [-0.8, -6.5]]), { z: fz + 0.1, lw: 2, color: D.hairHi, clip: ['hair'], seed: 142 });
    const root = [-1, -16], a = sway * 0.9 + mess * 0.25;
    const sp = [root, rotP([0.2, -19.6], a, ...root), rotP([2.6, -21.2], a * 1.3, ...root), rotP([4.4, -20.2], a * 1.6, ...root)];
    fig.add('ahoge', X(tube(sp, [[0, 0.95], [0.5, 0.6], [1, 0.12]], { capStart: 'flat' }).outline), { fill: D.hair, z: fz - 0.1, per: 2 });
    if (mess > 0.2) {
      const k = clamp((mess - 0.2) * 2.5);
      const s = [[-11.6, -8.8], [-13.8 - 1.5 * k, -10 - 1.8 * k], [-14.2 - 1.8 * k, -12.4 - 1.5 * k]];
      fig.add('strand0', X(tube(s, [[0, 0.8], [1, 0.1]], { capStart: 'flat' }).outline), { fill: D.hair, z: fz - 0.05, per: 2 });
    }
  } else if (D.hairStyle === 'fringe') {
    const outer = [[9.3, -8.8], [7.2, -13.2], [2.6, -16.2], [-3.2, -16.6], [-8.4, -14.2], [-11.9, -9.2], [-12.6, -2.6], [-11.6, 2.8], [-9.6, 6.6]];
    const tf = openTufts(outer, 0.3 + mess * 1.6, 27, [-1, -3]);
    const inner = [[-7.4, 5.2], [-5.6, 7.2], [-4.0, 3.6], [-3.4, -1.6], [-0.4, -2.6], [2.0, -2.0], [2.8, 1.6], [3.8, -1.8], [5.4, -5.0], [7.2, -4.4], [8.4, -6.2], [9.4, -5.8]];
    fig.add('hair', X([...tf, ...inner]), { fill: D.hair, z: fz, edge: ['face', 'ear'], per: 4 });
    fig.line(X([[-1, -13.8], [-5.6, -12.2], [-9, -7.8]]), { z: fz + 0.1, lw: 2.2, color: D.hairHi, clip: ['hair'], seed: 143 });
  } else if (D.hairStyle === 'beanie') {
    fig.add('hair', X([[-3.5, -4], [-9.8, -4.4], [-11.4, 1.8], [-9.4, 6], [-7.2, 3.8], [-5.6, 6.6], [-3.4, 2.4], [-2.4, -1.4], [0.8, -2.2], [1.8, 1.6], [3.6, -3], [6.4, -5], [7.8, -3.4], [8.6, -5.6]]), { fill: D.hair, z: fz, edge: ['face', 'ear'], per: 4 });
    const dome = [[9.8, -5.6], [9.4, -11], [6.4, -16.2], [1, -19.2], [-5.2, -18.6], [-10.2, -14.6], [-12.2, -8.6], [-12, -4.2]];
    fig.add('beanie', X(dome), { fill: D.beanie, z: fz + 1, edge: ['face', 'hair', 'ear'] });
    fig.add('brim', X([[10.4, -9.6], [10.6, -4.6], [0, -3.2], [-12.4, -3.4], [-12.8, -8], [0, -9.4]]), { fill: D.beanieShade, z: fz + 1.2, edge: true });
    for (let i = -5; i <= 4; i++) fig.line(X([[i * 2.1 + 0.5, -9.2], [i * 2.1 + 0.5, -3.8]]), { z: fz + 1.3, lw: 1.6, color: '#b98a26', clip: ['brim'], seed: 150 + i });
    const pc = [-2.2 + sway * 3.2, -21.2 + (hair?.bob || 0) * 1.2];
    fig.add('pompom', X(tufts(ellipsePts(pc[0], pc[1], 3.1, 2.9, 10), 0.55, 5, pc[0], pc[1])), { fill: D.beanieLight, z: fz + 0.9, per: 3 });
  }
  if (D.glasses) {
    fig.line(X(ellipsePts(9.5, 0.3, 0.75, 3.1, 16)), { z: fz + 2, fill: F.glare ? `rgba(${F.glare},${0.25 + 0.4 * (F.glareA || 0)})` : 'rgba(235,245,255,0.3)', lw: W(ups, 0.3, 1.8, 7) });
    fig.line(X([[9.2, -0.8], [4, -0.9], [-0.3, -0.2]]), { z: fz + 2, lw: W(ups, 0.3, 1.8, 7), brush: 'flat', seed: 160 });
  }
  if (F.sweat > 0.01) fig.line(X([[3, -8], [4, -5.8], [3, -4.9], [2, -5.8]]), { z: fz + 3, fill: '#cfe8f5', lw: 1.6, alpha: clamp(F.sweat * 1.5) });
}
