/** #950 · 主页（`calorie.view.home`）**照原型重做后的形状锁**——真交付出口 ＋ 固定种子库。
 *
 * 本件守什么（每条都对应本票的一处改动，判据打在**生产真正走的那条路**上：spawn
 * `dist/cli/cmd_read.js`、解析 envelope、读落盘产物——同族先例 `home-lock-374`／`t401c`）：
 *  1. **页框三件在位**：态声明条（只在目标暂停时出）／分段导航（动作形）／记录带（一格一天）；
 *  2. **记录带的两档行为**：短窗一格一天照窗口天数、今天那格带「今天」二字；长窗（>14 天）
 *     截到最近 14 天并**明示**截断（这条是实拍抓到压字后修的，锁住它免得回退）；
 *  3. **等式条**：`摄入 ＋ 缺口 ＝ 消耗` 三段读数在场，且**合计等于摄入加缺口**（算式断言，不是字面锁）；
 *  4. **折线纵轴下界恒 0**：刻度里必须有 `0`、且**不许出现负数**（负数刻度是 #544 打过的那类缺陷）；
 *  5. **五档各自的形状**：五张页都带导航与记录带；等式条只归 `overview`；`budget` 档出「剩余预算」。
 *
 * **变异自证**：把产物里那一段形状删掉，同一条判据必须翻转——证明断言不是恒真。
 * 跑法：`node --test packages/skill-calorie/test/t950-主页原型框架.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 真出口跑一遍：固定种子库（`SEED_TODAY`）；`paused` 为真时先把单例行的 `goal_paused` 置 1。
 *  取数口径：`db.dir` 指临时目录（`homeEnvOf`＋`calorieConfigDir`），时钟钉到种子日（`freezeClock`）。 */
function render(params, opts = {}) {
  const workDir = mkdtempSync(join(tmpdir(), 't950-shape-'));
  const db = openDb(join(workDir, DB_FILENAME));
  seedFull(db);
  if (opts.paused === true) db.prepare('UPDATE daily_goal SET goal_paused = 1 WHERE id = 1').run();
  db.close();
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.home', '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(workDir)), ...freezeClock(SEED_TODAY) },
  });
  assert.equal(r.status, 0, '真出口 exit 0（stderr：' + String(r.stderr).slice(0, 300) + '）');
  const env = JSON.parse(String(r.stdout).trim());
  return { env, metrics: env.data.metrics, html: readFileSync(env.data.output, 'utf8') };
}

/** 记录带那几格（日期串的文本）。 */
function stripDates(html) {
  return [...html.matchAll(/<span class="ilife-block-day-strip-date">([^<]*)<\/span>/g)].map((m) => m[1]);
}
/** 折线纵轴刻度（SVG `<text>` 里的整数字）。 */
function yTicks(html) {
  return [...html.matchAll(/<text[^>]*>(-?\d+)<\/text>/g)].map((m) => Number(m[1]));
}
/** **元素**在场判据：公共层的样式段里恒有这些类名的 CSS 规则，所以判据必须写成元素形
 *  （`<div class="…">`），只搜类名会把「样式在、元素不在」判成在场——本件第一版就栽在这上面。 */
const hasEquation = (html) => html.includes('<div class="ilife-block-equation-bar">');
const hasStateBanner = (html) => html.includes('<div class="ilife-block-state-banner');

/* ── ① 页框三件 ─────────────────────────────────────────────────────────── */

test('#950 页框三件在位：分段导航（动作形）＋记录带（一格一天）', () => {
  const { html, metrics } = render({ date: '今日' });
  assert.ok(html.includes('<nav class="ilife-block-seg-nav is-sticky" aria-label="页内导航">'),
    '缺分段导航（#950 起页内导航是分段控件，不是胶囊排）');
  assert.ok(html.includes('aria-current="page"'), '导航没标出「当前这一块」');
  assert.ok(html.includes('<div class="ilife-block-day-strip is-comfortable">'), '缺记录带');
  // 记录带带下那几件窗口事实：读数与 envelope 的 metrics 对齐（不字面锁死数字）。
  for (const needle of ['本窗 ' + metrics.loggedDays + '/7 天有记录', '连续记录 ' + metrics.streakDays + ' 天',
    '周均摄入 ', '周均缺口 ']) {
    assert.ok(html.includes(needle), '记录带带下缺事实：' + needle);
  }
});

