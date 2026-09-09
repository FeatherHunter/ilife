#!/usr/bin/env node
/** #97 · M5 写库回执契约逐键探针（35 写键 × 四要素，机读）。
 *
 * M5 铁则（旧版 SKILL.md:30-41 · v2.4.14 增）：「所有写库类 CLI 子命令必须按固定契约返 stdout」——
 * `id=<N>` ＋ `日期 <YYYY-MM-DD> <HH:MM:SS>` ＋ `影响 N 行` ＋ 写入字段摘要。
 * 新架构 stdout 是**一行 JSON**（P9），故四要素落在 `data.receipt` 字段上：
 *   id  → `recordId`（＋ 追加 `ids`／`idSource`）
 *   日期 → `meta.actionAt`
 *   影响 → `affectedRows`（追加；来源 SQLite `total_changes()` 增量）
 *   字段 → `writtenFields`（追加）
 *   旧版整行文本等价物 → `m5Line`（追加；`id=… | 日期 … | 影响 N 行 | 字段 …`）
 *
 * 本脚本**只读探针**：每个键在独立 tmp 库里跑真实 CLI（spawnSync），断言四要素，打机读摘要
 * `RESULT: n/m`（四要素全过＝该键 PASS）。exit 0 当且仅当 n===m。
 *
 * 运行（需先 `pnpm build`；经持锁包装器跑更佳）：
 *   node docs/research/t97-probe-receipts.mjs [--json <out.json>]
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../../packages/skill-calorie/dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', '..', 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 四要素断言（机读口径，见 docs/research/t97-m5-contract.md）。 */
export function checkM5(receipt, op) {
  const miss = [];
  if (receipt === null || typeof receipt !== 'object') return ['receipt 缺失'];
  if (receipt.m5Contract !== '1') miss.push('m5Contract');
  // ① id：单条 id（recordId）／多 id（ids）／显式不适用（idSource=condition|none，旧版口径 id=n/a）
  const idOk = (typeof receipt.recordId === 'number' && receipt.recordId > 0)
    || (Array.isArray(receipt.ids) && receipt.ids.length > 0)
    || receipt.idSource === 'condition' || receipt.idSource === 'none';
  if (!idOk) miss.push('id');
  if (!Array.isArray(receipt.ids)) miss.push('ids');
  if (!['record', 'singleton', 'condition', 'none'].includes(receipt.idSource)) miss.push('idSource');
  // ② 日期时间戳
  const at = receipt.meta && receipt.meta.actionAt;
  if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(at)) miss.push('timestamp');
  // ③ 影响行数（真实库行数，非自报）
  if (!Number.isInteger(receipt.affectedRows) || receipt.affectedRows < 0) miss.push('affectedRows');
  if (receipt.affectedRowsSource !== 'sqlite:total_changes') miss.push('affectedRowsSource');
  // ④ 写入字段摘要（delete 无写入字段 → 空数组合规，旧版同样只印 id/日期/影响）
  if (!Array.isArray(receipt.writtenFields)) miss.push('writtenFields');
  else if (op !== 'delete' && receipt.writtenFields.length === 0) miss.push('writtenFields:empty');
  // 旧版整行文本等价物
  const line = receipt.m5Line;
  if (typeof line !== 'string'
    || !/(^|\| )id=\S+ \| 日期 \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| 影响 \d+ 行 \| 字段 /.test(line)) miss.push('m5Line');
  return miss;
}

function seedDb(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0)').run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-05', '12:30:00', '米饭', 200, 500, 10, 80, 5)").run();
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-05', '07:00:00', '户外跑', 30, 300, '有氧')").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES ('2026-09-05', '07:00:00', 70.5, 175, 23.0)").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '测试')").run();
}

function mkEnv() {
  const dir = mkdtempSync(join(tmpdir(), 't97-'));
  const photosDir = mkdtempSync(join(tmpdir(), 't97-photos-'));
  const srcDir = mkdtempSync(join(tmpdir(), 't97-src-'));
  const src = join(srcDir, 'a.jpg');
  writeFileSync(src, 'fake-photo');
  const db = openDb(join(dir, 'calorie_data.db'));
  seedDb(db);
  db.close();
  return { dir, photosDir, src, env: { CALORIE_PHOTOS_DIR: photosDir } };}

function run(key, params, env) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  return spawnSync(NODE_BIN, [BIN, ...a], { encoding: 'utf8', env: { ...process.env, ...env } });
}

