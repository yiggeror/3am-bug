// Build the web player into site/: the page, 720p silent video parts (each under 15 MB, cut on hard cuts)
// and the soundtrack as one AAC file. The page plays the parts locked to the soundtrack's clock.
//   node production/tools/build_site.mjs [--frames production/build/frames_index] [--kbps 1700]
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const frames = path.resolve(root, arg('frames', 'production/build/frames_index'));
const kbps = +arg('kbps', 1700);
const out = path.join(root, 'site'), media = path.join(out, 'media');
fs.mkdirSync(media, { recursive: true });
const FPS = 24;
const total = fs.readdirSync(frames).filter((f) => f.endsWith('.jpg')).length;
const DURATION = total / FPS;
const ff = (a) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...a], { stdio: ['ignore', 'inherit', 'inherit'] });

// cut points: hard cuts close to every minute
const cuts = [0, 58.4, 119.5, 178.0, 239.6, DURATION];
const parts = [];
for (let i = 0; i + 1 < cuts.length; i++) {
  const f0 = Math.round(cuts[i] * FPS), f1 = i + 2 === cuts.length ? total : Math.round(cuts[i + 1] * FPS);
  const file = `part${i + 1}.mp4`;
  const dst = path.join(media, file);
  const input = ['-framerate', String(FPS), '-start_number', String(f0), '-i', path.join(frames, '%06d.jpg'), '-frames:v', String(f1 - f0)];
  const enc = ['-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '48',
    '-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 1.6)}k`, '-bufsize', `${kbps * 2}k`];
  const log = path.join(root, 'production/build/x264site');
  ff([...input, ...enc, '-pass', '1', '-passlogfile', log, '-an', '-f', 'null', '-']);
  ff([...input, ...enc, '-pass', '2', '-passlogfile', log, '-an', '-movflags', '+faststart', dst]);
  parts.push({ src: `media/${file}`, t0: +(f0 / FPS).toFixed(4), t1: +(f1 / FPS).toFixed(4) });
  console.log(file.padEnd(12), (fs.statSync(dst).size / 1e6).toFixed(1), 'MB', `${parts.at(-1).t0}–${parts.at(-1).t1}s`);
}
// soundtrack
const wav = path.join(root, 'production/build/soundtrack.wav');
ff(['-i', wav, '-t', String(DURATION), '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', path.join(media, 'soundtrack.m4a')]);
console.log('soundtrack.m4a', (fs.statSync(path.join(media, 'soundtrack.m4a')).size / 1e6).toFixed(1), 'MB');
// poster: the room at night
ff(['-i', path.join(frames, `${String(Math.round(12.0 * FPS)).padStart(6, '0')}.jpg`), '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '4', path.join(media, 'poster.jpg')]);

// the page: site_src/index.html is page content; the standalone site gets a full document around it
const MEDIA = { duration: +DURATION.toFixed(4), audio: 'media/soundtrack.m4a', parts };
const page = fs.readFileSync(path.join(root, 'site_src/index.html'), 'utf8').replace(/\/\*__MEDIA__\*\/[\s\S]*?\/\*__END__\*\//, JSON.stringify(MEDIA));
fs.writeFileSync(path.join(root, 'production/build/player_page.html'), page);
const title = page.match(/<title>.*?<\/title>/)[0];
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${title}
<style>[hidden]{display:none!important}*,*::before,*::after{box-sizing:border-box}body{margin:0}img{max-width:100%}</style>
${page.replace(title, '').replace(/(<\/style>)/, '$1\n</head>\n<body>')}
</body>
</html>
`);
console.log('site/index.html written');
