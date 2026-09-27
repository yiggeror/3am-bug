// The little orange friend, rebuilt as a soft box on the silhouette engine.
// Drawn after the character sheet: a wide orange block, two tall rectangular eyes, stubby side arms,
// four little legs. The body is a deformable shape: squash bulges its sides, stretch pinches a waist,
// `bend` curves it like a banana into a jump or a brake, `lean` shears it. Legs and arms hang under
// the body's outline exactly like the sheet (the body edge is drawn over them).
import { Fig, tube } from './figure.js';
import { C, curScale, emote, rectPts, ellipsePts, brush } from './draw.js';
import { clamp, lerp, TAU, hash2 } from './core.js';

export const CW = 1, CH = 0.64, CL = 0.2;
const LEG_X = [-0.37, -0.23, 0.23, 0.37];
const LEG_W = 0.09;

export const CUBE2 = {
  x: 0, y: 0, size: 40, flip: 1, alpha: 1,
  sq: 0, sx: 1, sy: 1, bend: 0, lean: 0, rot: 0, bulge: 0,
  lookX: 0, lookY: 0, blink: 0, eyes: 'normal', eyeS: 1, eyeL: 1, eyeR: 1, brows: 0, mouth: null, mouthK: 1, blush: 0,
  armL: null, armR: null, // { a: angle (0 = out, + = up), len, dy, bend, hide, front }
  walk: 0, walkAmt: 0, tuck: 0, legSpread: 0, legs: null, // legs: array of 4 {dx, dy, lift}
  shake: 0, fill: null, ink: null, lw: null, emote: null, emote2: null, glow: 0,
};
export function cubeState(o) { return { ...CUBE2, ...o }; }

// deformation of body-local points (origin = middle of the feet line; box from y=-CL-CH to -CL)
function deformer(s) {
  const sq = s.sq;
  const hk = (1 - sq) * s.sy, wk = (1 + sq * 0.8) * s.sx;
  const cy = -(CL + CH / 2);
  const bul = Math.max(0, sq) * 0.1 + s.bulge - Math.max(0, -sq) * 0.06; // squash bulges, stretch pinches
  return ([x, y]) => {
    // vertical position inside the box (0 bottom .. 1 top)
    const v = clamp((-CL - y) / CH, -0.5, 1.5);
    let px = x * wk, py = -CL + (y + CL) * hk;
    // side bulge (max at mid-height), only for points on the body
    const side = Math.abs(x) / (CW / 2);
    if (v >= 0 && v <= 1) px += Math.sign(x) * bul * Math.sin(Math.PI * v) * Math.pow(side, 3);
    // banana bend + shear
    const h = (py + CL) / -CH; // 0 at bottom, 1 at top (after squash)
    px += s.bend * 0.28 * h * h - s.lean * (py + CL);
    return [px, py];
  };
}

function boxOutline(r = 0.07) {
  return rectPts(-CW / 2, -CL - CH, CW, CH, r, 0.06);
}

