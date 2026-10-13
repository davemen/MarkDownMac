#!/usr/bin/env node
// Renders scene.html frame by frame with headless Chromium, synthesises the
// soundtrack, and muxes everything into out/markdownmac-teaser.mp4.
//
//   node motion/render.js             full 20 s render
//   node motion/render.js --preview   a handful of key frames into motion/preview/
//
// Requires: playwright (npm i -g playwright, or npx playwright) and ffmpeg on PATH.

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const FPS = 30, DUR = 20, N = FPS * DUR;
const WORKERS = Math.max(1, Math.min(4, require('os').cpus().length));
const ROOT = __dirname;
const preview = process.argv.includes('--preview');

const MIME = { '.html': 'text/html', '.woff2': 'font/woff2', '.js': 'text/javascript' };
function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', MIME[path.extname(p)] || 'application/octet-stream');
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/scene.html`;
  const outDir = path.join(ROOT, preview ? 'preview' : 'frames');
  fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const pages = await Promise.all(Array.from({ length: WORKERS }, async () => {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await p.goto(url);
    const fonts = await p.evaluate(() => window.ready);
    if (!fonts.grotesk || !fonts.mono) console.warn('warning: web fonts did not load', fonts);
    return p;
  }));

  const frames = preview
    ? [15, 60, 100, 125, 140, 200, 260, 300, 345, 375, 400, 450, 480, 530, 555, 575]
    : Array.from({ length: N }, (_, i) => i);
  let next = 0, done = 0; const t0 = Date.now();
  await Promise.all(pages.map(async page => {
    for (;;) {
      const idx = next++; if (idx >= frames.length) break;
      const f = frames[idx];
      const data = await page.evaluate(fr => window.renderFrame(fr), f);
      fs.writeFileSync(path.join(outDir, `f${String(f).padStart(4, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
      if (++done % 60 === 0 || done === frames.length) console.log(`${done}/${frames.length} frames  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  }));
  await browser.close(); srv.close();
  if (preview) return;

  const wav = path.join(ROOT, 'audio.wav');
  require('./audio.js').write(wav);
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const mp4 = path.join(ROOT, 'out', 'markdownmac-teaser.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(outDir, 'f%04d.jpg'), '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k', '-t', String(DUR), mp4], { stdio: 'inherit' });
  console.log('wrote', mp4);
})().catch(e => { console.error(e); process.exit(1); });
