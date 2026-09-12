/** #175 · 改档案的空库守卫：档案不存在时按用户裁定**报错**（不再 INSERT OR IGNORE 建行后更新）。
 *
 * 用户 2026-09-11 裁定原话：「档案不存在时报错即可、不做特殊兜底（AI 告知用户）」。
 * 判定口径（本仓既有冻结表，`src/cli/write.ts:10-12`）：缺参／坏参＝2；缺失阻断＝4；未知键＝3。
 * 「没有档案」是数据缺失而非参数错 → 期望 **4**，且**不落盘**（同查档案空库的先例：exit 4 且不落空页）。
 *
 * 两个接缝（都测，一处管 HTTP 无关的库侧不变量，一处管用户看得见的行为）：
 * ① 命令接缝：空库跑 `calorie.profile.update` → exit 4、不落盘、库里仍 0 行；
 * ② 能力接缝：`updateProfile(db, …)` 直接调用在空库上抛错，且**不建行**。
 * 反面（防回退）：空库先「设置档案」再「改档案」必须照常成功；空库「设置档案」仍能建行。
 *
 * 运行：先 npx tsc -b，再 node --test packages/skill-calorie/test/profile-guard-175.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { updateProfile } from '../dist/fetch/profile.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

/** 一份全新空库的目录（不写任何档案行）。 */
function mkEmpty() {
  const dir = mkdtempSync(join(tmpdir(), 't175-guard-'));
  openDb(join(dir, DB_FILENAME)).close();
  return dir;
}

/** 真 CLI 跑一条写命令。 */
function runCli(dir, key, params) {
  const out = join(dir, key.replace(/\./g, '_') + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  return {
    status: r.status,
    out,
    stderr: String(r.stderr || '').trim(),
    stdout: String(r.stdout || '').trim(),
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 库里 user_profile 的行数（唯一真相＝库本身，不从回执文本猜）。 */
function profileRowCount(dir) {
  const db = openDb(join(dir, DB_FILENAME));
  const row = db.prepare('SELECT COUNT(*) AS n FROM user_profile').get();
  db.close();
  return Number(row.n);
}

test('#175 空库跑「改档案」：exit 4、不落盘、不建行', () => {
  const dir = mkEmpty();
  const r = runCli(dir, 'calorie.profile.update', { fields: { heightCm: 176, note: '首次' } });
  assert.equal(r.status, 4, '空库改档案应缺失阻断（exit 4），实测 exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assert.equal(r.file, null, '空库改档案不该落盘回执页（缺失阻断不产出）');
  assert.equal(existsSync(r.out), false, '空库改档案不该留下产物文件');
  assert.equal(profileRowCount(dir), 0, '空库改档案不该 INSERT OR IGNORE 建行（这正是本票要修的缺陷）');
  assert.match(r.stderr, /档案/, '报错要说清缺的是什么：' + r.stderr.slice(-200));
});

test('#175 空库跑「改档案」的单字段写法（field／value）同样被挡', () => {
  const dir = mkEmpty();
  const r = runCli(dir, 'calorie.profile.update', { field: 'note', value: '测试' });
  assert.equal(r.status, 4, 'field／value 写法应同样 exit 4，实测 ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assert.equal(profileRowCount(dir), 0, 'field／value 写法也不该建行');
});

test('#175 能力接缝：updateProfile 在空库上抛错且不建行；有档案时照常改', () => {
  const dir = mkEmpty();
  const db = openDb(join(dir, DB_FILENAME));
  assert.throws(
    () => updateProfile(db, { age: 31 }),
    /档案/,
    'updateProfile 在无档案时应抛错（「改」以「已有一份档案」为前提）',
  );
  assert.equal(
    Number(db.prepare('SELECT COUNT(*) AS n FROM user_profile').get().n),
    0,
    '抛错路径不得留下半成品行',
  );
  db.close();
});

test('#175 反面：空库先「设置档案」仍能建行；建好之后再改档案照常成功', () => {
  const dir = mkEmpty();
  const s = runCli(dir, 'calorie.profile.set', { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' });
  assert.equal(s.status, 0, '空库设置档案应照常成功，实测 exit ' + s.status + ' stderr=' + s.stderr.slice(-300));
  assert.equal(profileRowCount(dir), 1, '设置档案在空库上仍须建行（本次不得连带动它）');

  const u = runCli(dir, 'calorie.profile.update', { fields: { heightCm: 174 } });
  assert.equal(u.status, 0, '有档案后改档案应照常成功，实测 exit ' + u.status + ' stderr=' + u.stderr.slice(-300));
  assert.ok(u.file !== null && u.file.includes('174'), '有档案后改档案应落盘且带新值');
  const env = JSON.parse(u.stdout);
  assert.deepEqual(env.data.receipt.items, [{ status: 'heightCm', reason: '175 → 174' }], '对照卡应带真改前值');
});

test('#175 同一条规则覆盖「设活动量」：空库 exit 4、不落盘、不建行；有档案照常设', () => {
  // 第一性原理：活动量是档案的一个字段，「设」＝改已有档案的字段。允许第二条创建路径，
  // 库里就会出现「只填了活动量」的半份档案（下游 TDEE 缺身高/年龄/性别一律算不出）。
  const dir = mkEmpty();
  const a = runCli(dir, 'calorie.profile.activity', { activityLevel: '活跃' });
  assert.equal(a.status, 4, '空库设活动量应缺失阻断（exit 4），实测 ' + a.status + ' stderr=' + a.stderr.slice(-300));
  assert.equal(a.file, null, '空库设活动量不该落盘');
  assert.equal(profileRowCount(dir), 0, '空库设活动量不该 INSERT OR IGNORE 建行');
  assert.match(a.stderr, /档案/, '报错要说清缺的是什么：' + a.stderr.slice(-200));

  const s = runCli(dir, 'calorie.profile.set', { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' });
  assert.equal(s.status, 0, '空库设置档案应照常成功，实测 ' + s.status);
  const b = runCli(dir, 'calorie.profile.activity', { activityLevel: '活跃' });
  assert.equal(b.status, 0, '有档案后设活动量应照常成功，实测 ' + b.status + ' stderr=' + b.stderr.slice(-300));
  assert.match(JSON.parse(b.stdout).data.message, /moderate→active/, '设活动量回执应带改前→改后');
});
