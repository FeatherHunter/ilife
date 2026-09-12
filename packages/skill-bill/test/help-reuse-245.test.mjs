/** #245 · 饼干记账 HELP 产物的**复用窗口**锁（真 spawn 出口；不调模块）。
 *
 * 病灶（#245）：HELP 被读一次就在落点目录多出一份 HTML——生产上 `biscuit_accountant_html/` 实测 **76 件**。
 * 口径（维护者 2026-09-12）：「**1 天内直接返回一份**，不会再创建新的。又或者 3 天这种参数。」
 *
 * 与同包 `help-exit-148.test.mjs` 的分工：那个文件锁「独立递补那套老语义（用 `reuseHours:0` 验）」与
 * 参数／退出码矩阵；本文件锁**复用那一套**（缺省一天、两支都吃窗口、复用＝只读、坏参阻断）。
 *
 * 运行：先 `pnpm build`（或 `tsc -b packages/skill-bill`），再
 *   node --test packages/skill-bill/test/help-reuse-245.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY = 'bill.help.lookup';
const HELP_NAME_RE = /^饼干记账_HELP_\d{8}_\d{6}(_\d+)?\.html$/;
const LOOKUP_NAME_RE = /^饼干记账_速查表_\d{8}_\d{6}(_\d+)?\.html$/;

const mkDir = (tag) => mkdtempSync(join(tmpdir(), 't245bill-' + tag + '-'));
const htmlDirOf = (dir) => join(dir, 'biscuit_accountant_html');
const namesOf = (dir) => { try { return readdirSync(htmlDirOf(dir)).sort(); } catch { return []; } };

function run(dir, args) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout).replace(/^\uFEFF/, '')); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

function runOk(dir, args) {
  const r = run(dir, args);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是一行可解析 JSON');
  return r;
}

test('#245 ① 缺省＝一天：连读 3 次目录文件数不增，三次落同一份、那份一字未改', () => {
  const dir = mkDir('default');
  const a = runOk(dir, [KEY]);
  const out = a.env.delivery.path;
  assert.ok(isAbsolute(out), '回执须绝对路径：' + out);
  assert.equal(basename(dirname(out)), 'biscuit_accountant_html', '落 <SKILLS_DB_PATH>/biscuit_accountant_html/');
  assert.match(basename(out), HELP_NAME_RE, '名字通式：' + basename(out));

  const before = readFileSync(out);
  const mtime = statSync(out).mtimeMs;
  for (let i = 2; i <= 3; i++) {
    const r = runOk(dir, [KEY]);
    assert.equal(r.env.delivery.path, out, '第 ' + String(i) + ' 次必须复用同一份');
    assert.equal(r.env.delivery.bytes, a.env.delivery.bytes, '字节数与首跑一致');
  }
  assert.deepEqual(namesOf(dir), [basename(out)], '目录里仍只有首跑那一份（不涨）');
  assert.deepEqual(readFileSync(out), before, '复用不得改写那份（逐字节相同）');
  assert.equal(statSync(out).mtimeMs, mtime, '复用不得 touch 那份（mtime 不动）');
});

test('#245 ② 两支都吃窗口：HELP 文件与速查表各自复用，目录稳定在两份', () => {
  const dir = mkDir('branches');
  const help1 = runOk(dir, [KEY]);
  const help2 = runOk(dir, [KEY]);
  assert.equal(help2.env.delivery.path, help1.env.delivery.path, 'HELP 支复用');

  const s1 = runOk(dir, [KEY, '--params', JSON.stringify({ mode: 'lookup' })]);
  const s2 = runOk(dir, [KEY, '--params', JSON.stringify({ mode: 'lookup' })]);
  assert.match(basename(s1.env.delivery.path), LOOKUP_NAME_RE, '速查名：' + basename(s1.env.delivery.path));
  assert.equal(s2.env.delivery.path, s1.env.delivery.path, '速查支复用');
  assert.notEqual(s1.env.delivery.path, help1.env.delivery.path, '两支仍分名（别让用户按一个名字打开到另一个东西）');
  assert.equal(namesOf(dir).length, 2, '目录稳定在两份：HELP ＋ 速查表');
});

test('#245 ③ 窗口可换：3 小时同效；0＝每次都要一份最新的（不覆盖旧的）', () => {
  const dir = mkDir('hours');
  const a = runOk(dir, [KEY, '--params', JSON.stringify({ reuseHours: 3 })]);
  const b = runOk(dir, [KEY, '--params', JSON.stringify({ reuseHours: 3 })]);
  assert.equal(b.env.delivery.path, a.env.delivery.path, 'reuseHours:3 窗口内同样复用');
  assert.equal(namesOf(dir).length, 1, '仍只有一份');

  const c = runOk(dir, [KEY, '--params', JSON.stringify({ reuseHours: 0 })]);
  assert.notEqual(c.env.delivery.path, a.env.delivery.path, 'reuseHours:0 ⇒ 落新的一份');
  assert.equal(readFileSync(a.env.delivery.path).length, a.env.delivery.bytes, '旧那份字节未被改写');
  assert.equal(namesOf(dir).length, 2, '目录里 2 份（旧的留着当留档）');
});

test('#245 ④ 坏参阻断：负数／非数一律 exit 2，且不落盘', () => {
  const dir = mkDir('badparams');
  for (const bad of [-1, '一天', true]) {
    const r = run(dir, [KEY, '--params', JSON.stringify({ reuseHours: bad })]);
    assert.equal(r.status, 2, 'reuseHours=' + JSON.stringify(bad) + ' 须 exit 2（stderr：' + r.stderr + '）');
    assert.match(r.stderr, /reuseHours 非法/, '报错须点名参数：' + r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 保持干净');
  }
  assert.deepEqual(namesOf(dir), [], '坏参一律不落盘');
});

test('#245 ⑤ 不吃窗口的路照旧：`--html` 逐字覆盖、`q` 现找不落盘、看帮助不建库', () => {
  const dir = mkDir('others');
  const mine = join(dir, 'sub', '我的帮助.html');
  const e1 = runOk(dir, [KEY, '--html', mine]);
  const e2 = runOk(dir, [KEY, '--html', mine]);
  assert.equal(e1.env.delivery.path, mine, '`--html` 逐字落点');
  assert.equal(e2.env.delivery.path, mine, '再写同一路径＝覆盖，不派生 _2');
  assert.deepEqual(readdirSync(join(dir, 'sub')), [basename(mine)], '覆盖写不产生 _2');
  assert.equal(existsSync(htmlDirOf(dir)), false, '给了 `--html` 就不落缺省目录');

  const before = namesOf(dir).length;
  const q = runOk(dir, [KEY, '--params', JSON.stringify({ q: '查今天' })]);
  assert.equal(q.env.delivery, undefined, '现找（q）只回命中，不落盘');
  assert.equal(namesOf(dir).length, before, '现找不许往目录里加东西');
  assert.equal(readdirSync(dir).filter((f) => f.endsWith('.db')).length, 0, '看帮助不建记账库');
});
