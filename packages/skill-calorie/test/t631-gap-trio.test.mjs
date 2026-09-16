/** #631 · 距范围列三态口径（t605 D3）：低于／在内／高于与状态列一致。
 *
 * 判据（票面）：单测覆盖三态各至少一例，断言符号与文案。
 * 口径（本票）：三态判定一律按占比 pct（与状态列同一谓词），符号 ↓/✓/↑ 与状态列同系；
 *   below → gap `↓ N 克` ＋ status `↓ 偏低`；in → gap `✓` ＋ status `✓ 在范围内`；
 *   above → gap `↑ N 克` ＋ status `↑ 偏高`。数字不动（minG/maxG/g/pct 算式不变）。
 * 另含 D3 原样复现（脂肪 44克17% vs 下限20%52克 → ↓8克）与 round 边界分家例（g==minG 但 pct 低于下限）。
 * 跑法：先 tsc -b，再 node --test packages/skill-calorie/test/t631-gap-trio.test.mjs
 */
import { strict as assert } from 'node:assert';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');

const { buildNutritionRatioBlock } =
  await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'diet', 'nutritionPortDocs.js')).href);

function viewOf(o) {
  return {
    start: '2026-09-09', end: '2026-09-15', days: 7,
    totalCalorie: 2000,
    proteinG: 80, proteinPct: 16,
    carbG: 260, carbPct: 52,
    fatG: 60, fatPct: 27,
    balance: 'good',
    targetProteinG: null, targetCarbG: null, targetFatG: null,
    range: {
      protein: { min: 10, max: 20, label: '10-20%' },
      carb: { min: 45, max: 65, label: '45-65%' },
      fat: { min: 20, max: 35, label: '20-35%' },
    },
    ...o,
  };
}

/** 表里某一行（按营养素名找 <tr>），断言 gap 与 status 同行。 */
function rowOf(html, name) {
  const m = new RegExp('<tr>(?:(?!</tr>)[\\s\\S])*' + name + '(?:(?!</tr>)[\\s\\S])*</tr>').exec(html);
  assert.ok(m !== null, '表里找不到「' + name + '」行');
  return m[0];
}

test('#631 低于下限：脂肪 D3 原样 → gap ↓8克 ＋ status ↓偏低（不再印 -8克）', () => {
  const v = viewOf({ totalCalorie: 2340, fatG: 44, fatPct: 17 });
  const html = buildNutritionRatioBlock(v);
  const row = rowOf(html, '脂肪');
  assert.ok(row.includes('↓ 8 克'), '脂肪行 gap 应为「↓ 8 克」，实得：' + row.slice(0, 300));
  assert.ok(row.includes('↓ 偏低'), '脂肪行 status 应为「↓ 偏低」');
  assert.ok(!row.includes('-8 克'), '脂肪行残留旧口径「-8 克」');
});

test('#631 在范围内：蛋白 → gap ✓ ＋ status ✓在范围内', () => {
  const v = viewOf({ proteinG: 80, proteinPct: 16 });
  const html = buildNutritionRatioBlock(v);
  const row = rowOf(html, '蛋白');
  assert.ok(row.includes('✓ 在范围内'), '蛋白行 status 应为「✓ 在范围内」');
  // gap 在内为单个 ✓（与状态列同符号系，不印数字）。
  assert.ok(/>✓</.test(row), '蛋白行 gap 应为单个「✓」');
});

test('#631 高于上限：碳水 → gap ↑25克 ＋ status ↑偏高（不再印 +25克）', () => {
  const v = viewOf({ totalCalorie: 2000, carbG: 350, carbPct: 70 });
  const html = buildNutritionRatioBlock(v);
  const row = rowOf(html, '碳水');
  assert.ok(row.includes('↑ 25 克'), '碳水行 gap 应为「↑ 25 克」，实得：' + row.slice(0, 300));
  assert.ok(row.includes('↑ 偏高'), '碳水行 status 应为「↑ 偏高」');
  assert.ok(!row.includes('+25 克'), '碳水行残留旧口径「+25 克」');
});

test('#631 边界分家已收敛：g==minG 但 pct 低于下限 → gap/status 同判 ↓（旧口径会印 ✓）', () => {
  // total=100 时脂肪 minG=round(100*20/100/9)=2；g=2 时 pct=round(2*9)=18<20。
  // 旧算式按克数比（2<2 为假）印 ✓，与状态 ↓偏低 分家；新口径按 pct 一律判 ↓。
  const v = viewOf({ totalCalorie: 100, fatG: 2, fatPct: 18 });
  const html = buildNutritionRatioBlock(v);
  const row = rowOf(html, '脂肪');
  assert.ok(row.includes('↓ 偏低'), '边界行 status 应为「↓ 偏低」');
  assert.ok(row.includes('↓ 0 克'), '边界行 gap 应为「↓ 0 克」（minG-g=0，方向与状态一致）');
});
