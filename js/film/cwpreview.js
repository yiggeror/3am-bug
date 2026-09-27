// Preview: the code world alone, following the little friend through the whole story.
import { makeFilm } from '../film.js';
import { drawCW, followCube } from './cwshot.js';
import { text } from '../draw.js';
const S = (t0, t1, cam) => ({ t0, t1, name: 'cw', noPost: true, draw: (ctx, t) => { drawCW(ctx, t, cam(t)); text(ctx, t.toFixed(1), 80, 60, { size: 40, color: '#fff', still: true }); } });
const shots = [S(64, 260, (t) => followCube(t, { zoom: 0.8 }))];
export const { SHOTS, DURATION, renderFrame, shotAt } = makeFilm(shots);