export function drawCube2(ctx, st) {
  const s = { ...CUBE2, ...st };
  if (s.alpha <= 0) return;
  ctx.save();
  if (s.alpha < 1) ctx.globalAlpha *= s.alpha;
  const shx = s.shake ? Math.sin(s.shake * 97.3) * s.size * 0.035 : 0;
  ctx.translate(s.x + shx, s.y);
  ctx.scale(s.size * s.flip, s.size);
  // rotation about the body centre
  const cy = -(CL * (1 - s.tuck) + CH / 2) * (1 - s.sq);
  ctx.translate(0, cy); ctx.rotate(s.rot * s.flip); ctx.translate(0, -cy);
  const ups = curScale(ctx);
  const lw = s.lw ?? clamp(ups * 0.045, 2.2, 5.2);
  const fig = new Fig(ctx, { lw, seed: s.seed || 1301, ink: s.ink || undefined, amp: 0.7 });
  const D = deformer(s);
  const fill = s.fill || C.orange;
  const legLen = CL * (1 - s.tuck);
  // ---- legs (hang from the deformed bottom edge)
  for (let i = 0; i < 4; i++) {
    const g = i % 2;
    const ph = s.walk * TAU + g * Math.PI;
    const lift = Math.max(0, Math.sin(ph)) * s.walkAmt * 0.1;
    const fwd = Math.cos(ph) * s.walkAmt * 0.05;
    const L = s.legs?.[i] || {};
    const lx0 = LEG_X[i] * (1 + s.legSpread * 0.25) + (L.dx || 0);
    const top = D([lx0, -CL - 0.04]);
    const footY = -lift + (L.dy || 0) - (s.tuck * CL) + (L.lift ? -L.lift : 0);
    const foot = [top[0] + fwd + (L.fx || 0) - s.lean * 0.05, Math.max(footY, top[1] + 0.03)];
    const lt = tube([top, foot], [[0, LEG_W / 2], [1, LEG_W / 2]], { capStart: 'flat', capEnd: 'round', capEndK: 0.25, smooth: false, step: 0.02 });
    fig.add('leg' + i, lt.outline, { fill, z: -2 + i * 0.01, per: 1, raw: true });
  }
  // ---- arms (behind the body edge unless in front)
  for (const [side, A] of [[-1, s.armL], [1, s.armR]]) {
    if (A?.hide) continue;
    const a = A?.a ?? 0, len = A?.len ?? 1, bendA = A?.bend ?? 0;
    const root = D([side * (CW / 2 - 0.05), -CL - CH * 0.45 + (A?.dy ?? 0)]);
    const L = 0.2 * len;
    const dir = [Math.cos(a) * side, -Math.sin(a)];
    const mid = [root[0] + dir[0] * L * 0.55 - dir[1] * bendA * 0.04 * side, root[1] + dir[1] * L * 0.55 + dir[0] * bendA * 0.04 * side];
    const tip = [root[0] + dir[0] * L, root[1] + dir[1] * L];
    const at = tube([root, mid, tip], [[0, 0.068], [1, 0.064]], { capStart: 'flat', capEnd: 'round', capEndK: 0.3, step: 0.02 });
    fig.add('arm' + side, at.outline, { fill, z: A?.front ? 3 : -1, per: 1, edge: A?.front ? true : false });
  }
  // ---- body
  const body = boxOutline().map(D);
  fig.add('body', body, { fill, z: 0, edge: true, per: 2, seg: 7 });
  // crayon highlight along the top
  fig.line([D([-CW / 2 + 0.09, -CL - CH + 0.07]), D([0, -CL - CH + 0.065]), D([CW / 2 - 0.22, -CL - CH + 0.07])], { z: 0.1, lw: lw * 1.3, color: 'rgba(250,176,120,0.55)', clip: ['body'], brush: 'soft' });
  // ---- face
  face(fig, s, D, lw);
  fig.draw();
  ctx.restore();
  // emotes (screen-aligned, not rotated)
  for (const e of [s.emote, s.emote2]) {
    if (!e || !(e.k > 0)) continue;
    const top = s.y - s.size * (CL + CH) * (1 - s.sq) * s.sy;
    emote(ctx, e.type, s.x + s.size * (e.dx ?? 0.35) * s.flip, top - s.size * (0.12 + (e.dy || 0)), s.size * (e.s ?? 0.45), e.k, e.seed ?? 7);
  }
}

