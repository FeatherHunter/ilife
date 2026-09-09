/** #83 蓝队独立探针（审查席 · 不复用实施者/红队脚本的任何断言）。
 *
 *  设计目标：专打既有两份脚本（`docs/research/t83-evidence.mjs` 21 例、`docs/research/t83-review-red.mjs` 33 例）
 *  的盲区——「脚本自我满足」：
 *   B1 `--html` legacy 别名（两份脚本都只用 `--output`）＋ 相对路径
 *   B2 显式 `--output` 落在**只读目录**（既有只覆盖默认目录只读）
 *   B3 ③ 文本态 ＋ `--output` 组合（落点/同值/字节）
 *   B4 写键 ＋ `delivery:"text"`（含参数白名单键 → 是否 exit 2）＋ 只读句柄回读库
 *   B5 `calorie.help.lookup` 空 `q` / 缺 `q`（③「无对应模板」结构缝的真机可达性）
 *   B6 1 MB 产物内联：stdout 体积与行数（P9 在 ② 态下的实际形状）
 *   B7 `mode:"text"` ＋ 相对 SKILLS_DB_PATH（R-1 之后 data.output 与 delivery.path 一致性）
 *   B8 全 99 键注入覆盖扫描：exit 0 ⇒ delivery 合法（读键／写键）＋ P9 ＋ template 与**实际产物结构**一致
 *   B9 R-1 归一化的**恒等性**：绝对／扩展长度前缀／驱动器相对／默认 四类输入的落点与命名不变
 *   B10 delivery 契约单元观测（template 结构判定的误判面）
 *
 *  运行（须经持锁包装器）：`node tooling/run-locked.mjs --ticket 83 -- node docs/research/t83-review-blue.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve as presolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = presolve(HERE, '..', '..');
const dist = (p) => pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', p)).href;
const { openDb } = await import(dist('index.js'));
const { CALORIE_COMBOS, isCalorieWriteKey } = await import(dist('cli/keys.js'));
const { deliverHtml, resolveDefaultHtmlPath } = await import(dist('output.js'));
const { buildDelivery, deliveryTemplateOf } = await import(dist('render/envelope.js'));

const BIN = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const ENVELOPE_FIELDS = ['version', 'skill', 'shape', 'key', 'data', 'delivery'];
const MODES = ['file', 'inline', 'text'];
const TEMPLATES = ['help-shell', 'doc-shell', 'receipt', 'fragment', 'text'];

let pass = 0; let fail = 0;
const fails = [];
function check(id, cond, detail) {
  if (cond) { pass += 1; console.log('PROBE ' + id + ' PASS ' + (detail ?? '')); } else {
    fail += 1; fails.push(id + ' :: ' + (detail ?? '')); console.log('PROBE ' + id + ' **FAIL** ' + (detail ?? ''));
  }
}
/** 只记录观测值、不计入 PASS/FAIL（用于「如实标注」类事实）。 */
function obs(id, detail) { console.log('OBS ' + id + ' ' + detail); }

/* ── 环境 ───────────────────────────────────────────────────────────────── */
const cleanups = [];
process.on('exit', () => { for (const fn of cleanups.reverse()) { try { fn(); } catch { /* 尽力 */ } } });
/** §2.1.3 路径守卫：只允许删「本脚本自己的临时根」，绝不允许碰仓库路径。 */
const TMP_ROOT = presolve(tmpdir());
function safeRm(p) {
  const a = presolve(p);
  const inTmp = a !== TMP_ROOT && a.startsWith(TMP_ROOT + '\\');
  const inDriveTmp = a.startsWith('D:\\t83b-tmp');
  const inRepo = a.startsWith(ROOT + '\\');
  const forbidden = /[\\/](packages|docs|test|tooling|node_modules|\.git)([\\/]|$)/.test(a);
  if ((!inTmp && !inDriveTmp) || inRepo || forbidden) throw new Error('路径守卫拒绝删除：' + a);
  rmSync(a, { recursive: true, force: true });
}

