#!/usr/bin/env node
/** t778 双端截图（390／1280）：册子 48 格各两档整页 ＋ 两张墙／总索引首屏。
 *
 * 用途：vision_router 终审的打分输入（逐页五维）与批级复评。产物落 `.scratch/t778/shots/`。
 * 形状照 `docs/skills/skill-chef/t772-截图.mjs`（同一个 `withBrowser`，真 Chrome ＋ CDP）。
 *
 * 用法：node docs/skills/skill-chef/t778-截图.mjs <批目录> [截图目录]
 * 退出码：0 全出；2 用法错或环境缺浏览器。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { withBrowser } from './t768-质量门.mjs';

const dir = resolve(process.argv[2] ?? '.scratch/t778');
const out = resolve(process.argv[3] ?? join(dir, 'shots'));
const manifest = join(dir, 'manifest.json');
if (!existsSync(manifest)) { console.error('没有册子：' + manifest); process.exit(2); }
mkdirSync(out, { recursive: true });

const rows = JSON.parse(readFileSync(manifest, 'utf8').replace(/^\uFEFF/, '')).map((r, i) => {
  const abs = r.产物绝对路径;
  return { seq: i + 1, rel: `${basename(dirname(abs))}/${basename(abs)}`, wake: r.唤醒词 };
});
const jobs = [];
/** 两种档：`-390.png`／`-1280.png`＝整页长图（取证用）；`-390v.png`／`-1280v.png`＝首屏
 *  （视口尺寸就是墙格子的 390×820／1280×860：vision 终审的判读面与墙给人看的面同尺寸，
 *  不会被超长图缩放糊掉）。 */
const VIEWPORT = process.argv.includes('--viewport-only');
for (const r of rows) {
  for (const w of [390, 1280]) {
    const h = w <= 500 ? 820 : 860;
    jobs.push({ name: `${String(r.seq).padStart(2, '0')}-${basename(r.rel, '.html')}-${w}v.png`, file: join(dir, r.rel), w, h, full: false });
    if (!VIEWPORT) jobs.push({ name: `${String(r.seq).padStart(2, '0')}-${basename(r.rel, '.html')}-${w}.png`, file: join(dir, r.rel), w, h: 900, full: true });
  }
}
for (const [f, w] of [['手机墙-390.html', 1220], ['桌面墙-1280.html', 680], ['总索引.html', 1120]]) {
  if (existsSync(join(dir, f))) jobs.push({ name: `wall-${basename(f, '.html')}-${w}.png`, file: join(dir, f), w, h: 1400, full: false });
}

const got = await withBrowser(async ({ s, sleep }) => {
  const made = [];
  for (const j of jobs) {
    await s('Emulation.setDeviceMetricsOverride', { width: j.w, height: j.h, deviceScaleFactor: 1, mobile: j.w < 768 });
    await s('Page.navigate', { url: pathToFileURL(j.file).href });
    for (let i = 0; i < 80; i += 1) {
      const r = await s('Runtime.evaluate', { expression: 'document.readyState === "complete"', returnByValue: true });
      if (r.result && r.result.value === true) break;
      await sleep(50);
    }
    await sleep(160);
    const shot = await s('Page.captureScreenshot', j.full ? { format: 'png', captureBeyondViewport: true } : { format: 'png' });
    writeFileSync(join(out, j.name), Buffer.from(shot.data, 'base64'));
    made.push(j.name);
  }
  return made;
});
if (got.error !== undefined) { console.error('截图跳过：' + got.error); process.exit(2); }
console.log(`截图 ${got.length} 张 -> ${out}（产物页 ${rows.length} × 2 档整页＋墙／索引首屏）`);
