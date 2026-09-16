/** #567 缺口页级断言（D1／D2／D6／D4／D5／状态列能力／572-S3-3／J4，读 `dist/` 真跑，不碰库／盘）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie`，
 * 再 `node --test packages/skill-calorie/test/analysis-shape-567.test.mjs`。
 * 冻结 `analysis-*.test.mjs` 一行不动（385／466／520 的逐字断言仍须全绿，见 §0 段界声明）。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildDeficitDoc } from '../dist/render/trendPredictDocs.js';
import { renderDataTable } from '../../base-render/dist/blocks.js';

function deficitData() {
  return {
    target: { weeklyDeficitPerDay: 300, intake: 1800, tdee: 2200 },
    summary: { avgIntake: 1600, avgBurn: 2400, avgExerciseBurn: 200, avgDeficit: 800, weeklyDeficit: 5600, predictedLossKg: 0.73, trend: 'loss' },
    series: [
      { date: '2026-09-10', weekday: '周三', intake: 1600, burn: 2400, deficit: 800 },
      { date: '2026-09-11', weekday: '周四', intake: 1500, burn: 2500, deficit: 1000 },
    ],
    meta: { start: '2026-09-10', end: '2026-09-16', days: 7, weekdayCount: 5, weekendCount: 2 },
  };
}
const html = buildDeficitDoc(deficitData());
const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
function lcsLen(a, b) {
  const prev = new Array(b.length + 1).fill(0);
  let best = 0;
  for (let i = 1; i <= a.length; i += 1) {
    let diag = 0;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      if (a[i - 1] === b[j - 1]) { prev[j] = diag + 1; if (prev[j] > best) best = prev[j]; }
      else prev[j] = 0;
      diag = tmp;
    }
  }
  return best;
}

test('#567 D1 缺口页表卡无宽度上限（吃满内容列）', () => {
  const base = (css.match(/\.ilife-block-data-table \{([^}]*)\}/) ?? [])[1] ?? '';
  assert.ok(!/max-width/.test(base), '表卡仍带宽度上限：' + base);
});

test('#567 D2 合计行首列不折行（公共层首轨可长＋本页 64px 覆盖仍在）', () => {
  assert.ok(css.includes('grid-template-columns: minmax(44px, auto) minmax(0, 1fr) auto'), '公共层首轨未放开');
  assert.ok(html.includes('.t571-deficit-totals .ilife-block-list-rows-row{grid-template-columns:64px minmax(0,1fr) auto}'),
    '本页合计行 64px 覆盖丢了');
});

test('#567 D6 缺口页导航触摸目标 44px', () => {
  const rule = (css.match(/\.ilife-block-toc a \{([^}]*)\}/) ?? [])[1] ?? '';
  assert.ok(/min-height:\s*44px/.test(rule), 'toc-a 无 44px：' + rule);
});

test('#567 D4 同一口径一页一处（参数说明只讲窗口）', () => {
  const desc = ((html.match(/ilife-block-param-form-description">([\s\S]*?)<\/(?:p|div)>/) ?? [])[1] ?? '')
    .replace(/<[^>]*>/g, '').trim();
  assert.ok(desc.length > 0, '参数说明空了（不许删了事）');
  assert.ok(desc.includes('共 7 天'), '参数说明不讲窗口：' + desc);
  const calibers = [...html.matchAll(/ilife-block-caliber">([\s\S]*?)<\/(?:p|div)>/g)]
    .map((m) => m[1].replace(/<[^>]*>/g, ' ')).join(' ');
  assert.ok(lcsLen(desc, calibers) < 8, '参数说明与口径行仍有 ' + lcsLen(desc, calibers) + ' 字重叠：' + desc);
});

test('#567 D5 消耗构成同数不两处（堆叠条值槽只印占比）', () => {
  const vals = [...html.matchAll(/dist-row-val">([^<]*)</g)].map((m) => m[1]);
  assert.deepEqual(vals.length, 2, '堆叠条行数变了：' + JSON.stringify(vals));
  for (const v of vals) assert.ok(/%$/.test(v) && !v.includes('卡'), '值槽仍印绝对数：' + v);
  // 绝对数只留 KPI detail（385 冻结原文，一字不动）。
  assert.ok(html.includes('日常消耗 2200 ＋ 运动 200 卡'), 'KPI detail 冻结原文丢了');
});

test('#567 状态列 cellHtml 合成表（缺口页暂不接线：385 CELL_RE 冻结）', () => {
  const t = renderDataTable({
    columns: [{ key: 's', label: '状态' }],
    rows: [{ s: '✓ 达标' }],
    cellHtml: (key, value) => key === 's'
      ? '<span class="ilife-status-badge ilife-status-badge-ok">' + value + '</span>' : undefined,
  });
  assert.ok(t.includes('<span class="ilife-status-badge ilife-status-badge-ok">✓ 达标</span>'), '徽章未进单元格');
  // 缺口页本票不接线：状态格仍是纯文本（385 D2 逐字），接线待 385 解冻。
  const cells = [...html.matchAll(/<td class="ilife-block-data-table-cell-[a-z]+"[^>]*>([^<]*)<\/td>/g)].map((m) => m[1]);
  assert.ok(cells.includes('✓ 达标'), '缺口页状态格形态变了（本票不该动）：' + cells.join('|'));
});

test('#567 572-S3-3 表头不抬大写（ml／kg 渲染即源码）', () => {
  assert.ok(!/block-data-table th\s*\{[^}]*text-transform:\s*uppercase/.test(css), 'th 仍抬大写');
  const t = renderDataTable({ columns: [{ key: 'w', label: '饮水（ml）' }], rows: [{ w: 1200 }] });
  assert.ok(t.includes('>饮水（ml）</th>'), '表头源码字面变了：' + t.slice(0, 200));
});

test('#567 J4 缺口页段字号收敛（基准量法 chartsAt 切分；≤6 种且 ≥11px）', () => {
  const chartsAt = css.indexOf('.ilife-charts');
  assert.ok(chartsAt > 0, 'charts 段起点找不到');
  const sizes = [...new Set([...css.slice(0, chartsAt).matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => m[1]))]
    .map(Number).sort((a, b) => a - b);
  assert.ok(sizes.length <= 6 && sizes[0] >= 11, '页段[' + sizes.join(',') + ']（单列偏差见证据 §1：票面≤5 vs 基准五档＋下限＝6 值）');
});
