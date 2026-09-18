/** #358 · 卡路里场景 08 身体细节 · 缺性别或年龄时**先问、不写库**。
 *
 * 票面验收（逐条对应）：「缺性别 → exit ≠ 0 且该表行数不变；缺年龄 → 同左」。
 * 本件把「exit ≠ 0」再加一条**可执行**的要求——错误信息里必须**明说缺谁**（「先问」才问得出来）：
 * 光看退出码，把缺项检查整块删掉也照样 exit 2（下游 `pct === null` 又兜一次），
 * 所以判据落在「说清缺谁」上，删检查与「猜默认值」两种改坏都必红（见证据件 §三）。
 *
 * 拦截点：`src/body/log.ts` 的 `caliperBodyFatPct(...)`（皮褶钳来源、未给 bodyFatPct 时才算）。
 * 期望值来源（不取自新实现）：7 点 10/12/14/11/13/12/10 ＋ 男 30 岁 → 12.02
 *   ＝ `docs/skills/skill-calorie/t357-皮褶换算证据.md` §四 C1 手算基准（Python decimal 与老技能 `jp7()` 两源一致）。
 * 数据操作一律 tmp 库（`SKILLS_DB_PATH` 指 mkdtemp），真库零写入。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 *   `node --test packages/skill-calorie/test/t358-missing-ask.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 7 点字段（次序＝`src/fetch/body.ts` 的 `CALIPER_FIELDS`：胸／腹／大腿／三头／肩胛下／髂上／腋中）。 */
const SEVEN = ['caliper_chest_mm', 'caliper_abdominal_mm', 'caliper_thigh_mm', 'caliper_tricep_mm',
  'caliper_subscapular_mm', 'caliper_suprailiac_mm', 'caliper_midaxillary_mm'];

/** 齐备形态（本仓种子那组；手算体脂率 12.02）。 */
const FULL = {
  source: 'home_caliper', sex: 'male', age: 30, date: '2026-09-14',
  caliper_chest_mm: 10, caliper_abdominal_mm: 12, caliper_thigh_mm: 14, caliper_tricep_mm: 11,
  caliper_subscapular_mm: 13, caliper_suprailiac_mm: 12, caliper_midaxillary_mm: 10,
};

const omitting = (...keys) => {
  const o = { ...FULL };
  for (const k of keys) delete o[k];
  return o;
};

/** 一个 tmp 库目录（真库零写入的机械化保证：不是 tmp 就当场断言失败）。 */
function mkEnv() {
  const dir = mkdtempSync(join(tmpdir(), 't358-'));
  assert.ok(dir.startsWith(tmpdir()), '写库路径必须在 tmp 下：' + dir);
  openDb(join(dir, 'calorie_data.db')).close(); // 建库（空表）
  return dir;
}

/** 跑一条真命令（每次显式给 `SKILLS_DB_PATH`，不给就走不到真库）。 */
function run(dir, params) {
  assert.ok(dir.startsWith(tmpdir()), 'SKILLS_DB_PATH 必须指向 tmp：' + dir);
  return spawnSync(NODE_BIN, [BIN, 'calorie.body.composition-add', '--params', JSON.stringify(params)],
    { encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) } });
}

/** `body_composition` 全部行（含废弃行——票面说「该表行数不变」，就按整表数）。 */
function rows(dir) {
  const db = openDb(join(dir, 'calorie_data.db'));
  const n = db.prepare('SELECT COUNT(*) AS n FROM body_composition').get().n;
  db.close();
  return n;
}

/** 一条被拦的读数：exit ≠ 0、信息里明说缺谁、表里零新增行；
 *  缺的若是年龄/性别，信息里还须带「先问用户」（「先问」要问得出来，不能只给失败码）。 */
