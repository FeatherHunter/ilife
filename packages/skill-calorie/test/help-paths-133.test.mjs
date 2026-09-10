/** T2-②a #133 · HELP 落盘命名单测（只测命名工具，不碰渲染接线）。
 *
 * 全用例硬编码金值（禁 tautology：期望串全部手写，不由被测函数推导）。
 * 运行：先 `npx tsc -b packages/skill-calorie`，
 * 再 `node --test packages/skill-calorie/test/help-paths-133.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { test } from 'node:test';
import {
  buildHelpFileName,
  formatHelpStamp,
  HELP_HTML_DIR_NAME,
  HELP_HTML_EXT,
  SHEET_FILE_STEM,
  resolveStemTarget,
} from '../dist/render/helpPaths.js';

/** 本地 2026-07-26 12:30:00（构造与格式化同为本地时区，任何机器时区下金值不变）。 */
const D0 = new Date(2026, 6, 26, 12, 30, 0);
const STAMP = '20260726_123000';

function tmpDbDir(tag) {
  return mkdtempSync(join(tmpdir(), 't133-' + tag + '-'));
}

test('#133 ① 通式：〈文件名主体〉_<YYYYMMDD>_<HHMMSS>.html', () => {
  assert.equal(buildHelpFileName('主页仪表盘', D0), '主页仪表盘_' + STAMP + '.html');
  assert.equal(formatHelpStamp(new Date(2026, 0, 2, 3, 4, 5)), '20260102_030405');
});

test('#133 ② HELP 形：卡路里_HELP_<ts>.html', () => {
  assert.equal(buildHelpFileName('卡路里_HELP', D0), '卡路里_HELP_' + STAMP + '.html');
});

test('#133 ③ 中文主体原样（不清洗不截断）', () => {
  assert.equal(buildHelpFileName('热量趋势', D0), '热量趋势_' + STAMP + '.html');
});

test('#133 ④ 特殊字符主体原样：空格／：／vs／_ 逐字保留', () => {
  assert.equal(
    buildHelpFileName('看体重 vs 摄入：最近_7天', D0),
    '看体重 vs 摄入：最近_7天_' + STAMP + '.html',
  );
});

/* ── ⑤⑥⑦⑩⑪ 已随 #139 删除 ────────────────────────────────────────────────────────
 * 那五条钉的是 `resolveHelpPath` 的 `exists` 判存循环（判存→取名→再写）。判存与写入之间
 * 没有独占性，并发同秒必交叉覆盖（S2），#128 起最终名一律由
 * `output.ts:writeFileExclusiveWithRetry` 的 `wx`＋`EEXIST` 递补仲裁。故该 API 已删，
 * 本模块只剩「算初候选」一件事，用例改为 ⑬⑭⑮。
 */

test('#133 ⑧ 显式 _n 直拼（含 _6 上限形）', () => {
  assert.equal(buildHelpFileName('卡路里_HELP', D0, 2), '卡路里_HELP_' + STAMP + '_2.html');
  assert.equal(buildHelpFileName('卡路里_HELP', D0, 6), '卡路里_HELP_' + STAMP + '_6.html');
});

test('#133 ⑨ 时间戳秒一致：同秒毫秒不同 → 同名；跨秒 → 异名', () => {
  assert.equal(
    buildHelpFileName('卡路里_HELP', new Date(2026, 6, 26, 12, 30, 0, 987)),
    '卡路里_HELP_' + STAMP + '.html',
  );
  assert.equal(
    buildHelpFileName('卡路里_HELP', new Date(2026, 6, 26, 12, 30, 1, 0)),
    '卡路里_HELP_20260726_123001.html',
  );
});

test('#133 ⑫ 落点目录名／扩展名字面量（防漂移：老 `SKILL_HTML_NAME + "_html"` → calorie_html）', () => {
  assert.equal(HELP_HTML_DIR_NAME, 'calorie_html');
  assert.equal(HELP_HTML_EXT, '.html');
});

test('#133 ⑬ 初候选：<dbDir>/calorie_html/〈主体〉_<stamp>.html', () => {
  const dbDir = tmpDbDir('target');
  assert.equal(
    resolveStemTarget(dbDir, '卡路里_HELP', D0),
    join(dbDir, HELP_HTML_DIR_NAME, '卡路里_HELP_' + STAMP + '.html'),
  );
});

test('#133 ⑭ 相对 dbDir 亦返回绝对路径；且零 IO——初候选不建目录', () => {
  const cwd = process.cwd();
  const leaf = 't133-rel-' + String(Date.now());
  const relDb = join(leaf, 'db');
  const got = resolveStemTarget(relDb, '卡路里_HELP', D0);
  assert.ok(isAbsolute(got), '须为绝对路径：' + got);
  assert.equal(got, join(resolve(cwd, relDb), HELP_HTML_DIR_NAME, '卡路里_HELP_' + STAMP + '.html'));
  assert.equal(existsSync(join(cwd, leaf)), false, '初候选不得建目录（零 IO；落盘时由 wx 独占写建）');
  rmSync(join(cwd, leaf), { recursive: true, force: true });
});

test('#133 ⑮ 速查台主体与 HELP 文件主体分名（#139：两份产物不撞名）', () => {
  const dbDir = tmpDbDir('sheet');
  assert.equal(SHEET_FILE_STEM, '卡路里_速查台');
  assert.equal(
    resolveStemTarget(dbDir, SHEET_FILE_STEM, D0),
    join(dbDir, HELP_HTML_DIR_NAME, '卡路里_速查台_' + STAMP + '.html'),
  );
  assert.notEqual(
    resolveStemTarget(dbDir, SHEET_FILE_STEM, D0),
    resolveStemTarget(dbDir, '卡路里_HELP', D0),
  );
});
