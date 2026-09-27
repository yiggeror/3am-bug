// Contact sheet of the film: node scan.cjs out.jpg t0 t1 step [cols] [film module]
const { chromium } = require('playwright');
const { start } = require('./serve.cjs');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
(async () => {
  const [out, a, b, step, cols = 4, film = ''] = process.argv.slice(2);
  const srv = await start(0);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/dev/frame.html${film ? '?film=' + film : ''}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'scan'));
  const files = []; const t0 = Date.now();
  for (let t = +a; t <= +b + 1e-6; t += +step) {
    const data = await page.evaluate((t) => { window.renderRaw(t); const c = document.getElementById('c'); const s = document.createElement('canvas'); s.width = 640; s.height = 360; const x = s.getContext('2d'); x.drawImage(c, 0, 0, 640, 360); x.fillStyle = '#000a'; x.fillRect(0, 0, 90, 26); x.fillStyle = '#fff'; x.font = '18px monospace'; x.fillText(t.toFixed(2), 6, 19); return s.toDataURL('image/jpeg', 0.85); }, t);
    const f = path.join(dir, `${files.length}.jpg`); fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64')); files.push(f);
  }
  console.log(`${files.length} frames, ${((Date.now() - t0) / files.length).toFixed(0)} ms/frame`);
  execFileSync('python3', [path.join(__dirname, 'grid.py'), out, String(cols), '640', ...files]);
  await browser.close(); srv.close();
})();
