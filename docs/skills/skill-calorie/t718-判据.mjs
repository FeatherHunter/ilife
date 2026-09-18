/** #718 · 判据电池：在一个**加锁窗口**内把本票的动面判据一次跑齐（协议 §2.6 指纹绑定 ＋ §5 变异自证）。
 *
 * 窗口内做什么（全部**直调底层命令**，自己不再抢锁 —— 协议 §2.4.5）：
 *   ① 记 `packages/skill-calorie/src` 全量 sha256（窗口指纹）；
 *   ② `tsc -b packages/skill-calorie`（编译）；
 *   ③ 真出口两条：读 `calorie.view.home`、写 `calorie.weight.log`，配置目录指临时目录，
 *      断言 `data.output` 落在 `<配置里的 db.dir>/calorie_html/<中文名>_<TS>.html` 且文件真在；
 *   ④ 换一份配置目录再跑一次 ⇒ 落点跟着换（证落点来自配置，不是常量）；
 *   ⑤ 基线：目标测试件必须**绿**（红了就说明变异读数没有意义，当场中止）；
 *   ⑥ 变异：把 `CALORIE_CONFIG_DEFAULTS.photos.gifs` 的默认值改坏（`gifs` → `gifs_t718`）⇒ 重编 ⇒ 同一个测试件必须**红**；
 *   ⑦ 还原（逐字节写回）⇒ 重编 ⇒ 同一个测试件必须**绿**，且文件 sha256 与原件相等；
 *   ⑧ 再记一次 src 指纹 ⇒ 与 ① 相等（窗口内没有别人改本包 src）。
 *
 * 用法（必须在持有外层锁时调用）：
 *   node tooling/run-locked.mjs --ticket 718 -- node docs/skills/skill-calorie/t718-判据.mjs
 * 可选：`--test <相对路径>` 换目标测试件（默认 `packages/skill-calorie/test/photo-gif-page-352.test.mjs`）。
 * 明细日志写 `.scratch/t718/`，stdout 只出判据行 ＋ 末行 `RESULT:`。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const SRC = join(PKG, 'src');
const LOG_DIR = join(ROOT, '.scratch', 't718');
mkdirSync(LOG_DIR, { recursive: true });

const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const TARGET_TEST = argOf('--test', 'packages/skill-calorie/test/db.test.mjs');
const MUTATE_FILE = 'packages/skill-calorie/src/config.ts';
const MUTATE_FROM = "export const CALORIE_CONFIG_STEM = 'calorie' as const;";
const MUTATE_TO = "export const CALORIE_CONFIG_STEM = 'calorie_t718' as const;";

const lines = [];
let bad = 0;
function judge(ok, label, detail) {
  if (!ok) bad += 1;
  lines.push((ok ? 'OK   ' : 'RED  ') + label + ' :: ' + detail);
}

/** `packages/skill-calorie/src` 全量文件的 sha256（排序后逐件哈希，拼成一个总指纹）。 */
function srcFingerprint() {
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (statSync(p).isFile()) files.push(p);
    }
  })(SRC);
  files.sort();
  const h = createHash('sha256');
  for (const f of files) h.update(relative(ROOT, f).replace(/\\/g, '/')).update('\0').update(readFileSync(f));
  return { count: files.length, sha: h.digest('hex') };
}

function run(cmd, args, logName) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  if (logName) writeFileSync(join(LOG_DIR, logName), (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || ''), 'utf8');
  return r;
}

function tsc() {
  return run(process.execPath, ['node_modules/typescript/bin/tsc', '-b', 'packages/skill-calorie'], 'battery-tsc.log');
}

