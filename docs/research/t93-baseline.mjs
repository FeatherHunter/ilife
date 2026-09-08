#!/usr/bin/env node
/**
 * #93 · 只读取证基线（可复跑、零风险）
 *
 * 一句话：把「卡路里 CLI 在真实数据上只读取数」变成一条可复跑的命令，
 * 全程不碰真库（真库只被 sha256 读一次、复制一次），所有采样都在 %TEMP% 副本内跑。
 *
 * 用法（仓根）：
 *   node docs/research/t93-baseline.mjs                 # 默认：真库只读副本 + 3 个历史日期 + 6 形取样
 *   node docs/research/t93-baseline.mjs --db <目录>      # 指定源库目录（内含 calorie_data.db）
 *   node docs/research/t93-baseline.mjs --photos <目录>  # 指定照片目录（可选；缺省空目录 → fileExists=false）
 *   node docs/research/t93-baseline.mjs --fixture        # 不读真库：临时库自造确定性数据（离线/CI 可复跑）
 *   node docs/research/t93-baseline.mjs --json           # 机器可读
 *   node docs/research/t93-baseline.mjs --out <文件>      # 报告落盘（UTF-8 无 BOM）
 *   node docs/research/t93-baseline.mjs --keep           # 保留临时工作目录（排查用）
 *
 * 零风险口径（脚本自身保证，逐条有断言）：
 *   1. 源库只读：源库文件仅被 readFileSync 式哈希 + copyFileSync 复制，从不作为 SKILLS_DB_PATH 传给 CLI；
 *   2. 采样副本：所有读键的 SKILLS_DB_PATH 指向 %TEMP% 下的副本目录；
 *   3. 读键不改副本：读键跑完前后副本 sha256 必须相等（openDb 会执行幂等建表/迁移，此断言即证明其零字节变化）；
 *   4. 写键只碰一次性库：receipt 形取样在另一份一次性副本上做，并断言其哈希**变了**（哈希探针灵敏度对照）；
 *   5. 源库前后三件套（sha256/size/mtime）必须全等，写操作计数恒为 0。
 *
 * 退出码：0 全绿；1 有断言失败（失败行以 FAIL 打头）；2 用法/环境错误。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const LINK_CORE = join(ROOT, 'packages', 'base-link-core', 'dist', 'index.js');
const KEYS_JS = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'keys.js');
const DB_FILENAME = 'calorie_data.db';
const DEFAULT_SOURCE_DIR = 'D:\\2Study\\StudyNotes\\.db';
const DEFAULT_PHOTOS_DIR = 'D:\\2Study\\StudyNotes\\.db\\CalorieHub';
const PHOTOS_COPY_LIMIT_BYTES = 512 * 1024 * 1024;

/** 已验证「有真实数据」的历史日期 ＋ 冻结期望值（drift 即 FAIL）。 */
const PINNED_DATES = [
  { date: '2026-08-19', expect: { calorieGoal: 1850, waterGoal: 4000, intakeCal: 1000, entryCount: 1 } },
  { date: '2026-08-18', expect: { calorieGoal: 1850, waterGoal: 4000, intakeCal: 1840, entryCount: 2 } },
  { date: '2026-08-17', expect: { calorieGoal: 1850, waterGoal: 4000, intakeCal: 2374, entryCount: 7 } },
];
/** fixture 模式：同一批日期，自造确定性数据（空库默认目标 1800/2000）。 */
const FIXTURE_DATES = [
  { date: '2026-08-19', meals: [['fixture-饭A', 1000, 25, 130, 31]], expect: { calorieGoal: 1800, waterGoal: 2000, intakeCal: 1000, entryCount: 1 } },
  { date: '2026-08-18', meals: [['fixture-饭B', 900, 30, 100, 20], ['fixture-饭C', 940, 40, 90, 30]], expect: { calorieGoal: 1800, waterGoal: 2000, intakeCal: 1840, entryCount: 2 } },
  { date: '2026-08-17', meals: [['fixture-饭D', 400, 20, 50, 10], ['fixture-饭E', 974, 30, 80, 20], ['fixture-饭E2', 1000, 50, 90, 30]], expect: { calorieGoal: 1800, waterGoal: 2000, intakeCal: 2374, entryCount: 3 } },
];
/** 1x1 透明 PNG（fixture 模式的照片源；不引外部资源）。 */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

