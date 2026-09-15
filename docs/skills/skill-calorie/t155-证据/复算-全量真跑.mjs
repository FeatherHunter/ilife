// #155 场景 02 全量真跑：唤醒词 → 命令 → 产物；每条跑前还原库快照（写词会改库，见派单附页 §15）。
// 只读仓内源码与路由声明；只在 .scratch/t155o/live-db 下写库与产物。
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/ilife';
const CLI = join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');
const DB = join(ROOT, '.scratch/t155o/live-db');
const HTMLDIR = join(DB, 'calorie_html');
const DBF = join(DB, 'calorie_data.db');

rmSync(DB, { recursive: true, force: true });
mkdirSync(DB, { recursive: true });
const env = { ...process.env, SKILLS_DB_PATH: DB };

const mod = await import('file:///' + join(ROOT, 'packages/skill-calorie/dist/triggers/routes.generated.js'));
const all = [...mod.WAKE_ROUTES, ...(mod.NEW_KEY_ROUTES || []), ...(mod.COVERAGE_REPAIR_ROUTES || [])];
const rows = all.filter((r) => String(r.scene) === '02' || r.scene === 2);

const run = (key, params) => {
  const args = [CLI, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
  return { status: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim().split('\n').filter(Boolean).slice(-1)[0] || '' };
};

/* 日期按真实当天算（本地时区），播种与窗口都跟着走——否则「今日」类命令隔天必失败。 */
const LOCAL = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dt = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return LOCAL(d); };
const TODAY = dt(0), D1 = dt(-1), D2 = dt(-2), START7 = dt(-6), START31 = dt(-30);

/* ── 播种：一份有真实数据的库 ── */
const SEED = [
  ['calorie.profile.set', { heightCm: 175, activityLevel: 'moderate' }],
  ['calorie.product.add', { productName: '鸡胸肉', calories: 165, protein: 31, fat: 3.6, carbohydrates: 0, sodium: 70 }],
  ['calorie.product.add', { productName: '燕麦片', calories: 380, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 }],
  ['calorie.product.add', { productName: '全麦面包', calories: 265, protein: 9, fat: 3, carbohydrates: 49, sodium: 400 }],
  ['calorie.product.add', { productName: '米饭', calories: 116, protein: 2.6, fat: 0.3, carbohydrates: 25.9, sodium: 2 }],
  ['calorie.diet.add', { foodName: '燕麦片', grams: 60, calories: 228, protein: 8, carbs: 40, fat: 4, date: TODAY, time: '07:20' }],
  ['calorie.diet.add', { foodName: '鸡胸肉', grams: 150, calories: 248, protein: 46, carbs: 0, fat: 5, date: TODAY, time: '12:10', note: '煎的，少油' }],
  ['calorie.diet.add', { foodName: '米饭', grams: 200, calories: 232, protein: 5, carbs: 52, fat: 1, date: TODAY, time: '19:05' }],
  ['calorie.diet.add', { foodName: '全麦面包', grams: 80, calories: 212, protein: 7, carbs: 39, fat: 2, date: D1, time: '07:30' }],
  ['calorie.diet.add', { foodName: '牛肉面', grams: 400, calories: 520, protein: 24, carbs: 72, fat: 14, date: D1, time: '12:40' }],
  ['calorie.diet.add', { foodName: '鸡胸肉', grams: 150, calories: 248, protein: 46, carbs: 0, fat: 5, date: D2, time: '12:10' }],
  ['calorie.diet.add', { foodName: '燕麦片', grams: 60, calories: 228, protein: 8, carbs: 40, fat: 4, date: D2, time: '07:20' }],
  ['calorie.water.log', { ml: 300 }],
  ['calorie.water.log', { ml: 500 }],
];
let seedBad = 0;
for (const [k, p] of SEED) { const r = run(k, p); if (r.status !== 0) { seedBad++; console.log('SEED-BAD ' + k + ' exit=' + r.status + ' ' + r.err.slice(0, 80)); } }
console.log('SEED ok=' + (SEED.length - seedBad) + '/' + SEED.length);
const SNAPSHOT = readFileSync(DBF);
console.log('SEED db bytes =', SNAPSHOT.length);

/* ── 逐条真跑：每条跑前把库还原成同一份快照 ── */
const fix = (s) => String(s)
  .replace(/<日期>/g, TODAY).replace(/<开始日期>/g, START7).replace(/<结束日期>/g, TODAY).replace(/<今日>/g, TODAY)
  .replace(/<关键词>/g, '鸡胸').replace(/<备注>/g, '少油').replace(/<餐别>/g, 'lunch')
  .replace(/<数量>/g, '300').replace(/<毫升>/g, '300').replace(/<路径>/g, 'none.jsonl')
  .replace(/<文件路径>/g, 'none.jsonl').replace(/<照片路径>/g, 'none.jpg');

const results = [];
for (const r of rows) {
  const cli = fix(r.cli || '');
  const m = cli.match(/calorie-cmd-read\s+(\S+)(?:\s+--params\s+(?:"([\s\S]*)"|'([\s\S]*)'))?\s*$/);
  const wake = r.wakeWord || '（未命名）';
  const base = { wake, kind: r.kind || '', key: r.key || '', cli };
  if (!m) { results.push({ ...base, status: 'NO-CLI', err: '路由未给可跑的 cli', made: [] }); continue; }
  const key = m[1];
  const raw = m[2] !== undefined ? m[2] : m[3];
  let params;
  if (raw !== undefined) { try { params = JSON.parse(raw); } catch { results.push({ ...base, status: 'JSON-FAIL', err: raw.slice(0, 80), made: [] }); continue; } }
  for (const suffix of ['', '-wal', '-shm']) rmSync(DBF + suffix, { force: true });
  writeFileSync(DBF, SNAPSHOT);
  const before = new Set(readdirSync(HTMLDIR).filter((f) => f.endsWith('.html')));
  const out = run(key, params);
  const made = readdirSync(HTMLDIR).filter((f) => f.endsWith('.html') && !before.has(f));
  const file = made[0];
  results.push({ ...base, params, status: out.status, err: out.err, made,
    path: file ? join(HTMLDIR, file) : null, bytes: file ? statSync(join(HTMLDIR, file)).size : 0 });
}

const ok = results.filter((r) => r.status === 0);
const bad = results.filter((r) => r.status !== 0);
console.log('LIVE-RUN total   =', results.length);
console.log('LIVE-RUN exit0   =', ok.length);
console.log('LIVE-RUN nonzero =', bad.length);
console.log('LIVE-RUN 有产物  =', results.filter((r) => r.path).length);
for (const b of bad) console.log('LIVE-BAD [' + b.status + '] ' + b.wake + ' (' + b.key + ') ' + String(b.err).slice(0, 88));
writeFileSync(join(ROOT, '.scratch/t155o/live-run.json'), JSON.stringify(results, null, 1), 'utf8');
console.log('LIVE-JSON ok');
