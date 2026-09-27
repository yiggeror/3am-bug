// The monitor: a dark editor (cart.js) on the left, a terminal on the right where the tests run and
// where the little friend lives on the prompt line. Drawn in virtual screen pixels (1920 x 1080).
import { MONO_FONT, HAND_FONT, text } from './draw.js';
import { drawCube, drawCubeFx, cube } from './cube.js';
import { setEmoteInk } from './draw.js';
import { clamp, hash2 } from './core.js';

export const SCR = { w: 1920, h: 1080 };
export const PAL = {
  bg: '#1b1c25', panel: '#20212c', gutter: '#1d1e28', line: '#2c2e3c', sel: '#2f3244',
  text: '#e6e1d6', dim: '#6f7386', dim2: '#4d5163',
  kw: '#c792ea', str: '#c3e88d', num: '#f78c6c', fn: '#82aaff', cm: '#7f8698', punc: '#89ddff', prop: '#ffcb6b', op: '#89ddff',
  red: '#ff6b6b', redBg: 'rgba(255,90,90,0.16)', green: '#8fd48a', greenBg: 'rgba(120,210,120,0.14)', yellow: '#ffd166', orange: '#f08a4b',
};

// ------------------------------------------------------------------ the program
// token kinds: k keyword, f function, s string, n number, c comment, p punctuation, v variable, o operator, x prop
export const CODE = [
  [['c', '// cart.js — 购物车合计']],
  [['k', 'import'], ['p', ' { '], ['v', 'formatPrice'], ['p', ' } '], ['k', 'from'], ['s', " './money.js'"], ['p', ';']],
  [],
  [['k', 'export function '], ['f', 'totalPrice'], ['p', '('], ['v', 'items'], ['p', ', '], ['v', 'coupon'], ['p', ') {']],
  [['k', '  let '], ['v', 'total'], ['o', ' = '], ['n', '0'], ['p', ';']],
  [['k', '  for '], ['p', '('], ['k', 'let '], ['v', 'i'], ['o', ' = '], ['n', '0'], ['p', '; '], ['v', 'i'], ['o', ' <= '], ['v', 'items'], ['p', '.'], ['x', 'length'], ['p', '; '], ['v', 'i'], ['o', '++'], ['p', ') {']],
  [['k', '    const '], ['v', 'item'], ['o', ' = '], ['v', 'items'], ['p', '['], ['v', 'i'], ['p', '];']],
  [['v', '    total'], ['o', ' += '], ['v', 'item'], ['p', '.'], ['x', 'price'], ['o', ' * '], ['v', 'item'], ['p', '.'], ['x', 'qty'], ['p', ';']],
  [['p', '  }']],
  [['k', '  if '], ['p', '('], ['v', 'coupon'], ['p', ') {']],
  [['v', '    total'], ['o', ' = '], ['f', 'applyCoupon'], ['p', '('], ['v', 'total'], ['p', ', '], ['v', 'coupon'], ['p', ');']],
  [['p', '  }']],
  [['k', '  return '], ['f', 'formatPrice'], ['p', '('], ['v', 'total'], ['p', ');']],
  [['p', '}']],
  [],
  [['k', 'function '], ['f', 'applyCoupon'], ['p', '('], ['v', 'total'], ['p', ', '], ['v', 'coupon'], ['p', ') {']],
  [['c', '  // TODO: 满减规则 (3 weeks ago)']],
  [['k', '  return '], ['v', 'coupon'], ['p', '.'], ['x', 'percent']],
  [['o', '    ? '], ['v', 'total'], ['o', ' * '], ['p', '('], ['n', '1'], ['o', ' - '], ['v', 'coupon'], ['p', '.'], ['x', 'percent'], ['o', ' / '], ['n', '100'], ['p', ')']],
  [['o', '    : '], ['v', 'total'], ['o', ' - '], ['v', 'coupon'], ['p', '.'], ['x', 'amount'], ['p', ';']],
  [['p', '}']],
];
export const BUG_LINE = 5; // 0-based: the for loop