// ---------------------------------------------------------------- 工具

function usage(msg) {
  if (msg) console.error('用法错误：' + msg);
  console.error('用法：node docs/research/t93-baseline.mjs [--db <目录>] [--photos <目录>] [--fixture] [--json] [--out <文件>] [--keep]');
  process.exit(2);
}

function parseArgv(a) {
  const o = { db: null, photos: null, fixture: false, json: false, out: null, keep: false };
  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (t === '--db') o.db = a[++i] ?? usage('--db 缺值');
    else if (t === '--photos') o.photos = a[++i] ?? usage('--photos 缺值');
    else if (t === '--out') o.out = a[++i] ?? usage('--out 缺值');
    else if (t === '--fixture') o.fixture = true;
    else if (t === '--json') o.json = true;
    else if (t === '--keep') o.keep = true;
    else if (t === '-h' || t === '--help') { usage(); }
    else usage('未知参数 ' + t);
  }
  return o;
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();
}

function probe(file) {
  const st = statSync(file);
  return { sha256: sha256(file), size: st.size, mtimeMs: st.mtimeMs, mtime: new Date(st.mtimeMs).toISOString() };
}

function dirBytes(dir) {
  let total = 0;
  for (const f of readdirFiles(dir)) total += statSync(f).size;
  return total;
}

function readdirFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

/** 唯一出口调用：argv + JSON(stdout) + exit。 */
function runCli(key, params, env) {
  const args = [CLI, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  const r = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    maxBuffer: 32 * 1024 * 1024,
  });
  const stdout = String(r.stdout ?? '');
  const stderr = String(r.stderr ?? '');
  let envelope = null;
  const line = stdout.trim().split('\n').filter((s) => s.trim() !== '').pop() ?? '';
  if (line.startsWith('{')) { try { envelope = JSON.parse(line); } catch { envelope = null; } }
  return { exit: r.status === null ? -1 : r.status, stdout, stderr, envelope };
}

const results = [];
function check(ok, label, detail) {
  results.push({ ok, label, detail: detail === undefined ? '' : String(detail) });
  return ok;
}
function eqCheck(actual, expected, label) {
  return check(actual === expected, label, '实际 ' + JSON.stringify(actual) + ' / 期望 ' + JSON.stringify(expected));
}

// ---------------------------------------------------------------- 主流程

const opt = parseArgv(process.argv.slice(2));

if (!existsSync(CLI)) {
  console.error('缺构建产物：' + CLI + '\n请先构建（pnpm -C packages/skill-calorie build），本脚本只跑产物、不改源码。');
  process.exit(2);
}

const workRoot = mkdtempSync(join(tmpdir(), 't93-baseline-'));
const seedDir = join(workRoot, 'seed');
const roDir = join(workRoot, 'ro');
const wrDir = join(workRoot, 'wr');
const roPhotos = join(workRoot, 'photos');
for (const d of [seedDir, roDir, wrDir, roPhotos]) mkdirSync(d, { recursive: true });

const report = [];
const push = (s) => { report.push(s); };

const envOf = (dbDir, photosDir) => ({
  SKILLS_DB_PATH: dbDir,
  ...(photosDir ? { CALORIE_PHOTOS_DIR: photosDir } : {}),
  // 不设 CALORIE_FORCE_PROD：副本一律在 %TEMP% 下，写守卫保持开启（路径若意外逃出 tmp 会立刻被拒）。
});

let sourceInfo = null;
let photosInfo = null;
let seedNote = '';