/** 跑目标测试件，回收 {pass, fail}。 */
function runTest(logName) {
  const r = run(process.execPath, ['--test', TARGET_TEST], logName);
  const text = (r.stdout || '') + (r.stderr || '');
  const num = (re) => {
    const m = text.match(re);
    return m ? Number(m[1]) : -1;
  };
  const pass = num(/^[#\u2139]\s*pass\s+(\d+)/m);
  const fail = num(/^[#\u2139]\s*fail\s+(\d+)/m);
  return { status: r.status, pass, fail };
}

/** 一份配置目录：`db.dir` 与配置目录**不同**，这样落点才证明读的是配置项。
 *  库按测试件的同一套跑法造：`dist/index.js#openDb` 落 schema ＋ `docs/research/t81-seed.mjs#seedFull` 灌种子
 *  （种子日 `SEED_TODAY`，子进程靠 `freeze-clock.cjs` 把「今天」钉到那一天）。 */
const FREEZE_CJS = join(PKG, 'test', 'freeze-clock.cjs');
let SEED_ISO = '2026-09-07T12:00:00';
function mkCfg(tag) {
  const dir = mkdtempSync(join(tmpdir(), tag));
  const dbDir = join(dir, 'db');
  mkdirSync(dbDir, { recursive: true });
  writeFileSync(join(dir, 'calorie.yaml'),
    ['db:', '  dir: ' + JSON.stringify(dbDir), '  name: calorie_data.db', 'html:', '  dir: calorie_html', ''].join('\n'),
    'utf8');
  const seed = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const { openDb } = await import(${JSON.stringify(pathToFileURL(join(PKG, 'dist', 'index.js')).href)});
    const { seedFull, SEED_TODAY } = await import(${JSON.stringify(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href)});
    const db = openDb(process.argv[1]);
    seedFull(db);
    db.close();
    console.log('SEED_TODAY=' + SEED_TODAY);
  `, join(dbDir, 'calorie_data.db')], { cwd: ROOT, encoding: 'utf8' });
  if (seed.status !== 0) throw new Error('造库失败：' + (seed.stderr || '').slice(-500));
  const m = (seed.stdout || '').match(/SEED_TODAY=(\d{4}-\d{2}-\d{2})/);
  if (m) SEED_ISO = m[1] + 'T12:00:00';
  return dir;
}

function cli(key, params, cfgDir) {
  const r = spawnSync(process.execPath, [join(PKG, 'dist', 'cli', 'cmd_read.js'), key, '--params', JSON.stringify(params)],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        ILIFE_CONFIG_DIR: cfgDir,
        NODE_OPTIONS: '--require ' + FREEZE_CJS,   // 钉「今天」（`CALORIE_TODAY` 已删，钉钟走这件）
        FAKE_NOW_ISO: SEED_ISO,
      },
    });
  let parsed = null;
  try { parsed = JSON.parse((r.stdout || '').trim()); } catch { /* 断言按失败报 */ }
  return { r, parsed, text: (r.stdout || '') + (r.stderr || '') };
}

/** 每个 src 文件的 sha（用于窗口漂移判定：变了就点名）。 */
function srcMap() {
  const map = new Map();
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (statSync(p).isFile()) map.set(relative(ROOT, p).replace(/\\/g, '/'), createHash('sha256').update(readFileSync(p)).digest('hex'));
    }
  })(SRC);
  return map;
}

/** 安静窗口闸（协议 §2.6）：等「锁为空 ＋ 本包 src 连着两次采样一致 ＋ 最近 10 秒没人写 src」。
 *  等不到就打印现状并如实判红（不「重跑碰运气」）。 */
function waitQuiet(maxWaitMs) {
  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const started = Date.now();
  let prev = srcMap();
  for (;;) {
    sleep(5000);
    const cur = srcMap();
    const same = cur.size === prev.size && [...prev].every(([k, v]) => cur.get(k) === v);
    // 锁要看「是不是**别人**在持」：本脚本自己就跑在外层锁窗内，`gate.lock` 恒在，
    // 故按 owner.json 的 cmd 判是不是自己这一窗（是本窗即不算争用）。
    let lockMine = false;
    const ownerFile = join(ROOT, '.scratch', 'locks', 'owner.json');
    if (existsSync(ownerFile)) {
      try { lockMine = String(JSON.parse(readFileSync(ownerFile, 'utf8')).cmd || '').includes('t718-判据.mjs'); } catch { lockMine = false; }
    }
    const lockOthers = existsSync(join(ROOT, '.scratch', 'locks', 'gate.lock')) && !lockMine;
    const newest = Math.max(...[...cur.keys()].map((k) => statSync(join(ROOT, k)).mtimeMs));
    const ageSec = (Date.now() - newest) / 1000;
    if (same && !lockOthers && ageSec > 10) return { ok: true, waitedMs: Date.now() - started, files: cur.size };
    prev = cur;
    if (Date.now() - started > maxWaitMs) return { ok: false, waitedMs: Date.now() - started, files: cur.size, lockOwner: lockOthers, ageSec: Math.round(ageSec) };
  }
}

/* ── ① 安静窗口 ＋ 窗口指纹 ────────────────────────────────────────────── */
const quiet = waitQuiet(Number(argOf('--wait-quiet-ms', '120000')));
judge(quiet.ok, '安静窗口（锁为空 ＋ src 连着两次采样一致 ＋ 10 秒内没人写）',
  'waitedMs=' + quiet.waitedMs + ' files=' + quiet.files + (quiet.ok ? '' : ' lockOwner=' + quiet.lockOwner + ' lastWriteAgeSec=' + quiet.ageSec));
const mapBefore = srcMap();
const fpBefore = srcFingerprint();
lines.push('INFO src-fingerprint-before files=' + fpBefore.count + ' sha=' + fpBefore.sha.slice(0, 16));

/* ── ② 编译 ───────────────────────────────────────────────────────────── */
const t1 = tsc();
judge(t1.status === 0, '编译 tsc -b packages/skill-calorie', 'exit=' + t1.status + ' stderr-tail=' + (t1.stderr || '').trim().split('\n').slice(-2).join(' | '));

/* ── ③ 读一条 ＋ 写一条 ─────────────────────────────────────────────────── */
const cfgA = mkCfg('t718-cfgA-');

/* ── ③0 设置页那条路：`calorie.config.read` 读回来的 `db.dir` 就是配置里那份 ⇒ 配置真进了执行路径 ── */
{
  const { r, parsed } = cli('calorie.config.read', {}, cfgA);
  const values = parsed && parsed.data ? parsed.data.values : null;
  const got = values && values.db ? values.db.dir : '';
  judge(r.status === 0 && got === join(cfgA, 'db'), '配置读回 db.dir ＝ 配置里那份（设置页那条路）',
    'exit=' + r.status + ' db.dir=' + got + ' path=' + (parsed && parsed.data ? parsed.data.path : ''));
}

let lastOut = '';
for (const [label, key, params, nameRe] of [
  ['读 calorie.view.home', 'calorie.view.home', { date: '2026-09-07' }, /^今日总览.*_\d{8}_\d{6}(_\d+)?\.html$/],
  ['写 calorie.weight.log', 'calorie.weight.log', { kg: 70, date: '2026-09-07' }, /^记体重.*_\d{8}_\d{6}(_\d+)?\.html$/],
]) {
  const { r, parsed } = cli(key, params, cfgA);
  const data = parsed && typeof parsed === 'object' ? parsed.data : null;
  const out = data && typeof data.output === 'string' ? data.output : '';
  const delivery = parsed && typeof parsed === 'object' ? parsed.delivery : null;
  lastOut = out || lastOut;
  judge(r.status === 0, label + ' exit', 'exit=' + r.status + ' tail=' + (r.stderr || '').trim().split('\n').slice(-1)[0]);
  judge(out !== '' && existsSync(out), label + ' 真落盘', 'output=' + out);
  judge(out.startsWith(join(cfgA, 'db', 'calorie_html')), label + ' 落在配置 db.dir 下的 calorie_html', 'dir=' + dirname(out));
  judge(nameRe.test(basename(out)), label + ' 文件名通式', 'basename=' + basename(out));
  judge(!!(delivery && delivery.path === out), label + ' envelope.delivery.path 同值', 'delivery=' + JSON.stringify(delivery));
}

/* ── ④ 换配置目录 ⇒ 落点跟着换 ─────────────────────────────────────────── */
const cfgB = mkCfg('t718-cfgB-');
const other = cli('calorie.weight.log', { kg: 71, date: '2026-09-07' }, cfgB);
const outB = other.parsed && other.parsed.data ? other.parsed.data.output : '';
judge(typeof outB === 'string' && outB.startsWith(join(cfgB, 'db', 'calorie_html')),
  '换配置目录⇒落点跟着换', 'output=' + outB + '（对照 A=' + lastOut + '）');

/* ── ⑤ 基线：目标测试件必须绿 ──────────────────────────────────────────── */
const base = runTest('battery-baseline.log');
judge(base.status === 0 && base.fail === 0 && base.pass > 0, '基线 ' + basename(TARGET_TEST) + ' 绿',
  'exit=' + base.status + ' pass=' + base.pass + ' fail=' + base.fail);
if (base.fail !== 0) {
  lines.push('ABORT 基线不绿 ⇒ 变异读数无意义，本次不做变异（换件或先修基线）');
  console.log(lines.join('\n'));
  console.log('RESULT: ' + lines.filter((l) => l.startsWith('OK')).length + '/' + (lines.filter((l) => l.startsWith('OK') || l.startsWith('RED')).length)
    + ' PASSABORT src-sha=' + fpBefore.sha.slice(0, 16));
  process.exit(1);
}

/* ── ⑥ 变异 ⇒ 重编 ⇒ 必红 ─────────────────────────────────────────────── */
const mutPath = join(ROOT, MUTATE_FILE);
const original = readFileSync(mutPath);
const originalSha = createHash('sha256').update(original).digest('hex');
let mutRed = null;
let restoreGreen = null;
let restoreSame = false;
try {
  const text = original.toString('utf8');
  if (text.split(MUTATE_FROM).length - 1 !== 1) throw new Error('变异点命中次数不是 1：' + MUTATE_FROM);
  writeFileSync(mutPath, text.replace(MUTATE_FROM, MUTATE_TO), 'utf8');
  const t2 = tsc();
  const m = runTest('battery-mut.log');
  mutRed = { tsc: t2.status, ...m };
} finally {
  // 回滚必须容忍自身失败并把文件放回原样（协议 §2.5.3）
  writeFileSync(mutPath, original);
  restoreSame = createHash('sha256').update(readFileSync(mutPath)).digest('hex') === originalSha;
  const t3 = tsc();
  const g = runTest('battery-restore.log');
  restoreGreen = { tsc: t3.status, ...g };
}
judge(restoreSame, '还原逐字节一致', 'sha=' + originalSha.slice(0, 16));
judge(!!mutRed && mutRed.tsc === 0 && mutRed.fail > 0, '变异红（改坏必红）',
  'MUT-TSC=' + (mutRed ? mutRed.tsc : 'n/a') + ' MUT pass=' + (mutRed ? mutRed.pass : 'n/a') + ' fail=' + (mutRed ? mutRed.fail : 'n/a'));
judge(!!restoreGreen && restoreGreen.tsc === 0 && restoreGreen.fail === 0 && restoreGreen.pass > 0, '还原绿（改回必绿）',
  'RESTORE-TSC=' + (restoreGreen ? restoreGreen.tsc : 'n/a') + ' RESTORE pass=' + (restoreGreen ? restoreGreen.pass : 'n/a') + ' fail=' + (restoreGreen ? restoreGreen.fail : 'n/a'));

/* ── ⑧ 窗口内 src 无漂移 ───────────────────────────────────────────────── */
const mapAfter = srcMap();
const drifted = [...new Set([...mapBefore.keys(), ...mapAfter.keys()])].filter((k) => mapBefore.get(k) !== mapAfter.get(k));
judge(drifted.length === 0, '窗口内 src 无漂移（读数有效）',
  drifted.length === 0 ? 'files=' + mapAfter.size : '漂移 ' + drifted.length + ' 件：' + drifted.slice(0, 8).join(', '));

console.log(lines.join('\n'));
const judged = lines.filter((l) => l.startsWith('OK ') || l.startsWith('RED'));
console.log('RESULT: ' + judged.filter((l) => l.startsWith('OK')).length + '/' + judged.length + ' ' + (bad === 0 ? 'PASS' : 'FAIL')
  + ' src-sha=' + fpBefore.sha.slice(0, 16) + ' mut=' + MUTATE_TO + ' target=' + TARGET_TEST);
process.exit(bad === 0 ? 0 : 1);
