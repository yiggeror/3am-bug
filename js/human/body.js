// The programmer, seated. Three views drawn as continuous silhouettes:
//   front (seen from the monitor), back (seen from behind the chair), side (profile, facing +x / the desk).
// Body-local units are centimetres, origin = middle of the hips on the seat surface, +y down.
// A pose is a bag of semantic controls (slump, shrug, lean, head turn...) plus arm targets in body space;
// the silhouette is regenerated from the controls every drawing, so nothing is a rigid part.
import { Fig, tube, rotP, lerpP, EDGE_IN } from '../figure.js';
import { headFront, headBack, headSide } from './head.js';
import { drawHand } from './hand.js';
import { chain, tr, rot, sc, ap, apAll, mul } from '../mat.js';
import { curScale, ik, ellipsePts } from '../draw.js';
import { clamp, lerp } from '../core.js';

export const POSE_DEFAULT = {
  lean: 0, bend: 0, slump: 0, breath: 0, shrug: 0, sy: 1, twist: 0, hipX: 0, hipY: 0,
  head: { turn: 0, nod: 0, tilt: 0, dx: 0, dy: 0 },
  face: {},
  hair: { mess: 0, sway: 0, bob: 0 },
  strings: 0,
  armL: null, armR: null,
  legs: { knee: 0, foot: 0 },
};
export function pose(o = {}) {
  return { ...POSE_DEFAULT, ...o, head: { ...POSE_DEFAULT.head, ...(o.head || {}) }, hair: { ...POSE_DEFAULT.hair, ...(o.hair || {}) }, legs: { ...POSE_DEFAULT.legs, ...(o.legs || {}) } };
}

// outline width in screen px for a given scale (px per cm)
export function inkFor(ups) { return clamp(ups * 0.44, 2.3, 5.8); }

// ------------------------------------------------------------------ shared torso deformation (front / back)
function deformFB(p, tag, P, D) {
  let [x, y] = p;
  const T = D.torsoH;
  const h = clamp(-y / T);
  y *= 1 - 0.07 * P.slump;
  if (tag === 'sh' || tag === 'shTop') { y += P.slump * 2.6; x *= 1 - 0.05 * P.slump; }
  if (tag === 'neck') y += P.slump * 3.4;
  if (tag === 'sh') y -= 3.4 * P.shrug;
  if (tag === 'shTop') y -= 4.4 * P.shrug;
  if (tag === 'neck') y -= 1.5 * P.shrug;
  if (tag === 'chest' || tag === 'sh') x *= 1 + 0.028 * P.breath;
  if (tag === 'sh' || tag === 'shTop' || tag === 'neck') y -= 0.7 * P.breath;
  if (tag === 'hem') x *= 1 + 0.04 * P.slump;
  y *= P.sy;
  x *= 1 + (1 / Math.sqrt(P.sy) - 1) * (0.4 + 0.6 * h);
  x += P.twist * 3 * h;
  [x, y] = rotP([x, y], P.lean * (0.5 + 0.5 * h));
  return [x + P.hipX, y + P.hipY];
}
function torsoFB(P, D) {
  const k = D.torsoH / 50;
  const { shW, chestW, hemW } = D;
  const base = [
    [[0, 0.9], 'hem'], [[-hemW, -0.2], 'hem'], [[-hemW - 0.7, -12 * k], 'side'], [[-chestW, -30 * k], 'chest'], [[-shW - 1.5, -40 * k], 'chest'],
    [[-shW, -45.6 * k], 'sh'], [[-shW + 4.8, -49.5 * k], 'shTop'], [[-6.4, -51.2 * k], 'neck'], [[0, -51.8 * k], 'neck'], [[6.4, -51.2 * k], 'neck'],
    [[shW - 4.8, -49.5 * k], 'shTop'], [[shW, -45.6 * k], 'sh'], [[shW + 1.5, -40 * k], 'chest'], [[chestW, -30 * k], 'chest'], [[hemW + 0.7, -12 * k], 'side'], [[hemW, -0.2], 'hem'],
  ];
  const pts = base.map(([p, t]) => deformFB(p, t, P, D));
  const d = (p, t = 'chest') => deformFB(p, t, P, D);
  return {
    pts,
    SL: d([-shW + 3.2, -44.2 * k], 'sh'), SR: d([shW - 3.2, -44.2 * k], 'sh'),
    N: d([0, -50.2 * k], 'neck'),
    d, k,
    ang: P.lean * 0.95, // approximate upper-body angle
  };
}

