// What is on his screen, as a function of story time: the editor (cart.js, with his edits),
// the terminal (test runs, the little friend's home), and the miniature cube/bug running through the
// editor when they are inside the code.
import { CODE, TEST_FAIL, TEST_PASS } from '../screen.js';
import { T } from './times.js';
import { clamp, lerp, hash2 } from '../core.js';

// ------------------------------------------------------------------ editor text over time
const clone = (code) => code.map((l) => l.map(([k, s]) => [k, s]));
function setLineText(code, i, toks) { code[i] = toks; }
function insertLine(code, i, toks) { code.splice(i, 0, toks); }
function deleteTail(code, i, n) {
  // remove n characters from the end of line i (token-aware)
  let line = code[i].map(([k, s]) => [k, s]);
  while (n > 0 && line.length) {
    const last = line[line.length - 1];
    const cut = Math.min(n, last[1].length);
    last[1] = last[1].slice(0, last[1].length - cut);
    n -= cut;
    if (!last[1].length) line.pop();
  }
  code[i] = line;
}
const LOG_LINE = [['v', '        console'], ['p', '.'], ['f', 'log'], ['p', '('], ['s', "'here'"], ['p', ');']];
export const LOG_AT = 20;          // the console.log line is inserted at editor row 20
export const TYPE = {
  // his attempts: item?.price (NaN), then back
  q1: 13.0, q1Out: 20.6,
  logStart: 114.4, logEnd: 116.8,
  // holding backspace too long: deletes the tail of "      });" (editor row 22 after the insert)
  bsStart: 131.4, bsEnd: 134.6,
  run2Type: 21.7,                 // second run, typed in the keyboard close-up
  finalType: T.enter + 0.1, finalEnter: T.green - 0.25,
  undo: T.undo + 0.2,
  fix: T.caught + 0.1,
};
// "items[i]" typed into the find box (Ctrl+F at T.pin, one key every 0.09 s)
export const PIN_TYPE = T.pin + 0.25;
export const pinChars = (t) => Math.floor(clamp((t - PIN_TYPE) / 0.72) * 8.999);
export function editorCode(t) {
  const code = clone(CODE);
  if (t >= TYPE.q1 && t < TYPE.q1Out) setLineText(code, 7, [['v', '    total'], ['o', ' += '], ['v', 'item'], ['o', '?'], ['p', '.'], ['x', 'price'], ['o', ' * '], ['v', 'item'], ['o', '?'], ['p', '.'], ['x', 'qty'], ['p', ';']]);
  if (t >= TYPE.logStart) {
    const n = Math.floor(clamp((t - TYPE.logStart) / (TYPE.logEnd - TYPE.logStart)) * 28);
    const full = LOG_LINE.map(([k, s]) => [k, s]).reduce((acc, [k, s]) => { acc.push([k, s]); return acc; }, []);
    // reveal characters progressively (after the indentation)
    let left = 8 + n, line = [];
    for (const [k, s] of full) { if (left <= 0) break; line.push([k, s.slice(0, left)]); left -= s.length; }
    insertLine(code, LOG_AT, line);
  }
  if (t >= TYPE.bsStart && t < TYPE.undo) {
    const n = Math.floor(clamp((t - TYPE.bsStart) / (TYPE.bsEnd - TYPE.bsStart)) * 3);
    deleteTail(code, 22, n); // ';' then ')' then '}'
  }
  if (t >= TYPE.fix) {
    const L = code[5].map(([k, s]) => [k, s]);
    for (const tok of L) if (tok[1] === ' <= ') tok[1] = ' < ';
    code[5] = L;
  }
  return code;
}
// world line (static layout) → editor row (console.log insert shifts the rest down)
export const worldToEditorLine = (i, t) => (t >= TYPE.logStart && i >= LOG_AT ? i + 1 : i);

export function editorState(t) {
  const code = editorCode(t);
  const st = { code, dirty: false, errLine: null, hl: [], breakpoints: [], cursor: null, find: null, problems: 0, squiggle: null, glitch: 0 };
  // cursor & error highlight before the story's cooperation starts
  if (t < T.into) { st.errLine = 7; st.cursor = { line: 7, col: t >= TYPE.q1 && t < TYPE.q1Out ? 18 : 17 }; }
  if (t >= TYPE.q1 && t < T.save1) st.dirty = true;
  // search "total"
  if (t >= T.search + 1.2 && t < T.log) {
    st.find = { q: 'total'.slice(0, Math.floor(clamp((t - T.search - 1.2) / 1.0) * 5)), count: '3 of 7' };
    if (t >= T.search + 3) for (const [line, c0] of [[4, 6], [7, 4], [10, 4], [10, 24], [12, 21]]) st.hl.push({ line, c0, c1: c0 + 5 });
  }
  if (t >= TYPE.logStart - 0.6 && t < T.oops) st.cursor = { line: LOG_AT, col: 8 + Math.floor(clamp((t - TYPE.logStart) / (TYPE.logEnd - TYPE.logStart)) * 20) };
  if (t >= TYPE.logStart && t < TYPE.logEnd + 0.8) st.dirty = true;
  if (t >= TYPE.bsStart && t < TYPE.undo) {
    st.cursor = { line: 22, col: Math.max(6, 9 - Math.floor(clamp((t - TYPE.bsStart) / (TYPE.bsEnd - TYPE.bsStart)) * 3)) };
    st.dirty = true;
    if (t >= TYPE.bsEnd) { st.problems = t > TYPE.bsEnd + 0.8 ? 99 : 12; st.squiggle = { line: 22, c0: 6, c1: 7 }; st.glitch = 0.15 * clamp(1 - (t - TYPE.bsEnd) / 2); }
  }
  // breakpoints
  if (t >= T.bp1 + 0.5) st.breakpoints.push(9);
  if (t >= T.bp2 + 0.5) st.breakpoints.push(4);
  if (t >= T.pin && t < T.caught) {
    const n = pinChars(t);
    st.find = { q: 'items[i]'.slice(0, n), count: n >= 8 ? '1 of 1' : '' };
    if (t >= T.pin + 1.0) st.hl.push({ line: 6, c0: 17, c1: 25, color: 'rgba(255,209,102,0.35)' });
  }
  if (t >= TYPE.fix && t < T.green + 3) { st.okLine = 5; st.cursor = { line: 5, col: 21 }; st.dirty = t < TYPE.fix + 1.2; }
  if (t >= T.green) { st.greenWave = t - T.green; st.allGreen = true; }
  if (t >= T.glitch - 0.2 && t < T.situp + 2.5) st.glitch = Math.max(st.glitch, 0.08 + 0.12 * Math.max(0, Math.sin((t - T.glitch) * 7)));
  return st;
}

