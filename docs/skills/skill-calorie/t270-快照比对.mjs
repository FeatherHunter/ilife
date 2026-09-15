/** #270 · 「其余写命令的产物逐字节未变」前后快照比对（可复跑；日志落 `.scratch/t270/`）。
 *
 * 判据（票面）：本票只改 `src/diet/receipt.ts`（饮食 15＋1 条那一格的整页装配）。**别的写命令**
 * （场景 03 体重／04 运动／07 基础信息／08 身体细节／目标／照片那一族）的产物必须**逐字节不变**。
 *
 * 取样的办法：从路由生成物里把**所有会改数据库的命令**捞出来，按命令去重，只留下不在饮食那一格里的；
 * 每条用路由自带的 `cli` 原文（含真实参数、占位符按 `t155-证据/复算-全量真跑.mjs` 同一张表替换）真跑，
 * 记 `exit` 与产物 `sha256`。每条跑前把库还原成同一份播种快照。
 *
 * 跑法（仓根）：
 *   `node docs/skills/skill-calorie/t270-快照比对.mjs --record`   记基线（改动前的编译态上跑）
 *   `node docs/skills/skill-calorie/t270-快照比对.mjs`            与基线逐条比 sha256
 * 摘要行：`RESULT: n/m 逐字节一致`（m＝基线里有真产物的条数）。
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const OUTDIR = join(ROOT, '.scratch', 't270');
const DB = join(OUTDIR, 'snap-db');
const HTMLDIR = join(DB, 'calorie_html');
const DBF = join(DB, 'calorie_data.db');
const BASE = join(OUTDIR, 't270-快照基线.json');
const PRODDIR = join(OUTDIR, 'snap-products');
const record = process.argv.includes('--record');

/** 页里带**当刻时钟**的地方（`reconcileDisclosure` 的写入时间、页脚来源行的时刻、字段变更行里那条
 *  `HH:MM:SS`）——两次真跑不可能落在同一秒，故逐字节比对前先把时刻串归一（`日期 ＋ 时刻` 或裸时刻）。
 *  归一**只吃时刻**：别的差别都留在读数里（`snap-products/` 留着两态产物原件，用 `--verify-products`
 *  复核「差异只有时刻」）。字节数另作一条独立比对。 */
const CLOCK = /(?:\d{4}-\d{2}-\d{2}[ T])?\d{2}:\d{2}:\d{2}/g;
const norm = (s) => s.replace(CLOCK, '<时刻>');
const digest = (s) => createHash('sha256').update(norm(s), 'utf8').digest('hex');

/** 本票的饮食那一格：这 14 条命令的产物**允许**变。 */
const DIET_KEYS = new Set([
  'calorie.diet.add', 'calorie.diet.batch', 'calorie.diet.copy',
  'calorie.diet.remove', 'calorie.diet.remove-by-date', 'calorie.diet.remove-by-range',
  'calorie.diet.remove-by-type', 'calorie.diet.update', 'calorie.diet.update-by-date',
  'calorie.product.add', 'calorie.product.import', 'calorie.product.update', 'calorie.product.deprecate',
  'calorie.water.log',
]);

/* ── 播种：一份有真实数据的库（照 `t155-证据/复算-全量真跑.mjs` 那份最小集） ── */
const LOCAL = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dt = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return LOCAL(d); };
const TODAY = dt(0), D1 = dt(-1), D2 = dt(-2), START7 = dt(-6);
const env = { ...process.env, SKILLS_DB_PATH: DB };

const runCli = (key, params) => {
  const args = [CLI, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
  return { status: r.status, err: String(r.stderr || '').trim().split('\n').filter(Boolean).pop() || '' };
};

const SEED = [
  ['calorie.profile.set', { heightCm: 175, activityLevel: 'moderate' }],
  ['calorie.product.add', { productName: '鸡胸肉', calories: 165, protein: 31, fat: 3.6, carbohydrates: 0, sodium: 70 }],
  ['calorie.product.add', { productName: '燕麦片', calories: 380, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 }],
  ['calorie.diet.add', { foodName: '燕麦片', grams: 60, calories: 228, protein: 8, carbs: 40, fat: 4, date: TODAY, time: '07:20' }],
  ['calorie.diet.add', { foodName: '鸡胸肉', grams: 150, calories: 248, protein: 46, carbs: 0, fat: 5, date: D1, time: '12:10', note: '煎的，少油' }],
  ['calorie.diet.add', { foodName: '米饭', grams: 200, calories: 232, protein: 5, carbs: 52, fat: 1, date: D2, time: '19:05' }],
  ['calorie.water.log', { ml: 300 }],
];

rmSync(DB, { recursive: true, force: true });
mkdirSync(HTMLDIR, { recursive: true });
let seedBad = 0;
for (const [k, p] of SEED) { const r = runCli(k, p); if (r.status !== 0) { seedBad += 1; console.log('SEED-BAD ' + k + ' exit=' + r.status + ' ' + r.err.slice(0, 80)); } }
console.log('SEED ok=' + (SEED.length - seedBad) + '/' + SEED.length);
const SNAPSHOT = readFileSync(DBF);

/* ── 取样：路由生成物里所有会改数据库的命令，去掉本票那一格，按命令去重 ── */
const mod = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routes.generated.js')).href);
const all = [...mod.WAKE_ROUTES, ...(mod.NEW_KEY_ROUTES || []), ...(mod.COVERAGE_REPAIR_ROUTES || [])];
/** 「会改数据库的命令」的登记面（唯一事实源＝`src/cli/keys.ts` 的 `CALORIE_WRITE_COMBOS`）。 */
const { CALORIE_WRITE_COMBOS } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'keys.js')).href);
const WRITE_KEYS = new Set(Object.keys(CALORIE_WRITE_COMBOS));

