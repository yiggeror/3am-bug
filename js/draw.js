// Hand-drawn primitives: wobbly ink lines, brush strokes with pressure, flat fills, "line boil" on twos.
import { hash2, noise1, TAU, clamp, lerp } from './core.js';

export const C = {
  paper: '#f5efe3',
  paper2: '#efe6d4',
  ink: '#2b2622',
  inkSoft: '#5b534b',
  orange: '#e8743b',
  orangeLight: '#f39a62',
  orangeDark: '#c95a26',
  blush: '#f59a8f',
  white: '#fffaf0',
  red: '#e2574c',
  yellow: '#f6d365',
  blue: '#8fb3d9',
  green: '#9bc59d',
  grey: '#b9b1a6',
  greyDark: '#8d857b',
  wood: '#d9b88f',
  woodDark: '#b8936a',
  wall: '#efe4d0',
  floor: '#d8c3a5',
};

// ---------------------------------------------------------------- global drawing state
let BOIL = 0;          // drawing index: changes 12 times a second ("on twos" at 24 fps)
let INK_SCALE = 1;     // global line-weight multiplier (set per shot)
let INK = C.ink;
export const BOIL_FPS = 12;
export function setBoil(t, fps = BOIL_FPS) { BOIL = Math.floor(t * fps + 1e-6); }
export function getBoil() { return BOIL; }
export function setInkScale(s) { INK_SCALE = s; }
export function getInkScale() { return INK_SCALE; }
export function setInk(c) { INK = c || C.ink; }
export function getInk() { return INK; }

// current uniform scale of the ctx transform (screen px per local unit)
export function curScale(ctx) {
  const m = ctx.getTransform();
  return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
}

// ---------------------------------------------------------------- point generators (local units)
export function rectPts(x, y, w, h, r = 0, seg = 10) {
  const pts = [];
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  const edge = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / seg));
    for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * (i / n), y0 + (y1 - y0) * (i / n)]);
  };
  const arc = (cx, cy, a0) => {
    if (r <= 0) return;
    for (let i = 0; i < 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  edge(x + r, y, x + w - r, y); arc(x + w - r, y + r, -Math.PI / 2);
  edge(x + w, y + r, x + w, y + h - r); arc(x + w - r, y + h - r, 0);
  edge(x + w - r, y + h, x + r, y + h); arc(x + r, y + h - r, Math.PI / 2);
  edge(x, y + h - r, x, y + r); arc(x + r, y + r, Math.PI);
  return pts;
}
export function ellipsePts(cx, cy, rx, ry, n = 0, a0 = 0, a1 = TAU) {
  if (!n) n = Math.max(12, Math.min(64, Math.round((rx + ry) * 0.5)));
  const pts = [];
  const full = Math.abs(a1 - a0) >= TAU - 1e-6;
  const cnt = full ? n : n + 1;
  for (let i = 0; i < cnt; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}
export function subdiv(pts, seg, closed) {
  const out = [];
  const n = pts.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.round(len / seg));
    for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * (j / k), a[1] + (b[1] - a[1]) * (j / k)]);
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

// Catmull-Rom spline through control points (centripetal-ish, uniform parameter). per = samples per span
export function spline(pts, closed = true, per = 6) {
  const n = pts.length, out = [];
  if (n < 3) return pts.slice();
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a0 = closed || i > 0 ? p0 : p1, a3 = closed || i < n - 2 ? p3 : p2;
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * ((2 * p1[k]) + (-a0[k] + p2[k]) * t + (2 * a0[k] - 5 * p1[k] + 4 * p2[k] - a3[k]) * t2 + (-a0[k] + 3 * p1[k] - 3 * p2[k] + a3[k]) * t3)));
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
// resample a polyline to spacing `seg` (keeps ends)
export function resample(pts, seg, closed = false) {
  const src = closed ? [...pts, pts[0]] : pts;
  let L = 0;
  const cum = [0];
  for (let i = 1; i < src.length; i++) { L += Math.hypot(src[i][0] - src[i - 1][0], src[i][1] - src[i - 1][1]); cum.push(L); }
  const n = Math.max(2, Math.round(L / seg));
  const out = [];
  let j = 1;
  const cnt = closed ? n : n + 1;
  for (let i = 0; i < cnt; i++) {
    const d = (i / n) * L;
    while (j < cum.length - 1 && cum[j] < d) j++;
    const a = src[j - 1], b = src[j];
    const k = (d - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1);
    out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
  }
  return out;
}
export function polyLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

