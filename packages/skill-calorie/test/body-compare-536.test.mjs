/** #536 路 对比族两页（对比体脂／对比围度）形状与图注门：tmp 隔离，真实 DB 零触碰。
 *  跑法：`node packages/skill-calorie/test/body-compare-536.test.mjs`（先 `tsc -b packages/skill-calorie`）。
 *
 *  断言面（都是**可见文本**口径，与本票的探针同源）：
 *    ① 两页都不再出现内部命令名（`calorie.view.…`）与英文裸词（`vs`）；
 *    ② 期别区间不拿 `~` 顶替「至」（单日只写那一天）；
 *    ③ 表格首行的差值格写 `基准`，且表题说明「第一段是基准」；
 *    ④ 卡明细／表题不再抄同一组数（差值／变化率各只出现一处声明）；
 *    ⑤ 围度 9 部位的 `/` 串不再上屏；
 *    ⑥ 两页都接了页面级移动端配方（`pageUi: true` → `ilife-page-ui`／`viewport-fit=cover`／`td[data-label]`）。
 *  可见文本剥离口径与 `audit-separators.mjs` 同：去样式／脚本／注释／标签，另去复制区（数据在 `data-t` 属性里）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { runBodyView } from '../dist/body/index.js';

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't536-')), 't.db'));

const COMP = [
  ['2025-12-25', 'home_caliper', 22, '年底自测'],
  ['2026-09-05', 'gym', 21, '入夏'],
  ['2026-09-07', 'gym', 20, '晚间复测'],
];
const M13 = [
  ['chest_cm', 100, 102], ['waist_cm', 85, 84], ['abdomen_cm', 90, 91.5], ['hip_cm', 95, 94.5],
  ['left_thigh_cm', 55, 56], ['right_thigh_cm', 55.5, 54.5], ['left_calf_cm', 36, 36.5],
  ['right_calf_cm', 36.5, 36], ['left_arm_cm', 30, 31], ['right_arm_cm', 30.5, 29.5],
  ['left_forearm_cm', 25, 27], ['right_forearm_cm', 25.5, 23.5], ['shoulder_cm', 110, 113],
];

function seed(db) {
  for (const [date, source, pct, note] of COMP) {
    db.prepare('INSERT INTO body_composition (date, source, body_fat_pct, note) VALUES (?, ?, ?, ?)')
      .run(date, source, pct, note);
  }
  for (const [date, idx] of [['2026-09-05', 1], ['2026-09-07', 2]]) {
    const cols = M13.map(([c]) => c);
    const vals = M13.map(([, a, b]) => (idx === 1 ? a : b));
    db.prepare('INSERT INTO body_measurements (date, ' + cols.join(', ') + ') VALUES (?, '
      + cols.map(() => '?').join(', ') + ')').run(date, ...vals);
  }
}

/** 可见文本（与探针同口径：样式／脚本／注释／标签剥掉，复制区整段剥掉）。 */
const visible = (html) => html
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<section[^>]*ilife-block-copy-block[\s\S]*?<\/section>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ');

const run = (db, key, params) => runBodyView(key, params, db).html;

test('#536 对比体脂：页头人话＋期别区间写「至」＋基准行有说明＋接了手机端配方', () => {
  const db = tmpDb();
  seed(db);
  const html = run(db, 'calorie.view.body-composition-compare', {
    period1Start: '2026-09-05', period1End: '2026-09-05',
    period2Start: '2026-09-07', period2End: '2026-09-07',
  });
  const text = visible(html);
  assert.ok(html.startsWith('<!doctype html>'), '整份文档');
  // ① 内部命令名与英文裸词出页面
  assert.ok(!text.includes('calorie.view.'), '命令名不上屏');
  assert.ok(!/\bvs\b/.test(text), '英文裸词 vs 不上屏');
  // ② 区间不拿 ~ 顶替「至」；单日只写那一天
  assert.ok(!text.includes('~'), '可见文本里没有 ~');
  // ③ 同一组数以两处为限：对照带一次 ＋ 表内一次（改前是三处：结论条 ＋ 表题 ＋ 卡明细）
  const rateHits = text.match(/4\.76%/g) ?? [];
  assert.ok(rateHits.length <= 2, '变化率数值不重复抄：' + rateHits.length);
  assert.ok(text.includes('第一段是基准'), '表题说明首行是基准');
  assert.ok(text.includes('基准'), '首行基准字样在场');
  // ④ 半角减号不出现在数值里（负值走全角减号 U+2212）
  assert.ok(!/[-]\d/.test(text.replace(/2026-\d\d-\d\d/g, '')), '数值不用半角减号');
  // ⑤ 页头两件是读者的话
  assert.ok(text.includes('体脂率两期对比'), '左槽写期别口径');
  assert.ok(text.includes('身体细节'), '类型徽章是域名');
  // ⑥ 手机端配方已接
  assert.ok(html.includes('viewport-fit=cover'), 'viewport-fit=cover');
  assert.ok(html.includes('ilife-page-ui'), '页面级配方类在场');
  assert.ok(html.includes('data-label='), '表格格带列头文本（窄屏卡片化）');
  db.close();
});

test('#536 对比围度：9 部位斜杠串出页面＋页头人话＋手机端配方', () => {
  const db = tmpDb();
  seed(db);
  const html = run(db, 'calorie.view.body-measure-compare', { date1: '2026-09-05', date2: '2026-09-07' });
  const text = visible(html);
  assert.ok(!text.includes('calorie.view.'), '命令名不上屏');
  assert.ok(!text.includes('vs'), '英文裸词 vs 不上屏');
  // 9 个部位挤一行的斜杠串（改前债）——整串与半角括号都不该再出现
  assert.ok(!text.includes('胸/腰'), '部位斜杠串出页面');
  assert.ok(!/前臂\(/.test(text), '半角括号串出页面');
  assert.ok(text.includes('前一次记录是基准'), '表题说明前一次是基准');
  assert.ok(text.includes('围度变了'), '事实条说清变了几个部位');
  assert.ok(!/[-]\d/.test(text.replace(/2026-\d\d-\d\d/g, '')), '数值不用半角减号');
  assert.ok(html.includes('viewport-fit=cover') && html.includes('data-label='), '手机端配方在场');
  db.close();
});

test('#536 对比体脂：无记录时表空心走空态而不是假数字', () => {
  const db = tmpDb();
  seed(db);
  assert.throws(
    () => run(db, 'calorie.view.body-composition-compare', {
      period1Start: '2026-01-01', period1End: '2026-01-02',
      period2Start: '2026-01-03', period2End: '2026-01-04',
    }),
    /第一段无体脂记录/,
  );
  db.close();
});
