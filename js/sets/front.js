// FRONT set: seen from the monitor. 2D layout in body centimetres (origin = seat centre, +y down) with the
// rear of the room behind him as a parallax layer: the door, a coat hook, the bed, a calendar.
// The desk edge and keyboard in the foreground are drawn *inside* his figure so his hands rest on them.
import { C, rect, line, shape, ellipse, circle, rectPts, ellipsePts, text, brush, softShadow, curScale, ZH_FONT, HAND_FONT } from '../draw.js';
import { Fig } from '../figure.js';
import { drawFront, inkFor } from '../human/body.js';
import { LightMap, addGlow } from '../light.js';
import { ambient, sunK, rgbs, clockMinutes } from './tod.js';
import { mugSide } from './props.js';
import { clamp, lerp, hash2, TAU } from '../core.js';

export const FRONT_D = 160;      // camera distance to his plane
export const REAR = 215;         // depth of the rear wall behind him
export const F_DESK = -23.5;     // desk edge (body y) as seen from the monitor
export const F_KB = { y0: -22.8, y1: -15.5, w0: 21, w1: 24.5 };

export function frontProj(cam) {
  const f = cam.zoom * FRONT_D;
  const s = (d) => f / (FRONT_D + d);
  return {
    s,
    P: (x, y, d = 0) => [960 + (x - cam.x) * s(d), 540 + (y - cam.y) * s(d)],
    layer: (ctx, d, fn) => { const k = s(d); ctx.save(); ctx.translate(960 - cam.x * k, 540 - cam.y * k); ctx.scale(k, k); fn(ctx, k); ctx.restore(); },
  };
}

// desk + keyboard, added into the character's figure at depth z
export function frontDesk(S) {
  return (fig, z) => {
    const kb = F_KB;
    fig.add('desk', [[-160, F_DESK], [160, F_DESK], [160, 60], [-160, 60]], { fill: '#caa77d', z, edge: true, sharp: true, noOutline: true, noLight: true });
    fig.line([[-160, F_DESK + 1.4], [160, F_DESK + 1.4]], { z: z + 0.01, lw: 1.6, color: 'rgba(120,80,50,0.5)', brush: false });
    fig.add('kb', [[-kb.w0, kb.y0], [kb.w0, kb.y0], [kb.w1, kb.y1], [-kb.w1, kb.y1]], { fill: '#e7e0d4', z: z + 0.1, edge: true, sharp: true, noLight: true });
    fig.after((c) => {
      const press = S.kbKeys || {};
      for (let r = 0; r < 4; r++) {
        const v = (r + 0.5) / 4;
        const y = lerp(kb.y0 + 0.7, kb.y1 - 0.6, v);
        const w = lerp(kb.w0, kb.w1, v) - 1.3;
        const n = 13;
        for (let i = 0; i < n; i++) {
          const kw = (2 * w) / n;
          const x = -w + i * kw;
          const dn = press[r * 20 + i] || 0;
          c.fillStyle = dn > 0 ? '#cfc6b6' : '#f7f2e9';
          c.beginPath(); c.roundRect(x + 0.2, y - 0.75 + dn * 0.25, kw - 0.4, 1.35, 0.35); c.fill();
          c.fillStyle = 'rgba(80,70,60,0.18)'; c.fillRect(x + 0.2, y + 0.55 + dn * 0.25, kw - 0.4, 0.3);
        }
      }
    }, z + 0.2, ['kb']);
    // mugs close to the camera at the desk corners (big, soft)
    const cups = S.cups ?? 3;
    fig.after((c) => {
      const spots = [[-50, F_DESK + 3.5, 0.95], [56, F_DESK + 5, 1.0], [-68, F_DESK + 7, 1.05], [74, F_DESK + 9, 1.1]];
      for (let i = 0; i < Math.min(cups, spots.length); i++) {
        const [x, y, s] = spots[i];
        c.save(); c.translate(x, y); c.scale(s, s); mugSide(c, i + 1, 0.35, { flip: x > 0 }); c.restore();
      }
    }, z + 0.3);
  };
}

