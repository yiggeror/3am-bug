// Continuous-silhouette figures.
//
// A figure is a set of soft closed shapes ("parts": torso, sleeves, hands, head, hair...) that are drawn
// as ONE drawing: every part is stroked with a double-width ink line first, then all parts are filled on
// top. Where parts overlap the inner lines vanish, so the result is a single continuous outline around the
// whole union — no seams or joints between pieces, like a character drawn in one go.
// Interior lines that an animator *would* draw (a sleeve crossing the chest, a fringe over the forehead,
// a cuff) are added explicitly, clipped to the parts underneath and tapered like a brush.
// Fills, edges, shading and detail lines are interleaved in z order, so a hand rubbing an eye covers the eye.
import { curScale, jitter, spline, resample, addPath, getInkScale, getInk, brush, subdiv } from './draw.js';

function signedArea(p) {
  let a = 0;
  for (let i = 0, n = p.length; i < n; i++) { const q = p[i], r = p[(i + 1) % n]; a += q[0] * r[1] - r[0] * q[1]; }
  return a / 2;
}

export class Fig {
  // o: { lw: outline width (screen px), amp: jitter (screen px), ink, seed }
  constructor(ctx, o = {}) {
    this.ctx = ctx;
    this.parts = [];
    this.ops = [];
    this.lw = o.lw ?? 3.4;
    this.amp = o.amp ?? 0.85;
    this.ink = o.ink || getInk();
    this.seed = o.seed || 1;
    this.alpha = o.alpha ?? 1;
    this.n = 0;
  }
  // closed shape through control points (smoothed with a spline unless o.sharp / o.raw)
  // o: { fill, z, seed, edge: true | [names], edgeLines: [[pts...], ...] (open lines drawn instead of the
  //      whole outline, tapering in from their first point), noOutline, per, sharp, raw, lwMul }
  add(name, pts, o = {}) {
    if (!pts || pts.length < 3) return null;
    const p = { type: 'part', name, pts, z: o.z ?? 0, fill: o.fill, o, idx: this.n++ };
    this.parts.push(p);
    this.ops.push(p);
    return p;
  }
  // detail line. o: { z, clip: [names] | 'all' | 'below', brush: profile | false, lw, color, seed, closed, alpha, fill, stroke }
  line(pts, o = {}) { if (pts && pts.length >= 2) this.ops.push({ type: 'line', pts, o, z: o.z ?? 1e9, idx: this.n++ }); }
  // shading: fn(ctx) drawn clipped to the named parts (or 'all' / 'below')
  shade(fn, clip = 'all', z = 1e9) { this.ops.push({ type: 'shade', fn, clip, z, idx: this.n++ }); }
  // arbitrary drawing at depth z (optional clip)
  after(fn, z = 1e9, clip = null) { this.ops.push({ type: 'fn', fn, clip, z, idx: this.n++ }); }
  // cel light on the silhouette: a crescent on the side the light comes from.
  // o: { rgb, a, v: [dx, dy] screen px toward the light (several allowed via vs), mode: 'lighter' | 'multiply' | 'source-over',
  //      blur (px), only: [names] | null, exclude: [names] }
  edgeLight(o) { (this.lights ||= []).push(o); }