// ---- 1. 数据源：真库只读副本 或 fixture 自造
if (opt.fixture) {
  seedNote = 'fixture（写键在临时库自造）';
  // 先定营养目标（空库无 daily_goal 行时 view.home 的 calorieGoal 会被 nums() 丢弃 → 显式种 1800/2000）
  const gr = runCli('calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50, water: 2000 }, envOf(seedDir));
  if (gr.exit !== 0) { console.error('fixture 目标种子失败：exit=' + gr.exit + ' ' + gr.stderr.trim()); process.exit(2); }
  for (const d of FIXTURE_DATES) {
    for (const [name, cal, pro, carb, fat] of d.meals) {
      const r = runCli('calorie.diet.add', {
        foodName: name, calories: cal, protein: pro, carbs: carb, fat: fat, grams: 200, date: d.date, time: '12:00:00',
      }, envOf(seedDir));
      if (r.exit !== 0) { console.error('fixture 种子失败：' + d.date + ' exit=' + r.exit + ' ' + r.stderr.trim()); process.exit(2); }
    }
  }
  const png = join(workRoot, 'fixture-photo.png');
  writeFileSync(png, TINY_PNG);
  const pr = runCli('calorie.photo.add', { srcPaths: [png], tag: '正面', date: '2026-05-30' }, envOf(seedDir, roPhotos));
  if (pr.exit !== 0) { console.error('fixture 照片种子失败：exit=' + pr.exit + ' ' + pr.stderr.trim()); process.exit(2); }
} else {
  const srcDir = resolve(opt.db ?? process.env.SKILLS_DB_PATH ?? DEFAULT_SOURCE_DIR);
  const srcDb = join(srcDir, DB_FILENAME);
  if (!existsSync(srcDb)) {
    console.error('源库不存在：' + srcDb + '\n用 --db <目录> 指定，或加 --fixture 离线自造。');
    process.exit(2);
  }
  const before = probe(srcDb);
  copyFileSync(srcDb, join(seedDir, DB_FILENAME));
  const copy = probe(join(seedDir, DB_FILENAME));
  const after = probe(srcDb);
  sourceInfo = { dir: srcDir, file: srcDb, before, after, copy };
  check(before.sha256 === copy.sha256, '源库 → 种子副本 sha256 相等', copy.sha256);
  check(before.sha256 === after.sha256 && before.size === after.size && before.mtimeMs === after.mtimeMs,
    '源库复制前后三件套未变（sha256/size/mtime）', 'sha256=' + after.sha256 + ' size=' + after.size);

  const photoSrc = resolve(opt.photos ?? process.env.CALORIE_PHOTOS_DIR ?? DEFAULT_PHOTOS_DIR);
  if (existsSync(photoSrc)) {
    const bytes = dirBytes(photoSrc);
    if (bytes <= PHOTOS_COPY_LIMIT_BYTES) {
      cpSync(photoSrc, roPhotos, { recursive: true });
      photosInfo = { dir: photoSrc, copied: true, files: readdirFiles(photoSrc).length, bytes };
    } else {
      photosInfo = { dir: photoSrc, copied: false, files: readdirFiles(photoSrc).length, bytes };
      push('photos          : 源目录超 ' + (PHOTOS_COPY_LIMIT_BYTES / 1048576) + 'MB，未复制；读键只做 existsSync（不写）');
    }
  } else {
    photosInfo = { dir: photoSrc, copied: false, files: 0, bytes: 0, missing: true };
  }
}

// ---- 2. 只读副本：种子库 → ro/（此后所有读键只碰 ro/）
copyFileSync(join(seedDir, DB_FILENAME), join(roDir, DB_FILENAME));
const roBefore = probe(join(roDir, DB_FILENAME));
const photosForRead = photosInfo && photosInfo.copied === false && photosInfo.missing !== true
  ? photosInfo.dir : roPhotos;

// ---- 3. 历史日期（stat 形）
const dateRows = [];
const pinned = opt.fixture ? FIXTURE_DATES : PINNED_DATES;
for (const p of pinned) {
  const r = runCli('calorie.view.home', { date: p.date }, envOf(roDir, photosForRead));
  const m = r.envelope && r.envelope.data && r.envelope.data.metrics ? r.envelope.data.metrics : {};
  dateRows.push({ date: p.date, exit: r.exit, shape: r.envelope && r.envelope.shape, m });
  eqCheck(r.exit, 0, '历史日期 ' + p.date + ' view.home exit=0');
  eqCheck(r.envelope && r.envelope.shape, 'stat', '历史日期 ' + p.date + ' shape=stat');
  eqCheck(r.envelope && r.envelope.key, 'calorie.view.home', '历史日期 ' + p.date + ' key=calorie.view.home');
  for (const [k, v] of Object.entries(p.expect)) eqCheck(m[k], v, '历史日期 ' + p.date + ' metrics.' + k);
}

// ---- 4. 六形取样
const shapeRows = [];
function sample(shape, key, params, expectExit, extract) {
  const r = runCli(key, params, envOf(roDir, photosForRead));
  const got = extract ? extract(r) : null;
  shapeRows.push({ shape, key, params: params === undefined ? null : JSON.stringify(params), exit: r.exit, got });
  eqCheck(r.exit, expectExit, '形状 ' + shape + ' · ' + key + ' exit=' + expectExit);
  if (expectExit === 0) eqCheck(r.envelope && r.envelope.shape, shape, '形状 ' + shape + ' · ' + key + ' envelope.shape');
  return r;
}

// stat：历史日期首条即 stat 样本，此处再显式记一行（同一条命令，不重复跑）
shapeRows.push({ shape: 'stat', key: 'calorie.view.home', params: JSON.stringify({ date: pinned[0].date }), exit: dateRows[0].exit, got: 'metrics.calorieGoal=' + dateRows[0].m.calorieGoal });

// list：calorie.today
const today = sample('list', 'calorie.today', { date: pinned[0].date }, 0, (r) => {
  const d = r.envelope.data;
  return 'total=' + d.total + ' items[0]=' + (d.items[0] ? d.items[0].food_name + '/' + d.items[0].calories + 'kcal' : '—');
});
if (today.envelope) eqCheck(today.envelope.data.total, pinned[0].expect.entryCount, 'list · calorie.today total 与 entryCount 一致');

// list：calorie.photo.list（显式日期窗，避免「今天滑动窗」导致输出漂移）
const photoList = sample('list', 'calorie.photo.list', { dateFrom: '2026-05-30', dateTo: '2026-07-17', limit: 500 }, 0, (r) => {
  const d = r.envelope.data;
  const exists = d.items.filter((i) => i.fileExists).length;
  return 'total=' + d.total + ' fileExists=' + exists + '/' + d.items.length;
});
const photoIds = photoList.envelope ? photoList.envelope.data.items.map((i) => i.id) : [];
check(photoIds.length > 0, 'list · photo.list 至少 1 张（detail/analysis 取样依赖）', 'ids=' + photoIds.length);

// detail：calorie.photo.detail（取 list 首条，避免写死 id 漂移）
const detailId = photoIds.length > 0 ? photoIds[0] : 1;
sample('detail', 'calorie.photo.detail', { id: detailId }, 0, (r) => {
  const it = r.envelope.data.item;
  return 'item.id=' + it.id + ' date=' + it.date + ' tags=' + JSON.stringify(it.tagList);
});

// analysis：calorie.photo.gif
sample('analysis', 'calorie.photo.gif', { tag: '正面', dateFrom: '2026-05-30', dateTo: '2026-07-17' }, 0, (r) => {
  const s = r.envelope.data.summary;
  return 'summary.len=' + s.length + ' prefix=' + JSON.stringify(s.slice(0, 24));
});

// receipt：写键 → 一次性库（绝不碰 ro/ 与源库）
copyFileSync(join(roDir, DB_FILENAME), join(wrDir, DB_FILENAME));
const wrBefore = probe(join(wrDir, DB_FILENAME));
const receipt = runCli('calorie.water.log', { ml: 300, date: pinned[0].date }, envOf(wrDir, photosForRead));
const wrAfter = probe(join(wrDir, DB_FILENAME));
shapeRows.push({
  shape: 'receipt', key: 'calorie.water.log', params: JSON.stringify({ ml: 300, date: pinned[0].date }),
  exit: receipt.exit,
  got: receipt.envelope ? 'ok=' + receipt.envelope.data.ok + ' recordId=' + (receipt.envelope.data.receipt || {}).recordId : '—',
});
eqCheck(receipt.exit, 0, '形状 receipt · calorie.water.log exit=0');
eqCheck(receipt.envelope && receipt.envelope.shape, 'receipt', '形状 receipt · envelope.shape');
eqCheck(receipt.envelope && receipt.envelope.data.ok, true, '形状 receipt · data.ok=true');
check(typeof (receipt.envelope && receipt.envelope.data.message) === 'string' && receipt.envelope.data.message.length > 0,
  '形状 receipt · data.message 非空', receipt.envelope ? receipt.envelope.data.message : '');
check(wrBefore.sha256 !== wrAfter.sha256, '哈希探针灵敏度：写键确实改变了它自己那份库（对照）', wrBefore.sha256.slice(0, 20) + ' → ' + wrAfter.sha256.slice(0, 20));

// fallback：CLI 注册表不可达 → 三重证据
const fallbackEvidence = { registryKeys: 0, missingExit: null, linkCoreOk: false, linkCoreRejects: false };
const keysMod = await import(pathToFileURL(KEYS_JS).href);
const shapeTally = {};
for (const v of Object.values(keysMod.CALORIE_COMBOS)) shapeTally[v.shape] = (shapeTally[v.shape] ?? 0) + 1;
fallbackEvidence.registryKeys = shapeTally.fallback ?? 0;
fallbackEvidence.shapeTally = shapeTally;
eqCheck(fallbackEvidence.registryKeys, 0, 'fallback 形 · 77 键中 fallback 键数=0（CLI 不可达，见报告结论）');

const missing = runCli('calorie.view.home', { date: '1900-01-01' }, envOf(roDir, photosForRead));
fallbackEvidence.missingExit = missing.exit;
eqCheck(missing.exit, 4, 'fallback 形 · 缺数据走 exit 4（missing-data，非 fallback envelope）');
check(/^ERR 4:/.test(missing.stderr.trim()), 'fallback 形 · stderr 首行 ERR 4', missing.stderr.trim().slice(0, 80));

const link = await import(pathToFileURL(LINK_CORE).href);
try {
  const env = link.createEnvelope({ skill: 'calorie', shape: 'fallback', key: 'calorie.view.home', data: { reason: 'fixture 降级载荷', degraded: true } });
  fallbackEvidence.linkCoreOk = env.shape === 'fallback' && env.data.degraded === true;
} catch { fallbackEvidence.linkCoreOk = false; }
check(fallbackEvidence.linkCoreOk, 'fallback 形 · base-link-core createEnvelope 可造合法 fallback（契约面成立）', JSON.stringify(shapeTally));
try {
  link.assertShapeData('fallback', { reason: 'x' });
  fallbackEvidence.linkCoreRejects = false;
} catch { fallbackEvidence.linkCoreRejects = true; }
check(fallbackEvidence.linkCoreRejects, 'fallback 形 · 缺 degraded:true 被拒（契约校验生效）', '');
shapeRows.push({ shape: 'fallback', key: '(不可达)', params: null, exit: 4, got: '注册表 fallback 键=0；缺数据走 exit 4；契约面由 base-link-core 覆盖' });

// ---- 4.5 票面归属澄清的两条可复现事实（技能侧产物 / 历史日期不受「今天为空」影响）
const htmlOut = join(workRoot, 'view-home.html');
const htmlRun = runCli('calorie.view.home', { date: pinned[0].date }, { ...envOf(roDir, photosForRead) });
const htmlArgs = [CLI, 'calorie.view.home', '--params', JSON.stringify({ date: pinned[0].date }), '--html', htmlOut];
const htmlSpawn = spawnSync(process.execPath, htmlArgs, { encoding: 'utf8', env: { ...process.env, ...envOf(roDir, photosForRead) } });
const htmlText = existsSync(htmlOut) ? readFileSync(htmlOut, 'utf8') : '';
eqCheck(htmlSpawn.status, 0, '技能侧产物 · --html 渲染 exit=0（证据是技能侧 HTML，不需要面板）');
check(htmlText.startsWith('<section') && htmlText.includes('data-skill="calorie"'),
  '技能侧产物 · HTML 以 <section data-skill="calorie" 开头', 'bytes=' + Buffer.byteLength(htmlText, 'utf8'));
check(htmlRun.exit === 0 && htmlRun.stdout.trim().split('\n').filter((s) => s.trim() !== '').length === 1,
  '技能侧产物 · stdout 纯净：成功只打一行 envelope', 'exit=' + htmlRun.exit + ' 行数=' + htmlRun.stdout.trim().split('\n').filter((s) => s.trim() !== '').length);

const todayIso = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); // 本地日，与 CLI todayISO() 同口径
})();
const todayRun = runCli('calorie.view.home', { date: todayIso }, envOf(roDir, photosForRead));
// 今日窗口是否有数据取决于维护者是否记账，不参与断言；只记录事实。
const todayFact = 'exit=' + todayRun.exit + (todayRun.exit === 0 ? '（今日有数据）' : '（' + todayRun.stderr.trim().slice(0, 60) + '）');