// arm: returns tube + wrist + forearm direction. A: { hand:[x,y], bend:±1, elbow?, fs (forearm foreshortening), us, w }
function armGeom(S, A, D, o = {}) {
  const up = D.upper * (A.us ?? 1), fo = D.fore * (A.fs ?? 1);
  const W = A.hand;
  let E = A.elbow || ik(S, W, up, fo, A.bend ?? 1).joint;
  if (A.elbowTo && A.elbowK > 0) E = lerpP(E, A.elbowTo, Math.min(1, A.elbowK));
  const sw = D.sleeve * (A.w ?? 1);
  const persp = A.persp ?? 1; // forearm closer to the camera looks wider
  const t = tube([S, lerpP(S, E, 0.5), E, lerpP(E, W, 0.55), W], [[0, sw * 1.08], [0.42, sw * 0.95], [0.8, sw * 0.86 * persp], [1, sw * 0.8 * persp]], { capStart: 'round', capStartK: 0.6, capEnd: 'flat', step: 0.9 });
  const dir = Math.atan2(W[1] - E[1], W[0] - E[0]);
  return { t, E, W, dir, sw: sw * persp };
}
function addArm(fig, name, S, A, D, z, o = {}) {
  const g = armGeom(S, A, D, o);
  const fill = o.fill || D.hoodie;
  const L = g.t.left, R = g.t.right;
  fig.add(name, g.t.outline, { fill, z, edge: o.edge ?? true, edgeLines: [L, R], per: 2, raw: false, seg: 8 });
  // cuff band
  const n = L.length;
  const i0 = Math.floor(n * 0.9);
  const cuff = [...L.slice(i0), ...R.slice(i0).reverse()];
  const cuffOut = [];
  const cw = 1.06;
  const c = g.W;
  for (const p of cuff) cuffOut.push([c[0] + (p[0] - c[0]) * cw, c[1] + (p[1] - c[1]) * cw]);
  fig.add(name + 'c', cuffOut, { fill: o.cuff || fill, z: z + 0.5, edge: true, per: 2 });
  // sleeve folds at the elbow
  if (A.folds !== false) {
    const mi = Math.floor(n * 0.45);
    const a = L[mi], b = R[mi];
    fig.line([lerpP(a, b, 0.15), lerpP(lerpP(a, b, 0.45), g.E, 0.12), lerpP(a, b, 0.62)], { z: z + 0.3, lw: 1.8, color: o.foldColor || D.hoodieDeep, clip: [name], seed: 5 + z });
  }
  // hand
  if (A.hp !== null) {
    const hp = A.hp || {};
    const flip = A.flipHand ? -1 : 1;
    const hs = (hp.scale ?? 1) * (D.hands === 'mitten' ? 1.02 : 1);
    const M = chain(tr(g.W[0], g.W[1]), rot(g.dir + (hp.rot || 0)), sc(hs, hs * flip), tr(-0.6, 0));
    drawHand(fig, M, D, hp, z - 0.2, name + 'h', { skin: o.skin });
  }
  return g;
}

function headMatrix(NT, ang, D, extraScale = 1, attach = [0, 9.6]) {
  const hs = D.headScale * extraScale;
  return chain(tr(NT[0], NT[1]), rot(ang), sc(hs), tr(-attach[0], -attach[1]));
}