const fix = (s) => String(s)
  .replace(/<日期>/g, TODAY).replace(/<开始日期>/g, START7).replace(/<结束日期>/g, TODAY).replace(/<今日>/g, TODAY)
  .replace(/<关键词>/g, '鸡胸').replace(/<备注>/g, '少油').replace(/<餐别>/g, 'lunch')
  .replace(/<数量>/g, '300').replace(/<毫升>/g, '300').replace(/<重量>/g, '70')
  .replace(/<路径>/g, 'none.jsonl').replace(/<文件路径>/g, 'none.jsonl').replace(/<照片路径>/g, 'none.jpg');

const seen = new Set();
const CASES = [];
for (const r of all) {
  const cli = fix(r.cli || '');
  const m = /calorie-cmd-read\s+(\S+)(?:\s+--params\s+(?:"([\s\S]*)"|'([\s\S]*)'))?\s*$/.exec(cli);
  if (m === null) continue;
  const key = m[1];
  if (!WRITE_KEYS.has(key) || DIET_KEYS.has(key) || seen.has(key)) continue;
  seen.add(key);
  const raw = m[2] !== undefined ? m[2] : m[3];
  let params;
  if (raw !== undefined) { try { params = JSON.parse(raw); } catch { continue; } }
  CASES.push({ key, params, wake: r.wakeWord || '' });
}
console.log('NON-DIET 会改数据库的命令 =' + CASES.length);

/* ── 逐条真跑：每条跑前还原库快照，记 exit 与产物指纹（归一时刻后的 sha256） ── */
mkdirSync(PRODDIR, { recursive: true });
const rows = [];
for (const c of CASES) {
  for (const suffix of ['', '-wal', '-shm']) rmSync(DBF + suffix, { force: true });
  writeFileSync(DBF, SNAPSHOT);
  const before = new Set(readdirSync(HTMLDIR).filter((f) => f.endsWith('.html')));
  const r = runCli(c.key, c.params);
  const made = readdirSync(HTMLDIR).filter((f) => f.endsWith('.html') && !before.has(f));
  const name = made.length > 0 ? made[made.length - 1] : null;
  const file = name === null ? null : join(HTMLDIR, name);
  const html = file === null ? null : readFileSync(file, 'utf8');
  if (html !== null) writeFileSync(join(PRODDIR, c.key + '.html'), html, 'utf8');
  rows.push({
    key: c.key, exit: r.status, bytes: html === null ? 0 : Buffer.byteLength(html, 'utf8'),
    sha256: html === null ? null : digest(html),
  });
}

if (process.argv.includes('--verify-products')) {
  const dbg = join(OUTDIR, 'snap-products-before');
  let same = 0, total = 0;
  for (const r of rows) {
    const a = join(dbg, r.key + '.html');
    const b = join(PRODDIR, r.key + '.html');
    if (!existsSync(a) || !existsSync(b)) continue;
    total += 1;
    const x = norm(readFileSync(a, 'utf8')), y = norm(readFileSync(b, 'utf8'));
    if (x === y) { same += 1; continue; }
    let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i += 1;
    console.log('PRODUCT-DIFF ' + r.key + ' 首个不同字符在第 ' + i + ' 位：'
      + JSON.stringify(x.slice(Math.max(0, i - 30), i + 30)) + ' vs ' + JSON.stringify(y.slice(Math.max(0, i - 30), i + 30)));
  }
  console.log('VERIFY-PRODUCTS: ' + same + '/' + total + ' 归一时刻后逐字相同');
  process.exit(same === total ? 0 : 1);
}

if (record) {
  writeFileSync(BASE, JSON.stringify({ at: new Date().toISOString(), rows }, null, 2), 'utf8');
  /* 两态产物各留一份原件：`--verify-products` 用它复核「差异只有时刻」。 */
  rmSync(join(OUTDIR, 'snap-products-before'), { recursive: true, force: true });
  cpSync(PRODDIR, join(OUTDIR, 'snap-products-before'), { recursive: true });
  console.log('RECORDED ' + BASE + ' 条数=' + rows.length
    + ' 有产物=' + rows.filter((r) => r.sha256 !== null).length);
  process.exit(0);
}

if (!existsSync(BASE)) { console.log('没有基线文件：先跑 --record'); process.exit(2); }
const base = JSON.parse(readFileSync(BASE, 'utf8')).rows;
const byKey = new Map(base.map((r) => [r.key, r]));
let same = 0, total = 0;
for (const now of rows) {
  const was = byKey.get(now.key);
  if (was === undefined) { console.log('新增取样（基线没有）：' + now.key); continue; }
  const comparable = was.sha256 !== null && now.sha256 !== null;
  if (!comparable) {
    console.log((was.exit === now.exit ? 'SKIP ' : 'DIFF ') + now.key
      + ' exit ' + was.exit + '→' + now.exit + '（两次都没产物，不参与逐字节比对）');
    if (was.exit !== now.exit) total += 1;
    continue;
  }
  total += 1;
  const ok = was.sha256 === now.sha256 && was.bytes === now.bytes;
  if (ok) same += 1;
  console.log((ok ? 'SAME ' : 'DIFF ') + now.key + ' bytes=' + was.bytes + '→' + now.bytes
    + (ok ? '' : ' sha256=' + String(was.sha256).slice(0, 12) + '→' + String(now.sha256).slice(0, 12)));
}
console.log('RESULT: ' + same + '/' + total + ' 逐字节一致（时刻串已归一，只差当刻时钟不算差异）');
process.exit(same === total ? 0 : 1);
