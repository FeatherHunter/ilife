/** t269 终验 · 逐条产物对账（全部会改数据库的命令 × 「本票改动前 / 改动后」两遍）。
 *
 * 用法：
 *   node docs/skills/skill-calorie/t269-verify-final.mjs                        # 自驱动两遍 ＋ 比对，打摘要行
 *   node docs/skills/skill-calorie/t269-verify-final.mjs --mode before --out f  # 只跑一遍（供复核单独重跑）
 *  中间件（before.json／dump-*.html）落 `.scratch/t269-verify/`；需持锁跑（协议 §2.4）。
 *
 * 一遍＝每条命令都在**全新临时库**里跑一次 `dispatchWrite`，取 `html` 的字节数／sha256／完整文档标志。
 *   · 「改动后」＝直接 import 编译产物（真出口现状）。
 *   · 「改动前」＝同一棵树、同一份编译产物，用加载钩子把 `dist/diet/receipt.js` 换成恒返回 null 的替身，
 *     即“本票那一行 `?? dietReceiptDoc(...)` 未接线”的行为；除饮食 13 条之外，两条路逐字同源。
 *   · sha256 归一：先按当刻内容把 `YYYY-MM-DD HH:MM:SS`（`nowStamp()` 口径）与各条自带的临时目录串
 *     换成 `<TS>`／`<DIR>`，消除同秒漂移与环境路径；其余字节照原样参与哈希。
 *
 * 机器摘要行：`RESULT-ONE mode=<m> keys=<n> cases=<n> ok=<k> fail=<f> full=<d> diet13_full=<n>/13`／
 *            `RESULT-DIFF keys=<n> diet13=13/13 changed=<n>/13 others_same=<s>/<o> others_changed=<c> fail=<f>`
 *            ＋ 末行 `RESULT: PASS|FAIL`。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const modeIdx = argv.indexOf('--mode');
const mode = modeIdx >= 0 ? argv[modeIdx + 1] : null;
const outIdx = argv.indexOf('--out');
const outPath = outIdx >= 0 ? argv[outIdx + 1] : null;
const dumpIdx = argv.indexOf('--dump');
const dumpKey = dumpIdx >= 0 ? argv[dumpIdx + 1] : null;

const HERE = new URL('.', import.meta.url);
/** 中间件落点（未受版本控制；摘要行仍走 stdout）。 */
const OUTDIR = '.scratch/t269-verify';
const SELFPATH = fileURLToPath(import.meta.url);

/** 饮食 13 条（本票波及面；来源 `src/diet/receipt.ts` 的具名命令集）。 */
const DIET13 = new Set([
  'calorie.diet.add', 'calorie.diet.batch', 'calorie.diet.copy', 'calorie.diet.remove',
  'calorie.diet.remove-by-date', 'calorie.diet.remove-by-range', 'calorie.diet.remove-by-type',
  'calorie.diet.update', 'calorie.diet.update-by-date',
  'calorie.product.add', 'calorie.product.update', 'calorie.product.deprecate',
  'calorie.water.log',
]);

/** 同参数种子计划（训练计划 10 条的前置）。 */
const T2_PLAN = {
  config: { title: '落库计划', start_date: '2026-09-07', user_level: '中手', available_equipment: ['瑜伽垫', '杠铃'] },
  weeks: [{ week_number: 1, days: [
    { day_of_week: 1, sessions: [{ session_label: '上肢', movements: [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }] }] },
    { day_of_week: 3, sessions: [{ session_label: '下肢', movements: [{ name: '深蹲', part: '腿', type: '力量', sets: [] }] }] },
  ] }],
};

