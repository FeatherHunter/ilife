/** #245 · 作息 HELP 产物的**复用窗口**锁（真 spawn 出口；不调模块）。
 *
 * 病灶（#245）：HELP 被读一次就在落点目录多出一份 HTML（生产上同类目录 76～323 件）。口径
 * （维护者 2026-09-12）：「**1 天内直接返回一份**，不会再创建新的。又或者 3 天这种参数。」
 *
 * 本文件锁五件事：
 *  ① **缺省＝一天**：连读 3 次目录**文件数不增**，三次回执同一份、字节同值、那份一字未改；
 *  ② `reuseHours` 换窗口：`3` 同效、`0`＝**每次都要一份最新的**（落新的、不覆盖旧的）；
 *  ③ **坏参阻断**：负数／非数一律 exit 2（不静默当 0、不静默当缺省），且不落盘；
 *  ④ 落点与名字**逐字不变**（`<SKILLS_DB_PATH>/schedule_html/help/作息管家_HELP_<TS>[_N].html`）——
 *     本票为接复用把落盘管线改成走共用件 `saveHtmlFile`，这一条防「顺手改坏名字」；
 *  ⑤ **不吃窗口的路照旧**：`--html` 逐字覆盖、`q` 现找回命中、看帮助不建库。
 *
 * 运行：先 `pnpm build`（或逐包 `tsc -b`），再
 *   node --test packages/skill-schedule/test/help-reuse-245.test.mjs
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
const KEY = 'schedule.help.lookup';
const NAME_RE = /^作息管家_HELP_\d{8}_\d{6}(_\d+)?\.html$/;

const mkDir = (tag) => mkdtempSync(join(tmpdir(), 't245sch-' + tag + '-'));
const helpDirOf = (dir) => join(dir, 'schedule_html', 'help');
const namesOf = (dir) => { try { return readdirSync(helpDirOf(dir)).sort(); } catch { return []; } };

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
  assert.equal(dirname(out), helpDirOf(dir), '落点＝<SKILLS_DB_PATH>/schedule_html/help');
  assert.match(basename(out), NAME_RE, '名字通式逐字不变：' + basename(out));

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

test('#245 ② 窗口可换：3 小时同效；0＝每次都要一份最新的（不覆盖旧的）', () => {
  const dir = mkDir('hours');
  const a = runOk(dir, [KEY, '--params', JSON.stringify({ reuseHours: 3 })]);
  const b = runOk(dir, [KEY, '--params', JSON.stringify({ reuseHours: 3 })]);
  assert.equal(b.env.delivery.path, a.env.delivery.path, 'reuseHours:3 窗口内同样复用');
  assert.equal(namesOf(dir).length, 1, '仍只有一份');

  const c = runOk(dir, [KEY, '--params', JSON.stringify({ reuseHours: 0 })]);
  assert.notEqual(c.env.delivery.path, a.env.delivery.path, 'reuseHours:0 ⇒ 落新的一份');
  assert.equal(readFileSync(a.env.delivery.path).length, a.env.delivery.bytes, '旧那份字节未被改写');
  assert.equal(namesOf(dir).length, 2, '目录里 2 份（旧的留着当留档）');

  // 落新那份之后，再读又复用**最新**的那份（不是回到更旧的一份）。
  const d = runOk(dir, [KEY]);
  assert.equal(d.env.delivery.path, c.env.delivery.path, '复用取最新的一份');
  assert.equal(namesOf(dir).length, 2, '仍两份（不再涨）');
});

test('#245 ③ 坏参阻断：负数／非数一律 exit 2，且不落盘', () => {
  const dir = mkDir('badparams');
  for (const bad of [-1, '一天', true]) {
    const r = run(dir, [KEY, '--params', JSON.stringify({ reuseHours: bad })]);
    assert.equal(r.status, 2, 'reuseHours=' + JSON.stringify(bad) + ' 须 exit 2（stderr：' + r.stderr + '）');
    assert.match(r.stderr, /reuseHours 非法/, '报错须点名参数：' + r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 保持干净');
  }
  assert.deepEqual(namesOf(dir), [], '坏参一律不落盘');
});

test('#245 ④ 落点与名字逐字不变：产物仍是共享 help 模板的全壳页', () => {
  const dir = mkDir('shell');
  const r = runOk(dir, [KEY]);
  const html = readFileSync(r.env.delivery.path, 'utf8');
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'file 态＝完整文档（doctype 起）');
  assert.ok(html.includes('<!-- 公共组件注入管线 -->'), '共享模板的注入锚点还在');
  assert.ok(html.includes('<title>作息管家 · 使用手册(HELP)</title>'), '标题逐字');
  assert.equal(html.includes('<section data-skill="schedule"'), false, '缺省产物是 HELP 全壳页，不是分节页');
  assert.equal(statSync(r.env.delivery.path).size, r.env.delivery.bytes, 'delivery.bytes ＝落盘字节数');
});

test('#245 ⑤ 不吃窗口的路照旧：`--html` 逐字覆盖、`q` 现找回命中、看帮助不建库', () => {
  const dir = mkDir('others');
  const mine = join(dir, 'mine', 'named.html');
  const e1 = runOk(dir, [KEY, '--html', mine]);
  const e2 = runOk(dir, [KEY, '--html', mine]);
  assert.equal(e1.env.delivery.path, mine, '`--html` 逐字落点');
  assert.equal(e2.env.delivery.path, mine, '再写同一路径＝覆盖，不派生 _2');
  assert.deepEqual(readdirSync(join(dir, 'mine')), [basename(mine)], '覆盖写不产生 _2');
  assert.equal(existsSync(join(dir, 'schedule_html')), false, '给了 `--html` 就不落缺省目录');

  const q = runOk(dir, [KEY, '--params', JSON.stringify({ q: '查作息' })]);
  assert.equal(q.env.delivery, undefined, '现找（q）不落盘');
  assert.ok(q.env.data.total >= 1, '现找回命中：' + String(q.env.data.total));
  assert.equal(existsSync(join(dir, 'schedule_data.db')), false, '看帮助不建库');
});
