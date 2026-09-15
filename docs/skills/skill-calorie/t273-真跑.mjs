/** #273 · 复盘／餐别分布页 10 条词**真出口**取证（可复跑，产物不落仓内）。
 *
 * 跑法：`node docs/skills/skill-calorie/t273-真跑.mjs`
 * （先 `npx tsc -b packages/base-render packages/skill-calorie`）
 *
 * 它做什么：开一个系统 tmp 的标准种子库（`docs/research/t81-seed.mjs` 的 `seedFull`，锚点 2026-09-07），
 * 对 10 条词**逐条** spawn `dist/cli/cmd_read.js`（**不给 `--html`** ⇒ 走默认落点
 * `<SKILLS_DB_PATH>/calorie_html/<中文名>_<YYYYMMDD_HHMMSS>.html`，与共同口径一致），打印
 * 一条机读行：`WORD <唤醒词> key=<命令键> exit=<码> path=<绝对路径> bytes=<字节数> doctype=<yes/no> 餐别区块=<yes/no>`。
 * 最后一行 `RESULT: n/n …` 供复核只读摘要。
 *
 * 餐别 5 条**当刻**的路由记录只有 `{"window":"7d"}`（`src/home/routes.ts:28-32`）⇒ 它们 exit 0 但出的是
 * 条目列表页（`餐别区块=no`）。这一行是**症状取证**，不是判据；缺的餐别参数归 #276（见 `t273-交接.md`）。
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const D = SEED_TODAY;

const DIR = mkdtempSync(join(tmpdir(), 't273-live-'));
{
  const db = openDb(join(DIR, 'calorie_data.db'));
  seedFull(db);
  db.close();
}

/** 10 条词：参数照当刻路由记录（复盘 6 条住 `src/diet/routes.ts:70-74`＋`:93`；餐别 5 条住 `src/home/routes.ts:28-32`）。 */
const WORDS = [
  { word: '饮食复盘（本周）', key: 'calorie.view.diet-review', params: { window: '本周' }, page: 'review' },
  { word: '饮食复盘（本月）', key: 'calorie.view.diet-review', params: { window: '本月' }, page: 'review' },
  { word: '饮食复盘（最近 90 天）', key: 'calorie.view.diet-review', params: { window: '90d' }, page: 'review' },
  { word: '饮食复盘（今年）', key: 'calorie.view.diet-review', params: { window: '今年' }, page: 'review' },
  { word: '饮食复盘（自定义时间）', key: 'calorie.view.diet-review', params: { window: 'custom', start: '2026-09-01', end: D }, page: 'review' },
  { word: '看饮食复盘', key: 'calorie.view.diet-review', params: { window: '今日' }, page: 'review' },
  { word: '看早餐（最近 7 天）', key: 'calorie.view.diet', params: { window: '7d' }, page: 'meal' },
  { word: '看午餐（最近 7 天）', key: 'calorie.view.diet', params: { window: '7d' }, page: 'meal' },
  { word: '看晚餐（最近 7 天）', key: 'calorie.view.diet', params: { window: '7d' }, page: 'meal' },
  { word: '看加餐（最近 7 天）', key: 'calorie.view.diet', params: { window: '7d' }, page: 'meal' },
  { word: '看全部餐别分布（最近 7 天）', key: 'calorie.view.diet', params: { window: '7d' }, page: 'meal' },
];

let ok = 0;
let reviewOk = 0;
for (const w of WORDS) {
  const r = spawnSync(process.execPath, [CLI, w.key, '--params', JSON.stringify(w.params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: DIR, CALORIE_TODAY: D },
  });
  let out = null;
  try { out = JSON.parse(String(r.stdout).trim()); } catch { out = null; }
  const path = out && out.data && typeof out.data.output === 'string' ? out.data.output : '(无落点)';
  let bytes = 0;
  let doctype = 'no';
  let meal = 'no';
  if (r.status === 0 && path !== '(无落点)') {
    bytes = statSync(path).size;
    const html = readFileSync(path, 'utf8');
    doctype = html.startsWith('<!doctype html>') && html.includes('<meta charset="utf-8">') ? 'yes' : 'no';
    meal = html.includes('<section id="md-dist">') || html.includes('<section id="md-table">') ? 'yes' : 'no';
  }
  if (r.status === 0 && doctype === 'yes') ok += 1;
  if (r.status === 0 && doctype === 'yes' && w.page === 'review') reviewOk += 1;
  console.log('WORD ' + w.word + ' key=' + w.key + ' exit=' + r.status + ' path=' + path
    + ' bytes=' + bytes + ' doctype=' + doctype + ' 餐别区块=' + meal);
}
console.log('RESULT: ' + ok + '/' + WORDS.length + ' 条 exit 0 且产物是完整文档；复盘 6 条 ' + reviewOk + '/6；'
  + '餐别 5 条当刻路由无餐别参数（出条目列表页，餐别区块=no）');
console.log('TMPDIR: ' + DIR);
