#!/usr/bin/env node
/** t648 产物真跑器（**独立于 t647 那套脚本**，#648 自己写自己跑）：
 *  一套种子库、逐命令出页 —— 供「10 页铺开改前／改后」的逐字节比对与四档度量。
 *
 *  用法：node .scratch/t648/render.mjs <输出目录>
 *  种子：docs/research/t81-seed.mjs 的 seedFull（SEED_TODAY=2026-09-07），与 t275／t647 同一套。
 *  产物：<输出目录>/<页名>.html ＋ manifest.json（bytes＋sha256）。
 *
 *  10 页＝#646 影响面清理出的**调用页清单**（nutritionPortDocs.ts 那唯一一处长标签产地，
 *  经 calorie.view.nutrition-ratio １ 词 ＋ calorie.view.diet-review ８ 词读到）＋
 *  同区块另一页（看饮食复盘，window=今日，与「看今日营养」同参数不同入口）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT = resolve(process.argv[2] ?? join(HERE, 'pages'));
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 10 页：①-⑧ 走 diet-review 八词，⑨ 走 nutrition-ratio，⑩ 同区块的「看饮食复盘」。 */
const PAGES = [
  ['看营养结构', 'calorie.view.diet-review', { window: '7d' }],
  ['看今日营养', 'calorie.view.diet-review', { window: '今日', entry: 'today-nutrition' }],
  ['看饮食复盘', 'calorie.view.diet-review', { window: '今日' }],
  ['饮食复盘（本周）', 'calorie.view.diet-review', { window: '本周' }],
  ['饮食复盘（本月）', 'calorie.view.diet-review', { window: '本月' }],
  ['饮食复盘（最近 90 天）', 'calorie.view.diet-review', { window: '90d' }],
  ['饮食复盘（今年）', 'calorie.view.diet-review', { window: '今年' }],
  ['饮食复盘（自定义时间）', 'calorie.view.diet-review', { window: 'custom', start: '2026-09-01', end: '2026-09-07' }],
  ['查营养配比', 'calorie.view.nutrition-ratio', { window: '7d' }],
  ['查营养结构', 'calorie.view.diet-review', { window: '7d' }],
];

const dir = mkdtempSync(join(tmpdir(), 't648-'));
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
    process.exit(1);
  }
  const html = readFileSync(out, 'utf8');
  const bytes = statSync(out).size;
  rows.push({ name, key, params, bytes, sha256: createHash('sha256').update(html).digest('hex') });
  console.log('RENDER ' + name.padEnd(12) + ' bytes=' + String(bytes).padStart(7)
    + ' sha256=' + rows[rows.length - 1].sha256.slice(0, 16) + ' → ' + out);
}
writeFileSync(join(OUT, 'manifest.json'),
  JSON.stringify({ at: new Date().toISOString(), seedToday: SEED_TODAY, rows }, null, 2) + '\n', 'utf8');
console.log('MANIFEST ' + join(OUT, 'manifest.json'));
