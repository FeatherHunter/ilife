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
  resolveHelpPath,
} from '../dist/render/helpPaths.js';

/** 本地 2026-07-26 12:30:00（构造与格式化同为本地时区，任何机器时区下金值不变）。 */
const D0 = new Date(2026, 6, 26, 12, 30, 0);
const STAMP = '20260726_123000';

function tmpDbDir(tag) {
  return mkdtempSync(join(tmpdir(), 't133-' + tag + '-'));
}

test('#133 ① 通式：〈茎〉_<YYYYMMDD>_<HHMMSS>.html', () => {
  assert.equal(buildHelpFileName('主页仪表盘', D0), '主页仪表盘_' + STAMP + '.html');
  assert.equal(formatHelpStamp(new Date(2026, 0, 2, 3, 4, 5)), '20260102_030405');
});

test('#133 ② HELP 形：卡路里_HELP_<ts>.html', () => {
  assert.equal(buildHelpFileName('卡路里_HELP', D0), '卡路里_HELP_' + STAMP + '.html');
});

test('#133 ③ 中文茎原样（不清洗不截断）', () => {
  assert.equal(buildHelpFileName('热量趋势', D0), '热量趋势_' + STAMP + '.html');
});

test('#133 ④ 特殊字符茎原样：空格／：／vs／_ 逐字保留', () => {
  assert.equal(
    buildHelpFileName('看体重 vs 摄入：最近_7天', D0),
    '看体重 vs 摄入：最近_7天_' + STAMP + '.html',
  );
});

test('#133 ⑤ 碰撞 → _2（首候选已存在）', () => {
  const dbDir = tmpDbDir('coll2');
  const seen = new Set([join(dbDir, HELP_HTML_DIR_NAME, '卡路里_HELP_' + STAMP + '.html')]);
  const got = resolveHelpPath(dbDir, '卡路里_HELP', D0, (p) => seen.has(p));
  assert.equal(got, join(dbDir, HELP_HTML_DIR_NAME, '卡路里_HELP_' + STAMP + '_2.html'));
});

test('#133 ⑥ 碰撞 → _3（首候选＋_2 均已存在）', () => {
  const dbDir = tmpDbDir('coll3');
  const seen = new Set([
    join(dbDir, HELP_HTML_DIR_NAME, '卡路里_HELP_' + STAMP + '.html'),
    join(dbDir, HELP_HTML_DIR_NAME, '卡路里_HELP_' + STAMP + '_2.html'),
  ]);
  const got = resolveHelpPath(dbDir, '卡路里_HELP', D0, (p) => seen.has(p));
  assert.equal(got, join(dbDir, HELP_HTML_DIR_NAME, '卡路里_HELP_' + STAMP + '_3.html'));
});

test('#133 ⑦ 无碰撞不加后缀（exists 恒假）', () => {
  const dbDir = tmpDbDir('nocoll');
  const got = resolveHelpPath(dbDir, '卡路里_HELP', D0, () => false);
  assert.equal(got, join(dbDir, HELP_HTML_DIR_NAME, '卡路里_HELP_' + STAMP + '.html'));
});

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

test('#133 ⑩ 绝对路径：相对 dbDir 输入亦返回绝对路径', () => {
  const cwd = process.cwd();
  const leaf = 't133-rel-' + String(Date.now());
  const relDb = join(leaf, 'db');
  const got = resolveHelpPath(relDb, '卡路里_HELP', D0, () => false);
  assert.ok(isAbsolute(got), '须为绝对路径：' + got);
  assert.equal(got, join(resolve(cwd, relDb), HELP_HTML_DIR_NAME, '卡路里_HELP_' + STAMP + '.html'));
  rmSync(join(cwd, leaf), { recursive: true, force: true });
});

test('#133 ⑫ 落点目录名／扩展名字面量（防漂移：老 `SKILL_HTML_NAME + "_html"` → calorie_html）', () => {
  assert.equal(HELP_HTML_DIR_NAME, 'calorie_html');
  assert.equal(HELP_HTML_EXT, '.html');
});
test('#133 ⑪ 目录自动创建：calorie_html 不存在则递归建出', () => {
  const dbDir = join(tmpDbDir('mkdir'), 'not-exist-db');
  assert.ok(!existsSync(dbDir), '前置：dbDir 不存在');
  const got = resolveHelpPath(dbDir, '卡路里_HELP', D0, () => false);
  assert.ok(existsSync(join(dbDir, HELP_HTML_DIR_NAME)), 'calorie_html 须被建出');
  assert.equal(got, join(dbDir, HELP_HTML_DIR_NAME, '卡路里_HELP_' + STAMP + '.html'));
});
