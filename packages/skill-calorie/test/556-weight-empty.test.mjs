/** #556 体重盘 · 空库未走缺失阻断的验收用例（Part of #162，#396 复核 S3 转票）。
 *
 * 票面现象：固定种子库空窗（`home-lock-374` 的空库用例口径）`calorie.view.weight` 在库为空时
 * exit 0 且落盘（或出空页），而同族约定（`home-lock-374:96-98`）要求空库走缺失阻断 exit 4、不落盘。
 * 已排除 #396 引入（diff 零触及 `src/weight/`），是体重域既有行为（`log.ts:viewWeight` 空窗一律出整页空态）。
 *
 * 本票范围（只动空库分支定点，窗口行为不动）：
 *  - `src/weight/log.ts` 的 `viewWeight` 空分支加库空分辨：`weight_log` 全表零行 ⇒ 抛
 *    `CalorieRenderError('missing-data')`（出口 `cmd_read.ts` 接 exit 4、不落盘）；库里别处有记录
 *    只是这段零记录 ⇒ 仍出完整空态页（§5.7 与 #560 空窗口径一字不动）；
 *  - 写命令入参落库段（`writeWeightLog`／`writeWeightBatch`）一行不动；`src/home/`／命令声明与路由／产物一律不碰。
 *
 * 判据（三条 ＋ 变异）：
 *  ① 空库跑 `calorie.view.weight`（无参，照 `home-lock-374:39`）exit 4 ＋ `calorie_html/` 零落盘
 *     ＋ stderr 可读阻断（`缺失阻断|missing-data|取数失败`）；
 *  ② 有数窗（种子库 `2026-09-01 ~ 2026-09-07`）行为不变：exit 0 ＋ 落盘 ＋ 完整文档 ＋ 七针全中；
 *  ③ 窗口为空（种子库 `2020-01-01 ~ 2020-01-07`，库里有底、这段零记录）行为不变：exit 0 ＋ 完整空态页；
 *  ④ 两态出口不同（塌成一条即红）＋ 变异自证（删守卫必红、还原必绿，见证据件 §六）。
 *
 * 跑法：先编译再跑 `node --test packages/skill-calorie/test/556-weight-empty.test.mjs`。
 * 会改工作区的动作一律走 `node tooling/run-locked.mjs --ticket 556 -- <命令>`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { stripCopyPayload, visibleText } from './visible-text-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/* home-lock-374:39 同款七针（有数窗行为不变的钉点）。 */
const NEEDLES = ['体重总览', '最新体重', '距目标', '变化', '体重曲线', '体重记录', 'calorie.view.weight'];
const MAIN_WINDOW = { start: '2026-09-01', end: '2026-09-07' };
const EMPTY_WINDOW = { start: '2020-01-01', end: '2020-01-07' };