// ================================================================== FRONT
// Arms default to typing on a keyboard in front of the body.
export function drawFront(ctx, P0, D, o = {}) {
  const P = pose(P0);
  const ups = curScale(ctx);
  const fig = new Fig(ctx, { lw: inkFor(ups), seed: o.seed || 11 });
  const tor = torsoFB(P, D);
  // torso
  fig.add('torso', tor.pts, { fill: D.hoodie, z: 0, per: 5 });
  // hem band + pocket (usually below the desk)
  const d = tor.d;
  fig.line([d([-D.hemW + 1, -4], 'hem'), d([0, -3.4], 'hem'), d([D.hemW - 1, -4], 'hem')], { z: 0.2, lw: 1.8, color: D.hoodieDeep, clip: ['torso'], seed: 3 });
  fig.line([d([-11, -5], 'side'), d([-9.4, -17], 'side'), d([9.4, -17], 'side'), d([11, -5], 'side')], { z: 0.2, lw: 1.8, color: D.hoodieDeep, clip: ['torso'], seed: 4, brush: false });
  // center fold / chest crease
  fig.line([d([-5, -34], 'chest'), d([0, -32.5], 'chest'), d([4, -35], 'chest')], { z: 0.2, lw: 1.6, color: D.hoodieShade, clip: ['torso'], seed: 5, alpha: 0.8 });
  // shading: side of the torso away from the key light
  fig.shade((c) => {
    c.fillStyle = 'rgba(40,50,80,0.13)';
    const q = tor.pts;
    c.beginPath();
    const a = d([D.chestW * 0.45, -52], 'neck'), b = d([D.hemW * 1.3, -52], 'neck'), e = d([D.hemW * 1.3, 2], 'hem'), f = d([D.hemW * 0.6, 2], 'hem');
    c.moveTo(...a); c.lineTo(...b); c.lineTo(...e); c.lineTo(...f); c.closePath(); c.fill();
  }, ['torso'], 0.1);
  // hood collar behind the neck
  const N = tor.N;
  const col = (pts) => pts.map(([x, y]) => d([x, y - 50.2 * tor.k], 'neck'));
  fig.add('collarB', col([[-11, 1.2], [-10.4, -2.8], [-6.6, -5.0], [0, -5.6], [6.6, -5.0], [10.4, -2.8], [11, 1.2], [5.5, -0.4], [0, -1.2], [-5.5, -0.4]]), { fill: D.hoodieShade, z: 1, edge: true, per: 4 });
  // neck
  const turn = P.head.turn || 0;
  const NT = [N[0] + (P.head.dx || 0) + turn * 0.6, N[1] - 4.0 + (P.head.dy || 0) + (P.head.nod || 0) * 0.8];
  const neck = tube([[N[0], N[1] + 2], NT], [[0, 3.6], [1, 3.3]], { capEnd: 'flat', capStart: 'flat' });
  fig.add('neck', neck.outline, { fill: D.skin, z: 2 });
  fig.shade((c) => { c.fillStyle = 'rgba(160,90,70,0.22)'; c.beginPath(); c.ellipse(NT[0], NT[1] + 1.2, 5, 2.4, 0, 0, Math.PI * 2); c.fill(); }, ['neck'], 2.1);
  // front of the collar (V) with drawstring eyelets
  for (const s of [-1, 1]) {
    fig.add('collarF' + s, col([[s * 11, 1.2], [s * 6.5, -0.6], [s * 3.4, 2.6], [s * 0.2, 6.8], [s * -0.9, 8.2], [s * 1.6, 8.6], [s * 5.4, 5.6], [s * 9.4, 3.6]]), { fill: D.hoodie, z: 3, edge: true, per: 4 });
  }
  // drawstrings with follow-through
  const sway = P.strings || 0;
  for (const s of [-1, 1]) {
    const top = d([s * 2.4, -45.6 * tor.k], 'chest');
    const len = 12.5;
    const ang = Math.PI / 2 + sway * 0.35 + P.lean * 0.8 + s * 0.04;
    const mid = [top[0] + Math.cos(ang - sway * 0.2) * len * 0.5, top[1] + Math.sin(ang - sway * 0.2) * len * 0.5];
    const end = [top[0] + Math.cos(ang) * len, top[1] + Math.sin(ang) * len];
    const st = tube([top, mid, end], [[0, 0.55], [1, 0.5]], { capStart: 'flat', capEnd: 'flat', step: 0.6 });
    fig.line(st.outline, { z: 4, fill: D.strings, lw: 1.6, seed: 30 + s });
    const ag = tube([end, [end[0] + Math.cos(ang) * 2.2, end[1] + Math.sin(ang) * 2.2]], [[0, 0.75], [1, 0.7]], { step: 0.5 });
    fig.line(ag.outline, { z: 4.1, fill: '#d8d0c0', lw: 1.6, seed: 32 + s });
  }
  // head
  const ang = tor.ang * 0.6 + (P.head.tilt || 0);
  const M = headMatrix(NT, ang, D);
  headFront(fig, M, D, P.head, P.face, P.hair, 10, ups * D.headScale);
  // desk + keyboard inside the drawing (so arms rest *on* them with correct overlaps)
  if (o.desk) o.desk(fig, 15);
  // arms
  const arms = [['armL', tor.SL, P.armL, -1], ['armR', tor.SR, P.armR, 1]];
  for (const [nm, S, A0, side] of arms) {
    const A = { ...defaultFrontArm(side, D), ...(A0 || {}) };
    const z = A.z === 'back' ? -5 : A.z === 'mid' ? 8 : 20;
    addArm(fig, nm, S, { ...A, flipHand: side > 0 ? !A.flipHand : !!A.flipHand }, D, z);
  }
  if (o.extra) o.extra(fig, tor);
  if (o.lights) for (const L of o.lights) fig.edgeLight(L);
  fig.draw();
  return { tor, fig };
}
function defaultFrontArm(side, D) {
  return { hand: [side * 10, -19.6], bend: side > 0 ? 1 : -1, fs: 0.5, persp: 1.14, hp: { view: 'front', rot: 0, scale: 1.16 } };
}