// jitter points by `amp` screen px, stable per seed, changing per boil drawing
export function jitter(ctx, pts, seed, amp = 1) {
  const s = curScale(ctx);
  const a = (amp * INK_SCALE) / s;
  if (a === 0) return pts;
  const b = BOIL * 7919 + seed * 131;
  return pts.map((p, i) => [p[0] + (hash2(i, b) * 2 - 1) * a, p[1] + (hash2(i + 999, b) * 2 - 1) * a]);
}
// low-frequency wobble along a path (for hand-drawn "drift" without zigzag)
export function wobblePts(ctx, pts, seed, amp = 1, freq = 0.08) {
  const s = curScale(ctx);
  const a = (amp * INK_SCALE) / s;
  const b = BOIL * 3.7 + seed * 13.1;
  let d = 0;
  return pts.map((p, i) => {
    if (i) d += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) * s;
    return [p[0] + noise1(d * freq + b, seed) * a, p[1] + noise1(d * freq + b + 50, seed + 1) * a];
  });
}

// smooth path through points using midpoint quadratics
export function tracePath(ctx, pts, closed, sharp = false) {
  const n = pts.length;
  if (n < 2) return;
  ctx.beginPath();
  addPath(ctx, pts, closed, sharp);
}
export function addPath(ctx, pts, closed, sharp = false) {
  const n = pts.length;
  if (n < 2) return;
  if (sharp) {
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (closed) ctx.closePath();
    return;
  }
  if (closed) {
    const m0 = mid(pts[n - 1], pts[0]);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], m = mid(p, pts[(i + 1) % n]);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) {
      const p = pts[i], m = mid(p, pts[i + 1]);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
}
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
export function toPath2D(pts, closed = true, sharp = false) {
  const p = new Path2D();
  addPath(p, pts, closed, sharp);
  return p;
}

// ---------------------------------------------------------------- drawing
// o: { fill, stroke, lw (screen px), closed, seed, amp, seg (screen px), alpha, noStroke, dash }
export function shape(ctx, pts, o = {}) {
  if (!pts || pts.length < 2) return;
  const s = curScale(ctx);
  const closed = o.closed !== false;
  const seed = o.seed || 1;
  const amp = o.amp ?? 1.0;
  const seg = (o.seg ?? 14) / s;
  const base = o.subdiv === false ? pts : subdiv(pts, seg, closed);
  if (o.alpha !== undefined) { ctx.save(); ctx.globalAlpha *= o.alpha; }
  const jp = jitter(ctx, base, seed, amp);
  if (o.fill) {
    tracePath(ctx, o.fillSame ? jp : jitter(ctx, base, seed + 51, amp * 0.6), closed, o.sharp);
    ctx.fillStyle = o.fill;
    ctx.fill();
  }
  if (o.stroke !== null && !o.noStroke) {
    const lw = ((o.lw ?? 3.2) * INK_SCALE) / s;
    tracePath(ctx, jp, closed, o.sharp);
    ctx.strokeStyle = o.stroke || INK;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash.map((d) => d / s));
    ctx.stroke();
    if (o.dash) ctx.setLineDash([]);
  }
  if (o.alpha !== undefined) ctx.restore();
}
export function line(ctx, pts, o = {}) { shape(ctx, pts, { ...o, closed: false, fill: null }); }
export function rect(ctx, x, y, w, h, o = {}) {
  const s = curScale(ctx);
  shape(ctx, rectPts(x, y, w, h, o.r ?? 0, (o.seg ?? 14) / s), { ...o, subdiv: false });
}
export function ellipse(ctx, cx, cy, rx, ry, o = {}) {
  const sc = curScale(ctx);
  const n = o.n || Math.max(14, Math.min(96, Math.round(((Math.abs(rx) + Math.abs(ry)) * sc) / 9)));
  shape(ctx, ellipsePts(cx, cy, rx, ry, n), o);
}
export function circle(ctx, cx, cy, r, o = {}) { ellipse(ctx, cx, cy, r, r, o); }