function seedDb(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 50, 2000)').run();
  const meals = [
    ['2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2],
    ['2026-09-06', '12:30:00', '米饭', 200, 500, 10, 80, 5],
    ['2026-09-07', '19:00:00', '鸡胸', 150, 200, 35, 2, 4],
  ];
  for (const [d, t, n, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, n, g, cal, p, cb, f);
  }
  db.prepare("INSERT OR REPLACE INTO weight_log (date, weight_kg) VALUES ('2026-09-05', 70.5)").run();
  db.prepare("INSERT OR REPLACE INTO weight_log (date, weight_kg) VALUES ('2026-09-07', 70.0)").run();
}
function mkDb(tag, seed = false) {
  const dir = mkdtempSync(join(tmpdir(), 't83b-' + tag + '-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (seed) seedDb(db);
  db.close();
  return dir;
}
function run(dir, key, params, extra = [], cwd = undefined) {
  const args = [key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  args.push(...extra);
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd: cwd ?? dir,
    env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}
function runOk(dir, key, params, extra = [], cwd = undefined) {
  const r = run(dir, key, params, extra, cwd);
  assert.equal(r.status, 0, key + ' 须 exit 0，实得 ' + r.status + ' stderr=' + r.stderr.slice(-500));
  assert.ok(r.env, 'stdout 须为一行 JSON，实得 ' + JSON.stringify(r.stdout.slice(0, 200)));
  return r;
}
function makeDirReadOnly(dir) {
  if (process.platform === 'win32') {
    const r = spawnSync('icacls', [dir, '/deny', '*S-1-1-0:(W,AD,WD)'], { encoding: 'utf8' });
    if (r.status !== 0) return null;
    return () => spawnSync('icacls', [dir, '/remove:d', '*S-1-1-0'], { encoding: 'utf8' });
  }
  return null;
}
function canStillWrite(dir) {
  const probe = join(dir, '.t83b-probe');
  try { writeFileSync(probe, 'x'); safeRm(probe); return true; } catch { return false; }
}

/* ── B1 `--html` legacy 别名（相对路径） ──────────────────────────────────── */
{
  const dir = mkDb('html-alias');
  const r = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' }, ['--html', join('nested', 'alias.html')]);
  const want = join(dir, 'nested', 'alias.html');
  check('B1a', r.env.delivery.mode === 'file', 'mode=' + r.env.delivery.mode);
  check('B1b', isAbsolute(r.env.delivery.path), 'path=' + r.env.delivery.path);
  check('B1c', r.env.delivery.path === want, '回传 ' + r.env.delivery.path + ' ≠ 期望 ' + want);
  check('B1d', r.env.data.output === r.env.delivery.path, 'data.output 与 delivery.path 不同值');
  check('B1e', existsSync(want) && statSync(want).size === r.env.delivery.bytes, '--html 落点存在且 bytes 相符');
  check('B1f', r.stdout.trim().split('\n').length === 1, 'P9 一行');
  safeRm(dir);
}

/* ── B2 显式 `--output` 落在只读目录 ─────────────────────────────────────── */
{
  const dir = mkDb('ro-explicit');
  const base = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' });
  const baseline = readFileSync(base.env.data.output, 'utf8');
  const ro = join(dir, 'ro-out');
  mkdirSync(ro, { recursive: true });
  const restore = makeDirReadOnly(ro);
  if (restore === null || canStillWrite(ro)) { check('B2', true, 'SKIP（本环境无法模拟只读目录）'); } else {
    cleanups.push(restore);
    const r = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' }, ['--output', join(ro, 'x.html')]);
    check('B2a', r.env.delivery.mode === 'inline', 'mode=' + r.env.delivery.mode);
    check('B2b', r.env.delivery.path === undefined, 'path=' + String(r.env.delivery.path));
    check('B2c', r.env.data.output === undefined, 'data.output 仍存在=' + String(r.env.data.output));
    check('B2d', r.env.data.html === baseline, '内联产物与文件态逐字相同');
    check('B2e', r.env.delivery.bytes === Buffer.byteLength(r.env.data.html, 'utf8'), 'bytes 一致');
    check('B2f', !('reason' in r.env.delivery), 'delivery.reason 未透出（记账：' + JSON.stringify(Object.keys(r.env.delivery)) + '）');
    restore();
  }
  safeRm(dir);
}

/* ── B3 ③ 文本态 ＋ `--output` ───────────────────────────────────────────── */
{
  const dir = mkDb('text-out');
  const r = runOk(dir, 'calorie.help.center', { mode: 'text' }, ['--output', join('t3', 'help.txt')]);
  const want = join(dir, 't3', 'help.txt');
  check('B3a', r.env.delivery.mode === 'text' && r.env.delivery.template === 'text', JSON.stringify(r.env.delivery));
  check('B3b', r.env.delivery.path === want && r.env.data.output === want, 'path=' + r.env.delivery.path + ' output=' + r.env.data.output);
  check('B3c', readFileSync(want, 'utf8') === r.env.data.text, '落盘文本 ＝ data.text');
  check('B3d', r.env.delivery.bytes === statSync(want).size, 'bytes=' + r.env.delivery.bytes + ' size=' + statSync(want).size);
  check('B3e', !/<(section|div|style|script)\b/.test(r.env.data.text), '文本零标签');
  safeRm(dir);
}

/* ── B4 写键 ＋ delivery:"text" ──────────────────────────────────────────── */
{
  const dir = mkDb('write-text');
  const r = runOk(dir, 'calorie.water.log', { ml: 250, delivery: 'text' });
  check('B4a', r.env.delivery.mode === 'text' && r.env.delivery.template === 'text', JSON.stringify(r.env.delivery));
  check('B4b', r.env.delivery.path === undefined && !('output' in r.env.data), '写键文本态不落盘');
  check('B4c', typeof r.env.data.text === 'string' && r.env.data.text.length > 0, 'data.text 非空');
  const db = new DatabaseSync(join(dir, DB_FILENAME), { readOnly: true });
  const rows = db.prepare('SELECT COUNT(*) AS n FROM food_log WHERE food_name = ?').get('💧水');
  const grams = db.prepare('SELECT grams FROM food_log WHERE food_name = ?').get('💧水');
  db.close();
  check('B4d', Number(rows.n) === 1 && Number(grams.grams) === 250,
    '库真实落库 n=' + String(rows.n) + ' grams=' + String(grams.grams) + '（不信回执自报）');
  const t = run(dir, 'calorie.exercise.update', { id: 1, calories: 10, delivery: 'text' });
  obs('B4e', 'calorie.exercise.update ＋ delivery:text → exit ' + t.status + ' stderr=' + String(t.stderr).slice(0, 140).trim());
  check('B4f', t.status === 2 || t.status === 0, '参数白名单键行为可解释（exit ' + t.status + '）');
  safeRm(dir);
}

/* ── B5 「无对应模板」结构缝的真机可达性 ─────────────────────────────────── */
{
  const dir = mkDb('empty-q');
  const empty = run(dir, 'calorie.help.lookup', { q: '' });
  const missing = run(dir, 'calorie.help.lookup', {});
  const blank = run(dir, 'calorie.help.lookup', { q: '   ' });
  obs('B5', 'emptyQ exit=' + empty.status + ' mode=' + String(empty.env?.delivery?.mode)
    + ' | missingQ exit=' + missing.status + ' | blankQ exit=' + blank.status + ' mode=' + String(blank.env?.delivery?.mode));
  check('B5a', empty.env === null || empty.env.delivery.mode !== 'text' || (empty.env.data.html ?? '') !== '',
    '空 q 不得走「无产物」分支（status=' + empty.status + '）');
  check('B5b', missing.status === 2 && missing.stdout === '', '缺 q → exit 2 ＋ stdout 空（实得 ' + missing.status + '）');
  safeRm(dir);
}

/* ── B6 1 MB 产物内联：stdout 体积与行数 ─────────────────────────────────── */
{
  const dir = mkDb('big-inline', true);
  const fileRun = runOk(dir, 'calorie.help.center', undefined);
  const htmlDir = join(dir, 'calorie_html');
  // 只读目录下「新建」文件才受目录 ACL 约束，**覆盖同名旧文件**仍成功（红队 R6 同一陷阱）→ 先清空基线。
  for (const f of readdirSync(htmlDir)) safeRm(join(htmlDir, f));
  const restore = makeDirReadOnly(htmlDir);
  if (restore === null || canStillWrite(htmlDir)) { check('B6', true, 'SKIP（只读模拟不可用）'); } else {
    cleanups.push(restore);
    const r = runOk(dir, 'calorie.help.center', undefined);
    const bytes = Buffer.byteLength(r.stdout, 'utf8');
    check('B6a', r.env.delivery.mode === 'inline' && r.env.delivery.template === 'help-shell', JSON.stringify(r.env.delivery));
    check('B6b', r.stdout.trim().split('\n').length === 1, 'P9：1 MB 内联仍恰一行');
    check('B6c', bytes > 1_000_000 && bytes < 1_400_000, 'stdout ' + bytes + ' B（file 态产物 ' + fileRun.env.delivery.bytes + ' B）');
    check('B6d', r.env.delivery.bytes === Buffer.byteLength(r.env.data.html, 'utf8'), 'bytes ＝ data.html 字节数');
    restore();
  }
  safeRm(dir);
}

/* ── B11 mode=inline（页面形态）与 delivery.mode 的命名歧义 ───────────────── */
{
  const dir = mkDb('mode-inline', true);
  const r = runOk(dir, 'calorie.help.center', { mode: 'inline' });
  obs('B11', 'mode:"inline"（页面形态）→ delivery=' + JSON.stringify(r.env.delivery) + ' data.bytes=' + String(r.env.data.bytes));
  check('B11a', r.env.delivery.mode === 'file', '页面形态 inline ≠ 交付通道 inline（可写盘时仍为 file）');
  safeRm(dir);
}

/* ── B12/B13 同一键两条「文本」来源 ──────────────────────────────────────── */
{
  const dir = mkDb('text-two', true);
  const byMode = runOk(dir, 'calorie.help.center', { mode: 'text' });
  const byDelivery = runOk(dir, 'calorie.help.center', { delivery: 'text' });
  const byBoth = runOk(dir, 'calorie.help.center', { mode: 'file', delivery: 'text' });
  obs('B12', 'mode:text bytes=' + byMode.env.delivery.bytes + ' | delivery:text bytes=' + byDelivery.env.delivery.bytes
    + ' | mode:file+delivery:text bytes=' + byBoth.env.delivery.bytes);
  check('B12a', byDelivery.env.delivery.mode === 'text' && byDelivery.env.delivery.path === undefined, 'delivery:text 不落盘');
  check('B12b', byBoth.env.delivery.mode === 'text' && byBoth.env.delivery.path === undefined && !('output' in byBoth.env.data),
    'mode:file＋delivery:text → 文本态覆盖页面形态（无落盘）');
  check('B12c', byMode.env.data.text !== byDelivery.env.data.text, '两条文本来源内容不同（结构缝，记账）');
  safeRm(dir);
}

/* ── B7 mode=text ＋ 相对 SKILLS_DB_PATH ─────────────────────────────────── */
{
  const dir = mkDb('text-rel');
  const r = runOk(dir, 'calorie.help.center', { mode: 'text' }, [], dir);
  check('B7a', isAbsolute(r.env.delivery.path) && r.env.delivery.path === r.env.data.output, 'path=' + r.env.delivery.path);
  check('B7b', /_20\d{6}_\d{6}(_\d+)?\.html$/.test(basename(r.env.delivery.path)), '命名沿用 #87：' + basename(r.env.delivery.path));
  safeRm(dir);
}

/* ── B8 全键注入覆盖扫描 ─────────────────────────────────────────────────── */
{
  const dir = mkDb('sweep', true);
  const keys = Object.keys(CALORIE_COMBOS);
  const writeParams = {
    'calorie.water.log': { ml: 300 },
    'calorie.weight.log': { kg: 70.1 },
    'calorie.diet.add': { foodName: '蓝队探针餐', grams: 100, calories: 120 },
    'calorie.exercise.add': { type: '跑步', minutes: 20 },
    'calorie.product.add': { productName: '蓝队探针食品', calories: 100, unit: 'g' },
    'calorie.goal.set': { calorieGoal: 1800 },
  };
  let ok = 0; let nonzero = 0; let noDelivery = 0; let bad = 0; let tplMismatch = 0; const detail = [];
  const shapes = new Map();
  for (const key of keys) {
    const params = isCalorieWriteKey(key) ? (writeParams[key] ?? undefined) : undefined;
    const r = run(dir, key, params);
    if (r.status !== 0) {
      nonzero += 1;
      if (r.stdout !== '') { bad += 1; detail.push('NONZERO-STDOUT ' + key); }
      continue;
    }
    ok += 1;
    const env = r.env;
    if (!env || !env.delivery) { noDelivery += 1; detail.push('NO-DELIVERY ' + key); continue; }
    if (!MODES.includes(env.delivery.mode) || !TEMPLATES.includes(env.delivery.template)) { bad += 1; detail.push('BAD-MODE ' + key); }
    if (r.stdout.trim().split('\n').length !== 1) { bad += 1; detail.push('P9 ' + key); }
    shapes.set(env.shape + '/' + env.delivery.template, (shapes.get(env.shape + '/' + env.delivery.template) ?? 0) + 1);
    if (env.delivery.mode === 'file') {
      if (!isAbsolute(env.delivery.path) || env.delivery.path !== env.data.output) { bad += 1; detail.push('PATH ' + key); }
      else if (!existsSync(env.delivery.path)) { bad += 1; detail.push('MISSING ' + key); }
      else {
        const raw = readFileSync(env.delivery.path);
        if (raw.length !== env.delivery.bytes) { bad += 1; detail.push('BYTES ' + key); }
        const s = raw.toString('utf8');
        const expect = s.includes('id="ilife-help-shell"') ? 'help-shell'
          : /^\s*<!DOCTYPE/i.test(s) ? 'doc-shell' : (env.shape === 'receipt' ? 'receipt' : 'fragment');
        if (expect !== env.delivery.template) { tplMismatch += 1; detail.push('TPL ' + key + ' expect=' + expect + ' got=' + env.delivery.template); }
      }
    } else if (env.delivery.mode === 'text') {
      if (typeof env.data.text !== 'string' || env.data.text.length === 0) { bad += 1; detail.push('TEXT-EMPTY ' + key); }
    }
  }
  console.log('B8-SWEEP keys=' + keys.length + ' exit0=' + ok + ' nonzero=' + nonzero + ' noDelivery=' + noDelivery
    + ' bad=' + bad + ' tplMismatch=' + tplMismatch);
  console.log('B8-SHAPES ' + JSON.stringify([...shapes.entries()].sort()));
  if (detail.length) console.log('B8-DETAIL ' + detail.slice(0, 24).join(' | '));
  check('B8a', noDelivery === 0, 'exit 0 却无 delivery：' + noDelivery);
  check('B8b', bad === 0, '不变量违规：' + bad + ' ' + detail.slice(0, 6).join(' | '));
  check('B8c', tplMismatch === 0, 'template 与实际产物结构不一致：' + tplMismatch + ' ' + detail.filter((d) => d.startsWith('TPL')).slice(0, 6).join(' | '));
  check('B8d', ok >= 30, 'exit 0 覆盖键数 ' + ok + '（其余 ' + nonzero + ' 键需参数/缺数据，未达交付阶段）');
  safeRm(dir);
}

/* ── B9 R-1 归一化的恒等性（落点/命名不变） ───────────────────────────────── */
{
  const dir = mkDb('identity');
  const html = '<section class="ilife-page">probe</section>';
  const abs = join(dir, 'abs.html');
  const d1 = deliverHtml({ key: 'calorie.help.lookup', params: {}, explicit: abs, html });
  check('B9a', d1.mode === 'file' && d1.path === abs, '绝对落点恒等：' + String(d1.path));
  const ext = '\\\\?\\' + abs;
  const d2 = deliverHtml({ key: 'calorie.help.lookup', params: {}, explicit: ext, html });
  check('B9b', d2.mode === 'file' && d2.path === ext, '扩展长度前缀落点恒等：' + String(d2.path) + ' mode=' + d2.mode);
  check('B9c', existsSync(abs), '扩展长度前缀写入的就是请求的那个文件');
  const cwd0 = process.cwd();
  const dRoot = mkdtempSync('D:\\t83b-tmp-');
  cleanups.push(() => { try { process.chdir(cwd0); } catch { /* 尽力 */ } safeRm(dRoot); });
  try {
    process.chdir(dRoot); // D 盘独占临时目录：驱动器相对路径据此解析（跨盘 cwd 语义）
    const d3 = deliverHtml({ key: 'calorie.help.lookup', params: {}, explicit: 'D:identity.html', html });
    check('B9d', d3.mode === 'file' && isAbsolute(d3.path) && d3.path === join(dRoot, 'identity.html'),
      '驱动器相对 → 绝对且落点＝请求处：' + String(d3.path));
    check('B9g', existsSync(d3.path), '驱动器相对产物真实存在：' + String(d3.path));
  } finally {
    process.chdir(cwd0);
  }
  const now = new Date();
  const def = resolveDefaultHtmlPath('calorie.help.lookup', { params: {}, dbDir: dir, now });
  const prevEnv = process.env['SKILLS_DB_PATH'];
  process.env['SKILLS_DB_PATH'] = dir; // 进程内调用须与子进程同口径（否则 resolveDbDir 走别的默认目录）
  let d4;
  try {
    d4 = deliverHtml({ key: 'calorie.help.lookup', params: {}, html, now });
  } finally {
    if (prevEnv === undefined) delete process.env['SKILLS_DB_PATH']; else process.env['SKILLS_DB_PATH'] = prevEnv;
  }
  check('B9e', d4.mode === 'file' && basename(d4.path) === basename(def) && dirname(d4.path) === dirname(def),
    '默认落点不变：' + d4.path + ' / 期望 ' + def);
  check('B9f', presolve(def) === def, '默认落点本身已绝对：' + def);
  safeRm(dir);
}

/* ── B10 delivery 契约单元（独立复算，不看既有测试） ─────────────────────── */
{
  check('B10a', JSON.stringify(ENVELOPE_FIELDS) === JSON.stringify(['version', 'skill', 'shape', 'key', 'data', 'delivery']), '顶层字段序');
  obs('B10b', 'receipt 形全文档被判＝' + deliveryTemplateOf('receipt', '<!DOCTYPE html><section>x</section>')
    + '（结构判定先看 DOCTYPE、后看 shape → receipt 语义可被吞）');
  let threw = false;
  try { buildDelivery({ mode: 'file', shape: 'stat', path: 'rel.html', html: '<p>' }); } catch { threw = true; }
  check('B10c', threw, 'delivery.path 绝对不变量仍在');
  check('B10d', deliveryTemplateOf('stat', '<section>x</section>') === 'fragment', 'fragment 判定');
  check('B10e', deliveryTemplateOf('stat', '') === 'text', '空产物 → text');
  obs('B10f', 'receipt 形片段判定＝' + deliveryTemplateOf('receipt', '<section class="ilife-page"></section>'));
}

/* ── B14 回执覆盖面：exit 4／2 是否也发回执（旧铁则字面「退出码非 0」） ────── */
{
  const dir = mkDb('receipt-scope');
  const cases = [
    ['exit4-空数据', 'calorie.history', { days: 3 }],
    ['exit2-空q', 'calorie.help.lookup', { q: '' }],
    ['exit2-非法mode', 'calorie.help.center', { mode: 'nope' }],
    ['exit5-落点结构错', 'calorie.help.lookup', { q: '看今日主页' }],
  ];
  const seen = [];
  for (const [tag, key, params] of cases) {
    if (tag.startsWith('exit5')) writeFileSync(join(dir, 'calorie_html'), 'blocker');
    const r = run(dir, key, params);
    const receiptLines = String(r.stderr).split('\n').filter((l) => l.startsWith('RECEIPT ')).length;
    seen.push(tag + ' exit=' + r.status + ' stdout=' + r.stdout.length + 'B receiptLines=' + receiptLines);
    check('B14-' + tag, r.stdout === '', '失败态 stdout 必须纯净：' + r.stdout.length + 'B');
    if (tag.startsWith('exit5')) check('B14-receipt-on-5', receiptLines === 1, 'exit 5 恰一行 RECEIPT');
    else obs('B14-' + tag + '-no-receipt', 'exit ' + r.status + ' 无回执（receiptLines=' + receiptLines + '）');
  }
  obs('B14', seen.join(' | '));
  safeRm(dir);
}

/* ── B15 回执「落盘态不重复回传正文」：既有断言是否空洞 ───────────────────── */
{
  const dir = mkDb('receipt-file');
  writeFileSync(join(dir, 'blocker'), 'x');
  const bad = join(dir, 'blocker', 'x.html'); // 父路径是文件 → 结构错（非只读类）→ 回执落默认目录
  const r = run(dir, 'calorie.help.lookup', { q: '看今日主页' }, ['--output', bad]);
  const line = String(r.stderr).split('\n').find((l) => l.startsWith('RECEIPT '));
  const rec = line ? JSON.parse(line.slice('RECEIPT '.length)) : null;
  obs('B15', 'exit=' + r.status + ' delivery.mode=' + String(rec?.delivery?.mode) + ' recHasHtml=' + (rec !== null && 'html' in rec));
  check('B15a', r.status === 5 && rec !== null && rec.delivery.mode === 'file', '落盘态回执');
  check('B15b', rec !== null && !('html' in rec), '落盘态不回传正文（独立证明；delivery-83 该断言为恒真式）');
  safeRm(dir);
}

console.log('RESULT-BLUE: ' + pass + '/' + (pass + fail) + ' PASS' + (fail ? '  FAILS: ' + fails.join(' ; ') : ''));
process.exit(fail === 0 ? 0 : 1);
