/** #83 · 红队独立探针（不依赖实施者证据脚本，自建断言）。
 *
 * 目的：独立复核三态交付 ＋ 渲染失败回执，并钉住红队 S1（相对落点）的返修。
 * 运行（协议 §2.4，单锁）：
 *   node tooling/run-locked.mjs --ticket 83 -- node docs/research/t83-review-red.mjs
 *
 * 探针（每条独立起真机子进程，断言失败即 FAIL，不短路）：
 *   R1 相对 `SKILLS_DB_PATH`（子进程 cwd 设进 tmp，DB 路径给 `.`）→ exit 0 ＋ `delivery.mode=file`
 *      ＋ `delivery.path` 绝对 ＋ `data.output` 同值 ＋ 产物真实存在（**返修前必红：exit 2**）
 *   R2 相对 `--output` → 同上（回传路径＝实际写入路径）
 *   R3 相对 `SKILLS_DB_PATH` ＋ **写键**：exit 0 ＋ 库内记录真的写入（读回计数）——写成功不得报失败
 *   R4 绝对落点对照组：`delivery.path === data.output === --output` 逐字相等（确认 R1/R2 的修复
 *      没有改变既有绝对路径行为）
 *   R5 `delivery.path` 绝对不变量本身仍然生效（`buildDelivery` 传相对路径仍抛 `bad-input`）——
 *      证明 R-1 是在**落点归一化**处修的，而不是把不变量拆了
 *   R6 只读目录 → ② 内联态：exit 0 ＋ `mode=inline` ＋ 无 `path`/`data.output` ＋ `data.html` 非空
 *   R7 结构错落点 → 渲染失败回执：exit 5 ＋ stdout 空 ＋ stderr 一行 `RECEIPT` ＋ `delivery.template=receipt`
 *   R8 P9：成功态 stdout 恰一行 JSON（无内嵌换行）
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12).toUpperCase();

let ok = 0;
let bad = 0;
const check = (cond, label, extra = '') => {
  if (cond) { ok += 1; console.log('PASS ' + label); } else { bad += 1; console.log('FAIL ' + label + (extra ? ' :: ' + extra : '')); }
};

/** 真机跑一次 CLI（`env` 与 `cwd` 可覆盖；默认 cwd＝仓库根）。 */
function cli(args, { dbPath, cwd = ROOT } = {}) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd, env: { ...process.env, SKILLS_DB_PATH: dbPath },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

const mkdir = (tag) => mkdtempSync(join(tmpdir(), 't83-red-' + tag + '-'));

/* ── R1 相对 SKILLS_DB_PATH ─────────────────────────────────────────────────────── */
{
  const dir = mkdir('reldb');
  const r = cli(['calorie.help.lookup', '--params', JSON.stringify({ q: '看今日主页' })], { dbPath: '.', cwd: dir });
  check(r.status === 0, 'R1 相对 SKILLS_DB_PATH exit 0', 'exit=' + r.status + ' stderr=' + r.stderr.slice(0, 200));
  check(!!r.env, 'R1 stdout 为 envelope JSON');
  if (r.env) {
    check(r.env.delivery?.mode === 'file', 'R1 delivery.mode=file', JSON.stringify(r.env.delivery));
    check(isAbsolute(String(r.env.delivery?.path)), 'R1 delivery.path 绝对', String(r.env.delivery?.path));
    check(r.env.delivery?.path === r.env.data?.output, 'R1 delivery.path === data.output');
    check(existsSync(String(r.env.delivery?.path)), 'R1 产物真实存在');
    check(r.env.delivery?.bytes === statSync(String(r.env.delivery.path)).size, 'R1 bytes === 落盘字节数');
  }
}

/* ── R2 相对 --output ──────────────────────────────────────────────────────────── */
{
  const dir = mkdir('relout');
  const relOut = join('nested', 'rel.html');
  const r = cli(['calorie.help.lookup', '--params', JSON.stringify({ q: '看今日主页' }), '--output', relOut],
    { dbPath: dir, cwd: dir });
  check(r.status === 0, 'R2 相对 --output exit 0', 'exit=' + r.status + ' stderr=' + r.stderr.slice(0, 200));
  if (r.env) {
    check(r.env.delivery?.path === join(dir, 'nested', 'rel.html'), 'R2 回传路径＝实际写入路径', String(r.env.delivery?.path));
    check(isAbsolute(String(r.env.delivery?.path)), 'R2 delivery.path 绝对');
    check(existsSync(String(r.env.delivery?.path)), 'R2 产物真实存在');
    check(r.env.delivery?.path === r.env.data?.output, 'R2 delivery.path === data.output');
  }
}

/* ── R3 相对 SKILLS_DB_PATH ＋ 写键（写成功不得报失败） ─────────────────────────── */
{
  const dir = mkdir('relwrite');
  const w = cli(['calorie.water.log', '--params', JSON.stringify({ ml: 250 })], { dbPath: '.', cwd: dir });
  check(w.status === 0, 'R3 写键相对落点 exit 0', 'exit=' + w.status + ' stderr=' + w.stderr.slice(0, 200));
  if (w.env) {
    check(w.env.data?.ok === true, 'R3 写键回执 ok=true');
    check(w.env.delivery?.template === 'receipt', 'R3 delivery.template=receipt');
    check(existsSync(String(w.env.delivery?.path)), 'R3 回执产物存在');
  }
  // 库内读回（不信回执自报）：只读打开真库数「💧水」行数 ≥ 1
  const db = new DatabaseSync(join(dir, 'calorie_data.db'), { readOnly: true });
  const row = db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(grams),0) AS ml FROM food_log WHERE food_name = '💧水'").get();
  db.close();
  check(Number(row.n) >= 1 && Number(row.ml) >= 250, 'R3 库内确实落库（只读读回 ' + JSON.stringify(row) + '）');
}

