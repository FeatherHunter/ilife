#!/usr/bin/env node
/** t776 双端截图：8 页 × 390／1280（供册子与过程性 vision 审查）。 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { withBrowser } from './t768-质量门.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const OUT = join(ROOT, '.scratch', 't776');
const SHOTS = join(OUT, 'shots');
const files = readdirSync(OUT).filter((f) => f.endsWith('.html')).sort().map((f) => join(OUT, f));
mkdirSync(SHOTS, { recursive: true });
const got = await withBrowser(async ({ s, sleep }) => {
  const made = [];
  for (const f of files) {
    for (const w of [390, 1280]) {
      await s('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 768 });
      await s('Page.navigate', { url: pathToFileURL(f).href });
      for (let i = 0; i < 80; i += 1) {
        const r = await s('Runtime.evaluate', { expression: 'document.readyState === "complete"', returnByValue: true });
        if (r.result && r.result.value === true) break;
        await sleep(50);
      }
      await sleep(150);
      const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      const name = f.replace(/\.html$/, '').split(/[\\/]/).pop() + '-' + w + '.png';
      writeFileSync(join(SHOTS, name), Buffer.from(shot.data, 'base64'));
      made.push(name);
    }
  }
  return made;
});
if (got.error !== undefined) { console.error('截图跳过：' + got.error); process.exit(2); }
console.log('截图 ' + got.length + ' 张 → ' + SHOTS);
void readFileSync;
