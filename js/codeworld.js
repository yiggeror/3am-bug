// The code world: cart.js turned into a place.
//   - every line of code is a platform (the text is written on it); indentation makes steps
//   - every { … } pair is a room, and the braces themselves stand up as big door pillars
//   - comments float, translucent, like ghosts; the failing line is a flashing red zone
// World units: 1 unit = 1 px at zoom 1. Characters are drawn from the real tokens, so what the little
// friend walks on is exactly what the programmer sees in his editor.
import { CODE, PAL } from './screen.js';
import { shape, line, rectPts, text, brush, MONO_FONT, HAND_FONT, ZH_FONT, curScale, setInk, getInk } from './draw.js';
import { clamp, lerp, hash2, noise1, TAU } from './core.js';

export const CW = { fs: 72, cw: 43.2, lh: 230, padL: 26, padR: 34 };
const TOKCOL = { k: PAL.kw, f: PAL.fn, s: PAL.str, n: PAL.num, c: PAL.cm, p: PAL.punc, v: PAL.text, o: PAL.op, x: PAL.prop };

// ------------------------------------------------------------------ layout
export const LINES = CODE.map((toks, i) => {
  const chars = [];
  for (const [k, s] of toks) for (const ch of s) chars.push({ ch, k });
  const text = chars.map((c) => c.ch).join('');
  const indent = text.length - text.trimStart().length;
  const trimmedEnd = text.trimEnd().length;
  const isComment = toks.length === 1 && toks[0][0] === 'c';
  const y = i * CW.lh;                    // baseline
  return {
    i, chars, text, indent, len: trimmedEnd, isComment, empty: !text.trim(),
    y, ground: y - CW.fs * 0.86, bottom: y + CW.fs * 0.32,
    x0: indent * CW.cw - CW.padL, x1: trimmedEnd * CW.cw + CW.padR,
  };
});
export const charX = (c) => c * CW.cw;                 // left edge of column c
export const charCX = (c) => c * CW.cw + CW.cw / 2;    // centre of column c
export const groundY = (i) => LINES[i].ground;
export const WORLD_W = Math.max(...LINES.map((l) => l.x1)) + 200;
export const WORLD_H = LINES.length * CW.lh;

// braces (outside comments / strings) and the rooms they make
export const BRACES = [];
export const ROOMS = [];
{
  const stack = [];
  LINES.forEach((L) => {
    if (L.isComment) return;
    L.chars.forEach((c, col) => {
      if (c.k === 's' || c.k === 'c') return;
      if (c.ch === '{') { const b = { line: L.i, col, ch: '{', depth: stack.length }; BRACES.push(b); stack.push(b); }
      if (c.ch === '}') {
        const open = stack.pop();
        const b = { line: L.i, col, ch: '}', depth: stack.length, open };
        BRACES.push(b);
        if (open) ROOMS.push({ l0: open.line, c0: open.col, l1: L.i, c1: col, depth: stack.length });
      }
    });
  });
}
export const isBrace = (i, c) => BRACES.some((b) => b.line === i && b.col === c);

// ------------------------------------------------------------------ camera
export function camTransform(ctx, cam) {
  ctx.translate(960, 540);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.rotate(cam.roll || 0);
  ctx.translate(-cam.x, -cam.y);
}
export const toScreen = (cam, x, y) => [960 + (x - cam.x) * cam.zoom, 540 + (y - cam.y) * cam.zoom];