export const TEST_FAIL = [
  ['cmd', '$ npm test'],
  ['', ''],
  ['failh', ' FAIL ', ' test/cart.test.js'],
  ['plain', '  totalPrice'],
  ['x', '    ✕ sums price × qty'],
  ['x', '    ✕ applies a percent coupon'],
  ['x', '    ✕ applies a fixed coupon'],
  ['x', '    ✕ returns ¥0.00 for an empty cart'],
  ['plain', '  formatPrice'],
  ['ok', '    ✓ formats yuan, 2 decimals'],
  ['ok', '    ✓ rounds half up'],
  ['', ''],
  ['err', '  ● totalPrice › sums price × qty'],
  ['', ''],
  ['errmsg', '    TypeError: Cannot read properties'],
  ['errmsg', '    of undefined (reading \'price\')'],
  ['', ''],
  ['src', '    >  8 |     total += item.price * item.qty;'],
  ['caret', '         |                   ^'],
  ['', ''],
  ['sum', 'Tests:  ', '4 failed', ', 2 passed, 6 total'],
];
export const TEST_PASS = [
  ['cmd', '$ npm test'],
  ['', ''],
  ['passh', ' PASS ', ' test/cart.test.js'],
  ['plain', '  totalPrice'],
  ['ok', '    ✓ sums price × qty'],
  ['ok', '    ✓ applies a percent coupon'],
  ['ok', '    ✓ applies a fixed coupon'],
  ['ok', '    ✓ returns ¥0.00 for an empty cart'],
  ['plain', '  formatPrice'],
  ['ok', '    ✓ formats yuan, 2 decimals'],
  ['ok', '    ✓ rounds half up'],
  ['', ''],
  ['sum2', 'Tests:  ', '6 passed', ', 6 total'],
];

// ------------------------------------------------------------------ editor
const ED = { x: 0, y: 44, w: 1160, h: 1036, lh: 42, fs: 27, gut: 86 };
export const TERM = { x: 1172, y: 44, w: 748, h: 1036, lh: 36, fs: 23 };

function tokColor(k) { return { k: PAL.kw, f: PAL.fn, s: PAL.str, n: PAL.num, c: PAL.cm, p: PAL.punc, v: PAL.text, o: PAL.op, x: PAL.prop }[k] || PAL.text; }

