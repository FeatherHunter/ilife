/** #571 · 缺口族 R-28~R-35 靶向断言（页 21/22 同字节，一处修两页各验）。
 *
 *  范围：`buildDeficitDoc` 合成数据（不依赖取数）＋源码结构锁。
 *  不改冻结 `analysis-deficit-385.test.mjs`（D1/D2逐字断言）；本文件只增量锁本票修法：
 *  改坏（ revert R-32 折叠 / R-33 第三序列 / R-30 tnum 等 ）必红，还原必绿。
 *  R-28 与冻结 D2 字面冲突（见本文件 R-28 段与证据 §2），本票不动文案、只锁现况，待编排者裁决。
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { buildDeficitDoc } from '../dist/render/trendDocs.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, '..', 'src', 'render', 'trendPredictDocs.ts'), 'utf8');

function synth() {
  return {
    summary: { avgIntake: 433, avgBurn: 600, avgExerciseBurn: 200, avgDeficit: 167, weeklyDeficit: 500, predictedLossKg: 0.06, trend: 'loss' },
    target: { intake: 1800, tdee: 500, weeklyDeficitPerDay: 300 },
    series: [
      { date: '2026-09-01', intake: 200, burn: 600, deficit: 400, weekday: '周二' },
      { date: '2026-09-02', intake: 450, burn: 600, deficit: 150, weekday: '周三' },
      { date: '2026-09-03', intake: 650, burn: 600, deficit: -50, weekday: '周四' },
    ],
    meta: { start: '2026-09-01', end: '2026-09-03', days: 3, weekdayCount: 3, weekendCount: 0 },
  };
}

test('#571 R-29 缺口列纯符号整数（改回连排即红）', () => {
  const html = buildDeficitDoc(synth());
  const cells = [...html.matchAll(/data-label="缺口"[^>]*>([^<]*)</g)].map((m) => m[1]);
  assert.deepEqual(cells, ['+400', '+150', '-50']);
  for (const v of cells) assert.match(v, /^[+-]\d+$/);
});

test('#571 R-30 数值等宽右对齐页侧锁（撤tnum即红）', () => {
  assert.ok(SRC.includes('t571DeficitCss'), '缺口页侧样式缺失');
  assert.ok(SRC.includes('font-variant-numeric:tabular-nums'), 'tnum 缺失');
  assert.ok(SRC.includes(".t571-deficit-table"), '缺口表标记缺失');
});

test('#571 R-31 合计标签短标签（改长即红）', () => {
  const html = buildDeficitDoc(synth());
  for (const t of ['合计摄入', '合计消耗', '合计缺口']) assert.ok(html.includes('>' + t + '<'));
  assert.ok(SRC.includes('.t571-deficit-totals'), '合计宽列标记缺失');
  assert.ok(SRC.includes('grid-template-columns:64px'), '左列64px缺失');
});

test('#571 R-32 明细折叠默认闭合带展开（撤disclosure即红）', () => {
  const html = buildDeficitDoc(synth());
  assert.ok(html.includes('ilife-block-disclosure'), '折叠区缺失');
  assert.ok(html.includes('缺口明细（点击展开）'), '展开标题缺失');
  assert.ok(!html.includes('ilife-block-disclosure" open'), '默认须闭合');
  assert.ok(SRC.includes('.t571-deficit-detail details:not([open])'), '折叠隐藏规则缺失');
});

test('#571 R-33 图例含摄入目标与目标值（撤第三序列即红）', () => {
  const html = buildDeficitDoc(synth());
  const leg = (html.match(/ilife-charts-legend">([\s\S]*?)<\/div>/) || [])[1] || '';
  assert.ok(leg.includes('摄入目标'), '图例缺摄入目标：' + leg.slice(0, 120));
  assert.ok(leg.includes('1800'), '图例缺目标值：' + leg.slice(0, 120));
  assert.ok(SRC.includes("name: '摄入目标 ' + d.target.intake"), '第三序列缺失');
});

test('#571 R-34 刻度3条保持（撤yTicks即红）', () => {
  const html = buildDeficitDoc(synth());
  assert.equal([...html.matchAll(/<text class="ilife-charts-tick"/g)].length, 3);
});

test('#571 R-35 日期含星期（去星期即红）', () => {
  const html = buildDeficitDoc(synth());
  const dates = [...html.matchAll(/data-label="日期"[^>]*>([^<]*)</g)].map((m) => m[1]);
  assert.deepEqual(dates, ['2026-09-01 周二', '2026-09-02 周三', '2026-09-03 周四']);
});

test('#571 R-28 冲突锁现况（改文案即红，待裁决）', () => {
  const html = buildDeficitDoc(synth());
  const cells = [...html.matchAll(/<td class="ilife-block-data-table-cell-[a-z]+"[^>]*>([^<]*)<\/td>/g)].map((m) => m[1]);
  assert.ok(cells.includes('✓ 达标'), '冻结 D2 表文案被改');
  const chips = [...html.matchAll(/ilife-block-chip">([^<]*)</g)].map((m) => m[1]);
  assert.ok(chips.includes('达标 1 天'), '冻结 D2 徽章被改');
  assert.ok(html.includes('达标线＝每天 +300 卡缺口'), '冻结 D1 口径被改');
});
