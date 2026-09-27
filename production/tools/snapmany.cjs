// Render several args of a dev page:  node snapmany.cjs <page> <outprefix> W H arg1 arg2 ...
const { chromium } = require('playwright');
const { start } = require('./serve.cjs');
const fs = require('fs');
(async () => {
  const [page_, prefix, W, H, ...args] = process.argv.slice(2);
  const srv = await start(0);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +W, height: +H } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/${page_}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  let i = 0;
  for (const a of args) {
    const data = await page.evaluate(async (a) => { await window.render(a); return document.getElementById('c').toDataURL('image/png'); }, a);
    const fn = `${prefix}_${i++}.png`;
    fs.writeFileSync(fn, Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(i, 'images');
  await browser.close(); srv.close();
})();
