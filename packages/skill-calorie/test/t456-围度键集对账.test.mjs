/** #456 · 围度键集对账：TOP 平局次序表与展示列序表集合相等、各 13 项。
 *
 * 期望值来源（只认字面手算，不拿实现输出当期望）：
 *   ① `src/fetch/body.ts:29-34` 的 `MEASURE_DEFS` 字面：13 键，`shoulder_cm` 在末位
 *      （展示列序；与 `t440` 的 `PART_FIELDS`、`t361` 的 `SEED_13` 键序同一份字面）。
 *   ② `src/analysis/cross.ts:15-19` 的 `WAIST_DIVERGENCE_ORDER` 字面：13 键，
 *      `shoulder_cm` 在第 5 位（TOP 平局次序，属行为；次序与 ① 不同**不是**债务）。
 *   ③ 判据只认**集合相等**（排序后逐项相等）＋**各 13 项**；两表字面次序永不拉齐
 *      （拉齐即改行为，票面「不许动」条；另开票才议）。
 * 负向对照（源码级变异，持锁另做，机器读数见证据）：
 *   M1 在 `MEASUREMENT_FIELDS` 侧加一个假第 14 键 → 本断言必红并点名差集；还原 → 必绿。
 *   M2 在 `WAIST_DIVERGENCE_ORDER` 侧删一个键 → 本断言必红；还原 → 必绿。
 * 运行：先 `npx tsc -b packages/skill-calorie`，再
 *   `node --test packages/skill-calorie/test/t456-围度键集对账.test.mjs`。
 * 真库零写入：纯内存集合断言，不开库、不读库、不写库。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { MEASUREMENT_FIELDS } from '../dist/fetch/body.js';
import { WAIST_DIVERGENCE_ORDER } from '../dist/analysis/cross.js';

const sorted = (xs) => [...xs].sort();
const diff = (a, b) => sorted(a).filter((x) => !b.includes(x));

test('#456 围度键集对账：两表各 13 项且键集合相等（次序不同不是债务）', () => {
  assert.equal(MEASUREMENT_FIELDS.length, 13, '展示列序表应有 13 项（实测 ' + MEASUREMENT_FIELDS.length + '）');
  assert.equal(WAIST_DIVERGENCE_ORDER.length, 13, 'TOP 平局次序表应有 13 项（实测 ' + WAIST_DIVERGENCE_ORDER.length + '）');
  assert.deepEqual(
    sorted(WAIST_DIVERGENCE_ORDER),
    sorted(MEASUREMENT_FIELDS),
    '两表键集合应相等；只在列序侧多的=' + JSON.stringify(diff(MEASUREMENT_FIELDS, WAIST_DIVERGENCE_ORDER))
      + '；只在 TOP 侧多的=' + JSON.stringify(diff(WAIST_DIVERGENCE_ORDER, MEASUREMENT_FIELDS)),
  );
  console.log('T456-READOUT columns=13 top=13'
    + ' shoulder_pos(columns)=' + (MEASUREMENT_FIELDS.indexOf('shoulder_cm') + 1)
    + ' shoulder_pos(top)=' + (WAIST_DIVERGENCE_ORDER.indexOf('shoulder_cm') + 1)
    + ' columns=' + MEASUREMENT_FIELDS.join(',')
    + ' top=' + WAIST_DIVERGENCE_ORDER.join(',')
    + ' VERDICT=GREEN');
});