export function drawFrontSet(ctx, S, cam, o = {}) {
  const pj = frontProj(cam);
  const { P, layer } = pj;
  const tod = S.tod ?? 0;
  // ---------------- rear wall of the room (far behind him)
  layer(ctx, REAR, (c, k) => {
    c.fillStyle = '#e6d8c0'; c.fillRect(-500, -330, 1000, 380);
    c.fillStyle = 'rgba(205,185,155,0.25)';
    for (let x = -500; x < 500; x += 22) c.fillRect(x, -330, 8, 377);
    c.fillStyle = '#d6c4a6'; c.fillRect(-500, 38, 1000, 9);
    c.fillStyle = '#b8966e'; c.fillRect(-500, 47, 1000, 120);
    const fig = new Fig(c, { lw: inkFor(k) * 0.8, seed: 701 });
    // door (closed), with a hoodie hanging on it
    fig.add('frame', rectPts(-150, -168, 100, 215, 1, 2), { fill: '#efe5d3', z: 0, sharp: true });
    fig.add('door', rectPts(-144, -162, 88, 209, 1, 2), { fill: '#d8c3a2', z: 0.1, edge: true, sharp: true });
    fig.line([[-138, -150], [-62, -150], [-62, -60], [-138, -60], [-138, -150]], { z: 0.2, lw: 1.6, color: '#b89f7c', brush: false, smooth: false });
    fig.add('knob', ellipsePts(-132, -65, 3, 3, 12), { fill: '#b8a36a', z: 0.3, edge: true });
    // light switch + calendar
    fig.add('switch', rectPts(-36, -74, 8, 12, 1, 1), { fill: '#f7f1e6', z: 0 });
    fig.add('cal', rectPts(-20, -180, 40, 54, 1, 1), { fill: '#fbf6ea', z: 0 });
    fig.add('calTop', rectPts(-20, -180, 40, 12, 1, 1), { fill: '#e2574c', z: 0.1, edge: true });
    fig.after((cc) => {
      for (let r = 0; r < 5; r++) for (let q = 0; q < 7; q++) { cc.fillStyle = r === 3 && q === 4 ? '#e2574c' : 'rgba(80,70,60,0.35)'; cc.fillRect(-16 + q * 5.2, -160 + r * 6.5, 3, 3); }
      text(cc, 'DEADLINE', 0, -174, { size: 5.4, font: HAND_FONT, color: '#fff8ec' });
    }, 1);
    // bed along the side wall (screen right)
    fig.add('bedframe', [[70, -2], [320, -2], [320, 30], [70, 30]], { fill: '#a98a6a', z: 0, sharp: true });
    fig.add('mattress', [[64, -24], [320, -24], [320, -1], [66, -1]], { fill: '#f1ece2', z: 0.2 });
    fig.add('duvet', [[98, -30], [320, -34], [320, 4], [120, 6], [100, -6]], { fill: '#9fb7cf', z: 0.4 });
    fig.add('pillow', [[68, -38], [102, -40], [106, -24], [70, -22]], { fill: '#fbf8f2', z: 0.5 });
    fig.add('head', rectPts(58, -76, 14, 104, 2, 2), { fill: '#a98a6a', z: 0.1 });
    // shelf with a small clock
    fig.add('shelf', rectPts(60, -150, 90, 5, 1, 1), { fill: '#c9a47a', z: 0 });
    const mins = S.clock ?? clockMinutes(tod);
    fig.add('clock', rectPts(70, -168, 26, 18, 3, 1), { fill: '#3b4049', z: 0.1 });
    fig.after((cc) => {
      const hh = Math.floor(mins / 60) % 12 || 12, mm = Math.floor(mins % 60);
      cc.font = `11px "JetBrains Mono"`; cc.textAlign = 'center'; cc.textBaseline = 'middle';
      cc.fillStyle = '#ff7a5c'; cc.fillText(`${hh}:${String(mm).padStart(2, '0')}`, 83, -158.6);
    }, 1);
    fig.add('plant', [[118, -150], [134, -150], [132, -164], [120, -164]], { fill: '#e7b98f', z: 0.1 });
    for (let i = 0; i < 4; i++) fig.line([[126, -163], [126 + (i - 1.5) * 6, -182 + Math.abs(i - 1.5) * 4]], { z: 0.05, lw: 4, color: '#6f9e72', brush: 'out' });
    fig.draw();
  });
  // ---------------- his chair's backrest, just behind him
  layer(ctx, 14, (c, k) => {
    const fig = new Fig(c, { lw: inkFor(k) * 0.9, seed: 711 });
    const tilt = S.chairTilt || 0;
    fig.add('rest', [[-19, -33 + tilt * 6], [19, -33 + tilt * 6], [20, -6], [-20, -6]], { fill: '#454b57', z: 0 });
    fig.draw();
  });
  // ---------------- the character (with desk & keyboard inside his figure)
  const hum = S.human;
  if (hum) layer(ctx, 0, (c) => { drawFront(c, hum.P, hum.D, { desk: frontDesk(S), lights: hum.lights, seed: 11 }); });
  if (o.after) layer(ctx, 0, (c) => o.after(c, pj));
  lightFront(ctx, S, pj);
}

function lightFront(ctx, S, pj) {
  const { P } = pj;
  const tod = S.tod ?? 0;
  const k = pj.s(0);
  const L = new LightMap(ctx, `rgb(${rgbs(ambient(tod))})`);
  const scr = S.screen ?? 1;
  const sRGB = S.screenRGB || '170,190,255';
  // the screen is right where the camera is: frontal light on his face and chest
  const f = P(0, -62, 0);
  L.point(f[0], f[1] + 8 * k, 100 * k, sRGB, 0.72 * scr, 1.15, 1.05);
  L.point(f[0], f[1] + 50 * k, 95 * k, sRGB, 0.38 * scr, 1.6, 0.6);
  // desk lamp to his left (screen left): warm side light + spill on the wall behind
  const lamp = S.lamp ?? 1;
  const lp = P(-60, -40, -10);
  L.point(lp[0], lp[1], 85 * k, '255,205,140', 0.5 * lamp, 1.1, 1.3);
  const wl = P(-120, -60, REAR);
  L.point(wl[0], wl[1], 140 * pj.s(REAR), '255,200,140', 0.35 * lamp, 1.2, 1);
  // dawn from the window behind the monitor (screen right)
  const sk = sunK(tod);
  if (sk > 0.001) {
    const sp = P(70, -70, 0);
    L.point(sp[0], sp[1], 130 * k, '255,200,140', 0.8 * sk, 1.1, 1.2);
    L.fill('255,196,160', 0.15 * sk);
  }
  if (S.extraLights) S.extraLights(L, pj);
  L.apply();
  if (S.flashRGB && S.flashA > 0.01) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(f[0], f[1], 0, f[0], f[1], 55 * k);
    g.addColorStop(0, `rgba(${S.flashRGB},${0.3 * S.flashA})`); g.addColorStop(0.6, `rgba(${S.flashRGB},${0.1 * S.flashA})`); g.addColorStop(1, `rgba(${S.flashRGB},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
    ctx.restore();
  }
}