// ------------------------------------------------------------------ drawing
// W: world state { t, scramble(i, c, t) → {ch, dx, dy, col} | null, removed: {i: [cols]}, override(i,c) → ch,
//                  errorLine, errorK, highlights: [{line, c0, c1, k}], collapse: {from, k}, dim, hook: {behind, front} }
export function drawCodeWorld(ctx, cam, W) {
  const t = W.t || 0;
  backdrop(ctx, cam, t, W);
  ctx.save();
  camTransform(ctx, cam);
  // rooms
  for (const R of ROOMS) drawRoom(ctx, R, W, t);
  // floating comments + far decorations
  for (const L of LINES) if (L.isComment) drawComment(ctx, L, t, W);
  W.hook?.behind?.(ctx, cam);
  // platforms (+ the error zone on its line)
  for (const L of LINES) {
    if (L.empty || L.isComment) continue;
    lineTransform(ctx, L, W, () => {
      drawSlab(ctx, L, W, t);
      if (W.errorLine === L.i && (W.errorK ?? 1) > 0) drawErrorZone(ctx, L, t, W.errorK ?? 1);
      drawGlyphs(ctx, L, W, t);
    });
  }
  // brace doors stand on their platforms
  for (const B of BRACES) {
    if (W.removed?.[B.line]?.includes(B.col)) continue;
    lineTransform(ctx, LINES[B.line], W, () => drawBraceDoor(ctx, B, W, t));
  }
  W.hook?.front?.(ctx, cam);
  ctx.restore();
  // screen-space finish: scanlines + vignette (the world lives inside a screen)
  finish(ctx, t, W);
}

function lineTransform(ctx, L, W, fn) {
  const col = W.collapse;
  if (col && L.i >= col.from && col.k > 0) {
    const n = L.i - col.from;
    const k = col.k;
    const ang = (hash2(L.i, 5) - 0.35) * 0.5 * k;
    const drop = (80 + n * 45 + hash2(L.i, 9) * 60) * k * k;
    const cx = (L.x0 + L.x1) / 2, cy = L.y;
    ctx.save();
    ctx.translate(cx, cy + drop); ctx.rotate(ang); ctx.translate(-cx, -cy);
    fn();
    ctx.restore();
  } else fn();
}

