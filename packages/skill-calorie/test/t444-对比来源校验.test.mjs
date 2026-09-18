/** #444 · 对比体脂未知来源校验（命令层，与 #398 同一道门）。
 *
 * 期望值来源（不拿新实现的输出当期望）：
 *   ① **手算**：冻结种子 P1=2026-09-05（home_caliper 22.0／gym 20.0／hospital 21.0）、
 *      P2=2026-09-07（21.0／19.0／20.0）——home_caliper 22→21 delta -1 rate -4.55；
 *      gym 20→19 delta -1 rate -5；hospital 21→20 delta -1 rate -4.76；
 *      全源 21.0→20.0 delta -1 rate -4.76（`round2(delta/before*100)`，与实现同式手算）。
 *   ② **同一 tmp 库的 SQL 读数**（`AVG(body_fat_pct)` 逐来源逐日，判据的另一侧）。
 *   ③ **改前基线**：改前同种子跑 `source=nope` 得 exit=4＋缺失阻断原文（落证据，不在本文件冻字）；
 *      合法三例与缺省的改前产物（stdout＋html）冻在 `.scratch/t444/impl-base-*`，
 *      改后逐字对照见证据（本文件只锁行为，不读草稿目录）。
 * 负向对照（源码级变异，持锁另做，机器读数见证据）：
 *   把 `compare.ts` 的 `assertSourceFilter` 那一行删掉 → 本文件「未知来源」两条必红；还原 → 必绿。
 * 围度去处：`body_measurements` 表无来源列、`compareMeasurements` 不收来源，
 *   对比围度命令多传 `source` 原样忽略（本文件锁 exit 0 且与不传逐字节相同）。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 *   `node --test packages/skill-calorie/test/t444-对比来源校验.test.mjs`。
 * 真库零写入：一切数据走 mkdtemp tmp 库（spawn 的 `SKILLS_DB_PATH` 只指该 tmp 目录）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { dispatch } from '../dist/cli/cmd_read.js';
import { assertSourceFilter } from '../dist/fetch/body.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const COMP = 'calorie.view.body-composition-compare';
const MEAS = 'calorie.view.body-measure-compare';
const DB_FILE = 'calorie_data.db';

/** 冻结种子（与 `.scratch/t444/impl-baseline.mjs` 同一份，改一处必须改两处）。 */
const COMP_SEED = [
  ['2026-09-05', 'home_caliper', 22.0],
  ['2026-09-05', 'gym', 20.0],
  ['2026-09-05', 'hospital', 21.0],
  ['2026-09-07', 'home_caliper', 21.0],
  ['2026-09-07', 'gym', 19.0],
  ['2026-09-07', 'hospital', 20.0],
];
const M13 = [
  ['chest_cm', 100, 102], ['waist_cm', 85, 84], ['abdomen_cm', 90, 91.5], ['hip_cm', 95, 94.5],
  ['left_thigh_cm', 55, 56], ['right_thigh_cm', 55.5, 54.5], ['left_calf_cm', 36, 36.5],
  ['right_calf_cm', 36.5, 36], ['left_arm_cm', 30, 31], ['right_arm_cm', 30.5, 29.5],
  ['left_forearm_cm', 25, 27], ['right_forearm_cm', 25.5, 23.5], ['shoulder_cm', 110, 113],
];
const P = { period1Start: '2026-09-05', period1End: '2026-09-05', period2Start: '2026-09-07', period2End: '2026-09-07' };

/** 手算期望（唯一依据＝上表种子，不是实现输出）。 */
const EXPECT = {
  home_caliper: { beforeAvg: 22, afterAvg: 21, delta: -1, ratePct: -4.55 },
  gym: { beforeAvg: 20, afterAvg: 19, delta: -1, ratePct: -5 },
  hospital: { beforeAvg: 21, afterAvg: 20, delta: -1, ratePct: -4.76 },
  all: { beforeAvg: 21, afterAvg: 20, delta: -1, ratePct: -4.76 },
};

function mkTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), 't444-'));
  const db = openDb(join(dir, DB_FILE));
  const stmt = db.prepare('INSERT INTO body_composition (date, source, body_fat_pct, note) VALUES (?, ?, ?, ?)');
  for (const [date, source, pct] of COMP_SEED) stmt.run(date, source, pct, 't444');
  for (const [date, idx] of [['2026-09-05', 1], ['2026-09-07', 2]]) {
    const cols = M13.map(([c]) => c);
    const vals = M13.map(([, a, b]) => (idx === 1 ? a : b));
    db.prepare('INSERT INTO body_measurements (date, ' + cols.join(', ') + ') VALUES (?, '
      + cols.map(() => '?').join(', ') + ')').run(date, ...vals);
  }
  db.close();
  return dir;
}

function withDb(dir, fn) {
  const db = openDb(join(dir, DB_FILE));
  try { return fn(db); } finally { db.close(); }
}

function runRead(dir, key, params, htmlName) {
  const html = join(dir, htmlName);
  const args = [BIN, key, '--params', JSON.stringify(params), '--html', html];
  const r = spawnSync(NODE_BIN, args, { encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) } });
  return { r, html };
}

