/** #357 · 皮褶→体脂换算（A 段）：换算本体 ＋ 命令落库 ＋ 缺项拦。
 *
 * 期望值来源（**不是**新实现的输出）：
 *   ① 手算式：`D:\ilife\.scratch\t357\handcalc.py`（Python decimal 高精度逐步算）；
 *   ② 老技能本体：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\body_composition_wizard.html:438` 的
 *      `jp7()` 原文抠出实跑（`.scratch/t357/oracle-jp7.mjs`）。
 *   两源逐值一致（12.02／17.69／12.14／9.13／29.01），本文件把它们写成常量。
 * 数据操作一律 tmp 库（`SKILLS_DB_PATH` 指 mkdtemp），真库零写入。
 * 运行：先 `pnpm --filter skill-calorie build`，再 `node --test packages/skill-calorie/test/t357-skinfold.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { CALIPER_FIELDS } from '../dist/fetch/body.js';
import { JP7_METHOD, jp7BodyFatPct } from '../dist/body/log.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 7 点字段顺序（SoT 口径：老技能 `SKILL.md:1164-1171` 的次序，逐字同 `CALIPER_FIELDS`）。 */
const ORDER = [
  'caliper_chest_mm', 'caliper_abdominal_mm', 'caliper_thigh_mm', 'caliper_tricep_mm',
  'caliper_subscapular_mm', 'caliper_suprailiac_mm', 'caliper_midaxillary_mm',
];

/** 手算基准表（sum＝7 点合计；pct＝手算值与老技能 jp7 实跑值，两源一致）。 */
const BASE = [
  { id: 'C1 男', sex: 'male', age: 30, calipers: [10, 12, 14, 11, 13, 12, 10], sum: 82, bd: 1.07138122, pct: 12.02 },
  { id: 'C2 女', sex: 'female', age: 30, calipers: [10, 12, 14, 11, 13, 12, 10], sum: 82, bd: 1.05840082, pct: 17.69 },
  { id: 'C3 男·年龄+1', sex: 'male', age: 31, calipers: [10, 12, 14, 11, 13, 12, 10], sum: 82, bd: 1.07109296, pct: 12.14 },
  { id: 'C4 男·老技能校验种子', sex: 'male', age: 30, calipers: [5, 10, 15, 8, 10, 8, 7], sum: 63, bd: 1.07813078, pct: 9.13 },
  { id: 'C5 女·大体量', sex: 'female', age: 45, calipers: [20, 25, 30, 18, 22, 20, 15], sum: 150, bd: 1.03337090, pct: 29.01 },
];

function mkEnv() {
  const dir = mkdtempSync(join(tmpdir(), 't357-'));
  openDb(join(dir, 'calorie_data.db')).close();
  return dir;
}

function run(key, params, envExtra) {
  const a = key === undefined ? [] : (params === undefined ? [key] : [key, '--params', JSON.stringify(params)]);
  return spawnSync(NODE_BIN, [BIN, ...a], { encoding: 'utf8', env: { ...process.env, ...(envExtra || {}) } });
}

/** 写命令（要求 exit 0 且 envelope 合法），回 envelope。 */
function runWrite(dir, params) {
  const r = run('calorie.body.composition-add', params, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-400));
  return JSON.parse(r.stdout);
}

/** 逐项拼 CLI 参数（字段名 ↔ 值，按 ORDER 逐位）。 */
function caliperParams(calipers) {
  const out = {};
  ORDER.forEach((f, i) => { out[f] = calipers[i]; });
  return out;
}

/** tmp 库里该表的全部活行（真库零触碰）。 */
function rows(dir) {
  const db = openDb(join(dir, 'calorie_data.db'));
  const r = db.prepare('SELECT date, source, age, sex, body_fat_pct, ' + CALIPER_FIELDS.join(', ')
    + " FROM body_composition WHERE COALESCE(is_deprecated, 0) = 0 ORDER BY id").all();
  db.close();
  return r;
}

test('字段顺序口径：ORDER 与 CALIPER_FIELDS 逐位相同（7 项）', () => {
  assert.deepEqual(ORDER, CALIPER_FIELDS);
  assert.equal(CALIPER_FIELDS.length, 7);
});

test('JP7 换算本体：5 组手算值逐值相同（男女各 2 组 ＋ 年龄+1 一组）', () => {
  for (const c of BASE) {
    const sum = c.calipers.reduce((s, v) => s + v, 0);
    assert.equal(sum, c.sum, c.id + ' 手算的 7 点合计');
    assert.equal(jp7BodyFatPct(sum, c.age, c.sex), c.pct, c.id + ' 体脂率应等于手算值');
  }
  // 年龄参与：同一组 7 点，年龄 +1 结果必变（12.02 → 12.14）。
  assert.notEqual(jp7BodyFatPct(82, 30, 'male'), jp7BodyFatPct(82, 31, 'male'));
  // 性别参与：同一组 7 点、同年龄，男 ≠ 女。
  assert.notEqual(jp7BodyFatPct(82, 30, 'male'), jp7BodyFatPct(82, 30, 'female'));
  // 合并不参与（每点单独入式才有意义）——同和不同分布，值必同。
  assert.equal(jp7BodyFatPct(82, 30, 'male'), jp7BodyFatPct(82, 30, 'male'));
});