const FOOD = { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-08', time: '08:00:00' };
const PROD = { productName: '鸡胸肉T269B', calories: 165, protein: 31, fat: 3.6, carbohydrates: 0, sodium: 70 };
const CARDIO = { type: '慢跑', calories: 320, minutes: 30, date: '2026-09-06' };
const WEIGH = { kg: 70.0, date: '2026-09-06' };
const BODYF = { source: 'gym', bodyFatPct: 18.5, date: '2026-09-06' };
const MEASR = { waistCm: 85, date: '2026-09-06' };
const PROF = { heightCm: 175, age: 30, gender: 'male', activityLevel: 'light' };

const CASES = [
  { key: 'calorie.body.composition-add', params: BODYF },
  { key: 'calorie.body.composition-remove', seedOf: ['calorie.body.composition-add', BODYF], makeParams: (id) => ({ id }) },
  { key: 'calorie.body.measure-add', params: MEASR },
  { key: 'calorie.body.measure-remove', seedOf: ['calorie.body.measure-add', MEASR], makeParams: (id) => ({ id }) },
  { key: 'calorie.diet.add', params: FOOD },
  { key: 'calorie.diet.batch', params: { items: [{ foodName: '粥', calories: 150, protein: 3, date: '2026-09-08', time: '08:10:00' }] } },
  { key: 'calorie.diet.copy', params: { from: '2026-09-08', to: '2026-09-09' }, seed: (db, W) => { W('calorie.diet.add', FOOD, db); } },
  { key: 'calorie.diet.remove', seedOf: ['calorie.diet.add', FOOD], makeParams: (id) => ({ id }) },
  { key: 'calorie.diet.remove-by-date', params: { date: '2026-09-08' }, seed: (db, W) => { W('calorie.diet.add', FOOD, db); } },
  { key: 'calorie.diet.remove-by-range', params: { start: '2026-09-08', end: '2026-09-08' }, seed: (db, W) => { W('calorie.diet.add', FOOD, db); } },
  { key: 'calorie.diet.remove-by-type', params: { mealType: '早餐', date: '2026-09-08' }, seed: (db, W) => { W('calorie.diet.add', FOOD, db); } },
  { key: 'calorie.diet.update', seedOf: ['calorie.diet.add', FOOD], makeParams: (id) => ({ id, grams: 150 }) },
  { key: 'calorie.diet.update-by-date', params: { date: '2026-09-08', note: '食堂' }, seed: (db, W) => { W('calorie.diet.add', FOOD, db); } },
  { key: 'calorie.exercise.add', params: CARDIO },
  { key: 'calorie.exercise.remove', seedOf: ['calorie.exercise.add', CARDIO], makeParams: (id) => ({ id }) },
  { key: 'calorie.exercise.update', seedOf: ['calorie.exercise.add', CARDIO], makeParams: (id) => ({ id, minutes: 40 }) },
  { key: 'calorie.goal.pause', params: {} },
  { key: 'calorie.goal.resume', params: {} },
  { key: 'calorie.goal.set', params: { calorie: 1800, protein: 150, carbs: 200, fat: 50 } },
  { key: 'calorie.goal.water', params: { water: 2000 } },
  { key: 'calorie.goal.weight', params: { kg: 68, deadline: '2026-12-31' } },
  { key: 'calorie.photo.add', withFiles: true },
  { key: 'calorie.photo.remove', seedPhoto: 'remove' },
  { key: 'calorie.photo.tag', seedPhoto: 'tag' },
  { key: 'calorie.product.add', params: PROD },
  { key: 'calorie.product.deprecate', seedOf: ['calorie.product.add', PROD], makeParams: (id) => ({ id }) },
  { key: 'calorie.product.import', params: { items: [{ productName: '导入燕麦T269', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 }] } },
  { key: 'calorie.product.update', seedOf: ['calorie.product.add', PROD], makeParams: (id) => ({ id, note: '新版T269' }) },
  { key: 'calorie.profile.activity', params: { activityLevel: 'moderate' }, seed: (db, W) => { W('calorie.profile.set', PROF, db); } },
  { key: 'calorie.profile.set', params: { heightCm: 175, age: 30, gender: 'male', activityLevel: 'moderate' } },
  { key: 'calorie.profile.update', params: { fields: { note: 't269' } }, seed: (db, W) => { W('calorie.profile.set', PROF, db); } },
  { key: 'calorie.water.log', params: { ml: 300, date: '2026-09-08', time: '09:00:00' } },
  { key: 'calorie.weight.batch', params: { items: [{ date: '2026-09-04', kg: 70.8 }] } },
  { key: 'calorie.weight.log', params: { kg: 70.0, date: '2026-09-08' } },
  { key: 'calorie.weight.remove', seedOf: ['calorie.weight.log', WEIGH], makeParams: (id) => ({ id }) },
  { key: 'calorie.weight.update', seedOf: ['calorie.weight.log', WEIGH], makeParams: (id) => ({ id, kg: 70.2 }) },
  { key: 'calorie.workout.plan-add-movement', params: { week: 1, dayOfWeek: 1, movement: { name: '深蹲' } }, seedPlan: true },
  { key: 'calorie.workout.plan-copy', params: { newTitle: '副本' }, seedPlan: true },
  { key: 'calorie.workout.plan-delete', params: { confirm: true }, seedPlan: true },
  { key: 'calorie.workout.plan-delete-day', params: { week: 1, dayOfWeek: 3 }, seedPlan: true },
  { key: 'calorie.workout.plan-set', params: { plan: T2_PLAN } },
  { key: 'calorie.workout.plan-set-rest', params: { week: 1, dayOfWeek: 3 }, seedPlan: true },
  { key: 'calorie.workout.plan-set-week', params: { week: 1, days: [{ dayOfWeek: 2, sessionLabel: '背', movements: [{ name: '硬拉' }] }] }, seedPlan: true },
  { key: 'calorie.workout.plan-update', params: { title: '新标题' }, seedPlan: true },
  { key: 'calorie.workout.plan-update-day', params: { week: 1, dayOfWeek: 3, newLabel: '腿部日' }, seedPlan: true },
  { key: 'calorie.workout.plan-update-movement', params: { oldMovement: '俯卧撑', newMovement: { name: '钻石俯卧撑' } }, seedPlan: true },
];

/** 归一：时间戳（整条 `YYYY-MM-DD HH:MM:SS` ＋ 只有时刻的 `HH:MM:SS`）与临时目录串。
 *  时刻那条是实测补上的：场景 06 运动整页回执的日志表把时刻单列一格，只归一整条日期时间抓不住。 */
function normalize(html, paths) {
  let s = String(html ?? '').replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '<TS>');
  s = s.replace(/\b\d{1,2}:\d{2}:\d{2}\b/g, '<TS>');
  for (const p of paths) {
    if (!p) continue;
    s = s.split(p).join('<DIR>');
    s = s.split(p.replace(/\\/g, '\\\\')).join('<DIR>');
  }
  return s;
}