/** 35 写键逐键场景：pre＝前置写（取 id），params＝被测键参数（可为 ids => params）。 */
export const SCENARIOS = [
  { key: 'calorie.diet.add', params: { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-06', time: '12:10:00' } },
  { key: 'calorie.diet.update', pre: [['calorie.diet.add', { foodName: '牛肉', calories: 250, protein: 30, date: '2026-09-06', time: '12:20:00' }]], params: (ids) => ({ id: ids[0], grams: 150 }) },
  { key: 'calorie.diet.remove', pre: [['calorie.diet.add', { foodName: '鱼', calories: 180, protein: 28, date: '2026-09-06', time: '12:30:00' }]], params: (ids) => ({ id: ids[0] }) },
  { key: 'calorie.diet.batch', params: { items: [{ foodName: '粥', calories: 150, protein: 3, date: '2026-09-06', time: '08:00:00' }] } },
  { key: 'calorie.diet.copy', params: { from: '2026-09-05', to: '2026-09-06' } },
  { key: 'calorie.diet.update-by-date', params: { date: '2026-09-06', note: '食堂' } },
  { key: 'calorie.diet.remove-by-date', params: { date: '2026-09-05' } },
  { key: 'calorie.diet.remove-by-range', params: { start: '2026-09-05', end: '2026-09-05' } },
  { key: 'calorie.diet.remove-by-type', params: { date: '2026-09-05', mealType: '早餐' } },
  { key: 'calorie.water.log', params: { ml: 300, date: '2026-09-06', time: '09:00:00' } },
  { key: 'calorie.weight.log', params: { kg: 70.2, date: '2026-09-06', time: '07:00:00' } },
  { key: 'calorie.weight.update', pre: [['calorie.weight.log', { kg: 70.4, date: '2026-09-06', time: '07:00:00' }]], params: (ids) => ({ id: ids[0], kg: 70 }) },
  { key: 'calorie.weight.remove', pre: [['calorie.weight.log', { kg: 70.6, date: '2026-09-06', time: '07:10:00' }]], params: (ids) => ({ id: ids[0] }) },
  { key: 'calorie.weight.batch', params: { items: [{ date: '2026-09-04', kg: 70.8 }] } },
  { key: 'calorie.exercise.add', params: { type: '慢跑', calories: 320, minutes: 30, date: '2026-09-06' } },
  { key: 'calorie.exercise.update', pre: [['calorie.exercise.add', { type: '快走', calories: 100, date: '2026-09-06' }]], params: (ids) => ({ id: ids[0], minutes: 40 }) },
  { key: 'calorie.exercise.remove', pre: [['calorie.exercise.add', { type: '游泳', calories: 200, date: '2026-09-06' }]], params: (ids) => ({ id: ids[0] }) },
  { key: 'calorie.photo.add', params: (ids, ctx) => ({ srcPaths: [ctx.src], tag: '正面', date: '2026-09-06', time: '08:00:00' }) },
  { key: 'calorie.photo.remove', pre: [['calorie.photo.add', (ctx) => ({ srcPaths: [ctx.src], tag: '正面', date: '2026-09-06' })]], params: (ids) => ({ id: ids[0] }) },
  { key: 'calorie.photo.tag', pre: [['calorie.photo.add', (ctx) => ({ srcPaths: [ctx.src], tag: '正面', date: '2026-09-06' })]], params: (ids) => ({ id: ids[0], op: 'add', tag: '晨起' }) },
  { key: 'calorie.product.add', params: { productName: '燕麦片', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 } },
  { key: 'calorie.product.update', pre: [['calorie.product.add', { productName: '全麦面包', calories: 250, protein: 9, fat: 3, carbohydrates: 45, sodium: 300 }]], params: (ids) => ({ id: ids[0], note: '新版' }) },
  { key: 'calorie.product.deprecate', pre: [['calorie.product.add', { productName: '下架品', calories: 100, protein: 1, fat: 1, carbohydrates: 1, sodium: 1 }]], params: (ids) => ({ id: ids[0] }) },
  { key: 'calorie.profile.set', params: { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' } },
  { key: 'calorie.profile.update', params: { field: 'note', value: '测试' } },
  { key: 'calorie.profile.activity', params: { activityLevel: '活跃' } },
  { key: 'calorie.goal.set', params: { calorie: 1800, protein: 150, carbs: 200, fat: 50, water: 2000 } },
  { key: 'calorie.goal.water', params: { water: 2200 } },
  { key: 'calorie.goal.weight', params: { kg: 68, deadline: '2026-12-31' } },
  { key: 'calorie.goal.pause', params: {} },
  { key: 'calorie.goal.resume', params: {} },
  { key: 'calorie.body.composition-add', params: { source: 'gym', bodyFatPct: 18.5, date: '2026-09-06' } },
  { key: 'calorie.body.composition-remove', pre: [['calorie.body.composition-add', { source: 'gym', bodyFatPct: 19.5, date: '2026-09-06' }]], params: (ids) => ({ id: ids[0] }) },
  { key: 'calorie.body.measure-add', params: { waistCm: 85, hipCm: 95, date: '2026-09-06' } },
  { key: 'calorie.body.measure-remove', pre: [['calorie.body.measure-add', { waistCm: 86, date: '2026-09-06' }]], params: (ids) => ({ id: ids[0] }) },
];

function main() {
  const jsonFlag = process.argv.indexOf('--json');
  const rows = [];
  let pass = 0;
  const prevErr = console.error;
  for (const sc of SCENARIOS) {
    const ctx = mkEnv();
    const dir = ctx.dir;
    const ids = [];
    const localEnv = { SKILLS_DB_PATH: dir, ...ctx.env };
    let failure = null;
    try {
      for (const [pkey, pparams] of sc.pre ?? []) {
        const r = run(pkey, typeof pparams === 'function' ? pparams(ids, ctx) : pparams, localEnv);
        if (r.status !== 0) { failure = 'pre ' + pkey + ' exit ' + r.status + ' ' + (r.stderr || '').slice(-200); break; }
        const rid = JSON.parse(r.stdout).data.receipt.recordId;
        if (typeof rid === 'number') ids.push(rid);
      }
      if (!failure) {
        const params = typeof sc.params === 'function' ? sc.params(ids, ctx) : sc.params;
        const r = run(sc.key, params, localEnv);
        if (r.status !== 0) {
          failure = 'exit ' + r.status + ' ' + (r.stderr || '').slice(-200);
        } else {
          const env2 = JSON.parse(r.stdout);
          const rc = env2.data.receipt;
          const miss = checkM5(rc, rc.op);
          const ok = miss.length === 0;
          if (ok) pass += 1;
          rows.push({
            key: sc.key, op: rc.op, ok, miss,
            recordId: rc.recordId ?? null,
            ids: Array.isArray(rc.ids) ? rc.ids : null,
            idSource: rc.idSource ?? null,
            actionAt: rc.meta && rc.meta.actionAt ? rc.meta.actionAt : null,
            affectedRows: rc.affectedRows ?? null,
            writtenFields: Array.isArray(rc.writtenFields) ? rc.writtenFields : null,
            m5Line: rc.m5Line ?? null,
          });
          const mark = (b) => (b ? '✓' : '✗');
          prevErr([
            (ok ? 'PASS ' : 'FAIL ') + sc.key,
            ' id=' + mark(!miss.includes('id') && !miss.includes('ids') && !miss.includes('idSource')),
            ' ts=' + mark(!miss.includes('timestamp')),
            ' rows=' + mark(!miss.includes('affectedRows') && !miss.includes('affectedRowsSource')),
            ' fields=' + mark(!miss.some((m) => m.startsWith('writtenFields'))),
            ' line=' + mark(!miss.includes('m5Line')),
            miss.length ? '  缺=' + miss.join(',') : '',
          ].join(''));
          continue;
        }
      }
    } catch (e) {
      failure = String(e && e.message ? e.message : e);
    }
    rows.push({ key: sc.key, ok: false, miss: [failure] });
    prevErr('FAIL ' + sc.key + '  ' + failure);
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* tmp 清理失败不影响判定 */ }
  }
  prevErr('');
  prevErr('--- 逐键诊断表（key | op | recordId | idSource | actionAt | affectedRows | writtenFields）---');
  for (const r of rows) {
    prevErr('  ' + r.key.padEnd(36) + ' ' + String(r.op ?? '—').padEnd(7) + ' id=' + String(r.recordId ?? '—').padEnd(5)
      + ' src=' + String(r.idSource ?? '—').padEnd(10) + ' ts=' + String(r.actionAt ?? '—').padEnd(21)
      + ' rows=' + String(r.affectedRows ?? '—').padEnd(4) + ' fields=' + (r.writtenFields ? r.writtenFields.join(',') : '—'));
  }
  if (jsonFlag > 0 && process.argv[jsonFlag + 1]) writeFileSync(process.argv[jsonFlag + 1], JSON.stringify(rows, null, 2) + '\n', 'utf8');
  console.log('RESULT: ' + pass + '/' + SCENARIOS.length);
  process.exit(pass === SCENARIOS.length ? 0 : 1);
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntry) main();