// ------------------------------------------------------------------ terminal over time
const FAIL_NAN = [
  ['cmd', '$ npm test'], ['', ''], ['failh', ' FAIL ', ' test/cart.test.js'], ['plain', '  totalPrice'],
  ['x', '    ✕ sums price × qty'], ['x', '    ✕ applies a percent coupon'], ['x', '    ✕ applies a fixed coupon'], ['x', '    ✕ returns ¥0.00 for an empty cart'],
  ['plain', '  formatPrice'], ['ok', '    ✓ formats yuan, 2 decimals'], ['ok', '    ✓ rounds half up'], ['', ''],
  ['err', '  ● totalPrice › sums price × qty'], ['', ''], ['errmsg', '    Expected: "¥42.00"'], ['errmsg', '    Received: "¥NaN"'], ['', ''],
  ['sum', 'Tests:  ', '4 failed', ', 2 passed, 6 total'],
];
const PASS_LOG = [
  ['cmd', '$ npm test'], ['', ''], ['plain', '  console.log'], ['say', '    here'], ['say', '    here'], ['say', '    here'], ['', ''],
  ...TEST_PASS.slice(2),
];
// the little friend types one character per hop (see cubeTerm)
export const MSG = { text: '辛苦了，晚安 :)', t0: T.goodnight + 0.2 + 3.6, rate: 2.2 };
export function terminalState(t) {
  const st = { lines: [], shown: 0, input: '', scroll: 0 };
  // an older failure is on screen when the film begins
  if (t < T.run1) { st.lines = TEST_FAIL; st.shown = TEST_FAIL.length; st.input = t > T.run1 - 1.0 ? 'npm test'.slice(0, Math.floor((t - (T.run1 - 1.0)) / 0.1)) : ''; }
  else if (t < T.run2) { st.lines = FAIL_NAN; st.shown = clamp((t - T.run1 - 0.9) / 0.7) * FAIL_NAN.length; if (t >= TYPE.run2Type) st.input = 'npm test'.slice(0, Math.floor((t - TYPE.run2Type) / 0.1) + 1); }
  else { st.lines = TEST_FAIL; st.shown = clamp((t - T.run2 - 0.4) / 0.6) * TEST_FAIL.length; }
  // his forehead on the keyboard
  if (t >= T.headDown && t < T.situp + 1.0) {
    const n = Math.floor(clamp((t - T.headDown) / 6) * 44);
    st.input = 'hhjjjjjjjjkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk'.slice(0, Math.max(2, n));
  }
  if (t >= T.situp + 1.0 && t < T.enter) { st.input = ''; }
  // the final run
  if (t >= T.enter) {
    const typed = 'npm test'.slice(0, Math.floor(clamp((t - TYPE.finalType) / 0.8) * 8.99));
    if (t < TYPE.finalEnter) { st.input = typed; st.lines = TEST_FAIL; st.shown = TEST_FAIL.length; }
    else { st.lines = PASS_LOG; st.shown = clamp((t - T.green) / 4.5) * PASS_LOG.length; }
  }
  // the little friend's message at the end
  if (t >= MSG.t0) {
    st.input = MSG.text.slice(0, Math.min(MSG.text.length, Math.floor((t - MSG.t0) * MSG.rate) + 1));
    st.inputColor = '#f39a62';
  }
  if (st.lines.length > 20) st.scroll = Math.max(0, Math.min(st.shown, st.lines.length) - 20);
  return st;
}

// average colour of the light the screen throws into the room
export function screenLight(t) {
  if (t >= T.fail1 && t < T.fail1 + 2.6) return lerp3([228, 172, 195], [190, 200, 245], clamp((t - T.fail1 - 0.8) / 1.8));
  if (t >= T.fail2 && t < T.fail2 + 3.0) return lerp3([228, 165, 188], [195, 200, 240], clamp((t - T.fail2 - 1.0) / 2));
  // the bug scrambling the code makes the whole screen flicker (magenta/white glitches)
  if (t >= T.glitch - 0.2 && t < T.situp + 2.5) {
    const f = Math.max(0, Math.sin((t - T.glitch) * 7)) * (hash2(Math.floor(t * 12), 77) > 0.45 ? 1 : 0.2);
    return lerp3([190, 200, 245], [240, 150, 235], 0.75 * f);
  }
  if (t >= T.green) return lerp3([195, 205, 240], [170, 245, 185], clamp((t - T.green - 1) / 3));
  return [190, 200, 245];
}
function lerp3(a, b, k) { return a.map((v, i) => Math.round(lerp(v, b[i], k))); }