// ================================================================== BACK
export function drawBack(ctx, P0, D, o = {}) {
  const P = pose(P0);
  const ups = curScale(ctx);
  const fig = new Fig(ctx, { lw: inkFor(ups), seed: o.seed || 21 });
  const tor = torsoFB(P, D);
  const d = tor.d;
  // the torso's side contour stays visible where it passes in front of an arm
  fig.add('torso', tor.pts, { fill: D.hoodie, z: 0, per: 5, edge: ['armL', 'armR'] });
  // spine crease + hem band
  fig.line([d([0.3, -44], 'chest'), d([0.8, -30], 'chest'), d([0.2, -12], 'side')], { z: 0.2, lw: 1.6, color: D.hoodieShade, clip: ['torso'], seed: 6, alpha: 0.9 });
  fig.line([d([-D.hemW + 1, -4], 'hem'), d([0, -3.3], 'hem'), d([D.hemW - 1, -4], 'hem')], { z: 0.2, lw: 1.8, color: D.hoodieDeep, clip: ['torso'], seed: 7 });
  // shading: lower back darker (under the hood), one side cooler
  fig.shade((c) => {
    const a = d([-30, -30], 'chest'), b = d([30, 5], 'hem');
    const g = c.createLinearGradient(a[0], a[1], b[0], b[1]);
    g.addColorStop(0, 'rgba(40,50,80,0)'); g.addColorStop(1, 'rgba(40,50,80,0.16)');
    c.fillStyle = g; c.fillRect(-60, -80, 120, 90);
  }, ['torso'], 0.1);
  // neck (mostly hidden by hair) + head
  const N = tor.N;
  const turn = P.head.turn || 0;
  const NT = [N[0] + (P.head.dx || 0), N[1] - 4.0 + (P.head.dy || 0) + (P.head.nod || 0) * 1.6];
  fig.add('neck', tube([[N[0], N[1] + 2], NT], [[0, 3.8], [1, 3.4]], { capEnd: 'flat', capStart: 'flat' }).outline, { fill: D.skin, z: 1 });
  fig.shade((c) => { c.fillStyle = 'rgba(150,90,70,0.28)'; c.beginPath(); c.ellipse(NT[0], NT[1] + 2.2, 5, 3, 0, 0, Math.PI * 2); c.fill(); }, ['neck'], 1.1);
  // hood lying on the upper back
  const hood = [[-10.4, -50.6], [-11.6, -45], [-9.2, -38.4], [-4, -35.2], [0, -34.8], [4, -35.2], [9.2, -38.4], [11.6, -45], [10.4, -50.6], [5, -48.6], [0, -48.2], [-5, -48.6]].map(([x, y]) => d([x, y * tor.k], y < -48 ? 'neck' : 'chest'));
  fig.add('hood', hood, { fill: D.hoodie, z: 2, edge: true, per: 4 });
  fig.line([d([-7.4, -47.4 * tor.k], 'neck'), d([-6, -41 * tor.k]), d([0, -38.4 * tor.k]), d([6, -41 * tor.k]), d([7.4, -47.4 * tor.k], 'neck')], { z: 2.2, lw: 1.8, color: D.hoodieDeep, clip: ['hood'], seed: 8 });
  fig.shade((c) => { c.fillStyle = 'rgba(40,50,80,0.18)'; c.beginPath(); const p = d([0, -40 * tor.k]); c.ellipse(p[0], p[1] + 2, 7, 3.5, 0, 0, Math.PI * 2); c.fill(); }, ['hood'], 2.1);
  const ang = tor.ang * 0.6 + (P.head.tilt || 0);
  const M = headMatrix(NT, ang, D);
  headBack(fig, M, D, P.head, P.hair, 10, ups * D.headScale);
  // arms: default typing — forearms go forward, hidden behind the body
  for (const [nm, S, A0, side] of [['armL', tor.SL, P.armL, -1], ['armR', tor.SR, P.armR, 1]]) {
    const A = { ...defaultBackArm(side, D, tor), ...(A0 || {}) };
    const z = A.z === 'front' ? 20 : A.z === 'mid' ? 5 : -5;
    addArm(fig, nm, S, { ...A, flipHand: side > 0 ? !A.flipHand : !!A.flipHand }, D, z, { edge: z < 0 ? false : true });
  }
  if (o.extra) o.extra(fig, tor);
  if (o.lights) for (const L of o.lights) fig.edgeLight(L);
  fig.draw();
  return { tor, fig };
}
function defaultBackArm(side, D, tor) {
  // elbows out a little, hands forward & inward (hidden)
  return { hand: [side * 9, -30], elbow: [side * (D.shW + 5.4), -25.5], bend: side > 0 ? -1 : 1, hp: { view: 'back', rot: 0 } };
}