function assertBlocked(dir, params, wantFields) {
  const before = rows(dir);
  const r = run(dir, params);
  const err = r.stderr || '';
  assert.notEqual(r.status, 0, '缺项必须 exit ≠ 0（实际 ' + r.status + '）');
  for (const f of wantFields) {
    assert.match(err, new RegExp('缺参数 ' + f), '错误信息要点名缺的参数：' + f + '；实际 stderr=' + err.slice(-300));
  }
  if (wantFields.includes('age') || wantFields.includes('sex')) {
    assert.match(err, /先问用户/, '错误信息要让人先问用户补齐，不能只给一个失败码：' + err.slice(-300));
  }
  assert.equal(rows(dir), before, '缺项时该表不许新增行');
  return r;
}

test('缺 sex（7 点齐 ＋ 给了 age）→ exit 2 ＋ 说缺 sex ＋ 零新增行', () => {
  const dir = mkEnv();
  assertBlocked(dir, omitting('sex'), ['sex']);
});

test('缺 age（7 点齐 ＋ 给了 sex）→ exit 2 ＋ 说缺 age ＋ 零新增行', () => {
  const dir = mkEnv();
  assertBlocked(dir, omitting('age'), ['age']);
});

test('7 点不齐（缺腋中一点）→ exit 2 ＋ 点名缺的那点 ＋ 零新增行', () => {
  const dir = mkEnv();
  assertBlocked(dir, omitting('caliper_midaxillary_mm'), ['caliper_midaxillary_mm']);
});

test('年龄与性别同时缺 → 一条信息里两样都要齐（AI 问一轮就够，不必撞两次）', () => {
  const dir = mkEnv();
  const bare = { source: 'home_caliper', date: '2026-09-14', ...Object.fromEntries(SEVEN.map((k) => [k, FULL[k]])) };
  const r = assertBlocked(dir, bare, ['age', 'sex']);
  const errLines = (r.stderr || '').split(/\r?\n/).filter((l) => l.startsWith('ERR '));
  assert.equal(errLines.length, 1, '缺两样也只许报一条：' + JSON.stringify(errLines));
});

test('对照：同一 tmp 库把缺项补齐 → 必须真写（exit 0／1 行／体脂率 == 手算 12.02）', () => {
  const dir = mkEnv();
  assert.equal(run(dir, omitting('sex')).status, 2, '先撞一次缺 sex');
  const ok = run(dir, FULL);
  assert.equal(ok.status, 0, '补齐后应 exit 0：' + (ok.stderr || '').slice(-300));
  assert.equal(rows(dir), 1, '补齐后应恰写 1 行');
  const db = openDb(join(dir, 'calorie_data.db'));
  const row = db.prepare('SELECT body_fat_pct AS p, sex, age FROM body_composition ORDER BY id').get();
  db.close();
  assert.equal(row.p, 12.02, '体脂率 == t357 手算基准 12.02（拦的是缺项，不是换算本体）');
  assert.equal(row.sex, 'male');
  assert.equal(row.age, 30);
});

test('拦的是缺项、不是整条命令：外部来源直传体脂率照旧（gym ＋ bodyFatPct → exit 0）', () => {
  const dir = mkEnv();
  const r = run(dir, { source: 'gym', bodyFatPct: 18.5, date: '2026-09-14', age: 30, sex: 'male' });
  assert.equal(r.status, 0, '其它来源不许被本票的缺项拦碰到：' + (r.stderr || '').slice(-300));
  assert.equal(rows(dir), 1);
});

test('什么都不给（连 7 点都没有）→ 一次把 7 点／age／sex 全报齐，零新增行', () => {
  const dir = mkEnv();
  const r = assertBlocked(dir, { source: 'home_caliper', date: '2026-09-14' }, ['caliper_chest_mm', 'age', 'sex']);
  assert.equal(/%/.test(r.stderr || ''), false, '不许出现算出来的百分数：' + (r.stderr || '').slice(-300));
  assert.equal((r.stdout || '').trim(), '', '被拦时 stdout 不许有回执');
});
