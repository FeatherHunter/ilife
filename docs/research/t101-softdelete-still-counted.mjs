#!/usr/bin/env node
/** #101 · 返修 H1 事实复核（可复跑）：删除回执文案的**每一句承诺**都必须与实测同源。
 *
 * 背景：A2 实测软删一条运动后回执写「已删除运动 #1（软删除，可恢复）」，但
 *   ① `analysis/**` 11 处查询**未过滤** `exercise_log.is_deleted` → 统计量删前=删后；
 *   ② `view.exercise` 同时 exit 4「无运动记录」（fetch `listWindow` 过滤了该列）；
 *   ③ 全仓 77 键 **0 个** restore/undo/recover 入口 → 「可恢复」是话术。
 * 裁定：根因在读层（analysis/fetch），**非本票引入、不在本票修查询**；本票只把文案改成如实。
 * 本脚本把上述三条事实**机器化**，供后续另开票（读层补 `is_deleted` 过滤）作回归基线：
 *   - 事实 A：软删运动后 `home.deficitToday`／`deficit.avgExerciseBurn`／`buildSeries.exerciseKcal` 不变
 *     → 文案「仍计入历史统计」为真；
 *   - 事实 B：同一时刻 `view.exercise` exit 4（列表侧已排除）；
 *   - 事实 C：键表 0 个 restore/undo/recover 入口 → 文案不得出现「可恢复」承诺；
 *   - 事实 D：`body_composition`／`body_measurements`／`nutrition_products` 软删后**读层已排除**
 *     （`is_deprecated = 0`）→ 这三键文案写「已从查询与统计中排除」为真。
 *
 * 用法（先 `pnpm build`；本脚本只读自己建的临时库，不碰工作区数据，无需持 gate.lock）：
 *   node docs/research/t101-softdelete-still-counted.mjs
 * 退出码：0 = 四条事实全部成立；1 = 任一事实与文案不符（文案需随之更新）。
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CALORIE_COMBOS, CALORIE_WRITE_COMBOS } from '../../packages/skill-calorie/dist/cli/keys.js';
import { openDbReadOnly } from '../../packages/skill-calorie/dist/db/readonly.js';
import { buildSeries } from '../../packages/skill-calorie/dist/analysis/series.js';
import { openDb } from '../../packages/skill-calorie/dist/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const DATE = '2026-09-09';
const START = '2026-09-01';

const dir = mkdtempSync(join(tmpdir(), 't101-h1-'));
const env = { ...process.env, SKILLS_DB_PATH: dir };
const run = (key, params) => spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params)], { encoding: 'utf8', env });
const runOk = (key, params) => {
  const r = run(key, params);
  if (r.status !== 0) throw new Error(key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-400));
  return JSON.parse(r.stdout).data;
};

runOk('calorie.profile.set', { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' });
runOk('calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50, water: 2000 });
runOk('calorie.diet.add', { foodName: '米饭', calories: 500, protein: 10, date: DATE });
const exId = runOk('calorie.exercise.add', { type: '跑步', calories: 250, minutes: 30, date: DATE }).receipt.recordId;
runOk('calorie.body.composition-add', { source: 'gym', bodyFatPct: 19.5, date: '2026-09-08' });
const bfId = runOk('calorie.body.composition-add', { source: 'gym', bodyFatPct: 18.5, date: DATE }).receipt.recordId;
runOk('calorie.product.add', { productName: '燕麦片', brand: 'X牌', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 });

const snapshot = () => {
  const home = runOk('calorie.view.home', { date: DATE });
  const def = runOk('calorie.view.deficit', { start: START, end: DATE });
  const db = openDbReadOnly(join(dir, 'calorie_data.db'));
  let seriesEx = null;
  try { seriesEx = buildSeries(db, DATE, DATE)[0].exerciseKcal; } finally { db.close(); }
  const bf = runOk('calorie.view.body-composition', { start: START, end: DATE });
  // 搜索：无命中时读键按「缺失阻断」exit 4 → 记为 0 命中（即「已从查询中排除」）。
  let productHits = 0;
  const search = run('calorie.view.search', { keyword: '燕麦' });
  if (search.status === 0) productHits = JSON.parse(search.stdout).data.metrics.total;
  else if (search.status !== 4) throw new Error('view.search exit ' + search.status + ' stderr=' + (search.stderr || '').slice(-300));
  return {
    deficitToday: home.metrics.deficitToday,
    avgExerciseBurn: def.metrics.avgExerciseBurn,
    exerciseKcal: seriesEx,
    bodyFatTotal: bf.metrics.total,
    bodyFatLatestPct: bf.metrics.latestPct,
    productHits,
  };
};

const before = snapshot();

// ---- 事实 A/B：软删运动 ----
const delEx = runOk('calorie.exercise.remove', { id: exId });
const after = snapshot();
const viewEx = run('calorie.view.exercise', { start: START, end: DATE });

// ---- 事实 C：restore/undo/recover 入口数 ----
const allKeys = [...new Set([...Object.keys(CALORIE_COMBOS), ...Object.keys(CALORIE_WRITE_COMBOS)])];
const restoreEntries = allKeys.filter((k) => /restore|undo|recover|undelete|回滚|恢复/.test(k));

// ---- 事实 D：体脂软删后被读层排除 ----
const delBf = runOk('calorie.body.composition-remove', { id: bfId });
const afterBf = snapshot();
// ---- 事实 D2：食品下架后被搜索排除 ----
const prodId = 1;
const delProd = runOk('calorie.product.deprecate', { id: prodId });
const afterProd = snapshot();

const rows = [
  ['A 软删运动文案「仍计入历史统计」', 'view.home.deficitToday', before.deficitToday, after.deficitToday, before.deficitToday === after.deficitToday],
  ['A', 'view.deficit.avgExerciseBurn', before.avgExerciseBurn, after.avgExerciseBurn, before.avgExerciseBurn === after.avgExerciseBurn],
  ['A', 'buildSeries.exerciseKcal(当日)', before.exerciseKcal, after.exerciseKcal, before.exerciseKcal === after.exerciseKcal],
  ['B 列表侧已排除', 'view.exercise exit', '0', String(viewEx.status), viewEx.status === 4],
  ['B', 'view.exercise stderr', '—', (viewEx.stderr || '').trim().split('\n')[0], /无运动记录/.test(viewEx.stderr || '')],
  ['C 无恢复入口', '键表 restore/undo/recover 数', '0', String(restoreEntries.length), restoreEntries.length === 0],
  ['D 体脂文案「已从查询与统计中排除」', 'view.body-composition 有效行数', before.bodyFatTotal, afterBf.bodyFatTotal, before.bodyFatTotal !== afterBf.bodyFatTotal],
  ['D', 'view.body-composition 最新体脂', before.bodyFatLatestPct, afterBf.bodyFatLatestPct, before.bodyFatLatestPct !== afterBf.bodyFatLatestPct],
  ['D2 食品文案「已从查询与统计中排除」', 'view.search 命中数', before.productHits, afterProd.productHits, afterProd.productHits === 0],
];

console.log('回执词条实测：');
console.log('  exercise.remove → ' + delEx.message);
console.log('  body.composition-remove → ' + delBf.message);
console.log('  product.deprecate → ' + delProd.message);
console.log('');
console.log('| 事实 | 观测点 | 删前 | 删后 | 与文案一致 |');
console.log('| --- | --- | --- | --- | --- |');
for (const [fact, probe, a, b, ok] of rows) console.log(`| ${fact} | ${probe} | ${a} | ${b} | ${ok ? '是' : '否'} |`);

// ---- 事实 E：词条落点计数（H3 口径统一，可复跑）----
const readLines = (rel) => readFileSync(join(ROOT, rel), 'utf8').split(/\r?\n/);
const writeLines = readLines(join('packages', 'skill-calorie', 'src', 'cli', 'write.ts'));
const photoLines = readLines(join('packages', 'skill-calorie', 'src', 'render', 'photo.ts'));
const isDef = (l) => /^const (SOFT_STILL_COUNTED|SOFT_EXCLUDED|SOFT_EXCLUDED_INNER|HARD_WORDING|HARD_INNER)\b/.test(l.trim());
const writeSites = writeLines.filter((l) => /SOFT_STILL_COUNTED|SOFT_EXCLUDED|HARD_WORDING|HARD_INNER/.test(l) && !isDef(l)).length;
const photoSites = photoLines.filter((l) => l.includes('（硬删除，不可恢复）')).length;
const wordingSites = writeSites + photoSites;

const promisesRecovery = (t) => String(t).split('不可恢复').join('').includes('可恢复');
const wordingOk = !promisesRecovery(delEx.message) && delEx.message.includes('仍计入历史统计');
const siteOk = writeSites === 13 && photoSites === 1 && wordingSites === 14;const bad = rows.filter((r) => !r[4]);
console.log('');
console.log('键表规模 = ' + allKeys.length + ' 键；restore/undo/recover 入口 = ' + restoreEntries.length + ' 个');
console.log('软删运动词条不承诺可恢复 = ' + (!promisesRecovery(delEx.message) ? '是' : '否') +
  '；含「仍计入历史统计」= ' + (delEx.message.includes('仍计入历史统计') ? '是' : '否'));
console.log('词条落点计数（事实 E）＝ ' + wordingSites + ' 处（write.ts ' + writeSites + ' ＋ render/photo.ts ' + photoSites + '）' +
  '，与文档／changeset 口径一致 = ' + (siteOk ? '是' : '否'));
if (bad.length || !wordingOk || !siteOk) {
  console.error('H1 事实复核不成立：' + bad.map((r) => r[0] + '/' + r[1]).join('、') +
    (wordingOk ? '' : ' [文案承诺与实测不符]') + (siteOk ? '' : ' [词条落点计数 ≠ 14]'));
  process.exit(1);
}
console.log('H1 事实复核通过：文案每一句承诺都有实测支撑。');