/** 同一 tmp 库的 SQL 期望读数（判据的另一侧：AVG 逐来源逐日）。 */
function sqlAvg(dir, day, source) {
  return withDb(dir, (db) => {
    const where = source === undefined ? '' : ' AND source = ?';
    const args = source === undefined ? [day] : [day, source];
    const row = db.prepare('SELECT AVG(body_fat_pct) AS v FROM body_composition'
      + ' WHERE COALESCE(is_deprecated, 0) = 0 AND date = ?' + where).get(...args);
    return row.v;
  });
}

test('#444 口径：三来源＋all 放行，未知来源拒（与 #398 同一道门）', () => {
  for (const s of ['home_caliper', 'hospital', 'gym', 'all']) {
    assert.doesNotThrow(() => assertSourceFilter(s), s + ' 应放行');
  }
  assert.throws(() => assertSourceFilter('nope'), (e) => /未知来源: nope/.test(e.message)
    && /home_caliper/.test(e.message) && /hospital/.test(e.message) && /gym/.test(e.message));
});

test('#444 对比体脂未知来源：直调抛错点名未知名与合法值', () => {
  const dir = mkTmpDb();
  assert.throws(() => withDb(dir, (db) => dispatch(COMP, { ...P, source: 'nope' }, db)),
    (e) => /未知来源: nope/.test(e.message) && /home_caliper \/ hospital \/ gym/.test(e.message),
    '须点名未知名 nope 与合法值集合');
});

test('#444 对比体脂未知来源：CLI exit 非 0 且 stderr 点名未知名与合法值', () => {
  const dir = mkTmpDb();
  const { r } = runRead(dir, COMP, { ...P, source: 'nope' }, 'nope.html');
  assert.notEqual(r.status, 0, 'exit 须非 0，实得 ' + r.status);
  const err = String(r.stderr || '');
  assert.ok(/未知来源: nope/.test(err), '点名未知名：' + err.slice(-200));
  assert.ok(/home_caliper/.test(err) && /hospital/.test(err) && /gym/.test(err), '点名合法值：' + err.slice(-200));
  console.log('T444-NOPE exit=' + r.status + ' errTail=' + err.replace(/\s+/g, ' ').slice(-120));
});

test('#444 合法三例：CLI exit 0 且读数与手算＋SQL 一致', () => {
  for (const source of ['home_caliper', 'hospital', 'gym']) {
    const dir = mkTmpDb();
    const { r } = runRead(dir, COMP, { ...P, source }, 'ok.html');
    assert.equal(r.status, 0, source + ' exit=' + r.status + ' stderr=' + String(r.stderr || '').slice(-300));
    const env = JSON.parse(r.stdout);
    assert.deepEqual(env.data.metrics, EXPECT[source], source + ' 读数 == 手算');
    assert.equal(sqlAvg(dir, '2026-09-05', source), EXPECT[source].beforeAvg, source + ' P1 == SQL');
    assert.equal(sqlAvg(dir, '2026-09-07', source), EXPECT[source].afterAvg, source + ' P2 == SQL');
    console.log('T444-OK source=' + source + ' metrics=' + JSON.stringify(env.data.metrics));
  }
});

test('#444 all＝全来源：exit 0 且产物与缺省逐字节相同', () => {
  const dir = mkTmpDb();
  const a = runRead(dir, COMP, { ...P, source: 'all' }, 'all.html');
  const b = runRead(dir, COMP, { ...P }, 'nosrc.html');
  assert.equal(a.r.status, 0, 'all exit=' + a.r.status + ' stderr=' + String(a.r.stderr || '').slice(-300));
  assert.equal(b.r.status, 0, '缺省 exit=' + b.r.status);
  assert.deepEqual(JSON.parse(a.r.stdout).data.metrics, EXPECT.all, 'all 读数 == 全源手算');
  assert.equal(sqlAvg(dir, '2026-09-05', undefined), EXPECT.all.beforeAvg, '全源 P1 == SQL');
  assert.equal(sqlAvg(dir, '2026-09-07', undefined), EXPECT.all.afterAvg, '全源 P2 == SQL');
  assert.equal(String(readFileSync(a.html, 'utf8')), String(readFileSync(b.html, 'utf8')), 'all 与缺省产物逐字节相同');
  console.log('T444-ALL metrics=' + JSON.stringify(JSON.parse(a.r.stdout).data.metrics) + ' htmlBytes=' + readFileSync(a.html).length);
});

test('#444 围度去处：无来源入口，多传 source 原样忽略且产物相同', () => {
  const dir = mkTmpDb();
  const plain = runRead(dir, MEAS, { date1: '2026-09-05', date2: '2026-09-07' }, 'm.html');
  const extra = runRead(dir, MEAS, { date1: '2026-09-05', date2: '2026-09-07', source: 'nope' }, 'm2.html');
  assert.equal(plain.r.status, 0, '围度对比 exit=' + plain.r.status);
  assert.equal(extra.r.status, 0, '多传未知 source 仍 exit 0（无入口可校验）');
  assert.equal(String(readFileSync(plain.html, 'utf8')), String(readFileSync(extra.html, 'utf8')), '多传与不传产物逐字节相同');
  console.log('T444-MEASURE exit=' + plain.r.status + '/' + extra.r.status
    + ' htmlBytes=' + readFileSync(plain.html).length);
});