// Brush stroke with pressure: a filled ribbon whose width follows `w` (screen px) times a profile.
// profile: 'taper' (thin-thick-thin), 'in' (thin→thick), 'out' (thick→thin), 'flat', or fn(u)->0..1
export function brush(ctx, pts, o = {}) {
  if (!pts || pts.length < 2) return;
  const s = curScale(ctx);
  const w = ((o.lw ?? 3) * INK_SCALE) / s;
  let base = o.smooth === false ? pts : spline(pts, false, 5);
  base = resample(base, Math.max(0.5 / s, (o.seg ?? 5) / s), false);
  base = jitter(ctx, base, o.seed || 7, (o.amp ?? 0.5));
  const prof = typeof o.profile === 'function' ? o.profile : PROFILES[o.profile || 'taper'];
  const n = base.length;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = base[Math.max(0, i - 1)], b = base[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = i / (n - 1);
    const hw = (w / 2) * Math.max(0.12, prof(u)) * (1 + (hash2(i, (o.seed || 7) + BOIL) - 0.5) * 0.12);
    L.push([base[i][0] - dy * hw, base[i][1] + dx * hw]);
    R.push([base[i][0] + dy * hw, base[i][1] - dx * hw]);
  }
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fillStyle = o.color || INK;
  ctx.fill();
  // round caps
  if (o.caps !== false) {
    for (const [p, u] of [[base[0], 0], [base[n - 1], 1]]) {
      const r = (w / 2) * Math.max(0.12, prof(u));
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}
export const PROFILES = {
  taper: (u) => Math.pow(Math.sin(Math.PI * clamp(u * 0.92 + 0.04)), 0.55),
  in: (u) => Math.pow(clamp(u * 1.3), 0.6),
  out: (u) => Math.pow(clamp((1 - u) * 1.3), 0.6),
  flat: () => 1,
  soft: (u) => 0.55 + 0.45 * Math.sin(Math.PI * u),
};

// straight-edged flat polygon (large planes: walls, floors)
export function poly(ctx, pts, fill) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
// plain (non-wobbly) fills, for light/shadow shapes
export function blob(ctx, pts, fill, closed = true) {
  tracePath(ctx, pts, closed);
  ctx.fillStyle = fill;
  ctx.fill();
}
export function softShadow(ctx, cx, cy, rx, ry, alpha = 0.18, rgb = '40,28,24') {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.55})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
  ctx.restore();
}
export function glow(ctx, x, y, r, color, alpha = 1, mode = 'lighter') {
  if (alpha <= 0.001 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha *= Math.min(1, alpha);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// thick outlined stroke (cables etc). thick in local units.
export function limb(ctx, pts, thick, fill, o = {}) {
  if (!pts || pts.length < 2) return;
  const s = curScale(ctx);
  const lw = ((o.lw ?? 3.2) * INK_SCALE) / s;
  const base = subdiv(pts, (o.seg ?? 16) / s, false);
  const p = jitter(ctx, base, o.seed || 1, o.amp ?? 0.8);
  ctx.lineJoin = 'round';
  ctx.lineCap = o.cap || 'round';
  tracePath(ctx, p, false);
  ctx.strokeStyle = o.stroke || INK;
  ctx.lineWidth = thick + lw * 2;
  ctx.stroke();
  tracePath(ctx, p, false);
  ctx.strokeStyle = fill;
  ctx.lineWidth = thick;
  ctx.stroke();
}

// two-bone IK: returns joint position given root, target, lengths, bend direction (+1/-1)
export function ik(root, target, l1, l2, bend = 1) {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  let d = Math.hypot(dx, dy);
  const maxd = l1 + l2 - 1e-3;
  const tx = d > maxd ? root[0] + (dx / d) * maxd : target[0];
  const ty = d > maxd ? root[1] + (dy / d) * maxd : target[1];
  d = Math.max(1e-3, Math.min(d, maxd));
  const a = Math.atan2(ty - root[1], tx - root[0]);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const ja = a - bend * A;
  return { joint: [root[0] + Math.cos(ja) * l1, root[1] + Math.sin(ja) * l1], end: [tx, ty] };
}

// ---------------------------------------------------------------- text
export const HAND_FONT = '"Patrick Hand", "ZCOOL KuaiLe", sans-serif';
export const ZH_FONT = '"ZCOOL KuaiLe", "Patrick Hand", sans-serif';
export const MONO_FONT = '"JetBrains Mono", "ZCOOL KuaiLe", monospace';
export function text(ctx, str, x, y, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 400} ${o.size || 32}px ${o.font || HAND_FONT}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.baseline || 'middle';
  ctx.fillStyle = o.color || INK;
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
  const j = o.still ? 0 : (noise1(BOIL * 0.7, (o.seed || 3)) * 0.6) / curScale(ctx);
  if (o.stroke) { ctx.lineWidth = o.stroke; ctx.strokeStyle = o.strokeColor || INK; ctx.lineJoin = 'round'; ctx.strokeText(str, x + j, y - j); }
  ctx.fillText(str, x + j, y - j);
  ctx.restore();
}

// ---------------------------------------------------------------- emotes (drawn around characters). size in local units.
let EMOTE_INK = null;
export function setEmoteInk(c) { EMOTE_INK = c; }
export function emote(ctx, type, x, y, size, k = 1, seed = 5) {
  if (k <= 0) return;
  const INKC = EMOTE_INK || INK;
  ctx.save();
  ctx.translate(x, y);
  const sc = Math.min(1, k);
  ctx.scale(sc, sc);
  const lw = 3.2;
  if (type === '!') {
    brush(ctx, [[0, -size], [0, -size * 0.62], [0, -size * 0.28]], { lw: lw * 1.8, seed, color: INKC, profile: 'out' });
    circle(ctx, 0, 0, size * 0.075, { fill: INKC, stroke: INKC, seed: seed + 1, lw: 1 });
  } else if (type === '?') {
    const s = size;
    line(ctx, [[-s * 0.28, -s * 0.72], [-s * 0.2, -s * 0.9], [0, -s], [s * 0.22, -s * 0.92], [s * 0.28, -s * 0.72], [s * 0.15, -s * 0.52], [0, -s * 0.4], [0, -s * 0.25]], { lw, seed, stroke: INKC });
    circle(ctx, 0, 0, s * 0.065, { fill: INKC, stroke: INKC, seed: seed + 1, lw: 1 });
  } else if (type === 'heart') {
    const s = size * 0.5;
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      const hx = 16 * Math.pow(Math.sin(a), 3);
      const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
      pts.push([(hx / 16) * s, (hy / 16) * s - s]);
    }
    shape(ctx, pts, { fill: '#ef6f6c', seed, lw: 2.6, stroke: INKC });
  } else if (type === 'dots') {
    for (let i = 0; i < 3; i++) {
      const on = k * 3 > i + 0.2 ? 1 : 0;
      if (on) circle(ctx, (i - 1) * size * 0.32, -size * 0.3, size * 0.07, { fill: INKC, stroke: INKC, seed: seed + i, lw: 1 });
    }
  } else if (type === 'sweat') {
    const s = size * 0.5;
    shape(ctx, [[0, -s * 1.2], [s * 0.45, -s * 0.25], [s * 0.35, s * 0.1], [0, s * 0.25], [-s * 0.35, s * 0.1], [-s * 0.45, -s * 0.25]], { fill: '#bfe0f2', seed, lw: 2.4, stroke: INKC });
  } else if (type === 'burst') { // "\ | /" delight lines (as on the character sheet)
    for (let i = -1; i <= 1; i++) {
      const a = -Math.PI / 2 + i * 0.6;
      const r0 = size * 0.45, r1 = size * 0.9;
      brush(ctx, [[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]], { lw: 4, seed: seed + i, color: '#e2574c' });
    }
  } else if (type === 'puff') { // angry steam cloud
    const s = size * 0.4;
    const pts = [];
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU;
      const r = s * (1 + 0.18 * Math.cos(a * 5));
      pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.8 - s]);
    }
    shape(ctx, pts, { fill: C.white, seed, lw: 2.4, stroke: INKC });
    line(ctx, [[-s * 0.35, s * 0.05], [-s * 0.2, s * 0.4]], { lw: 2.2, seed: seed + 3, stroke: INKC });
    line(ctx, [[s * 0.25, s * 0.05], [s * 0.4, s * 0.35]], { lw: 2.2, seed: seed + 4, stroke: INKC });
  } else if (type === 'zzz') {
    const s = size;
    for (let i = 0; i < 3; i++) {
      const kk = Math.max(0, Math.min(1, k * 3 - i));
      if (kk <= 0) continue;
      const zs = s * (0.28 + i * 0.1) * kk;
      const zx = i * s * 0.35, zy = -i * s * 0.35;
      line(ctx, [[zx - zs / 2, zy - zs / 2], [zx + zs / 2, zy - zs / 2], [zx - zs / 2, zy + zs / 2], [zx + zs / 2, zy + zs / 2]], { lw: 2.6, seed: seed + i, stroke: INKC });
    }
  } else if (type === 'note') {
    const s = size;
    line(ctx, [[s * 0.1, 0], [s * 0.1, -s * 0.8], [s * 0.4, -s * 0.65]], { lw: 3, seed, stroke: INKC });
    ellipse(ctx, -s * 0.05, 0, s * 0.16, s * 0.12, { fill: INKC, stroke: INKC, seed: seed + 2, lw: 1 });
  } else if (type === 'sparkle') {
    const s = size * 0.5;
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU - Math.PI / 2;
      const r = i % 2 === 0 ? s : s * 0.3;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    shape(ctx, pts, { fill: C.yellow, seed, lw: 2.2, subdiv: false, stroke: INKC });
  } else if (type === 'bulb') { // idea!
    const s = size * 0.42;
    shape(ctx, ellipsePts(0, -s * 1.5, s * 0.8, s * 0.85, 28), { fill: '#ffe680', seed, lw: 2.6, stroke: INKC });
    rect(ctx, -s * 0.38, -s * 0.72, s * 0.76, s * 0.45, { r: s * 0.1, fill: C.grey, seed: seed + 1, lw: 2.2, stroke: INKC });
    for (let i = -2; i <= 2; i++) {
      const a = -Math.PI / 2 + i * 0.5;
      brush(ctx, [[Math.cos(a) * s * 1.15, -s * 1.5 + Math.sin(a) * s * 1.15], [Math.cos(a) * s * 1.6, -s * 1.5 + Math.sin(a) * s * 1.6]], { lw: 3, seed: seed + 5 + i, color: INKC });
    }
  }
  ctx.restore();
}

