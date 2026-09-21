/** #538 路 身体域两张预检确认页（记体脂／记围度 五张产物）形状与文字纪律门：tmp 隔离，真实 DB 零触碰。
 *  跑法：`node packages/skill-calorie/test/body-wizard-538.test.mjs`（先 `tsc -b packages/skill-calorie`）。
 *
 *  断言面（可见文本口径，与本票探针同源）：
 *    ① 内部叫法出页面：眉标不再有 `wizard`／`prompt`／`AI`／`→`；
 *    ② 英文枚举名出页面：来源一律中文（`gym`／`home_caliper` 不上屏）；
 *    ③ 公式变量与系数不上屏（`BD`／`Σ`／`0.00043499`）；
 *    ④ 参数说明不再拿 `＋`／`；`／`／` 串字段串；
 *    ⑤ 范围字面量不再以 `(0, 100)` 这类写法上屏；
 *    ⑥ 复制区只有一个动作区（「复制日志」只出现一次）；
 *    ⑦ 围度页的 13 项回显一条一行（不再 `·` 串）；
 *    ⑧ 五页都接了页面级移动端配方（`pageUi: true`）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { dispatch } from '../dist/cli/cmd_read.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't538-')), 't.db'));

/** 可见文本（与 `audit-separators.mjs` 同口径：样式／脚本／注释／标签剥掉，复制区整段剥掉）。 */
const visible = (html) => html
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<section[^>]*ilife-block-copy-block[\s\S]*?<\/section>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ');

function seed(db) {
  db.prepare('INSERT INTO body_composition (date, source, body_fat_pct, note) VALUES (?, ?, ?, ?)')
    .run('2026-09-07', 'gym', 20, '健身房');
  db.prepare(
    'INSERT INTO body_measurements (date, chest_cm, waist_cm, abdomen_cm, hip_cm, shoulder_cm,'
    + ' left_thigh_cm, right_thigh_cm, left_calf_cm, right_calf_cm, left_arm_cm, right_arm_cm,'
    + ' left_forearm_cm, right_forearm_cm) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
  ).run('2026-09-05', 100, 85, 90, 95, 110, 55, 55.5, 36, 36.5, 30, 30.5, 25, 25.5);
}

const run = (db, key, params) => dispatch(key, params, db).html;

test('#538 记体脂（皮褶钳）：内部叫法出页面＋中文来源＋公式不上屏＋一个复制区', () => {
  const db = tmpDb();
  seed(db);
  const html = run(db, 'calorie.view.composition-wizard', {});
  const text = visible(html);
  assert.ok(html.startsWith('<!doctype html>'), '整份文档');
  // ① 内部叫法与内部打法出页面
  for (const word of ['wizard', 'prompt', 'AI', '→']) assert.ok(!text.includes(word), '不上屏：' + word);
  // ② 英文枚举名出页面（来源一律中文）
  assert.ok(!/\bgym\b/.test(text), 'gym 不上屏');
  assert.ok(!text.includes('home_caliper'), 'home_caliper 不上屏');
  assert.ok(text.includes('家测皮褶钳'), '来源写中文名');
  // ③ 公式变量与系数不上屏
  for (const word of ['BD', 'Σ', '0.0004349', '495 / BD']) assert.ok(!text.includes(word), '公式不上屏：' + word);
  // ⑤ 范围字面量不上屏
  assert.ok(!text.includes('(0, 100)'), '皮褶范围字面量不上屏');
  // ⑥ 复制区收成一个动作区：可见文本里「复制日志」至多一次（改前四处：两处复制区各带一颗各来一遍）
  const logHits = (text.match(/复制日志/g) ?? []).length;
  assert.ok(logHits <= 1, '「复制日志」至多一次：' + logHits);
  // ⑧ 手机端配方
  assert.ok(html.includes('viewport-fit=cover') && html.includes('ilife-page-ui'), '手机端配方在场');
  db.close();
});

test('#538 记围度：13 项回显一条一行＋参数说明不上屏字段串＋日期只一处语义', () => {
  const db = tmpDb();
  seed(db);
  const html = run(db, 'calorie.view.measure-wizard', { waistCm: 85, hipCm: 95 });
  const text = visible(html);
  for (const word of ['wizard', 'prompt', 'AI', '→']) assert.ok(!text.includes(word), '不上屏：' + word);
  // ⑦ 13 项回显：折叠块里一条一行（`·` 串不再出现）
  assert.ok(!text.includes('·'), '可见文本里没有 ·');
  // ④ 参数说明不再拿 ＋／；串字段
  assert.ok(!text.includes('＋'), '参数说明不用 ＋ 串');
  assert.ok(!/13 部位分 3 组/.test(text), '副标题不再重复说 13 部位分 3 组');
  assert.ok(text.includes('量了哪项就填哪项'), '表单说明是人话');
  const logHits = (text.match(/复制日志/g) ?? []).length;
  assert.ok(logHits <= 1, '「复制日志」至多一次：' + logHits);
  assert.ok(html.includes('viewport-fit=cover'), '手机端配方在场');
  db.close();
});

test('#538 空参数打开这两页不抛（首次记录也要能打开）', () => {
  const db = tmpDb();
  const a = run(db, 'calorie.view.measure-wizard', {});
  const b = run(db, 'calorie.view.composition-wizard', {});
  assert.ok(a.includes('ilife-block-param-form'), '围度页出表单');
  assert.ok(b.includes('ilife-block-param-form'), '体脂页出表单');
  db.close();
});
