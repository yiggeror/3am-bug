// Render a film module to MP4: deterministic frame capture in headless Chromium (parallel workers),
// then x264 (+ AAC if a soundtrack is given).
//   node render_video.cjs --film ../js/reel.js --out film/test.mp4 [--fps 24] [--from 0] [--to END] [--scale 1]
//        [--workers 4] [--frames dir] [--crf 18 | --bitrate 2750k] [--audio file.wav] [--force 1] [--encode-only 1]
const { chromium } = require('playwright');
const { start } = require('./serve.cjs');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const fps = +(args.fps || 24);
const workers = +(args.workers || 4);
const scale = +(args.scale || 1);
const root = path.resolve(__dirname, '../..');
const film = args.film || '../js/reel.js';
const framesDir = args.frames || path.join(root, 'production/build/frames_' + path.basename(film, '.js'));
const out = args.out || path.join(root, 'film/out.mp4');

(async () => {
  fs.mkdirSync(framesDir, { recursive: true });
  const encodeOnly = !!args['encode-only'];
  const srv = encodeOnly ? null : await start(0);
  const url = srv && `http://127.0.0.1:${srv.address().port}/dev/frame.html?film=${encodeURIComponent(film)}`;
  const browser = encodeOnly ? null : await chromium.launch();
  let DURATION = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).length / fps;
  if (browser) {
    const probe = await browser.newPage();
    await probe.goto(url);
    await probe.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    DURATION = await probe.evaluate(() => window.DURATION);
    await probe.close();
  }
  const t0 = +(args.from || 0), t1 = Math.min(+(args.to || DURATION), DURATION);
  const f0 = Math.round(t0 * fps), f1 = Math.floor(t1 * fps);
  const total = f1 - f0;
  if (browser) console.log(`rendering ${total} frames (${t0}s → ${t1.toFixed(2)}s @ ${fps}fps, ${1920 * scale}x${1080 * scale}) with ${workers} workers`);
  let done = 0; const tStart = Date.now();
  const work = async (w) => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('pageerror', (e) => console.log('[pageerror]', e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    for (let f = f0 + w; f < f1; f += workers) {
      const fn = path.join(framesDir, `${String(f).padStart(6, '0')}.jpg`);
      if (fs.existsSync(fn) && !args.force) { done++; continue; }
      const data = await page.evaluate(([t, sc]) => {
        window.renderRaw(t);
        const c = document.getElementById('c');
        if (sc === 1) return c.toDataURL('image/jpeg', 0.95);
        const s = document.createElement('canvas'); s.width = Math.round(1920 * sc); s.height = Math.round(1080 * sc);
        const x = s.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, s.width, s.height);
        return s.toDataURL('image/jpeg', 0.95);
      }, [f / fps, scale]);
      fs.writeFileSync(fn, Buffer.from(data.split(',')[1], 'base64'));
      done++;
      if (done % 240 === 0) {
        const el = (Date.now() - tStart) / 1000;
        console.log(`  ${done}/${total}  ${(done / el).toFixed(1)} fps  eta ${((total - done) / (done / el) / 60).toFixed(1)} min`);
      }
    }
    await page.close();
  };
  if (browser) {
    await Promise.all(Array.from({ length: workers }, (_, w) => work(w)));
    await browser.close(); srv.close();
  }
  if (args['frames-only']) return;
  const audio = args.audio;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const input = ['-y', '-framerate', String(fps), '-start_number', String(f0), '-i', path.join(framesDir, '%06d.jpg')];
  const video = ['-c:v', 'libx264', '-preset', args.preset || 'slow', '-pix_fmt', 'yuv420p', '-tune', 'animation', '-profile:v', 'high', '-frames:v', String(total)];
  if (args.vf) video.push('-vf', args.vf);
  const passlog = path.join(root, 'production/build/x264pass');
  const run = (a) => { const r = spawnSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'inherit'] }); if (r.status !== 0) process.exit(r.status); };
  console.log('encoding →', out);
  if (args.bitrate) {
    const br = args.bitrate, max = `${Math.round(parseInt(br, 10) * 2)}k`;
    run(['-v', 'error', ...input, ...video, '-b:v', br, '-maxrate', max, '-bufsize', max, '-pass', '1', '-passlogfile', passlog, '-an', '-f', 'null', '-']);
    video.push('-b:v', br, '-maxrate', max, '-bufsize', max, '-pass', '2', '-passlogfile', passlog);
  } else video.push('-crf', args.crf || '18');
  run(['-v', 'error', ...input,
    ...(audio && fs.existsSync(audio) ? ['-ss', String(t0), '-t', String(t1 - t0), '-i', audio] : []),
    ...video, '-movflags', '+faststart',
    ...(audio && fs.existsSync(audio) ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-metadata', `title=${args.title || '3 A.M. Bug'}`, out]);
  console.log('done in', ((Date.now() - tStart) / 60000).toFixed(1), 'min', (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
})();
