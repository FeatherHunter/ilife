/** T6 #25 · 取数/导入/跨技能只读测试：tmp 隔离，真实 DB 与真实 catalog 零触碰。 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  validateRecord,
  readJsonl,
  importProducts,
  validateFile,
  dedupeReport,
  exportBySource,
  getCalorieHistory,
  weightSeries,
  readSkill,
  requireOk,
  loadCatalog,
  verifyMovementName,
  suggestSimilar,
  collectPlanNames,
  auditPlanNames,
} from '../dist/fetch/index.js';
import { openDb } from '../dist/index.js';

// DSH 宿主下 process.execPath 可能指向宿主二进制而非 node，此时回退 PATH 查 node
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const tmp = (p) => join(mkdtempSync(join(tmpdir(), 't25-')), p);
const GOOD = {
  product_name: '燕麦', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5, source: '测试',
};

test('validate：7 必填 + source 非空 + 数值≥0', () => {
  assert.equal(validateRecord(GOOD).ok, true);
  assert.match(validateRecord({ ...GOOD, source: '  ' }).error, /source/);
  const { product_name, ...rest } = GOOD;
  assert.match(validateRecord(rest).error, /product_name/);
  assert.match(validateRecord({ ...GOOD, calories: -1 }).error, />= 0/);
  assert.match(validateRecord({ ...GOOD, protein: '高' }).error, /数字/);
  assert.equal(validateRecord(null).ok, false);
});

test('import：新增/跳过/覆盖/废弃/dry-run 与统计', async () => {
  const db = openDb(tmp('imp.db'));
  const f = tmp('a.jsonl');
  writeFileSync(f, [JSON.stringify(GOOD), JSON.stringify({ ...GOOD, brand: 'B' }), 'not-json', JSON.stringify({ calories: 1 })].join('\n'));
  const r1 = await importProducts(db, f, { onDuplicate: 'skip' });
  assert.deepEqual(r1.stats, { inserted: 2, updated: 0, skipped: 0, deprecated: 0, failed: 0 });
  assert.equal(r1.invalid.length, 1);
  assert.equal(r1.parseErrors.length, 1);
  const r2 = await importProducts(db, f, { onDuplicate: 'skip' });
  assert.equal(r2.stats.skipped, 2);
  const r3 = await importProducts(db, f, { onDuplicate: 'overwrite' });
  assert.equal(r3.stats.updated, 2);
  const r4 = await importProducts(db, f, { onDuplicate: 'deprecate' });
  assert.equal(r4.stats.deprecated, 2);
  const n = db.prepare('SELECT COUNT(*) AS c FROM nutrition_products WHERE is_deprecated = 1').get().c;
  assert.equal(n, 2);
  const rd = await importProducts(db, f, { onDuplicate: 'skip', dryRun: true });
  assert.equal(rd.dryRun, true);
  assert.equal(rd.stats.inserted, 0);
  db.close();
});

test('validateFile JSON 输出与 dedupe/export', () => {
  const db = openDb(tmp('v.db'));
  const f = tmp('b.jsonl');
  writeFileSync(f, JSON.stringify(GOOD));
  const out = tmp('v.json');
  const r = validateFile(f, out);
  assert.deepEqual([r.total, r.valid, r.failed], [1, 1, 0]);
  db.prepare('INSERT INTO nutrition_products (product_name, calories, protein, fat, carbohydrates, sodium, source) VALUES (?,?,?,?,?,?,?)').run('燕麦', 1, 1, 1, 1, 1, 'x');
  db.prepare('INSERT INTO nutrition_products (product_name, calories, protein, fat, carbohydrates, sodium, source) VALUES (?,?,?,?,?,?,?)').run('燕麦', 1, 1, 1, 1, 1, 'y');
  const dups = dedupeReport(db);
  assert.equal(dups.length, 1);
  assert.equal(dups[0].ids.length, 2);
  assert.equal(exportBySource(db, 'x').length, 1);
  assert.equal(exportBySource(db, '无').length, 0);
  db.close();
});

test('history：按日聚合倒序 + 目标状态 + 空库空行', () => {
  const db = openDb(tmp('h.db'));
  assert.deepEqual(getCalorieHistory(db, 7).rows, []);
  db.prepare("INSERT INTO food_log (date, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-04','饭',100,500,10,60,5),('2026-09-05','面',100,1800,100,200,60)").run();
  db.prepare('INSERT INTO daily_goal (id, calorie_goal) VALUES (1, 1800)').run();
  const h = getCalorieHistory(db, 7, new Date('2026-09-06T12:00:00'));
  assert.equal(h.rows.length, 2);
  assert.equal(h.rows[0].date, '2026-09-05');
  assert.deepEqual([h.rows[0].remaining, h.rows[0].status], [0, '达标']);
  assert.deepEqual([h.rows[1].remaining, h.rows[1].status], [1300, '+1300卡']);
  db.prepare('DELETE FROM daily_goal').run();
  assert.equal(getCalorieHistory(db, 7).rows[0].status, '未设目标');
  db.close();
});

test('cross-skill：缺失/超时/坏 JSON 一律阻断，永不空数组当正常', () => {
  const miss = readSkill({ skill: 's', domain: 'd', from: 'a', to: 'b' });
  assert.equal(miss.ok, false);
  assert.deepEqual(miss.data, []);
  assert.throws(() => requireOk(miss), /阻断/);
  const bad = readSkill({ command: ['x'], skill: 's', domain: 'd', from: 'a', to: 'b', spawn: () => ({ stdout: 'xx', stderr: '' }) });
  assert.equal(bad.ok, false);
  const err = readSkill({ command: ['x'], skill: 's', domain: 'd', from: 'a', to: 'b', spawn: () => ({ stdout: '', stderr: '', error: 'timeout' }) });
  assert.match(err.error, /timeout/);
  const ok = readSkill({
    command: [process.execPath], skill: 's', domain: 'd', from: 'a', to: 'b',
    spawn: (cmd) => ({ stdout: JSON.stringify({ ok: true, skill: 's', domain: 'd', data: [{ x: 1 }] }), stderr: '' }),
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.data, [{ x: 1 }]);
});

test('catalog：缺失→空集→无法验证；命中/落榜/建议', () => {
  assert.equal(loadCatalog(join(tmpdir(), 't25-no-such.json')).size, 0);
  const v = verifyMovementName('深蹲', new Set());
  assert.equal(v.valid, null);
  const f = tmp('cat.json');
  writeFileSync(f, JSON.stringify({ actions: ['杠铃深蹲', '平板卧推'] }));
  const cat = loadCatalog(f);
  assert.equal(verifyMovementName('杠铃深蹲', cat).valid, true);
  const bad = verifyMovementName('深蹲', cat);
  assert.equal(bad.valid, false);
  assert.deepEqual(suggestSimilar('深蹲', cat), ['杠铃深蹲']);
});

test('audit：ok/warn/fail 三段式 + 建议', () => {
  const db = openDb(tmp('a.db'));
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_label, movements) VALUES (1,1,?,?)').run('练腿', JSON.stringify([{ name: '杠铃深蹲' }]));
  const cat = new Set(['杠铃深蹲', '平板卧推']);
  const ok = auditPlanNames(db, { catalog: cat });
  assert.equal(ok.status, 'ok');
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_label, movements) VALUES (1,2,?,?)').run('练胸', JSON.stringify([{ name: '坐姿推举' }]));
  const warn = auditPlanNames(db, { catalog: cat, withSuggestions: true });
  assert.equal(warn.status, 'warn');
  assert.deepEqual(warn.data.not_in_catalog, ['坐姿推举']);
  assert.ok(warn.data.suggestions);
  assert.deepEqual(collectPlanNames(db).sort(), ['坐姿推举', '杠铃深蹲']);
  assert.equal(auditPlanNames(db, { catalog: new Set() }).status, 'fail');
  db.close();
});

test('CLI：import/history/audit exit 码 parity', () => {
  const cli = join(ROOT, 'packages', 'skill-calorie', 'dist', 'fetch', 'cli.js');
  const dbp = tmp('cli.db');
  const f = tmp('c.jsonl');
  writeFileSync(f, JSON.stringify(GOOD));
  const out = execFileSync(NODE_BIN, [cli, 'import', f, '--db', dbp, '--on-duplicate', 's'], { encoding: 'utf8' });
  assert.match(out, /新增: 1/);
  assert.throws(() => execFileSync(NODE_BIN, [cli, 'validate'], { stdio: 'pipe' }));
  const h = execFileSync(NODE_BIN, [cli, 'history', '--db', dbp, '--days', '7'], { encoding: 'utf8' });
  assert.match(h, /无记录/);
  let auditErr = null;
  try {
    execFileSync(NODE_BIN, [cli, 'audit', '--db', dbp, '--catalog', join(tmpdir(), 't25-no-cat.json')], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    auditErr = e;
  }
  assert.equal(auditErr?.status, 2);
  assert.match(String(auditErr?.stdout ?? ''), /"status": "fail"/);
  assert.throws(() => execFileSync(NODE_BIN, [cli, 'audit', '--db', dbp, '--catalog', join(tmpdir(), 't25-no-cat.json'), '--strict'], { stdio: 'pipe' }));
});