function backdrop(ctx, cam, t, W) {
  const g = ctx.createLinearGradient(0, 0, 0, 1080);
  g.addColorStop(0, '#14151e'); g.addColorStop(1, '#1c1d2a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  // parallax: far layers of other code, drifting slowly
  const layers = [[0.25, 0.05, 30, '#8a90b0'], [0.5, 0.07, 40, '#9aa0c0']];
  for (const [par, alpha, fs, col] of layers) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${fs}px ${MONO_FONT}`;
    ctx.fillStyle = col;
    const ox = -cam.x * par * cam.zoom, oy = -cam.y * par * cam.zoom;
    const lh = fs * 2.2;
    const x0 = ((ox % 1400) + 1400) % 1400 - 1400, y0 = ((oy % (lh * 12)) + lh * 12) % (lh * 12) - lh * 12;
    for (let yy = y0; yy < 1080 + lh; yy += lh) {
      const row = Math.round((yy - oy) / lh);
      for (let xx = x0; xx < 1920 + 1400; xx += 1400) {
        const s = FAR[(row % FAR.length + FAR.length) % FAR.length];
        ctx.fillText(s, xx + (hash2(row, 3) * 300) + t * 3 * par, yy);
      }
    }
    ctx.restore();
  }
  // soft dots grid (depth)
  ctx.save();
  ctx.fillStyle = 'rgba(160,170,220,0.08)';
  const sp = 60, par = 0.7;
  const ox = ((-cam.x * par * cam.zoom) % sp + sp) % sp, oy = ((-cam.y * par * cam.zoom) % sp + sp) % sp;
  for (let x = ox; x < 1920; x += sp) for (let y = oy; y < 1080; y += sp) ctx.fillRect(x, y, 2, 2);
  ctx.restore();
}
const FAR = ['export const formatPrice = (n) => `¥${n.toFixed(2)}`;', 'describe("totalPrice", () => {', '  it("sums price × qty", () => {', '    expect(totalPrice(cart)).toBe("¥42.00");', 'const cart = [{ price: 12, qty: 2 }, { price: 18, qty: 1 }];', '// FIXME later', 'module.exports = { totalPrice };', 'if (!items) return formatPrice(0);'];

function drawRoom(ctx, R, W, t) {
  const L0 = LINES[R.l0], L1 = LINES[R.l1];
  let x1 = 0;
  for (let i = R.l0; i <= R.l1; i++) x1 = Math.max(x1, LINES[i].x1);
  const x0 = LINES[R.l0].indent * CW.cw - 60 + R.depth * 10;
  const y0 = L0.ground - CW.fs * 1.6, y1 = L1.bottom + 40;
  const hues = ['rgba(90,110,200,0.10)', 'rgba(150,90,200,0.10)', 'rgba(90,170,200,0.10)', 'rgba(200,120,170,0.10)', 'rgba(120,200,160,0.10)'];
  ctx.save();
  if (W.collapse && R.l1 >= W.collapse.from) ctx.globalAlpha *= 1 - W.collapse.k * 0.8;
  ctx.fillStyle = hues[R.depth % hues.length];
  ctx.beginPath(); ctx.roundRect(x0, y0, x1 + 80 - x0, y1 - y0, 40); ctx.fill();
  shape(ctx, rectPts(x0, y0, x1 + 80 - x0, y1 - y0, 40, 30), { fill: null, stroke: 'rgba(170,180,240,0.22)', lw: 2.2, seed: 300 + R.l0 });
  ctx.restore();
}

function drawComment(ctx, L, t, W) {
  const bob = Math.sin(t * 0.9 + L.i) * 8;
  const drift = Math.sin(t * 0.37 + L.i * 2) * 12;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.font = `italic ${CW.fs * 0.8}px ${MONO_FONT}, ${ZH_FONT}`;
  ctx.fillStyle = PAL.cm;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(L.text.trim(), charX(L.indent) + drift, L.y + bob - 20);
  // a faint ghost trail
  ctx.globalAlpha = 0.12;
  ctx.fillText(L.text.trim(), charX(L.indent) + drift - 14, L.y + bob - 14);
  ctx.restore();
}

function drawSlab(ctx, L, W, t) {
  const top = L.ground + 6, bot = L.bottom;
  const pts = rectPts(L.x0, top, L.x1 - L.x0, bot - top, 14, 40);
  shape(ctx, pts, { fill: '#232536', stroke: '#454a6a', lw: 2.4, seed: 400 + L.i, amp: 0.8 });
  // lit top edge (the ground)
  line(ctx, [[L.x0 + 14, top + 3], [L.x1 - 14, top + 3]], { stroke: 'rgba(170,185,255,0.35)', lw: 2, seed: 450 + L.i });
  // line number on the left end, like the editor gutter
  ctx.save();
  ctx.font = `${CW.fs * 0.42}px ${MONO_FONT}`;
  ctx.fillStyle = 'rgba(120,125,150,0.7)'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(L.i + 1), L.x0 - 16, L.y - 8);
  ctx.restore();
}

function drawGlyphs(ctx, L, W, t) {
  ctx.save();
  ctx.font = `bold ${CW.fs}px ${MONO_FONT}`;
  ctx.textBaseline = 'alphabetic';
  const removed = W.removed?.[L.i];
  for (let c = 0; c < L.chars.length; c++) {
    const { ch, k } = L.chars[c];
    if (ch === ' ') continue;
    if (removed && removed.includes(c)) continue;
    if ((ch === '{' || ch === '}') && k !== 's' && k !== 'c') continue; // drawn as doors
    let g = W.override?.(L.i, c) ?? ch;
    let dx = 0, dy = 0, col = TOKCOL[k] || PAL.text, a = 1;
    const sc = W.scramble?.(L.i, c, t);
    if (sc) { g = sc.ch ?? g; dx = sc.dx || 0; dy = sc.dy || 0; if (sc.col) col = sc.col; if (sc.a !== undefined) a = sc.a; }
    const hl = W.highlights?.find((h) => h.line === L.i && c >= h.c0 && c < h.c1);
    const x = charX(c);
    if (hl && hl.k > 0.01) {
      ctx.fillStyle = `rgba(255,209,102,${0.35 * hl.k})`;
      ctx.fillRect(x - 2, L.y - CW.fs * 0.8, CW.cw + 4, CW.fs * 1.02);
    }
    if (g === null) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10,10,18,0.55)';
    ctx.fillText(g, x + dx + 3, L.y + dy + 4);
    ctx.fillStyle = col;
    ctx.fillText(g, x + dx, L.y + dy);
  }
  ctx.restore();
}

function drawBraceDoor(ctx, B, W, t) {
  const L = LINES[B.line];
  const x = charX(B.col), base = L.ground + 8;
  const H = CW.fs * 2.35;
  ctx.save();
  // glow behind the pillar
  const g = ctx.createRadialGradient(x + CW.cw / 2, base - H * 0.5, 0, x + CW.cw / 2, base - H * 0.5, H * 0.7);
  g.addColorStop(0, 'rgba(137,221,255,0.22)'); g.addColorStop(1, 'rgba(137,221,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x - H, base - H * 1.3, H * 2.2, H * 1.4);
  ctx.font = `bold ${H * 1.12}px ${MONO_FONT}`;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#11121a'; ctx.lineWidth = 9;
  const sc = W.scramble?.(B.line, B.col, t);
  const dx = sc?.dx || 0;
  ctx.strokeText(B.ch, x + CW.cw / 2 + dx, base + H * 0.06);
  ctx.fillStyle = PAL.punc;
  ctx.fillText(B.ch, x + CW.cw / 2 + dx, base + H * 0.06);
  ctx.restore();
}

function drawErrorZone(ctx, L, t, k) {
  const pulse = 0.55 + 0.45 * Math.sin(t * 6.5);
  const x0 = L.x0 - 20, x1 = L.x1 + 20, y0 = L.ground - CW.fs * 1.5, y1 = L.bottom + 12;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = `rgba(255,70,70,${0.12 + 0.12 * pulse})`;
  ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 18); ctx.fill();
  // hazard stripes along the bottom edge
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y1 - 16, x1 - x0, 16); ctx.clip();
  ctx.fillStyle = `rgba(255,90,90,${0.35 + 0.3 * pulse})`;
  for (let x = x0 - 40 + ((t * 40) % 40); x < x1; x += 40) { ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x + 20, y1 - 16); ctx.lineTo(x + 36, y1 - 16); ctx.lineTo(x + 16, y1); ctx.fill(); }
  ctx.restore();
  shape(ctx, rectPts(x0, y0, x1 - x0, y1 - y0, 18, 40), { fill: null, stroke: `rgba(255,107,107,${0.5 + 0.4 * pulse})`, lw: 3, seed: 501 });
  // the error message, floating above
  const msg = "TypeError: Cannot read properties of undefined (reading 'price')";
  ctx.font = `bold ${CW.fs * 0.42}px ${MONO_FONT}`;
  const w = ctx.measureText(msg).width + 44;
  const mx = L.x1 + 60, my = L.y - 30 + Math.sin(t * 1.3) * 6;
  ctx.fillStyle = 'rgba(40,14,18,0.92)';
  ctx.beginPath(); ctx.roundRect(mx, my - 50, w, 64, 12); ctx.fill();
  ctx.strokeStyle = `rgba(255,107,107,${0.6 + 0.4 * pulse})`; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#ff9b9b'; ctx.textBaseline = 'middle';
  ctx.fillText(msg, mx + 22, my - 18);
  ctx.restore();
}

function finish(ctx, t, W) {
  ctx.save();
  // scanlines: this world lives inside a screen
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#000';
  for (let y = (t * 30) % 4; y < 1080; y += 4) ctx.fillRect(0, y, 1920, 1.5);
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(960, 540, 420, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, 1920, 1080);
  if (W.dim) { ctx.fillStyle = `rgba(0,0,0,${W.dim})`; ctx.fillRect(0, 0, 1920, 1080); }
  ctx.restore();
}

// ------------------------------------------------------------------ helpers for actors
// ground height at world x on line i (null if off the platform)
export function groundAt(i, x) {
  const L = LINES[i];
  if (!L || L.empty || L.isComment) return null;
  return x >= L.x0 - 10 && x <= L.x1 + 10 ? L.ground + 6 : null;
}
// position of a character cell (centre top)
export function cellTop(i, c) { return [charCX(c), LINES[i].ground + 6]; }