test('#950 态声明条只在目标暂停时出（态与结论分住两件）', () => {
  const off = render({ date: '今日' });
  assert.ok(!hasStateBanner(off.html), '目标没暂停却出了态声明条');
  const on = render({ date: '今日' }, { paused: true });
  assert.ok(on.html.includes('<div class="ilife-block-state-banner is-warn">'), '目标暂停时没出态声明条');
  assert.ok(on.html.includes('目标暂停中'), '态声明条缺徽标词');
  assert.ok(on.html.includes('按暂停前的目标'), '态声明条缺那句前提');
  // 结论条与态声明条**同时在场**（这正是「态与结论分住」的判据）。
  assert.ok(on.html.includes('<p class="ilife-block-conclusion">'), '结论条被态声明条挤掉了');
});

/* ── ② 记录带的两档行为 ─────────────────────────────────────────────────── */

test('#950 短窗：一格一天、今天那格带「今天」二字', () => {
  const { html } = render({ date: '今日' });
  const dates = stripDates(html);
  assert.equal(dates.length, 7, '7 天窗该有 7 格，实得 ' + dates.length);
  assert.equal(dates[dates.length - 1], '09-07 今天', '今天那格没带「今天」：' + dates[dates.length - 1]);
  assert.ok(!dates[0].includes('今天'), '只有今天那格该带「今天」');
});

test('#950 长窗：截到最近 14 天并明示截断（实拍抓过压字）', () => {
  const { html } = render({ date: '今日', windowDays: 30 });
  const dates = stripDates(html);
  assert.equal(dates.length, 14, '30 天窗该截到 14 格，实得 ' + dates.length);
  assert.ok(html.includes('带上是最近 14 天'), '截断了却没明示（读者会以为整窗只有 14 天）');
  assert.ok(html.includes('本窗 '), '截断后窗口天数那句仍须在场');
});

/* ── ③ 等式条：算式断言（不是字面锁）───────────────────────────────────── */

test('#950 等式条：摄入＋缺口＝消耗 三段在场且合计对得上', () => {
  const { html, metrics } = render({ date: '今日' });
  assert.ok(html.includes('<div class="ilife-block-equation-bar">'), '缺等式条');
  for (const cap of ['摄入 ' + metrics.intakeCal, '缺口 ' + metrics.deficitToday]) {
    assert.ok(html.includes(cap), '等式条缺分段读数：' + cap);
  }
  const total = metrics.intakeCal + metrics.deficitToday;
  assert.ok(html.includes('<span class="ilife-block-equation-bar-cap-item is-total">合计 ' + total + '</span>'),
    '等式条的合计不等于摄入加缺口（' + metrics.intakeCal + '＋' + metrics.deficitToday + '＝' + total + '）');
});

/* ── ④ 折线纵轴下界恒 0 ─────────────────────────────────────────────────── */

test('#950 折线纵轴：含 0、且不出现负数刻度', () => {
  const { html } = render({ date: '今日' });
  const ticks = yTicks(html);
  assert.ok(ticks.length >= 3, '纵轴刻度少于 3 条：' + ticks.join('／'));
  assert.ok(ticks.includes(0), '纵轴不含 0（下界没恒 0）：' + ticks.join('／'));
  assert.ok(ticks.every((n) => n >= 0), '纵轴出现负数刻度（#544 打过的那类缺陷）：' + ticks.join('／'));
});

/* ── ⑤ 五档各自的形状 ───────────────────────────────────────────────────── */

test('#950 五档都带导航与记录带；等式条只归 overview；budget 出剩余预算', () => {
  for (const section of ['overview', 'week', 'streak', 'budget', 'month']) {
    const { html } = render({ date: '今日', section });
    assert.ok(html.includes('<nav class="ilife-block-seg-nav is-sticky"'), section + ' 档缺分段导航');
    assert.ok(html.includes('ilife-block-day-strip'), section + ' 档缺记录带');
    assert.ok(html.includes('>复制数据<') && html.includes('>复制日志<'), section + ' 档复制区两颗按钮不在了');
    assert.equal(hasEquation(html), section === 'overview', section + ' 档的等式条归属不对（只有 overview 该有）');
  }
  const budget = render({ date: '今日', section: 'budget' });
  assert.ok(budget.html.includes('剩余预算'), 'budget 档丢了「剩余预算」这个主角');
  assert.ok(!budget.html.includes('今日缺口（热量缺口）'), 'budget 档漏进了缺口卡');
});

/* ── 变异自证：判据不恒真 ───────────────────────────────────────────────── */

test('#950 变异自证：删掉那一段形状，同一条判据必翻转', () => {
  const { html } = render({ date: '今日' });
  const cut = html.replace('<div class="ilife-block-equation-bar">', '<div class="ilife-block-equation-bar-removed">');
  assert.notEqual(cut, html, '产物里找不到可删的等式条（判据锚点失效）');
  assert.ok(hasEquation(html), '原样该命中等式条');
  assert.ok(!hasEquation(cut), '删掉后仍命中 ⇒ 判据是恒真的');
});