// motion / speed lines behind something moving in direction dir (+1 = right)
export function speedLines(ctx, x, y, h, dir, k, seed = 9, n = 3, len = 1) {
  if (k <= 0) return;
  for (let i = 0; i < n; i++) {
    const yy = y + (i - (n - 1) / 2) * (h / n) * 1.1;
    const l = h * (0.6 + 0.5 * hash2(i, seed)) * len * k;
    const x0 = x - dir * (h * 0.15 + hash2(i + 3, seed) * h * 0.2);
    brush(ctx, [[x0, yy], [x0 - dir * l, yy]], { lw: 2.8, seed: seed + i, alpha: 0.85 * k, profile: 'out' });
  }
}

// dust puffs at landing: k from 0..1 over the puff's life
export function dust(ctx, x, y, size, k, seed = 4, spread = 1, fill = 'rgba(250,244,232,0.75)') {
  if (k <= 0 || k >= 1) return;
  const e = 1 - Math.pow(1 - k, 2);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 2; i++) {
      const r = size * (0.22 + i * 0.12) * (1 - k * 0.7);
      const px = x + side * size * (0.55 + e * 0.9 * spread + i * 0.35);
      const py = y - size * (0.15 + e * 0.25 + i * 0.1);
      circle(ctx, px, py, r, { fill, stroke: 'rgba(43,38,34,0.55)', seed: seed + i + side * 5, lw: 1.8, alpha: (1 - k) * 0.9 });
    }
  }
}

export { lerp };