const sha16 = (s) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const isFullDoc = (html) => {
  const h = String(html ?? '').toLowerCase();
  return h.includes('<!doctype html>') && h.includes('charset') && h.includes('<style');
};
const photoFixture = () => {
  const fdir = mkdtempSync(join(tmpdir(), 't269f-photo-'));
  const f1 = join(fdir, 'a.jpg'); const f2 = join(fdir, 'b.jpg');
  writeFileSync(f1, 'fake1'); writeFileSync(f2, 'fake2');
  return { fdir, f1, f2 };
};

async function snapshot() {
  if (mode === 'before') register(new URL('./t269-null-diet-hook.mjs', HERE).href, import.meta.url);
  mkdirSync(OUTDIR, { recursive: true });
  const { openDb } = await import('../../../packages/skill-calorie/dist/index.js');
  const { dispatchWrite } = await import('../../../packages/skill-calorie/dist/cli/write.js');
  const { CALORIE_WRITE_COMBOS } = await import('../../../packages/skill-calorie/dist/cli/keys.js');
  const W = (key, params, db) => dispatchWrite(key, params, db);

  const rows = [];
  const fails = [];
  for (const c of CASES) {
    const dir = mkdtempSync(join(tmpdir(), 't269f-'));
    const tmpPaths = [dir.replace(/\\/g, '\\\\'), dir];
    let db = null;
    try {
      db = openDb(join(dir, 'calorie_data.db'));
      db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 65, '2026-10-01', 300)").run();
      if (c.seed) c.seed(db, W);
      if (c.seedPlan) W('calorie.workout.plan-set', { plan: T2_PLAN }, db);
      let params = c.params;
      if (c.seedOf) params = c.makeParams(W(c.seedOf[0], c.seedOf[1], db).data.receipt.recordId);
      if (c.withFiles) {
        const { fdir, f1, f2 } = photoFixture();
        tmpPaths.push(fdir.replace(/\\/g, '\\\\'), fdir);
        params = { srcPaths: [f1, f2], tag: '正面', date: '2026-09-06', time: '08:00:00' };
      }
      if (c.seedPhoto) {
        const { fdir, f1 } = photoFixture();
        tmpPaths.push(fdir.replace(/\\/g, '\\\\'), fdir);
        const pid = W('calorie.photo.add', { srcPaths: [f1], tag: '正面', date: '2026-09-06' }, db).data.receipt.recordId;
        params = c.seedPhoto === 'remove' ? { id: pid } : { id: pid, op: 'add', tag: '晨起' };
      }
      const out = W(c.key, params, db);
      if (!out.data || out.data.ok !== true) throw new Error('回执 ok!==' + JSON.stringify(out.data && out.data.ok));
      const html = String(out.html ?? '');
      const norm = normalize(html, tmpPaths);
      if (dumpKey && dumpKey === c.key) {
        writeFileSync(join(OUTDIR, `dump-${mode ?? 'after'}-${c.key}.html`), norm, 'utf8');
      }
      rows.push({
        key: c.key, bytes: Buffer.byteLength(html, 'utf8'), doc: isFullDoc(html),
        shaRaw: sha16(html), sha: sha16(norm), diet: DIET13.has(c.key),
      });
    } catch (e) {
      fails.push(c.key + ': ' + String((e && e.message) || e));
      rows.push({ key: c.key, error: String((e && e.message) || e), diet: DIET13.has(c.key) });
    } finally {
      try { if (db) db.close(); } catch { /* ignore */ }
    }
  }

  const missing = Object.keys(CALORIE_WRITE_COMBOS).filter((k) => !CASES.some((c) => c.key === k));
  const extra = CASES.filter((c) => !(c.key in CALORIE_WRITE_COMBOS)).map((c) => c.key);
  const full = rows.filter((r) => r.doc).length;
  const summary = {
    mode: mode ?? 'after', at: new Date().toISOString(),
    keysInBook: Object.keys(CALORIE_WRITE_COMBOS).length,
    cases: CASES.length, rows, fails, missing, extra,
    diet13Full: rows.filter((r) => r.diet && r.doc).length,
  };
  if (outPath) writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`RESULT-ONE mode=${summary.mode} keys=${summary.keysInBook} cases=${CASES.length} ok=${rows.length - fails.length} fail=${fails.length} full=${full} diet13_full=${summary.diet13Full}/13`);
  if (missing.length) console.log('MISSING-SPEC ' + missing.join(','));
  if (extra.length) console.log('EXTRA-CASE ' + extra.join(','));
  for (const f of fails) console.log('FAIL ' + f);
  return summary;
}

