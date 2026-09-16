#!/usr/bin/env node
/** t648 近邻页真跑器：**本票没碰的**其它分布行调用页（负向边界 ＋ 无退化对照）。
 *
 *  用法：node .scratch/t648/render-neigh.mjs <输出目录>
 *  与 `render.mjs` 同一套种子（docs/research/t81-seed.mjs），只是换一组命令：
 *    · 看饮食总览（`calorie.view.diet`）＝餐别分布区块（`reviewDocs.ts:339`，短标签 早餐/午餐/晚餐/加餐）
 *    · 对比围度（`body-measure-compare`）＝`compareMeasureDoc.ts:31`
 *    · 对比体脂（`body-composition-compare`）＝`compareCompositionDoc.ts:45`
 *    · 看今日主页（`calorie.view.home`）＝今日账（`homeViewParts.ts:101`）
 *    · 查热量缺口（`calorie.view.deficit`）＝消耗构成（`trendPredictDocs.ts:97`）
 *    · 记一餐（写前页向导，`wizardDocs.ts:126` 那一族的读侧）
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT = resolve(process.argv[2] ?? join(HERE, 'neigh'));
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const PAGES = [
  ['看饮食总览', 'calorie.view.diet', { window: '7d', entry: 'overview' }],
  ['对比围度', 'calorie.view.body-measure-compare', { date1: '2026-09-05', date2: '2026-09-07' }],
  ['对比体脂', 'calorie.view.body-composition-compare', { period1Start: '2026-09-05', period1End: '2026-09-05', period2Start: '2026-09-07', period2End: '2026-09-07' }],
  ['看今日主页', 'calorie.view.home', { date: '今日' }],
  ['查热量缺口', 'calorie.view.deficit', { window: '7d' }],
];

const dir = mkdtempSync(join(tmpdir(), 't648n-'));
const db = openDb(join(dir, 'calorie_data.db'));
seedFull(db);
db.close();
mkdirSync(OUT, { recursive: true });

const rows = [];
for (const [name, key, params] of PAGES) {
  const out = join(OUT, name + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  if (r.status !== 0) {
    console.log('FAIL ' + name + ' exit=' + r.status + ' :: ' + String(r.stderr).slice(0, 300));
    continue;
  }
  const html = readFileSync(out, 'utf8');
  const bytes = statSync(out).size;
  const names = [...html.matchAll(/<span class="ilife-block-dist-row-name">([^<]*)<\/span>/g)].map((m) => m[1]);
  rows.push({ name, key, params, bytes, rowNames: names, sha256: createHash('sha256').update(html).digest('hex') });
  console.log('RENDER ' + name.padEnd(8) + ' bytes=' + String(bytes).padStart(7) + ' 名称栏=' + JSON.stringify(names));
}
writeFileSync(join(OUT, 'manifest.json'),
  JSON.stringify({ at: new Date().toISOString(), seedToday: SEED_TODAY, rows }, null, 2) + '\n', 'utf8');
console.log('MANIFEST ' + join(OUT, 'manifest.json'));
