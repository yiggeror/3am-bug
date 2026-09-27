// A tiny choreography engine for characters inside the code world.
// Positions are written in code coordinates — [line, col] — and resolved to world units.
// A path is a list of segments: { type, t0, t1, ... }. Between segments the character holds.
//   stand   { at }                               idle on a platform
//   run     { line, c0, c1, ease }               run along a line (col c0 → c1)
//   jump    { from, to, h }                       ballistic hop between cells (h = apex height in px)
//   fall    { from: [x, y], to }                  drop in from anywhere
//   move    { from: [x,y], to: [x,y], ease }      free move (carried, sliding…)
// The engine returns position, velocity, "air", and impulses (landings, take-offs) so the character
// rig can add anticipation, stretch, squash & spring.
import { LINES, charCX } from '../codeworld.js';
import { clamp, lerp, ease } from '../core.js';

export function cell(line, col) { return [charCX(col), LINES[line].ground + 6]; }
const P = (p) => (Array.isArray(p) && p.length === 2 && Number.isInteger(p[0]) && p[0] < LINES.length && !(p.world) ? cell(p[0], p[1]) : p);

export function resolve(path) {
  return path.map((s) => {
    const r = { ...s };
    if (s.type === 'stand') r.p0 = r.p1 = cell(...s.at);
    if (s.type === 'run') { r.p0 = cell(s.line, s.c0); r.p1 = cell(s.line, s.c1); }
    if (s.type === 'jump') { r.p0 = cell(...s.from); r.p1 = cell(...s.to); }
    if (s.type === 'fall') { r.p0 = s.from; r.p1 = cell(...s.to); }
    if (s.type === 'move') { r.p0 = s.from.length === 2 && s.fromCell ? cell(...s.from) : s.from; r.p1 = s.toCell ? cell(...s.to) : s.to; }
    return r;
  });
}

// evaluate a resolved path at time t
export function evalPath(path, t) {
  let seg = null, prev = null;
  for (const s of path) { if (t >= s.t0) { if (t < s.t1) { seg = s; break; } prev = s; } }
  if (!seg) {
    const s = prev || path[0];
    const p = prev ? s.p1 : s.p0;
    return { x: p[0], y: p[1], vx: 0, air: 0, type: 'hold', seg: s, k: 1, dir: s.dir ?? Math.sign((s.p1[0] - s.p0[0]) || 1) };
  }
  const k = clamp((t - seg.t0) / (seg.t1 - seg.t0));
  const dur = seg.t1 - seg.t0;
  const dir = seg.dir ?? Math.sign((seg.p1[0] - seg.p0[0]) || 1);
  if (seg.type === 'stand') return { x: seg.p0[0], y: seg.p0[1], vx: 0, air: 0, type: 'stand', seg, k, dir };
  if (seg.type === 'run' || seg.type === 'move') {
    const e = (ease[seg.ease || 'inOut'] || ease.inOut)(k);
    const x = lerp(seg.p0[0], seg.p1[0], e), y = lerp(seg.p0[1], seg.p1[1], e);
    const dk = 0.01;
    const e2 = (ease[seg.ease || 'inOut'] || ease.inOut)(Math.min(1, k + dk));
    const vx = ((lerp(seg.p0[0], seg.p1[0], e2) - x) / (dk * dur)) || 0;
    return { x, y, vx, air: 0, type: seg.type, seg, k, dir, dist: Math.abs(x - seg.p0[0]) };
  }
  if (seg.type === 'jump' || seg.type === 'fall') {
    const x = lerp(seg.p0[0], seg.p1[0], k);
    const base = lerp(seg.p0[1], seg.p1[1], k);
    const h = seg.type === 'fall' ? 0 : (seg.h ?? 160) + Math.max(0, seg.p0[1] - seg.p1[1]) * 0.5;
    const y = seg.type === 'fall' ? lerp(seg.p0[1], seg.p1[1], k * k) : base - h * 4 * k * (1 - k);
    const vy = seg.type === 'fall' ? 2 * k * (seg.p1[1] - seg.p0[1]) / dur : ((seg.p1[1] - seg.p0[1]) - h * 4 * (1 - 2 * k)) / dur;
    return { x, y, vx: (seg.p1[0] - seg.p0[0]) / dur, vy, air: 1, type: seg.type, seg, k, dir };
  }
  return { x: seg.p0[0], y: seg.p0[1], vx: 0, air: 0, type: 'hold', seg, k, dir };
}

// times at which the character leaves / meets the ground
export function takeoffs(path) { return path.filter((s) => s.type === 'jump').map((s) => s.t0); }
export function landings(path) { return path.filter((s) => s.type === 'jump' || s.type === 'fall').map((s) => ({ t: s.t1, hard: s.hard ?? (s.type === 'fall' ? 1 : 0.6) })); }

// squash impulse after landings, and the crouch before take-offs (anticipation)
export function squashAt(path, t, o = {}) {
  let sq = 0;
  for (const L of landings(path)) {
    const d = t - L.t;
    if (d >= 0 && d < 1.2) sq += (o.land ?? 0.42) * L.hard * Math.exp(-d * 7) * Math.cos(d * 24);
  }
  for (const t0 of takeoffs(path)) {
    const d = t0 - t;
    const wind = o.wind ?? 0.22;
    if (d > 0 && d < wind) sq += (o.crouch ?? 0.34) * Math.sin((1 - d / wind) * Math.PI * 0.5);
    const a = t - t0; // launch stretch
    if (a >= 0 && a < 0.16) sq -= (o.stretch ?? 0.3) * Math.sin((a / 0.16) * Math.PI);
  }
  return sq;
}