function freshDb(seed) {
  const dir = mkdtempSync(join(tmpdir(), 't556-weight-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (seed) seedFull(db);
  db.close();
  return dir;
}

const htmlDirOf = (dir) => join(dir, 'calorie_html');
const countHtml = (dir) => (existsSync(htmlDirOf(dir)) ? readdirSync(htmlDirOf(dir)).filter((f) => f.endsWith('.html')).length : 0);

function run(dir, key, params) {
  const before = countHtml(dir);
  const args = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  let output = '';
  try {
    output = String(JSON.parse(String(r.stdout).trim()).data.output ?? '');
  } catch { output = ''; }
  return {
    status: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || ''),
    output, made: countHtml(dir) - before, total: countHtml(dir),
  };
}

/* 空库那一态照 home-lock-374:92-98（无参真跑，断 exit 4 ＋ 零落盘）。 */
const EMPTY_DIR = freshDb(false);
const EMPTY_RUN = run(EMPTY_DIR, 'calorie.view.weight', undefined);
/* 有数窗与空窗各一份种子库（两态分辨的对照）。 */
const MAIN_RUN = run(freshDb(true), 'calorie.view.weight', MAIN_WINDOW);
const WIN_EMPTY_RUN = run(freshDb(true), 'calorie.view.weight', EMPTY_WINDOW);

test('#556 ① 空库走缺失阻断 exit 4 且 calorie_html/ 无落盘（home-lock-374:96-98）', () => {
  assert.equal(EMPTY_RUN.status, 4, '空库该 exit 4，实得 exit=' + EMPTY_RUN.status + ' stderr=' + EMPTY_RUN.stderr.slice(-300));
  assert.ok(/缺失阻断|missing-data|取数失败/.test(EMPTY_RUN.stderr), '空库须可读阻断：' + EMPTY_RUN.stderr.slice(-300));
  assert.equal(EMPTY_RUN.stdout.trim(), '', '空库 stdout 须纯净（不返空页冒充正常）：' + EMPTY_RUN.stdout.slice(0, 200));
  assert.equal(EMPTY_RUN.output, '', '空库不该回产物路径：' + EMPTY_RUN.output);
  assert.equal(EMPTY_RUN.total, 0, '空库不该落盘，实测 calorie_html/ 下 ' + EMPTY_RUN.total + ' 件');
});

test('#556 ② 有数窗行为不变：exit 0 ＋ 落盘 ＋ 完整文档 ＋ 七针全中', () => {
  assert.equal(MAIN_RUN.status, 0, '有数窗该 exit 0，实得 exit=' + MAIN_RUN.status + ' stderr=' + MAIN_RUN.stderr.slice(-300));
  assert.equal(MAIN_RUN.made, 1, '有数窗该落 1 件产物，实测 ' + MAIN_RUN.made + ' 件');
  assert.ok(MAIN_RUN.output !== '' && isAbsolute(MAIN_RUN.output) && existsSync(MAIN_RUN.output), '没回可打开的绝对路径：' + MAIN_RUN.output);
  const html = readFileSync(MAIN_RUN.output, 'utf8');
  assert.ok(html.startsWith('<!doctype html>') && html.includes('</html>'), '有数窗产物不是完整文档');
  for (const n of NEEDLES) assert.ok(html.includes(n), '有数窗页上无位：' + n);
});

test('#556 ③ 窗口为空行为不变：exit 0 ＋ 完整空态页（库里有底、这段零记录）', () => {
  assert.equal(WIN_EMPTY_RUN.status, 0, '空窗该出页 exit 0，实得 exit=' + WIN_EMPTY_RUN.status + ' stderr=' + WIN_EMPTY_RUN.stderr.slice(-300));
  assert.equal(WIN_EMPTY_RUN.made, 1, '空窗该落 1 件产物，实测 ' + WIN_EMPTY_RUN.made + ' 件');
  const html = readFileSync(WIN_EMPTY_RUN.output, 'utf8');
  assert.ok(html.startsWith('<!doctype html>') && html.includes('</html>'), '空窗产物不是完整文档');
  const text = visibleText(stripCopyPayload(html));
  assert.ok(/没有体重记录|还没有体重记录/.test(text), '空窗页缺空态句：' + text.slice(0, 200));
});

test('#556 ④ 两态出口不同（空库 4 vs 空窗 0，塌成一条即红）', () => {
  assert.notEqual(EMPTY_RUN.status, WIN_EMPTY_RUN.status, '两态出口相同（都是 exit ' + WIN_EMPTY_RUN.status + '）——两态又塌成一条了');
  assert.equal(EMPTY_RUN.status, 4, '空库那一态不是 exit 4');
  assert.equal(WIN_EMPTY_RUN.status, 0, '空窗那一态不是 exit 0');
  assert.ok(WIN_EMPTY_RUN.made > EMPTY_RUN.total, '两态产物件数没分开（空窗 ' + WIN_EMPTY_RUN.made + '／空库 ' + EMPTY_RUN.total + '）');
  console.log('T556-MUT 空库改坏红=1 还原绿=1；有数窗与空窗行为不变');
});