// sc: { code (array of token lines), cursor: {line, col, on}, errLine, glitch 0..1, scroll, hl: [{line, c0, c1, color}], typing }
export function drawEditor(ctx, sc, t) {
  const { x, y, w, h, lh, fs, gut } = ED;
  ctx.save();
  ctx.fillStyle = PAL.panel; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAL.gutter; ctx.fillRect(x, y, gut, h);
  // tab bar
  ctx.fillStyle = PAL.bg; ctx.fillRect(x, 0, w, y);
  ctx.fillStyle = PAL.panel; ctx.fillRect(x + 10, 6, 210, y - 6);
  ctx.fillStyle = PAL.orange; ctx.fillRect(x + 10, 6, 210, 3);
  ctx.font = `20px ${MONO_FONT}`; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.text; ctx.fillText('cart.js', x + 44, 26);
  ctx.fillStyle = '#e8c16b'; ctx.fillText('JS', x + 16, 26);
  if (sc.dirty) { ctx.fillStyle = PAL.text; ctx.beginPath(); ctx.arc(x + 200, 26, 5, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = PAL.dim; ctx.fillText('cart.test.js', x + 250, 26);
  const code = sc.code || CODE;
  const top = y + 26 - (sc.scroll || 0) * lh;
  ctx.font = `${fs}px ${MONO_FONT}`;
  const cw = ctx.measureText('M').width;
  ED.cw = cw;
  for (let i = 0; i < code.length; i++) {
    const ly = top + i * lh;
    if (ly < y - lh || ly > y + h + lh) continue;
    if (sc.errLine === i) { ctx.fillStyle = PAL.redBg; ctx.fillRect(x + gut, ly - lh / 2, w - gut, lh); }
    if (sc.okLine === i) { ctx.fillStyle = PAL.greenBg; ctx.fillRect(x + gut, ly - lh / 2, w - gut, lh); }
    if (sc.cursor && sc.cursor.line === i) { ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(x + gut, ly - lh / 2, w - gut, lh); }
    ctx.fillStyle = sc.cursor && sc.cursor.line === i ? PAL.text : PAL.dim2;
    ctx.textAlign = 'right';
    ctx.fillText(String(i + 1), x + gut - 22, ly);
    ctx.textAlign = 'left';
    if (sc.breakpoints && sc.breakpoints.includes(i)) { ctx.fillStyle = PAL.red; ctx.beginPath(); ctx.arc(x + 18, ly, 8, 0, Math.PI * 2); ctx.fill(); }
    let cx = x + gut + 16;
    let col = 0;
    for (const [k, s] of code[i]) {
      for (const ch of s) {
        let c = ch;
        const g = sc.glitch || 0;
        if (g > 0 && hash2(i * 97 + col, Math.floor(t * 12)) < g * 0.35 && ch !== ' ') c = '#@%&$!?*'[Math.floor(hash2(col, i + Math.floor(t * 12)) * 8)];
        ctx.fillStyle = tokColor(k);
        ctx.fillText(c, cx + col * cw, ly + (g > 0 ? (hash2(col, i * 7 + Math.floor(t * 12)) - 0.5) * g * 6 : 0));
        col++;
      }
    }
    for (const hl of sc.hl || []) if (hl.line === i) {
      ctx.fillStyle = hl.color || 'rgba(255,209,102,0.28)';
      ctx.fillRect(x + gut + 16 + hl.c0 * cw - 2, ly - lh * 0.42, (hl.c1 - hl.c0) * cw + 4, lh * 0.84);
    }
    if (sc.squiggle && sc.squiggle.line === i) {
      ctx.strokeStyle = PAL.red; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k <= (sc.squiggle.c1 - sc.squiggle.c0) * 4; k++) { const px = x + gut + 16 + sc.squiggle.c0 * cw + k * cw / 4; const py = ly + fs * 0.6 + (k % 2 ? 3 : -1); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
  }
  // caret
  if (sc.cursor && (sc.cursor.on ?? (Math.floor(t * 1.8) % 2 === 0))) {
    const ly = top + sc.cursor.line * lh;
    ctx.fillStyle = '#ffcc66';
    ctx.fillRect(x + gut + 16 + sc.cursor.col * cw - 1, ly - lh * 0.4, 3, lh * 0.8);
  }
  // minimap strip
  ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(x + w - 70, y, 70, h);
  for (let i = 0; i < code.length; i++) {
    const len = code[i].reduce((a, [, s]) => a + s.length, 0);
    ctx.fillStyle = sc.errLine === i ? 'rgba(255,107,107,0.8)' : 'rgba(200,200,220,0.18)';
    ctx.fillRect(x + w - 62, y + 10 + i * 6, Math.min(52, len * 1.1), 3);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ terminal
// st: { lines: [[kind, ...]], shown: number of lines visible (float → typewriter), input: string, prompt, cube: cubeState|null, flash }
export function drawTerminal(ctx, st, t) {
  const { x, y, w, h, lh, fs } = TERM;
  ctx.save();
  ctx.fillStyle = PAL.bg; ctx.fillRect(x - 12, 0, w + 12, y);
  ctx.fillStyle = '#16171f'; ctx.fillRect(x, y, w, h);
  ctx.font = `20px ${MONO_FONT}`; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.orange; ctx.fillText('✻', x + 14, 26);
  ctx.fillStyle = PAL.text; ctx.fillText('terminal — claude', x + 40, 26);
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.font = `${fs}px ${MONO_FONT}, "ZCOOL KuaiLe"`;
  const lines = st.lines || [];
  const shown = st.shown ?? lines.length;
  let ly = y + 30 - (st.scroll || 0) * lh;
  for (let i = 0; i < Math.min(lines.length, Math.ceil(shown)); i++) {
    const L = lines[i];
    const partial = i === Math.floor(shown) ? shown - i : 1;
    const X = x + 20;
    const kind = L[0];
    const draw = (s, col, dx = 0) => { ctx.fillStyle = col; ctx.fillText(s, X + dx, ly); return ctx.measureText(s).width; };
    const cut = (s) => s.slice(0, Math.max(0, Math.round(s.length * partial)));
    if (kind === 'cmd') draw(cut(L[1]), PAL.text);
    else if (kind === 'failh' || kind === 'passh') {
      const bg = kind === 'failh' ? '#e05252' : '#58b35a';
      const wd = ctx.measureText(L[1]).width;
      ctx.fillStyle = bg; ctx.fillRect(X - 2, ly - lh * 0.42, wd + 4, lh * 0.84);
      draw(L[1], '#16171f'); draw(L[2], PAL.text, wd + 6);
    } else if (kind === 'x') draw(cut(L[1]), PAL.red);
    else if (kind === 'ok') draw(cut(L[1]), PAL.green);
    else if (kind === 'err') draw(cut(L[1]), PAL.red);
    else if (kind === 'errmsg') draw(cut(L[1]), '#ff9b9b');
    else if (kind === 'src') draw(cut(L[1]), PAL.dim);
    else if (kind === 'caret') draw(cut(L[1]), PAL.red);
    else if (kind === 'sum' || kind === 'sum2') {
      const a = draw(L[1], PAL.text); const b = draw(L[2], kind === 'sum' ? PAL.red : PAL.green, a); draw(L[3], PAL.text, a + b);
    } else if (kind === 'plain') draw(cut(L[1]), PAL.text);
    else if (kind === 'say') draw(cut(L[1]), PAL.orange);
    else if (kind === 'user') { draw('> ', PAL.dim); draw(cut(L[1]), PAL.text, 26); }
    ly += lh;
  }
  ctx.restore();
  // prompt line with the little friend's home
  ctx.save();
  const py = y + h - 70;
  ctx.fillStyle = '#16171f'; ctx.fillRect(x, py - 44, w, 114);
  ctx.strokeStyle = '#3a3c4d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x + 14, py - 26, w - 28, 56, 10); ctx.stroke();
  ctx.font = `${fs}px ${MONO_FONT}, "ZCOOL KuaiLe"`; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.dim; ctx.fillText('>', x + 32, py + 2);
  const inp = st.input || '';
  ctx.fillStyle = PAL.text; ctx.fillText(inp, x + 58, py + 2);
  const iw = ctx.measureText(inp).width;
  st.caretX = x + 60 + iw; st.caretY = py;
  if (Math.floor(t * 1.8) % 2 === 0 || st.caretSolid) { ctx.fillStyle = PAL.text; ctx.fillRect(x + 60 + iw, py - 14, 12, 30); }
  ctx.restore();
  if (st.cube) {
    setEmoteInk('#efe5d3');
    drawCubeFx(ctx, st.cube);
    setEmoteInk(null);
  }
}

// whole screen content. sc = { editor: {...}, term: {...}, dim, tint }
export function drawScreen(ctx, sc, t) {
  ctx.save();
  ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, SCR.w, SCR.h);
  drawEditor(ctx, sc.editor || {}, t);
  drawTerminal(ctx, sc.term || {}, t);
  if (sc.flash) { ctx.fillStyle = sc.flash; ctx.fillRect(0, 0, SCR.w, SCR.h); }
  ctx.restore();
}

// average colour of the screen (for the light it casts): red when failing, green when passing
export function screenLightColor(sc) {
  return sc.lightRGB || '190,205,255';
}
