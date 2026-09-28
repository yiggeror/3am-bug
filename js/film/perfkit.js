// Shared performance tools for the programmer, and the room's state over story time.
import { key, ease, clamp, lerp, noise1, hash2 } from '../core.js';
import { evalTracks, follow, lagOf, blink, blinksAt, breathe, drift, onTwos } from '../anim.js';
import { todAt, clockAt, cupsAt, messAt, T } from './times.js';
import { screenLight } from './code.js';
import { screenContent } from './screen_content.js';
import { DESIGNS } from '../human/design.js';

export const D = DESIGNS.A;
export const K = key;
export { evalTracks, onTwos, follow, blinksAt };

// breathing, blinking and small drifts layered over a performance
export function idle(P, t, o = {}) {
  const br = breathe(t, o.rate ?? 0.24, o.phase ?? 0) * (o.amp ?? 1);
  P.breath = (P.breath || 0) + br * 0.7;
  P.shrug = (P.shrug || 0) + br * 0.05;
  const h = P.head || {};
  P.head = { ...h, nod: (h.nod || 0) + br * 0.015 + drift(t, 11 + (o.seed || 0), 0.025, 0.4), turn: (h.turn || 0) + drift(t, 12 + (o.seed || 0), 0.035, 0.22), tilt: (h.tilt || 0) + drift(t, 13 + (o.seed || 0), 0.018, 0.3) };
  if (!o.noBlink) {
    const bl = blink(t, o.seed ?? 3, o.every ?? 3.3);
    const f = P.face || {};
    P.face = { ...f, lid: clamp((f.lid ?? 0) + bl * (1 - (f.lid ?? 0))) };
  }
  P.hair = { ...(P.hair || {}), mess: Math.max(P.hair?.mess ?? 0, messAt(t)) };
  return P;
}
// follow-through for hair, cowlick and hood strings, driven by a scalar proxy of the head's motion
export function withSecondary(perf, t, proxy, gain = 0.05) {
  const P = perf(t);
  const f = (tt) => proxy(perf(tt));
  const lag = lagOf(f, t, 2.3, 0.26, 1.2), lag2 = lagOf(f, t, 1.6, 0.2, 1.4);
  P.hair = { ...(P.hair || {}), sway: (P.hair?.sway || 0) + clamp(lag * gain, -1.3, 1.3) };
  P.strings = (P.strings || 0) + clamp(lag2 * gain * 0.8, -1, 1);
  return P;
}
export const proxySide = (p) => (p.bend || 0) * 45 + (p.head?.nod || 0) * 12 + (p.slump || 0) * 10 - ((p.sy || 1) - 1) * 80;
export const proxyFront = (p) => (p.head?.nod || 0) * -18 + (p.slump || 0) * -10 + (p.shrug || 0) * -6 + (p.head?.tilt || 0) * 25 + (p.head?.turn || 0) * 12;
export const proxyBack = (p) => (p.head?.tilt || 0) * 30 + (p.head?.turn || 0) * 10 + (p.slump || 0) * 8;

// keystroke rhythm for body views: 0..1 pulses in bursts
export function strokes(t, seed, t0, t1, cps = 7) {
  if (t < t0 || t > t1) return 0;
  const burst = noise1(t * 0.9, seed) > -0.35 ? 1 : 0;
  const ph = (t * cps + hash2(Math.floor(t * cps), seed) * 0.3) % 1;
  return burst * Math.max(0, 1 - ph * 3.2);
}

// the room at story time t
export function room(t, o = {}) {
  const rgb = screenLight(t);
  return {
    t, tod: todAt(t), clock: clockAt(t), cups: cupsAt(t), lamp: 1, screen: o.screenK ?? 1,
    screenRGB: rgb.join(','),
    screenDraw: (c) => screenContent(c, t, o.scr || {}),
    ...o.S,
  };
}
// rim light from the monitor toward him (back views) and a warm lamp kiss
export function lightsBack(t) {
  const rgb = screenLight(t).join(',');
  return [{ rgb, a: 0.85, vs: [[0, -4], [-3, -1.5], [3, -1.5]] }];
}
export function lightsSide(t, extra = []) {
  const rgb = screenLight(t).join(',');
  const dawn = clamp((todAt(t) - 0.7) / 0.25);
  return [{ rgb, a: 0.6, vs: [[3.5, 0]] }, ...(dawn > 0 ? [{ rgb: '255,205,150', a: 0.55 * dawn, vs: [[3, -1.5]] }] : []), ...extra];
}
export function lightsFront(t) {
  return [{ rgb: '255,205,150', a: 0.35, vs: [[-3, 0]] }];
}
