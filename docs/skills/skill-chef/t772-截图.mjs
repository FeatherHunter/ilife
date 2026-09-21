#!/usr/bin/env node
/** t772 双端截图（390／1280）：5 张产物各两档，共 10 张，落 `.scratch/t772/`，供 vision 审查与册子。 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { withBrowser } from './t768-质量门.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DIR = join(ROOT, '.scratch', 't772');
const files = readdirSync(DIR).filter((f) => f.startsWith('做菜-') && f.endsWith('.html')).sort()
  .map((f) => join(DIR, f));
if (files.length !== 5) { console.error('产物不是 5 张：' + files.length); process.exit(2); }
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
      const name = f.replace(/\.html$/, '') + '-' + w + '.png';
      writeFileSync(name, Buffer.from(shot.data, 'base64'));
      made.push(name);
    }
  }
  return made;
});
if (got.error !== undefined) { console.log('截图跳过：' + got.error); process.exit(2); }
for (const m of got) console.log('SHOT ' + String(m).replace(/\\/g, '/'));