  _prep() {
    const ctx = this.ctx, s = curScale(ctx);
    for (const p of this.parts) {
      let pts = p.pts;
      if (!p.o.raw) {
        if (!p.o.sharp) pts = spline(pts, true, p.o.per ?? 6);
        pts = resample(pts, (p.o.seg ?? 9) / s, true);
      }
      if (signedArea(pts) < 0) pts = pts.slice().reverse();
      const j = p.o.still ? pts : jitter(ctx, pts, this.seed * 97 + (p.o.seed ?? p.idx * 13 + 5), (p.o.amp ?? this.amp));
      const path = new Path2D();
      addPath(path, j, true);
      p.path = path;
    }
    this.ops.sort((a, b) => a.z - b.z || a.idx - b.idx);
  }
  _clip(clip, drawn, self) {
    const path = new Path2D();
    let any = false;
    const pool = clip === 'below' ? drawn : this.parts;
    for (const p of pool) {
      if (p === self) continue;
      const ok = clip === 'all' || clip === 'below' ? true : Array.isArray(clip) ? clip.includes(p.name) : p.name === clip;
      if (ok && (clip !== 'below' || true)) {
        if (Array.isArray(clip) && !drawn.includes(p) && self) continue; // only parts under `self`
        path.addPath(p.path); any = true;
      }
    }
    return any ? path : null;
  }
  draw() {
    const ctx = this.ctx;
    if (!this.ops.length) return;
    this._prep();
    const s = curScale(ctx);
    const lw = (this.lw * getInkScale()) / s;
    ctx.save();
    if (this.alpha < 1) ctx.globalAlpha *= this.alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // 1) outline of the union: double-width strokes under everything
    ctx.strokeStyle = this.ink;
    for (const p of this.parts) {
      if (p.o.noOutline) continue;
      ctx.lineWidth = lw * 2 * (p.o.lwMul ?? 1);
      ctx.stroke(p.path);
    }
    // 2) fills / edges / shading / details, interleaved in z order
    const drawn = [];
    for (const op of this.ops) {
      if (op.type === 'part') {
        const p = op;
        if (p.fill) {
          if (p.o.alpha !== undefined) { ctx.save(); ctx.globalAlpha *= p.o.alpha; ctx.fillStyle = p.fill; ctx.fill(p.path); ctx.restore(); } else { ctx.fillStyle = p.fill; ctx.fill(p.path); }
        }
        if (p.o.edge) {
          const cp = this._clip(p.o.edge === true ? 'below' : p.o.edge, drawn, p);
          if (cp) {
            ctx.save();
            ctx.clip(cp);
            if (p.o.edgeLines) {
              for (const el of p.o.edgeLines) brush(ctx, el, { lw: this.lw * (p.o.edgeMul ?? 0.95), seed: this.seed + p.idx * 7, color: p.o.edgeColor || this.ink, profile: p.o.edgeProfile || EDGE_IN, amp: 0.4 });
            } else {
              ctx.strokeStyle = p.o.edgeColor || this.ink;
              ctx.lineWidth = lw * (p.o.edgeMul ?? 0.9);
              ctx.stroke(p.path);
            }
            ctx.restore();
          }
        }
        drawn.push(p);
      } else if (op.type === 'shade' || op.type === 'fn') {
        let cp = null;
        if (op.clip) { cp = this._clip(op.clip, drawn, null); if (!cp) continue; }
        ctx.save();
        if (cp) ctx.clip(cp);
        op.fn(ctx);
        ctx.restore();
      } else if (op.type === 'line') {
        const o = op.o;
        let cp = null;
        if (o.clip) { cp = this._clip(o.clip, drawn, null); if (!cp) continue; }
        ctx.save();
        if (cp) ctx.clip(cp);
        if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
        if (o.fill) {
          const pts = o.smooth === false ? op.pts : spline(op.pts, true, 5);
          const j = jitter(ctx, resample(pts, 7 / s, true), this.seed * 31 + (o.seed || 3), this.amp * (o.ampMul ?? 0.7));
          ctx.beginPath(); addPath(ctx, j, true);
          ctx.fillStyle = o.fill; ctx.fill();
          if (o.stroke !== false) { ctx.strokeStyle = o.color || this.ink; ctx.lineWidth = ((o.lw ?? this.lw * 0.7) * getInkScale()) / s; ctx.stroke(); }
        } else if (o.brush === false) {
          const pts = o.smooth === false ? op.pts : spline(op.pts, !!o.closed, 5);
          const j = jitter(ctx, resample(pts, 7 / s, !!o.closed), this.seed * 31 + (o.seed || 3), this.amp * 0.7);
          ctx.beginPath(); addPath(ctx, j, !!o.closed);
          ctx.strokeStyle = o.color || this.ink;
          ctx.lineWidth = ((o.lw ?? this.lw * 0.8) * getInkScale()) / s;
          ctx.stroke();
        } else {
          brush(ctx, op.pts, { lw: o.lw ?? this.lw * 0.95, seed: this.seed * 31 + (o.seed || 3), color: o.color || this.ink, profile: o.brush || 'taper', amp: o.amp ?? 0.35, smooth: o.smooth });
        }
        ctx.restore();
      }
    }
    ctx.restore();
    if (this.lights) for (const L of this.lights) this._edgeLight(L);
  }
  _edgeLight(L) {
    const ctx = this.ctx, cv = ctx.canvas;
    const W = cv.width, H = cv.height;
    const acc = offscreen(0, W, H), tmp = offscreen(1, W, H);
    const ac = acc.getContext('2d'), tc = tmp.getContext('2d');
    ac.setTransform(1, 0, 0, 1, 0, 0); ac.globalCompositeOperation = 'source-over'; ac.globalAlpha = 1; ac.filter = 'none'; ac.clearRect(0, 0, W, H);
    const m = ctx.getTransform();
    const lit = (p) => (!L.only || L.only.includes(p.name)) && !(L.exclude && L.exclude.includes(p.name)) && !p.o.noLight;
    const parts = this.parts.filter(lit);
    const order = this.parts.slice().sort((a, b) => a.z - b.z || a.idx - b.idx);
    const occludes = order.some((p) => p.o.noLight && p.path);
    const k = cv.width / 1920;
    const vs = L.vs || [L.v];
    // the visible lit silhouette: lit parts paint it in draw order, unlit parts in front of them (a desk,
    // a keyboard) erase it — so the rim light never shows through something that covers the figure
    let vis = null;
    if (occludes) {
      vis = offscreen(2, W, H);
      const vc = vis.getContext('2d');
      vc.setTransform(1, 0, 0, 1, 0, 0); vc.globalCompositeOperation = 'source-over'; vc.clearRect(0, 0, W, H);
      vc.setTransform(m); vc.fillStyle = '#fff';
      for (const p of order) {
        if (lit(p)) { vc.globalCompositeOperation = 'source-over'; vc.fill(p.path); }
        else if (p.o.noLight && p.path) { vc.globalCompositeOperation = 'destination-out'; vc.fill(p.path); }
      }
    }
    const fillAll = (c, dx, dy) => {
      if (vis) { c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(vis, dx, dy); return; }
      c.setTransform(new DOMMatrix([1, 0, 0, 1, dx, dy]).multiply(m));
      for (const p of parts) c.fill(p.path);
    };
    for (const v of vs) {
      tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H);
      tc.fillStyle = '#fff';
      fillAll(tc, 0, 0);
      tc.globalCompositeOperation = 'destination-out';
      fillAll(tc, -v[0] * k, -v[1] * k);
      ac.setTransform(1, 0, 0, 1, 0, 0);
      ac.globalCompositeOperation = 'lighter';
      ac.drawImage(tmp, 0, 0);
    }
    // colourise, keep inside the silhouette
    ac.setTransform(1, 0, 0, 1, 0, 0);
    ac.globalCompositeOperation = 'source-in';
    ac.fillStyle = `rgb(${L.rgb})`;
    ac.fillRect(0, 0, W, H);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = L.mode || 'lighter';
    ctx.globalAlpha = L.a ?? 0.8;
    if (L.blur) ctx.filter = `blur(${L.blur * k}px)`;
    if (L.blur) {
      // blur can bleed outside: clip to the silhouette
      ctx.setTransform(m);
      const clip = new Path2D();
      for (const p of parts) clip.addPath(p.path);
      ctx.clip(clip);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.drawImage(acc, 0, 0);
    ctx.restore();
  }
}
const OFF = [];
function offscreen(i, w, h) {
  let c = OFF[i];
  if (!c) c = OFF[i] = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
}
// edge lines fade in from the root (first point) so a sleeve grows out of the shoulder without a seam
export const EDGE_IN = (u) => Math.min(1, Math.max(0, (u - 0.05) / 0.3)) * (u > 0.93 ? Math.max(0.35, (1 - u) / 0.07) : 1);