/* ── R4 绝对落点对照组 ─────────────────────────────────────────────────────────── */
{
  const dir = mkdir('abs');
  const absOut = join(dir, 'explicit.html');
  const r = cli(['calorie.help.lookup', '--params', JSON.stringify({ q: '看今日主页' }), '--output', absOut], { dbPath: dir });
  check(r.status === 0 && r.env?.delivery?.path === absOut && r.env?.data?.output === absOut,
    'R4 绝对落点逐字不变（path === data.output === --output）',
    'exit=' + r.status + ' path=' + String(r.env?.delivery?.path));
}

/* ── R5 delivery.path 绝对不变量仍生效 ─────────────────────────────────────────── */
{
  const { buildDelivery } = await import(new URL('../../packages/skill-calorie/dist/render/envelope.js', import.meta.url));
  let threw = '';
  try { buildDelivery({ mode: 'file', shape: 'stat', path: relative(ROOT, join(ROOT, 'x.html')), html: '<p>' }); } catch (e) { threw = String(e.message); }
  check(/绝对路径/.test(threw), 'R5 相对 path 仍被 buildDelivery 拒绝（不变量未被拆）', threw);
}

/* ── R6 只读目录 → ② 内联态 ────────────────────────────────────────────────────── */
{
  const dir = mkdir('ro');
  const w1 = cli(['calorie.help.lookup', '--params', JSON.stringify({ q: '看今日主页' })], { dbPath: dir });
  const htmlDir = join(dir, 'calorie_html');
  const baseline = w1.env?.data?.output ? readFileSync(String(w1.env.data.output), 'utf8') : '';
  // 必须先清掉基线产物：只读目录下「**覆盖**同名旧文件」仍成功（文件自身 ACL 不受目录 DENY 影响），
  // 留着会误判成文件态（本探针首轮即踩此坑，红队自证）。
  for (const f of readdirSync(htmlDir)) rmSync(join(htmlDir, f), { force: true });
  const ro = spawnSync('icacls', [htmlDir, '/deny', '*S-1-1-0:(W,AD,WD)'], { encoding: 'utf8' });
  if (ro.status === 0) {
    const r = cli(['calorie.help.lookup', '--params', JSON.stringify({ q: '看今日主页' })], { dbPath: dir });
    check(r.status === 0, 'R6 只读目录 exit 0（不因写不进去而失败）', 'exit=' + r.status + ' stderr=' + r.stderr.slice(0, 200));
    check(r.env?.delivery?.mode === 'inline', 'R6 delivery.mode=inline', JSON.stringify(r.env?.delivery));
    check(r.env?.delivery?.path === undefined && r.env?.data?.output === undefined, 'R6 内联态无 path／data.output');
    check(typeof r.env?.data?.html === 'string' && r.env.data.html.length > 1000, 'R6 data.html 非空（产物随 envelope 回传）');
    check(baseline !== '' && r.env?.data?.html === baseline, 'R6 内联产物与落盘产物逐字相同（三态同源）');
    spawnSync('icacls', [htmlDir, '/remove:d', '*S-1-1-0'], { encoding: 'utf8' });
  } else {
    console.log('SKIP R6 只读目录（icacls 不可用）');
  }
}

/* ── R7 结构错落点 → 渲染失败回执 ──────────────────────────────────────────────── */
{
  const dir = mkdir('bad');
  writeFileSync(join(dir, 'calorie_html'), 'not a dir');
  const r = cli(['calorie.help.center'], { dbPath: dir });
  check(r.status === 5, 'R7 结构错 exit 5', 'exit=' + r.status);
  check(r.stdout === '', 'R7 失败时 stdout 纯净（P9）');
  const line = r.stderr.split('\n').find((l) => l.startsWith('RECEIPT '));
  check(!!line, 'R7 stderr 含一行 RECEIPT');
  if (line) {
    const rec = JSON.parse(line.slice('RECEIPT '.length));
    check(rec.ok === false && rec.delivery?.template === 'receipt', 'R7 回执 delivery.template=receipt', JSON.stringify(rec.delivery));
    check(/calorie-cmd-read/.test(String(rec.fixPrompt)), 'R7 回执含建议命令');
    check(!/未知失败/.test(r.stderr), 'R7 不得退化为「未知失败」');
  }
  check(readFileSync(join(dir, 'calorie_html'), 'utf8') === 'not a dir', 'R7 占位文件未被改写');
}

/* ── R8 P9：成功态 stdout 恰一行 ───────────────────────────────────────────────── */
{
  const dir = mkdir('p9');
  const r = cli(['calorie.help.center'], { dbPath: dir });
  check(r.status === 0 && r.stdout.trimEnd().split('\n').length === 1, 'R8 成功态 stdout 恰一行 JSON',
    'lines=' + r.stdout.trimEnd().split('\n').length);
  if (r.env?.delivery?.path) check(sha(String(r.env.delivery.path)).length === 12, 'R8 产物可读（sha 取样 ' + sha(String(r.env.delivery.path)) + '）');
}

console.log('RESULT-RED: ' + ok + '/' + (ok + bad) + (bad === 0 ? ' PASS' : ' FAIL'));
process.exit(bad === 0 ? 0 : 1);
