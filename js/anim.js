// Animation helpers: channel tracks, "on twos" timing, spring follow-through, blinks, breathing.
import { key, ease, clamp, lerp, noise1, hash2, TAU } from './core.js';

export const TWOS = 12;
export const onTwos = (t, fps = TWOS) => Math.floor(t * fps + 1e-6) / fps;

export function setPath(o, path, v) {
  const ks = path.split('.');
  let c = o;
  for (let i = 0; i < ks.length - 1; i++) c = c[ks[i]] ||= {};
  c[ks[ks.length - 1]] = v;
}
export function getPath(o, path, dflt = 0) {
  let c = o;
  for (const k of path.split('.')) { if (c == null) return dflt; c = c[k]; }
  return c ?? dflt;
}
// tracks: { 'head.nod': [[t, v, ease?], ...], ... } → nested object
export function evalTracks(T, t) {
  const out = {};
  for (const path in T) setPath(out, path, key(t, T[path]));
  return out;
}
// deep merge (b wins; arrays and non-plain values replaced)
export function merge(a, b) {
  if (b === undefined) return a;
  if (a === null || typeof a !== 'object' || Array.isArray(a) || b === null || typeof b !== 'object' || Array.isArray(b)) return b;
  const o = { ...a };
  for (const k in b) o[k] = merge(a[k], b[k]);
  return o;
}
// add numeric leaves of b onto a (for layering idle motion over a performance)
export function addTo(a, b) {
  const o = Array.isArray(a) ? a.slice() : { ...a };
  for (const k in b) {
    const v = b[k];
    if (typeof v === 'number') o[k] = (typeof o[k] === 'number' ? o[k] : 0) + v;
    else if (Array.isArray(v)) o[k] = (o[k] || v.map(() => 0)).map((x, i) => x + (v[i] || 0));
    else if (v && typeof v === 'object') o[k] = addTo(o[k] || {}, v);
  }
  return o;
}

// Damped spring following a scalar signal f(t): x'' = w²(f - x) - 2ζw x'.
// Simulated over a trailing window so the result is a pure function of t.
export function follow(f, t, freq = 2, damp = 0.35, win = 1.4, dt = 1 / 90) {
  const w = TAU * freq;
  let tt = t - win;
  let x = f(tt), v = 0;
  const n = Math.round(win / dt);
  for (let i = 0; i < n; i++) {
    tt += dt;
    const a = w * w * (f(tt) - x) - 2 * damp * w * v;
    v += a * dt;
    x += v * dt;
  }
  return x;
}
// the lag/overshoot of a follower relative to its driver (for hair, strings, antennae…)
export function lagOf(f, t, freq, damp, win) { return follow(f, t, freq, damp, win) - f(t); }

// natural blinking: deterministic, slightly irregular intervals. Returns 0..1 lid closure.
export function blink(t, seed = 1, every = 3.6, dur = 0.17) {
  const i = Math.floor(t / every);
  let out = 0;
  for (const j of [i - 1, i]) {
    const t0 = j * every + hash2(j, seed) * (every - dur - 0.1);
    const d = t - t0;
    if (d >= 0 && d < dur) out = Math.max(out, Math.sin((d / dur) * Math.PI));
    // occasional double blink
    if (hash2(j, seed + 7) > 0.8) { const d2 = d - dur - 0.08; if (d2 >= 0 && d2 < dur) out = Math.max(out, Math.sin((d2 / dur) * Math.PI)); }
  }
  return out;
}
// explicit blinks at given times (with custom durations)
export function blinksAt(t, list, dur = 0.16) {
  let out = 0;
  for (const b of list) {
    const t0 = Array.isArray(b) ? b[0] : b, dd = Array.isArray(b) ? b[1] : dur;
    const d = t - t0;
    if (d >= 0 && d < dd) out = Math.max(out, Math.sin((d / dd) * Math.PI));
  }
  return out;
}
// breathing: slow inhale, quicker exhale, small pause
export function breathe(t, rate = 0.23, phase = 0) {
  const u = ((t * rate + phase) % 1 + 1) % 1;
  if (u < 0.42) return -1 + 2 * ease.sine(u / 0.42);
  if (u < 0.8) return 1 - 2 * ease.sine((u - 0.42) / 0.38);
  return -1;
}
// small organic drift
export function drift(t, seed, amp = 1, speed = 0.3) { return noise1(t * speed, seed) * amp; }