// ---------------------------------------------------------------- shape builders
// A soft tube along a spine with a width profile: returns a closed outline plus its two sides.
// widths: array of [u, halfWidth | [left, right]] (u in 0..1 along the spine) or fn(u).
export function tube(spine, widths, o = {}) {
  const sp = resample(o.smooth === false ? spine : spline(spine, false, 8), o.step ?? 1.2, false);
  const n = sp.length;
  const wf = typeof widths === 'function' ? widths : (u) => profileAt(widths, u);
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = i / (n - 1);
    const w = wf(u);
    const wl = Array.isArray(w) ? w[0] : w, wr = Array.isArray(w) ? w[1] : w;
    L.push([sp[i][0] - dy * wl, sp[i][1] + dx * wl]);
    R.push([sp[i][0] + dy * wr, sp[i][1] - dx * wr]);
  }
  const out = [];
  if (o.capStart !== 'flat') out.push(...capArc(sp[0], sp[1], R[0], L[0], o.capStartK ?? 1));
  for (let i = 0; i < n; i++) out.push(L[i]);
  if (o.capEnd !== 'flat') out.push(...capArc(sp[n - 1], sp[n - 2], L[n - 1], R[n - 1], o.capEndK ?? 1));
  for (let i = n - 1; i >= 0; i--) out.push(R[i]);
  return { outline: out, left: L, right: R, spine: sp };
}
function capArc(c, prev, from, to, k) {
  const ax = c[0] - prev[0], ay = c[1] - prev[1];
  const d = Math.hypot(ax, ay) || 1;
  const ux = ax / d, uy = ay / d;
  const r = Math.hypot(from[0] - to[0], from[1] - to[1]) / 2;
  const pts = [];
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const mx = from[0] + (to[0] - from[0]) * t, my = from[1] + (to[1] - from[1]) * t;
    const bulge = Math.sin(Math.PI * t) * r * k;
    pts.push([mx + ux * bulge, my + uy * bulge]);
  }
  return pts;
}
export function profileAt(w, u) {
  if (u <= w[0][0]) return w[0][1];
  for (let i = 1; i < w.length; i++) {
    if (u <= w[i][0]) {
      const k = (u - w[i - 1][0]) / (w[i][0] - w[i - 1][0]);
      const s = k * k * (3 - 2 * k);
      const a = w[i - 1][1], b = w[i][1];
      if (Array.isArray(a)) return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
      return a + (b - a) * s;
    }
  }
  return w[w.length - 1][1];
}

// push points away from a centre by bumps between control points → soft tufts (hair, clouds)
export function tufts(pts, amp, seed = 1, cx = null, cy = null) {
  if (cx === null) { cx = 0; cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; } cx /= pts.length; cy /= pts.length; }
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    out.push(a);
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dx = m[0] - cx, dy = m[1] - cy, d = Math.hypot(dx, dy) || 1;
    const k = amp * (0.55 + 0.9 * frac(Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453));
    out.push([m[0] + (dx / d) * k, m[1] + (dy / d) * k]);
  }
  return out;
}
const frac = (x) => x - Math.floor(x);

export function rotP([x, y], a, cx = 0, cy = 0) { const c = Math.cos(a), s = Math.sin(a); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; }
export function lerpP(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
export { subdiv };
