// Time of day: one number drives the sky, the ambient light and the sun.
//   tod 0   = 02:50, deep night          tod 0.55 = 04:40, the sky starts to pale
//   tod 0.8 = 05:20, pink & gold dawn    tod 1    = 05:45, first sunlight in the room
import { lerp, clamp } from '../core.js';

function mixRGB(a, b, k) { return a.map((v, i) => Math.round(lerp(v, b[i], k))); }
function ramp(stops, x) {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) { const k = (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]); return mixRGB(stops[i - 1][1], stops[i][1], k * k * (3 - 2 * k)); }
  }
  return stops[stops.length - 1][1];
}
export const rgb = (a) => `rgb(${a.join(',')})`;
export const rgbs = (a) => a.join(',');

export function skyTop(tod) { return ramp([[0, [16, 20, 44]], [0.45, [22, 30, 64]], [0.62, [52, 66, 118]], [0.8, [120, 128, 176]], [1, [150, 186, 226]]], tod); }
export function skyMid(tod) { return ramp([[0, [26, 32, 66]], [0.45, [36, 46, 92]], [0.62, [104, 102, 156]], [0.8, [236, 160, 158]], [1, [250, 206, 170]]], tod); }
export function skyLow(tod) { return ramp([[0, [34, 40, 78]], [0.45, [48, 56, 104]], [0.62, [180, 128, 150]], [0.8, [255, 190, 140]], [1, [255, 226, 168]]], tod); }
// ambient multiplier for the room (lamp & screen add on top)
export function ambient(tod) { return ramp([[0, [58, 64, 104]], [0.5, [64, 70, 112]], [0.7, [110, 104, 140]], [0.85, [190, 170, 180]], [1, [236, 222, 214]]], tod); }
export function sunK(tod) { return clamp((tod - 0.78) / 0.2); }
export function stars(tod) { return clamp(1 - (tod - 0.4) / 0.25); }
export function clockMinutes(tod) { return 170 + tod * 175; } // 02:50 → 05:45
