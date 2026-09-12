/** #179 · 场景 07 基础信息：三条写入词的回执页与查档案结果页——产物是**完整文档**，
 * 且改档案回执带**逐字段 改前 → 改后**对照（items）。
 * 范围（只这三条写命令换了装配）：`calorie.profile.set`／`calorie.profile.activity`／
 * `calorie.profile.update` 的回执页 ＋ `calorie.view.profile` 的结果页。
 * 同批钉住反面：其余会改数据库的命令**仍是原回执片段**（`<section …ilife:calorie:receipt>`），
 * 一刀切换页会被这一条测出来。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/profile-doc-179.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

const SET_PARAMS = { heightCm: 175, age: 30, gender: '男', activityLevel: '中度', note: '减脂期' };

/** 一份全新库（`seeded` 给真则先写一份档案＝「有改前值」那一遍）。 */
function mkDb(seeded) {
  const dir = mkdtempSync(join(tmpdir(), 't179-profile-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (seeded) {
    db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', '减脂期')").run();
  }
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘（文件态＝默认的三态交付），顺带回 stdout 与产物文本。 */
function runCli(dir, key, params, outName) {
  const out = join(dir, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--output', out], {
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

/** 完整文档五断言（沿 wizard-86.test.mjs:53-59 的判据 ＋ charset）。 */
function assertDocPage(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('<script>'), what + ' 缺 helpers');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  assert.ok(!html.includes('<!--'), what + ' 有残留标记');
}

test('#179 三条写入词的回执页一律完整文档（空库一遍 ＋ 已写入档案一遍）', () => {
  const cases = [
    ['calorie.profile.set', SET_PARAMS, false, '空库'],
    ['calorie.profile.activity', { activityLevel: '活跃' }, false, '空库'],
    ['calorie.profile.update', { fields: { heightCm: 176, note: '首次' } }, false, '空库'],
    ['calorie.profile.set', SET_PARAMS, true, '已有档案'],
    ['calorie.profile.activity', { activityLevel: '高度活跃' }, true, '已有档案'],
    ['calorie.profile.update', { fields: { heightCm: 174, note: '改过一次' } }, true, '已有档案'],
  ];
  for (const [key, params, seeded, what] of cases) {
    const r = runCli(mkDb(seeded), key, params);
    const label = key + '（' + what + '）';
    assert.equal(r.status, 0, label + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
    assertDocPage(r.file, label);
    assert.ok(r.file.includes('基础信息 · 写后回执'), label + ' 缺场景 07 眉标');
    assert.ok(r.file.includes('M5 契约 v1'), label + ' 缺 M5 契约版本');
    assert.ok(r.file.length > 10000, label + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
  }
});

test('#179 改档案回执带逐字段对照：字段名／改前值／改后值（含空库无改前值的空态）', () => {
  const seeded = mkDb(true);
  const params = { fields: { heightCm: 174, note: '改过一次' } };
  const a = runCli(seeded, 'calorie.profile.update', params);
  assert.equal(a.status, 0, 'stderr=' + a.stderr.slice(-300));
  const envA = JSON.parse(a.stdout);
  assert.deepEqual(envA.data.receipt.items, [
    { status: 'heightCm', reason: '175 → 174' },
    { status: 'note', reason: '减脂期 → 改过一次' },
  ], '改档案回执的 items 不是逐字段 改前→改后');
  assert.deepEqual(envA.data.receipt.writtenFields, ['heightCm', 'note']);
  assert.equal(envA.data.receipt.noChange, false);
  assert.equal(envA.data.receipt.affectedRows, 1);
  assert.ok(a.file.includes('改前 → 改后'), '页面上没有对照区表头');
  assert.ok(a.file.includes('175 → 174') && a.file.includes('减脂期 → 改过一次'), '对照区没有真内容');
  assert.ok(!a.file.includes('本次回执未带逐字段对照'), '对照区还是空态');

  // 空库：改档案是首次写入，无改前值——如实写「—」，不编数据。
  const b = runCli(mkDb(false), 'calorie.profile.update', { fields: { heightCm: 176 } });
  assert.equal(b.status, 0, 'stderr=' + b.stderr.slice(-300));
  const envB = JSON.parse(b.stdout);
  assert.deepEqual(envB.data.receipt.items, [{ status: 'heightCm', reason: '— → 176' }], '空库没有如实写「无改前值」');
  assert.ok(b.file.includes('— → 176'));
});

test('#179 查档案结果页是完整文档；空档案仍是缺失阻断（不返空页）', () => {
  const miss = runCli(mkDb(false), 'calorie.view.profile', {});
  assert.equal(miss.status, 4, '空库查档案应仍 exit 4（缺失阻断）');
  assert.equal(existsSync(miss.out), false, '空库查档案不该落盘空页');

  const v = runCli(mkDb(true), 'calorie.view.profile', {});
  assert.equal(v.status, 0, 'stderr=' + v.stderr.slice(-300));
  assertDocPage(v.file, 'calorie.view.profile');
  assert.ok(v.file.includes('档案现值（user_profile#1 单例行）'), '结果页缺档案现值表');
  assert.ok(v.file.includes('基础信息 · 看档案'), '结果页缺场景 07 眉标');
  assert.equal(JSON.parse(v.stdout).data.metrics.hasGoal, 0);
});

test('#179 其余会改数据库的命令仍是原回执片段（没被一刀切换页）', () => {
  const dir = mkDb(true);
  const cases = [
    ['calorie.water.log', { ml: 300, date: '2026-09-06', time: '09:00:00' }],
    ['calorie.weight.log', { kg: 70.2, date: '2026-09-06', time: '07:00:00' }],
    ['calorie.product.add', { productName: '燕麦片', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 }],
    ['calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 }],
  ];
  for (const [key, params] of cases) {
    const r = runCli(dir, key, params);
    assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
    assert.ok(r.file !== null, key + ' 未落盘');
    assert.ok(r.file.startsWith('<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:receipt">'),
      key + ' 的产物不再是原回执片段（这 32 条本不该变）：' + r.file.slice(0, 80));
    assert.ok(!r.file.startsWith('<!doctype html>'), key + ' 意外变成了整页文档');
  }
});