// ---- 5. 零风险自证（采样之后）
const roAfter = probe(join(roDir, DB_FILENAME));
eqCheck(roAfter.sha256, roBefore.sha256, '只读副本读键前后 sha256 未变（openDb 幂等建表/迁移零字节变化）');
eqCheck(roAfter.size, roBefore.size, '只读副本 size 未变');
if (sourceInfo) {
  const srcAfter = probe(sourceInfo.file);
  eqCheck(srcAfter.sha256, sourceInfo.before.sha256, '源库采样后 sha256 未变');
  eqCheck(srcAfter.size, sourceInfo.before.size, '源库采样后 size 未变');
  eqCheck(srcAfter.mtimeMs, sourceInfo.before.mtimeMs, '源库采样后 mtime 未变');
}

// ---- 6. 报告
const fmt = (v) => (v === undefined || v === null ? '—' : String(v));
const failedChecks = results.filter((r) => !r.ok);
let text;
if (!opt.json) {
  const head = [];
  head.push('# #93 只读取证基线报告（docs/research/t93-baseline.mjs）');
  head.push('');
  head.push('mode            : ' + (opt.fixture ? 'fixture（离线自造）' : 'real-copy（真库只读副本）'));
  head.push('cli             : ' + CLI.slice(ROOT.length + 1).replace(/\\/g, '/'));
  head.push('cli sha256      : ' + sha256(CLI).slice(0, 32) + '…');
  head.push('node            : ' + process.version);
  if (sourceInfo) {
    head.push('source dir      : ' + sourceInfo.dir);
    head.push('source sha256   : ' + sourceInfo.before.sha256);
    head.push('source size     : ' + sourceInfo.before.size);
    head.push('source mtime    : ' + sourceInfo.before.mtime);
    head.push('photos          : ' + (photosInfo.dir ?? '（无）') + (photosInfo.copied ? '（已复制 ' + photosInfo.files + ' 文件 / ' + photosInfo.bytes + 'B）' : '（未复制，只做存在性检查）'));
  } else {
    head.push('source          : ' + seedNote);
    head.push('photos          : fixture 自造 1 张');
  }
  head.push('');
  head.push('== 历史日期（stat 形 · calorie.view.home）==');
  head.push('date        exit shape calorieGoal waterGoal intakeCal entryCount deficitToday streakDays loggedDays');
  for (const r of dateRows) {
    head.push([
      r.date, r.exit, fmt(r.shape), fmt(r.m.calorieGoal), fmt(r.m.waterGoal), fmt(r.m.intakeCal),
      fmt(r.m.entryCount), fmt(r.m.deficitToday), fmt(r.m.streakDays), fmt(r.m.loggedDays),
    ].join('  '));
  }
  head.push('');
  head.push('== 六形取样（每形一条最小命令）==');
  head.push('shape     exit key                     params                                        关键字段');
  for (const s of shapeRows) {
    head.push([s.shape.padEnd(9), String(s.exit).padEnd(4), s.key.padEnd(23), (s.params ?? '—').padEnd(45), s.got].join(' '));
  }
  head.push('');
  head.push('== 票面归属澄清（可复现事实）==');
  head.push('技能侧证据即可            : --html 渲染 exit=0 · ' + Buffer.byteLength(htmlText, 'utf8') + 'B · <section data-skill="calorie" 开头（无面板参与）');
  head.push('今日窗口（' + todayIso + '）        : ' + todayFact + ' ← 历史日期不受其影响（见上表）');
  head.push('');
  head.push('== 零风险自证 ==');
  head.push('源库写操作计数             : 0（读键 SKILLS_DB_PATH 全程指向 %TEMP% 副本）');
  head.push('只读副本 sha256 前后       : ' + (roBefore.sha256 === roAfter.sha256
    ? '相等' + (sourceInfo ? '（' + roBefore.sha256.slice(0, 20) + '…）' : '（fixture 库每次自造，值不固定）')
    : '不等 ← FAIL'));
  if (sourceInfo) {
    const srcNow = probe(sourceInfo.file);
    head.push('源库 sha256 前后           : ' + (srcNow.sha256 === sourceInfo.before.sha256 ? '相等（' + srcNow.sha256.slice(0, 20) + '…）' : '不等 ← FAIL'));
    head.push('源库 mtime 前后            : ' + (srcNow.mtimeMs === sourceInfo.before.mtimeMs ? sourceInfo.before.mtime + '（未变）' : srcNow.mtime + ' ← FAIL'));
  }
  head.push('写键取样库 sha256 前后     : ' + (wrBefore.sha256 !== wrAfter.sha256 ? '不等（灵敏度对照：写键确实改库，哈希探针有效）' : '相等 ← FAIL'));
  head.push('');
  head.push('== 断言汇总 ==');
  head.push('通过 ' + (results.length - failedChecks.length) + ' / ' + results.length + (failedChecks.length ? ' · FAIL ' + failedChecks.length : ''));
  for (const f of failedChecks) head.push('FAIL ' + f.label + ' · ' + f.detail);
  head.push('');
  head.push('结论：' + (failedChecks.length === 0 ? '全绿 —— 该基线可复跑、只读、零风险。' : '有失败项，见上。'));
  for (const l of head) push(l);
  text = report.join('\n') + '\n';
} else {
  text = JSON.stringify({
    mode: opt.fixture ? 'fixture' : 'real-copy',
    cli: CLI.slice(ROOT.length + 1).replace(/\\/g, '/'),
    node: process.version,
    source: sourceInfo ? { dir: sourceInfo.dir, ...sourceInfo.before } : { fixture: true },
    dates: dateRows,
    shapes: shapeRows,
    ticketFacts: { htmlBytes: Buffer.byteLength(htmlText, 'utf8'), todayIso, todayExit: todayRun.exit },
    fallback: fallbackEvidence,
    readonly: {
      roBefore: roBefore.sha256, roAfter: roAfter.sha256,
      writeProbeBefore: wrBefore.sha256, writeProbeAfter: wrAfter.sha256,
      sourceWriteCount: 0,
    },
    checks: { total: results.length, failed: failedChecks.length, failedItems: failedChecks },
  }, null, 2) + '\n';
}

process.stdout.write(text);
if (opt.out) writeFileSync(opt.out, text, 'utf8');
if (!opt.keep) rmSync(workRoot, { recursive: true, force: true });
process.exit(failedChecks.length === 0 ? 0 : 1);