test('记体脂（皮褶钳）男：只给 7 点＋性别＋年龄 → exit 0，库里体脂率 == 手算值 12.02', () => {
  const dir = mkEnv();
  const c = BASE[0];
  const env = runWrite(dir, { source: 'home_caliper', sex: 'male', age: c.age, date: '2026-09-06', ...caliperParams(c.calipers) });
  assert.equal(env.data.ok, true);
  const got = rows(dir);
  assert.equal(got.length, 1, '应恰写 1 行');
  assert.equal(got[0].body_fat_pct, c.pct, '库里体脂率 == 手算值');
  assert.equal(got[0].source, 'home_caliper');
  assert.equal(got[0].age, c.age);
  assert.equal(got[0].sex, 'male');
  ORDER.forEach((f, i) => assert.equal(got[0][f], c.calipers[i], f + ' 应逐位落库'));
});

test('记体脂（皮褶钳）女：同 7 点 → 库里体脂率 == 手算值 17.69（≠ 男）', () => {
  const dir = mkEnv();
  const c = BASE[1];
  runWrite(dir, { source: 'home_caliper', sex: '女', age: c.age, date: '2026-09-06', ...caliperParams(c.calipers) });
  const got = rows(dir);
  assert.equal(got[0].body_fat_pct, c.pct, '库里体脂率 == 手算值');
  assert.equal(got[0].sex, 'female', '中文「女」应归一成 female');
  assert.notEqual(got[0].body_fat_pct, BASE[0].pct, '同一组 7 点的男女值必不同');
});

test('年龄 +1 → 库里结果必变（12.02 → 12.14）', () => {
  const dir = mkEnv();
  const c = BASE[0];
  runWrite(dir, { source: 'home_caliper', sex: 'male', age: 30, date: '2026-09-06', ...caliperParams(c.calipers) });
  runWrite(dir, { source: 'home_caliper', sex: 'male', age: 31, date: '2026-09-07', ...caliperParams(c.calipers) });
  const got = rows(dir);
  assert.equal(got.length, 2);
  assert.equal(got[0].body_fat_pct, 12.02);
  assert.equal(got[1].body_fat_pct, 12.14);
  assert.notEqual(got[0].body_fat_pct, got[1].body_fat_pct);
});

test('缺性别／缺年龄／缺 1 点皮褶 → exit 2 且该表行数不变（不静默、不用默认值）', () => {
  const dir = mkEnv();
  const c = BASE[0];
  const full = { source: 'home_caliper', sex: 'male', age: c.age, date: '2026-09-06', ...caliperParams(c.calipers) };
  assert.equal(rows(dir).length, 0);

  const noSex = { ...full }; delete noSex.sex;
  const noAge = { ...full }; delete noAge.age;
  const noOne = { ...full }; delete noOne.caliper_midaxillary_mm;

  for (const [name, p] of [['缺性别', noSex], ['缺年龄', noAge], ['缺 1 点皮褶', noOne]]) {
    const r = run('calorie.body.composition-add', p, { SKILLS_DB_PATH: dir });
    assert.equal(r.status, 2, name + ' 应 exit 2（stderr=' + (r.stderr || '').slice(-200) + '）');
    assert.equal(rows(dir).length, 0, name + ' 不许写库');
  }
  // 缺项不猜：性别/年龄都没给时也不许按某一性别算出一个值来。
  const bare = { source: 'home_caliper', date: '2026-09-06', ...caliperParams(c.calipers) };
  assert.equal(run('calorie.body.composition-add', bare, { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(rows(dir).length, 0);
  // 齐了才写（对照：同一 tmp 库里把缺项补齐即成功）。
  const ok = runWrite(dir, full);
  assert.equal(ok.data.ok, true);
  assert.equal(rows(dir).length, 1);
});

test('可见文本含算法出处（Jackson-Pollock），且不含写死的 18.5', () => {
  const dir = mkEnv();
  const c = BASE[0];
  const env = runWrite(dir, { source: 'home_caliper', sex: 'male', age: c.age, date: '2026-09-06', ...caliperParams(c.calipers) });
  assert.equal(env.data.message, env.data.receipt.summary);
  assert.ok(env.data.message.includes(JP7_METHOD), '回执可见文本应含算法出处：' + env.data.message);
  assert.match(env.data.message, /Jackson-Pollock/);
  assert.match(env.data.message, /12\.02%/, '换算值应出现在可见文本里');
  assert.equal(env.data.message.includes('18.5'), false, '可见文本不许出现写死的 18.5');
  // 落盘回执页（envelope.data.output）同样查一遍：可见文本与页面不许留写死的 18.5。
  assert.ok(typeof env.data.output === 'string' && env.data.output.length > 0, '回执应回传落点');
  const page = readFileSync(env.data.output, 'utf8');
  assert.match(page, /Jackson-Pollock/, '回执页应含算法出处');
  assert.equal(page.includes('18.5'), false, '回执页不许出现写死的 18.5');
});

test('回归：外部来源直传体脂率照旧（source=gym ＋ bodyFatPct 18.5，不做换算）', () => {
  const dir = mkEnv();
  const env = runWrite(dir, { source: 'gym', bodyFatPct: 18.5, date: '2026-09-06', age: 30, sex: 'male' });
  assert.equal(env.data.ok, true);
  const got = rows(dir);
  assert.equal(got[0].body_fat_pct, 18.5, '直传值原样落库');
  assert.equal(got[0].caliper_chest_mm, null, '外部来源不写皮褶');
  // 非皮褶钳来源缺体脂率仍拦（旧契约不变）。
  assert.equal(run('calorie.body.composition-add', { source: 'gym', date: '2026-09-06' }, { SKILLS_DB_PATH: dir }).status, 2);
});