// ================================================================== SIDE (facing +x)
// Side view: the torso bends along a curved spine. Hips stay planted on the seat; the angle grows
// toward the shoulders (bend), and the upper back rounds when slumping. Points are carried by the
// spine's frame, so the front compresses and the back stretches like a soft tube.
const SPINE0 = -3, SPINE_L = 47;
function spineFrame(P, s) {
  // integrate the spine curve up to parameter s (0 hips .. 1 neck)
  const ang = (u) => P.bend * (0.4 + 0.6 * u) + P.slump * 0.85 * Math.pow(u, 1.6) + P.lean * u;
  const n = 12;
  let x = 0, y = SPINE0;
  const L = SPINE_L * (1 - 0.05 * P.slump) * P.sy;
  const ss = clamp(s, 0, 1.15);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n * ss;
    const a = ang(u);
    x += Math.sin(a) * L * ss / n;
    y -= Math.cos(a) * L * ss / n;
  }
  return { x, y, a: ang(ss) };
}
function deformSide(p, P, D) {
  const [px, py] = p;
  const s = (SPINE0 - py) / SPINE_L;
  let out;
  if (s <= 0) out = [px, py];
  else {
    const f = spineFrame(P, s);
    const nx = px + (px > 0 ? P.breath * 0.35 * Math.sin(Math.PI * clamp(s)) : 0);
    // belly squeezes a little when folding forward
    const squeeze = px > 0 && s < 0.6 ? 1 - clamp(P.bend, 0, 1) * 0.12 : 1;
    out = [f.x + Math.cos(f.a) * nx * squeeze, f.y + Math.sin(f.a) * nx * squeeze];
  }
  return [out[0] + P.hipX, out[1] + P.hipY];
}
export function drawSide(ctx, P0, D, o = {}) {
  const P = pose(P0);
  const ups = curScale(ctx);
  const fig = new Fig(ctx, { lw: inkFor(ups), seed: o.seed || 31 });
  const k = D.torsoH / 50;
  const d = (p) => deformSide([p[0], p[1] * (p[1] < 0 ? k : 1)], P, D);
  // legs (far then near)
  const legs = P.legs;
  for (const far of [true, false]) {
    const off = far ? [2.2, -1.4] : [0, 0];
    const kx = 34 + (legs.knee || 0) * (far ? 0.7 : 1);
    const hip = [3 + off[0] + P.hipX * 0.3, -6 + off[1]];
    const knee = [kx + off[0], -7.5 + off[1]];
    const ankle = [kx + 1 - (legs.foot || 0) * 10 + off[0] + (far ? -3 : 0), 40.5 + off[1]];
    const leg = tube([hip, lerpP(hip, knee, 0.5), knee, lerpP(knee, ankle, 0.5), ankle], [[0, 7.0], [0.42, 5.9], [0.5, 5.7], [1, 4.4]], { capStart: 'round', capEnd: 'flat', step: 1 });
    fig.add(far ? 'legF' : 'legN', leg.outline, { fill: far ? D.pantsShade : D.pants, z: far ? -12 : 2, edge: far ? false : true, per: 2 });
    const a = ankle;
    const sock = [[a[0] - 4.6, a[1] - 2], [a[0] + 2.5, a[1] - 1.6], [a[0] + 9, a[1] + 1.8], [a[0] + 12.8, a[1] + 4.6], [a[0] + 12, a[1] + 6.6], [a[0] - 3.4, a[1] + 6.8], [a[0] - 5.2, a[1] + 3]];
    fig.add(far ? 'footF' : 'footN', sock, { fill: far ? D.socksShade : D.socks, z: far ? -11.9 : 2.1, edge: true, per: 3 });
    fig.line([[a[0] - 4.5, a[1] + 0.2], [a[0] + 2.8, a[1] + 0.6]], { z: far ? -11.8 : 2.2, lw: 1.6, color: far ? D.pantsShade : D.pantsShade, clip: [far ? 'footF' : 'footN'], seed: 40 + far });
  }
  // torso
  const tp = [[-9, 0.6], [-11.2, -1], [-11.7, -12], [-12.6, -27], [-12, -39], [-9, -46.5], [-4.2, -51], [4, -51.5], [8.8, -46.5], [11.8, -37], [12.6, -22], [12.4, -5], [10.5, 0.6]];
  const tpts = tp.map(d);
  fig.add('torso', tpts, { fill: D.hoodie, z: 0, per: 5 });
  fig.line([d([-10.8, -4.2]), d([1, -3.6]), d([12, -4.4])], { z: 0.2, lw: 1.8, color: D.hoodieDeep, clip: ['torso'], seed: 9 });
  fig.line([d([12.2, -8]), d([5.5, -9]), d([4.5, -19]), d([12.4, -20.5])], { z: 0.2, lw: 1.7, color: D.hoodieDeep, clip: ['torso'], seed: 10, brush: false });
  fig.shade((c) => {
    const a = d([-14, -20]), b = d([6, -20]);
    const g = c.createLinearGradient(a[0], a[1], b[0], b[1]);
    g.addColorStop(0, 'rgba(40,50,80,0.18)'); g.addColorStop(1, 'rgba(40,50,80,0)');
    c.fillStyle = g; c.fillRect(-40, -90, 90, 100);
  }, ['torso'], 0.1);
  // hood lump behind the neck
  const hood = [[-10, -44.5], [-11.6, -47.8], [-10.2, -51.8], [-6.8, -53.4], [-3.6, -52.4], [-4.6, -48.6], [-7.4, -44.2]].map(d);
  fig.add('hood', hood, { fill: D.hoodie, z: 1, edge: true, per: 4 });
  fig.line([d([-9.8, -46.5]), d([-8, -50.5]), d([-5.2, -51.2])], { z: 1.1, lw: 1.6, color: D.hoodieDeep, clip: ['hood'], seed: 12 });
  // strings hanging in front of the chest
  const sway = P.strings || 0;
  {
    const top = d([7.6, -45.5]);
    const ang = Math.PI / 2 + sway * 0.35 - (P.bend + P.slump * 0.4) * 0.9;
    const mid = [top[0] + Math.cos(ang - sway * 0.2) * 6, top[1] + Math.sin(ang - sway * 0.2) * 6];
    const end = [top[0] + Math.cos(ang) * 12, top[1] + Math.sin(ang) * 12];
    fig.line(tube([top, mid, end], [[0, 0.5], [1, 0.45]], { capStart: 'flat', capEnd: 'flat', step: 0.6 }).outline, { z: 5, fill: D.strings, lw: 1.5, seed: 33 });
    fig.line(tube([end, [end[0] + Math.cos(ang) * 2.2, end[1] + Math.sin(ang) * 2.2]], [[0, 0.7], [1, 0.65]], { step: 0.5 }).outline, { z: 5.1, fill: '#d8d0c0', lw: 1.5, seed: 34 });
  }
  // neck + head
  const N = d([0.2, -50]);
  const upAng = spineFrame(P, 1).a;
  const ndir = -Math.PI / 2 + upAng * 0.95 + (P.head.nod || 0) * 0.3;
  const NT = [N[0] + Math.cos(ndir) * 4.6 + (P.head.dx || 0), N[1] + Math.sin(ndir) * 4.6 + (P.head.dy || 0)];
  fig.add('neck', tube([[N[0] - 0.4, N[1] + 2.5], NT], [[0, 3.7], [1, 3.4]], { capEnd: 'flat', capStart: 'flat' }).outline, { fill: D.skin, z: 1.5 });
  const hang = upAng * 0.75 + (P.head.tilt || 0) + (P.head.nod || 0) * 0.6;
  const M = headMatrix(NT, hang, D, 1, [-1.6, 9.2]);
  headSide(fig, M, D, P.head, P.face, P.hair, 10, ups * D.headScale);
  // arms: far (behind the body, darker), near (in front)
  const S = d([0.6, -44.2]);
  const SF = d([2.2, -45.4]);
  const armN = { hand: [35, -29.5], bend: -1, hp: { view: 'side', curl: 0.85 }, ...(P.armR || {}) };
  const armF = { hand: [38, -30.8], bend: -1, hp: { view: 'side', curl: 0.85 }, ...(P.armL || {}) };
  if (!armF.hidden) addArm(fig, 'armF', SF, armF, D, armF.z === 'front' ? 22 : -10, { fill: D.hoodieShade, skin: D.skinShade, foldColor: D.hoodieDeep, edge: armF.z === 'front' });
  if (o.desk) o.desk(fig, 15);
  addArm(fig, 'armN', S, armN, D, armN.z === 'back' ? -8 : 20);
  if (o.extra) o.extra(fig, { d, S, N });
  if (o.lights) for (const L of o.lights) fig.edgeLight(L);
  fig.draw();
  return { fig };
}

export function drawHuman(ctx, view, P, D, o = {}) {
  if (view === 'front') return drawFront(ctx, P, D, o);
  if (view === 'back') return drawBack(ctx, P, D, o);
  return drawSide(ctx, P, D, o);
}
