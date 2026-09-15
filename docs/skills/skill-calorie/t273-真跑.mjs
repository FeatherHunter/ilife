/** #273 · 复盘／餐别分布页 10 条词**真出口**取证（可复跑，产物不落仓内）。
 *
 * 跑法：`node docs/skills/skill-calorie/t273-真跑.mjs`
 * （先 `npx tsc -b packages/base-render packages/skill-calorie`）
 *
 * 它做什么：开一个系统 tmp 的标准种子库（`docs/research/t81-seed.mjs` 的 `seedFull`，锚点 2026-09-07），
 * 对 10 条词**逐条** spawn `dist/cli/cmd_read.js`（**不给 `--html`** ⇒ 走默认落点
 * `<SKILLS_DB_PATH>/calorie_html/<中文名>_<YYYYMMDD_HHMMSS>.html`，与共同口径一致），打印
 * 一条机读行：`WORD <唤醒词> key=<命令键> exit=<码> path=<绝对路径> bytes=<字节数> doctype=<yes/no> 餐别区块=<yes/no>`。
 * 最后 `RESULT: n/n …` 一行供复核只读摘要，再补一轮**空窗两态**与**缺餐别参数**两个反例的机读行。
 *
 * 参数口径：**逐字照当刻路由记录**——复盘 6 条住 `src/diet/routes.ts`（`wake` order 46／47／70-74 ＋
 * `new` order 8 的「看饮食复盘」）；餐别 5 条住 `src/home/routes.ts:32-36`，**带 `meal` 位**
 * （#276 已接线）。缺这一位时不出餐别页——最后两个反例把这两件事记下来。
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

/** 十条词（参数照当刻路由记录）：复盘 6 条 `calorie.view.diet-review` ＋ 餐别 5 条 `calorie.view.diet`。
 *  注：餐别那 5 条属 #276／#271 那一条链的**接线**，本票只交区块；这里一并实跑，是核对区块真到了页上。 */
const WORDS = [
  { word: '饮食复盘（本周）', key: 'calorie.view.diet-review', params: { window: '本周' }, page: 'review' },
  { word: '饮食复盘（本月）', key: 'calorie.view.diet-review', params: { window: '本月' }, page: 'review' },
  { word: '饮食复盘（最近 90 天）', key: 'calorie.view.diet-review', params: { window: '90d' }, page: 'review' },
  { word: '饮食复盘（今年）', key: 'calorie.view.diet-review', params: { window: '今年' }, page: 'review' },
  { word: '饮食复盘（自定义时间）', key: 'calorie.view.diet-review', params: { window: 'custom', start: '2026-09-01', end: D }, page: 'review' },
  { word: '看饮食复盘', key: 'calorie.view.diet-review', params: { window: '今日' }, page: 'review' },
  { word: '看早餐（最近 7 天）', key: 'calorie.view.diet', params: { window: '7d', meal: '早餐' }, page: 'meal' },
  { word: '看午餐（最近 7 天）', key: 'calorie.view.diet', params: { window: '7d', meal: '午餐' }, page: 'meal' },
  { word: '看晚餐（最近 7 天）', key: 'calorie.view.diet', params: { window: '7d', meal: '晚餐' }, page: 'meal' },
  { word: '看加餐（最近 7 天）', key: 'calorie.view.diet', params: { window: '7d', meal: '加餐' }, page: 'meal' },
  { word: '看全部餐别分布（最近 7 天）', key: 'calorie.view.diet', params: { window: '7d', meal: 'all' }, page: 'meal' },
];

/** 两个反例：① 缺 `meal` 的同一把键（用法错，不许编数）；② 空窗 ＋ 餐别（该出餐别页的空态，不出总览页）。 */
const COUNTER = [
  { word: '反例①同一把键缺 meal', key: 'calorie.view.diet', params: { window: '7d' }, want: 'overview' },
  { word: '反例②空窗 ＋ meal=all', key: 'calorie.view.diet', params: { start: '2026-10-01', end: '2026-10-07', meal: 'all' }, want: 'meal-empty' },
];

function run(key, params) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: DIR, CALORIE_TODAY: D },
  });
  let out = null;
  try { out = JSON.parse(String(r.stdout).trim()); } catch { out = null; }
  const path = out && out.data && typeof out.data.output === 'string' ? out.data.output : '(无落点)';
  let bytes = 0;
  let doctype = 'no';
  let meal = 'no';
  let h1 = '';
  if (r.status === 0 && path !== '(无落点)') {
    bytes = statSync(path).size;
    const html = readFileSync(path, 'utf8');
    doctype = html.startsWith('<!doctype html>') && html.includes('<meta charset="utf-8">') ? 'yes' : 'no';
    meal = html.includes('<section id="md-table">') ? 'yes' : 'no';
    const m = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
    h1 = m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
  }
  return { status: r.status, stderr: String(r.stderr), path, bytes, doctype, meal, h1 };
}

let ok = 0;
let reviewOk = 0;
let mealOk = 0;
for (const w of WORDS) {
  const r = run(w.key, w.params);
  if (r.status === 0 && r.doctype === 'yes') ok += 1;
  if (r.status === 0 && r.doctype === 'yes' && w.page === 'review') reviewOk += 1;
  if (r.status === 0 && r.doctype === 'yes' && w.page === 'meal' && r.meal === 'yes') mealOk += 1;
  console.log('WORD ' + w.word + ' key=' + w.key + ' exit=' + r.status + ' path=' + r.path
    + ' bytes=' + r.bytes + ' doctype=' + r.doctype + ' 餐别区块=' + r.meal + ' h1=' + r.h1);
}
console.log('RESULT: ' + ok + '/' + WORDS.length + ' 条 exit 0 且产物是完整文档；复盘 6 条 ' + reviewOk + '/6；'
  + '餐别 5 条到餐别页 ' + mealOk + '/5');

for (const c of COUNTER) {
  const r = run(c.key, c.params);
  const isMealPage = r.h1.includes('餐别分布') ? 'yes' : 'no';
  console.log('COUNTER ' + c.word + ' exit=' + r.status + ' bytes=' + r.bytes + ' h1=' + r.h1
    + ' 餐别区块=' + r.meal + ' 是餐别页=' + isMealPage + ' 期望=' + c.want);
  if (r.status !== 0) console.log('   stderr=' + r.stderr.trim().split('\n').slice(-2).join(' / '));
}
console.log('TMPDIR: ' + DIR);
