// Render a dev page to PNG:  node snap.cjs <page> <out.png> [W H] [arg]
// The page must set window.__ready = true and expose window.render(arg) that draws onto #c.
const { chromium } = require('playwright');
const { start } = require('./serve.cjs');
const fs = require('fs');
(async () => {
  const [page_, out, W = 1920, H = 1080, arg = ''] = process.argv.slice(2);
  const srv = await start(0);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +W, height: +H } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || m.type() === 'log') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/${page_}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const data = await page.evaluate(async (a) => { await window.render(a); return document.getElementById('c').toDataURL('image/png'); }, arg);
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log(out);
  await browser.close(); srv.close();
})();
