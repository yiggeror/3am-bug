// Generic film runtime: a list of shots, each a pure function of time; dissolves, fades, post.
// renderFrame(ctx, t) is deterministic, which lets the same code drive a live player and the MP4 render.
import { setBoil, setInkScale } from './draw.js';
import { postProcess } from './post.js';
import { clamp } from './core.js';

export function makeFilm(shots) {
  const SHOTS = shots.slice().sort((a, b) => a.t0 - b.t0);
  const DURATION = Math.max(...SHOTS.map((s) => s.t1));
  let buf = null;
  const getBuf = (w, h) => {
    if (!buf) buf = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
    if (buf.width !== w || buf.height !== h) { buf.width = w; buf.height = h; }
    return buf;
  };
  const drawShot = (ctx, shot, t) => {
    ctx.save();
    setBoil(t);
    setInkScale(shot.ink || 1);
    shot.draw(ctx, t, t - shot.t0);
    ctx.restore();
    if (!shot.noPost) postProcess(ctx, t, shot.post || {});
  };
  const shotAt = (t) => {
    let cur = SHOTS[0];
    for (const s of SHOTS) if (t >= s.t0 && t < s.t1) cur = s;
    if (t >= DURATION) cur = SHOTS[SHOTS.length - 1];
    return cur;
  };
  function renderFrame(ctx, t, base = [1, 0, 0, 1, 0, 0]) {
    t = clamp(t, 0, DURATION - 1e-4);
    ctx.setTransform(...base);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
    const shot = shotAt(t);
    drawShot(ctx, shot, t);
    if (shot.dissolve && t < shot.t0 + shot.dissolve) {
      const prev = SHOTS[SHOTS.indexOf(shot) - 1];
      if (prev) {
        const cv = ctx.canvas;
        const b = getBuf(cv.width, cv.height);
        const bx = b.getContext('2d');
        bx.setTransform(...base);
        bx.fillStyle = '#000'; bx.fillRect(0, 0, 1920, 1080);
        drawShot(bx, prev, t);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 - (t - shot.t0) / shot.dissolve;
        ctx.drawImage(b, 0, 0);
        ctx.restore();
      }
    }
    if (shot.overlay) { ctx.save(); ctx.setTransform(...base); shot.overlay(ctx, t, t - shot.t0); ctx.restore(); }
    let a = 0;
    if (shot.fadeIn) a = Math.max(a, 1 - clamp((t - shot.t0) / shot.fadeIn));
    if (shot.fadeOut) a = Math.max(a, clamp((t - (shot.t1 - shot.fadeOut)) / shot.fadeOut));
    if (a > 0.001) { ctx.save(); ctx.setTransform(...base); ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }
    return shot;
  }
  return { SHOTS, DURATION, renderFrame, shotAt };
}
