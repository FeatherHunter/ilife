/** #125 · 写层按 id 的 update／remove 必须与按日／按范围同口径：软删行视为不存在。
 *
 * 背景：#120 红队实测 E1–E3 —— 按 id 改／删对已软删行仍 exit 0 报成功，
 * 而按日／按范围路径已按活行过滤（`softDeleteWhere`／`updateDay` 带
 * `COALESCE(is_deleted,0)=0`）并对重复删报 exit 4 —— 同一张表两套幂等语义。
 * 本票口径（验收条 1 择一）：按 id 路径同样跳过软删行（与 `listWindow`／
 * `softDeleteWhere`／#120 `EX_ALIVE` 同款 `COALESCE`，保住 `is_deleted IS NULL`
 * 的历史活行），即软删＝不存在；重复删除在三路径下一致报 exit 4。
 *
 * 矩阵：三路径（id／date／range）×（活行／软删行），断言 exit 码与回执文案。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/softdelete-125.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

const SOFT_TAG = '已从查询与统计中排除';

const run = (key, params, dir) =>
  spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params)], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });

function runOk(dir, key, params) {
  const r = run(key, params, dir);
  assert.equal(r.status, 0, key + ' 应 exit 0，实测 exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-500));
  return JSON.parse(r.stdout).data;
}

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 'sd125-'));
  openDb(join(dir, 'calorie_data.db')).close();
  return dir;
}

function addOne(dir, date, type = '慢跑') {
  return runOk(dir, 'calorie.exercise.add', { type, calories: 250, minutes: 30, date }).receipt.recordId;
}

test('125 · E1/E2/E3 同一行：删后按 id 改／重复删与按日删一致报缺失（exit 4）', () => {
  const dir = mkDir();
  const date = '2026-09-09';
  const id = addOne(dir, date);

  const d1 = runOk(dir, 'calorie.exercise.remove', { id });
  assert.ok(d1.message.includes(SOFT_TAG), '首删回执缺软删口径词条：' + d1.message);

  // E1：已软删行按 id 改 → 缺失（此前 exit 0 报“已更新”是缺陷）
  const u = run('calorie.exercise.update', { id, minutes: 40 }, dir);
  assert.equal(u.status, 4, 'update(软删 id) 应 exit 4，实测 ' + u.status + ' out=' + ((u.stdout || '') + (u.stderr || '')).slice(-400));

  // E2：同一 id 重复删 → 缺失（此前 exit 0 再报“已删除”是缺陷）
  const r2 = run('calorie.exercise.remove', { id }, dir);
  assert.equal(r2.status, 4, '重复 remove(id) 应 exit 4，实测 ' + r2.status);

  // E3：同一日期重复删 → 缺失（原有正确行为，保持）
  const r3 = run('calorie.exercise.remove', { date }, dir);
  assert.equal(r3.status, 4, '重复 remove(date) 应 exit 4，实测 ' + r3.status);
  assert.ok((r3.stderr || '').includes('无运动记录'), '按日缺失文案应含“无运动记录”：' + (r3.stderr || '').slice(-300));

  // 按 id 改软删-only 日期 → 缺失（与按日改一致）
  const ud = run('calorie.exercise.update', { date, note: 'x' }, dir);
  assert.equal(ud.status, 4, 'update(全软删 date) 应 exit 4，实测 ' + ud.status);
});

test('125 · 三路径幂等一致：首删 exit 0，跨路径再删一律 exit 4', () => {
  // 按日删 → 按 id／按范围再删
  {
    const dir = mkDir();
    const date = '2026-09-10';
    const id = addOne(dir, date);
    runOk(dir, 'calorie.exercise.remove', { date });
    assert.equal(run('calorie.exercise.remove', { id }, dir).status, 4, 'date 删后按 id 再删应 4');
    assert.equal(run('calorie.exercise.remove', { from: date, to: date }, dir).status, 4, 'date 删后按范围再删应 4');
    assert.equal(run('calorie.exercise.update', { id, minutes: 10 }, dir).status, 4, 'date 删后按 id 改应 4');
  }
  // 按范围删 → 按 id／按日再删
  {
    const dir = mkDir();
    const date = '2026-09-11';
    const id = addOne(dir, date);
    runOk(dir, 'calorie.exercise.remove', { from: date, to: date });
    assert.equal(run('calorie.exercise.remove', { id }, dir).status, 4, 'range 删后按 id 再删应 4');
    assert.equal(run('calorie.exercise.remove', { date }, dir).status, 4, 'range 删后按日再删应 4');
    assert.equal(run('calorie.exercise.update', { id, minutes: 10 }, dir).status, 4, 'range 删后按 id 改应 4');
  }
  // 按 id 删 → 按日／按范围再删（E2/E3 同行）
  {
    const dir = mkDir();
    const date = '2026-09-12';
    const id = addOne(dir, date);
    runOk(dir, 'calorie.exercise.remove', { id });
    assert.equal(run('calorie.exercise.remove', { date }, dir).status, 4, 'id 删后按日再删应 4');
    assert.equal(run('calorie.exercise.remove', { from: date, to: date }, dir).status, 4, 'id 删后按范围再删应 4');
  }
});

test('125 · 活行不受影响：三路径首操作仍 exit 0（防过度过滤）', () => {
  const dir = mkDir();
  const date = '2026-09-13';
  const id = addOne(dir, date);
  runOk(dir, 'calorie.exercise.update', { id, minutes: 40 });
  runOk(dir, 'calorie.exercise.update', { date, note: '补' });
  const d = runOk(dir, 'calorie.exercise.remove', { date });
  assert.ok(d.message.includes(SOFT_TAG), '活行按日删回执缺口径词条：' + d.message);
});

test('125 · NULL 活行护栏：is_deleted IS NULL 的行按 id 可改可删（谓词必须 COALESCE）', () => {
  const dir = mkDir();
  const db = openDb(join(dir, 'calorie_data.db'));
  let nullId;
  try {
    const info = db.prepare(
      "INSERT INTO exercise_log (date, time, exercise_type, calories_burned, is_deleted) VALUES ('2026-09-14', '07:00:00', '游泳', 120, NULL)",
    ).run();
    nullId = Number(info.lastInsertRowid);
  } finally { db.close(); }
  // 写死 `is_deleted = 0` 会把 NULL 行误判为已删 → 此处会 exit 4；正确口径须 exit 0。
  runOk(dir, 'calorie.exercise.update', { id: nullId, minutes: 20 });
  const d = runOk(dir, 'calorie.exercise.remove', { id: nullId });
  assert.ok(d.message.includes(SOFT_TAG), 'NULL 活行删除回执缺口径词条：' + d.message);
  assert.equal(run('calorie.exercise.remove', { id: nullId }, dir).status, 4, 'NULL 行删后重复删应 4');
});
