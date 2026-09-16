/** #531 · 跨场景目标进度复用页：① 窗口词（场景 06）② 台词错位（场景 10）。
 *
 * 两条都由 #467 重做暴露、登记在本票；本件把两条各钉成机器判据：
 *  ① **窗口词**：周窗（`{"window":"本周"}`）那两页的**页名必须带「本周」二字**，且同一夹具日下
 *     与「看今日目标进度」那页的 `h1` **不相等**（周一「本周」＝周至今＝1 天，如实写 1 天窗但必须说清是本周）。
 *     #628 已把这一条落地（`home/goalProgressDocs.ts` 的 `week628` 分支），本件是它的回归锁。
 *  ② **台词错位**：`我的减肥策略对吗`（`diag_strategy_check`）声明的 `data_fields` 是
 *     findings／confidence／degraded／insight、要答「缺口是否合理 ＋ 蛋白是否足够 ＋ 运动是否有贡献」；
 *     接法必须落在 `calorie.view.anomaly --kind=strategy_check`（三答同源），不再接目标进度页。
 *
 * 夹具：`docs/research/t81-seed.mjs::seedFull` ＋ `CALORIE_TODAY`（周一 2026-09-07 ＝ 种子日；周三 2026-09-09
 * ＝ 周中，用来验「周窗不是 1 天」那一档）。
 * 跑法：`node --test packages/skill-calorie/test/t531-goal-progress-window.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const MON = '2026-09-07';   // 周一＝种子日
const WED = '2026-09-09';   // 周三＝周中

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const { ALL_ROUTES } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routes.generated.js')).href);

function seededDir() {
  const dir = mkdtempSync(join(tmpdir(), 't531-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

/** 按路由/命令真跑一条，回产物正文与标题。 */
function run(workDir, key, params, today) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: workDir, CALORIE_TODAY: today },
  });
  let envelope = null;
  try { envelope = JSON.parse(String(r.stdout || '').trim()); } catch { envelope = null; }
  const file = envelope?.data?.output && existsSync(envelope.data.output) ? readFileSync(envelope.data.output, 'utf8') : '';
  return { status: r.status, stderr: String(r.stderr || ''), file, envelope };
}

const h1Of = (html) => /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1] ?? '';
const docTitleOf = (html) => /<title[^>]*>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
/** 可见正文：剔样式／脚本／复制载荷属性后的字。 */
const visible = (html) => html
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/\sdata-[a-z0-9-]+="[^"]*"/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ');

/** 判据①的守卫：页名与 `<title>` 至少一处写出「本周」，且与「今日」那页 h1 不相等。 */
function assertWeekNamed(weekHtml, todayHtml, what) {
  const weekH1 = h1Of(weekHtml);
  const todayH1 = h1Of(todayHtml);
  assert.ok(weekH1.includes('本周') || docTitleOf(weekHtml).includes('本周'),
    what + ' 页名与 <title> 都没有「本周」二字：h1=' + weekH1 + ' title=' + docTitleOf(weekHtml));
  assert.notEqual(weekH1, todayH1, what + ' 周窗页与今日页的 h1 仍然相等：' + weekH1);
}

test('#531 ① 周一（种子日）：周窗如实写 1 天，但页上必须读得出「本周」', () => {
  const dir = seededDir();
  const week = run(dir, 'calorie.view.goal-progress', { window: '本周' }, MON);
  const today = run(dir, 'calorie.view.goal-progress', { window: '今日' }, MON);
  assert.equal(week.status, 0, 'stderr=' + week.stderr.slice(-200));
  assert.equal(today.status, 0, 'stderr=' + today.stderr.slice(-200));
  assertWeekNamed(week.file, today.file, '周一');
  assert.ok(visible(week.file).includes('本周'), '周一页可见文本里没有「本周」');
});

test('#531 ① 周三：周窗＝3 天，页名仍带「本周」且与今日页 h1 不等', () => {
  const dir = seededDir();
  const week = run(dir, 'calorie.view.goal-progress', { window: '本周' }, WED);
  const today = run(dir, 'calorie.view.goal-progress', { window: '今日' }, WED);
  assert.equal(week.status, 0, 'stderr=' + week.stderr.slice(-200));
  assert.ok(h1Of(week.file).includes('近 3 天'), '周三周窗页名不是 3 天窗：' + h1Of(week.file));
  assertWeekNamed(week.file, today.file, '周三');
  // 变异自证（改坏必红）：把「本周」两个字从页名与 <title> 两处都摘掉 ⇒ 守卫必须红。
  const stripped = week.file
    .replace(h1Of(week.file), h1Of(week.file).replace('（本周）', ''))
    .replace(docTitleOf(week.file), docTitleOf(week.file).replace('（本周）', ''));
  assert.equal(h1Of(stripped).includes('本周') || docTitleOf(stripped).includes('本周'), false, '变异没生效');
  assert.throws(() => assertWeekNamed(stripped, today.file, '变异①'), /没有「本周」二字|仍然相等/,
    '变异①（摘掉「本周」）未红');
  assertWeekNamed(week.file, today.file, '还原②');
});

test('#531 ② 我的减肥策略对吗：接法落在 calorie.view.anomaly --kind=strategy_check（三答同源）', () => {
  const rec = ALL_ROUTES.find((r) => r.wakeWord === '我的减肥策略对吗');
  assert.ok(rec, '路由表里没有「我的减肥策略对吗」这条词');
  assert.equal(rec.key, 'calorie.view.anomaly', '这条词的接法仍不在诊断页上：' + rec.key);
  const m = /^calorie-cmd-read (\S+)(?: --params '(.*)')?$/.exec(String(rec.cli));
  assert.ok(m, '路由 cli 形态不对：' + rec.cli);
  const params = JSON.parse(m[2]);
  assert.equal(params.kind, 'strategy_check', '缺 strategy_check 那一支：' + rec.cli);
  // 真跑该命令：页上必须能读到「缺口／蛋白／运动」三答（那三答正是这条词的 prompt 三问）。
  const r = run(seededDir(), m[1], params, MON);
  assert.equal(r.status, 0, 'exit=' + r.status + ' stderr=' + r.stderr.slice(-200));
  const text = visible(r.file);
  for (const needle of ['我的减肥策略对吗', '策略体检', '缺口', '蛋白', '运动']) {
    assert.ok(text.includes(needle), '诊断页可见文本缺：' + needle);
  }
  // 反向：目标进度页**不再**接这条词（接了就会退回「台词是诊断、页面是热量统计」那副样子）。
  assert.ok(!ALL_ROUTES.some((x) => x.wakeWord === '我的减肥策略对吗' && x.key === 'calorie.view.goal-progress'),
    '这条词仍有一条接在目标进度页上的记录');
  // 变异自证（改坏必红）：把 kind 摘掉 ⇒ 上面「缺 strategy_check 那一支」必红。
  const mutatedCli = String(rec.cli).replace('"kind":"strategy_check",', '');
  const mp = /^calorie-cmd-read (\S+)(?: --params '(.*)')?$/.exec(mutatedCli);
  assert.throws(() => assert.equal(JSON.parse(mp[2]).kind, 'strategy_check', '缺 strategy_check 那一支：' + mutatedCli),
    /缺 strategy_check 那一支/, '变异②（摘掉 kind）未红');
});