function face(fig, s, D, lw) {
  const cy = -CL - CH * 0.6 + s.lookY * 0.045;
  const cx = s.lookX * 0.05;
  const spread = 0.17;
  const blink = clamp(s.blink);
  const ew = 0.075 * s.eyeS, eh = 0.2 * s.eyeS;
  const INKC = s.ink || C.ink;
  for (const i of [-1, 1]) {
    const ex = cx + i * spread;
    const es = i < 0 ? s.eyeL : s.eyeR;
    const type = s.eyes;
    const P = (pts) => pts.map(D);
    if (type === 'normal' || type === 'wide' || type === 'tiny' || type === 'look' || type === 'sly') {
      let w = ew * es, h = eh * es;
      if (type === 'wide') { w *= 1.2; h *= 1.18; }
      if (type === 'tiny') { w *= 0.55; h *= 0.4; }
      let top = cy - h / 2;
      if (type === 'sly') { top = cy - h * 0.05; h *= 0.55; }
      const hh = Math.max(0.02, h * (1 - blink));
      const t2 = blink > 0.001 ? cy - hh / 2 + (type === 'sly' ? eh * 0.25 : 0) : top;
      fig.line(P(rectPts(ex - w / 2, t2, w, hh, Math.min(w, hh) * 0.35, 0.02)), { z: 1, fill: INKC, lw: lw * 0.3, ampMul: 0.3 });
      if (type === 'wide' && blink < 0.5) fig.line(P(ellipsePts(ex - w * 0.14, t2 + hh * 0.26, w * 0.2, w * 0.2, 8)), { z: 1.1, fill: '#fffaf0', stroke: false });
      if (type === 'sly') fig.line(P([[ex - w * 1.2, t2 - 0.01], [ex + w * 1.2, t2 - 0.025]]), { z: 1.1, lw: lw * 0.8, brush: 'soft' });
    } else if (type === 'happy') {
      fig.line(P([[ex - 0.065, cy + 0.035], [ex, cy - 0.045], [ex + 0.065, cy + 0.035]]), { z: 1, lw: lw * 1.05, brush: 'soft' });
    } else if (type === 'content' || type === 'sleep') {
      fig.line(P([[ex - 0.065, cy - 0.005], [ex - 0.02, cy + 0.03], [ex + 0.03, cy + 0.03], [ex + 0.065, cy - 0.005]]), { z: 1, lw: lw * 1.05, brush: 'soft' });
    } else if (type === 'closed' || type === 'shy' || type === 'flat') {
      fig.line(P([[ex - 0.065, cy + 0.01], [ex + 0.065, cy + 0.01]]), { z: 1, lw: lw * 1.05, brush: 'soft' });
    } else if (type === 'squeeze') {
      fig.line(P([[ex + i * 0.065, cy - 0.055], [ex - i * 0.045, cy], [ex + i * 0.065, cy + 0.055]]), { z: 1, lw: lw * 1.05, brush: 'soft', smooth: false });
    } else if (type === 'dizzy') {
      const pts = [];
      for (let k = 0; k < 26; k++) { const a = k * 0.55 + i + (s.spin || 0); const r = 0.008 + k * 0.0028; pts.push([ex + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      fig.line(P(pts), { z: 1, lw: lw * 0.8, brush: false, smooth: false });
    } else if (type === 'star') {
      const pts = [];
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU - Math.PI / 2; const r = k % 2 === 0 ? 0.09 : 0.036; pts.push([ex + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      fig.line(P(pts), { z: 1, fill: INKC, lw: lw * 0.3, smooth: false });
    }
    if (s.brows) {
      const by = cy - eh * 0.72 - 0.02;
      const tilt = s.brows * 0.04;
      fig.line(P([[ex - 0.06, by + (i < 0 ? tilt : -tilt)], [ex + 0.06, by + (i < 0 ? -tilt : tilt)]]), { z: 1.2, lw: lw * 0.9, brush: 'soft' });
    }
  }
  if (s.blush > 0.01) {
    for (const i of [-1, 1]) {
      const bx = cx + i * (spread + 0.075), by = cy + 0.12;
      for (let k = 0; k < 3; k++) fig.line([D([bx - 0.035 + k * 0.03, by + 0.02]), D([bx - 0.02 + k * 0.03, by - 0.02])], { z: 1.1, lw: lw * 0.7, color: `rgba(226,87,76,${0.9 * s.blush})`, brush: 'taper' });
    }
  }
  const mx = cx, my = cy + 0.13, k = s.mouthK;
  const M = (pts, o = {}) => fig.line(pts.map(D), { z: 1.2, lw: lw * 0.9, brush: 'soft', ...o });
  switch (s.mouth) {
    case 'smile': M([[mx - 0.045, my - 0.012], [mx - 0.02, my + 0.016], [mx + 0.02, my + 0.016], [mx + 0.045, my - 0.012]]); break;
    case 'o': fig.line(ellipsePts(mx, my + 0.005, 0.022 * k + 0.01, 0.03 * k + 0.01, 12).map(D), { z: 1.2, fill: '#7a2e1c', lw: lw * 0.6 }); break;
    case 'grin': fig.line([[mx - 0.06, my - 0.015], [mx + 0.06, my - 0.015], [mx + 0.035, my + 0.04], [mx - 0.035, my + 0.04]].map(D), { z: 1.2, fill: '#7a2e1c', lw: lw * 0.6 }); break;
    case 'line': M([[mx - 0.035, my], [mx + 0.035, my]]); break;
    case 'wave': M([[mx - 0.06, my], [mx - 0.03, my - 0.012], [mx, my + 0.004], [mx + 0.03, my - 0.012], [mx + 0.06, my]]); break;
    case 'frown': M([[mx - 0.045, my + 0.015], [mx - 0.02, my - 0.008], [mx + 0.02, my - 0.008], [mx + 0.045, my + 0.015]]); break;
    case 'cat': M([[mx - 0.05, my - 0.01], [mx - 0.025, my + 0.015], [mx, my - 0.004], [mx + 0.025, my + 0.015], [mx + 0.05, my - 0.01]]); break;
  }
}

export function cubeTop2(s) { return s.y - s.size * (CL * (1 - (s.tuck || 0)) + CH) * (1 - (s.sq || 0)) * (s.sy ?? 1); }