async function main() {
  const after = await snapshot();
  if (mode) return after.fails.length ? 1 : 0;

  const beforePath = join(OUTDIR, 'before.json');
  const r = spawnSync(process.execPath, [SELFPATH, '--mode', 'before', '--out', beforePath], { encoding: 'utf8' });
  const beforeLine = String(r.stdout || '').trim().split('\n').find((l) => l.startsWith('RESULT-ONE'));
  console.log('RESULT-ONE-BEFORE ' + (beforeLine || '(no line)'));
  if (!existsSync(beforePath)) { console.log('RESULT: FAIL 改动前快照未落盘'); return 1; }
  const before = JSON.parse(readFileSync(beforePath, 'utf8'));
  const bBy = new Map(before.rows.map((x) => [x.key, x]));

  const dietRows = after.rows.filter((x) => x.diet);
  const dietFullAfter = dietRows.filter((x) => x.doc).length;
  const dietChanged = dietRows.filter((x) => bBy.get(x.key) && bBy.get(x.key).sha !== x.sha).length;
  const otherRows = after.rows.filter((x) => !x.diet);
  const otherSame = otherRows.filter((x) => bBy.get(x.key) && bBy.get(x.key).sha === x.sha);
  const otherChanged = otherRows.filter((x) => !bBy.get(x.key) || bBy.get(x.key).sha !== x.sha);

  console.log(`RESULT-DIFF keys=${after.keysInBook} diet13=13/13 changed=${dietChanged}/13 others_same=${otherSame.length}/${otherRows.length} others_changed=${otherChanged.length} fail=${after.fails.length} before_fail=${before.fails.length}`);
  for (const x of otherChanged) {
    const b = bBy.get(x.key);
    console.log(`OTHER-CHANGED ${x.key} before_sha=${b ? b.sha : 'n/a'} after_sha=${x.sha}`);
  }
  for (const x of dietRows) {
    const b = bBy.get(x.key);
    console.log(`DIET13 ${x.key} before_doc=${b && b.doc ? 1 : 0} after_doc=${x.doc ? 1 : 0} before_bytes=${b ? b.bytes : 'n/a'} after_bytes=${x.bytes} after_sha=${x.sha}`);
  }
  const green = dietFullAfter === 13 && dietChanged === 13 && otherChanged.length === 0
    && after.fails.length === 0 && after.missing.length === 0;
  console.log(green ? 'RESULT: PASS' : 'RESULT: FAIL');
  return green ? 0 : 1;
}

main().then((c) => process.exit(c)).catch((e) => { console.log('RESULT: FAIL ' + String((e && e.message) || e)); process.exit(1); });
