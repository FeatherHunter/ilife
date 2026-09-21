// #148 · 真出口锁：spawn `bill-cmd-read`（argv＋JSON＋exit），锁四件事——
//  ① 文件名通式与落点（`饼干记账_HELP_<TS>[_N].html` 落 biscuit_accountant_html，回执绝对路径）；
//  ② 壳层：产物 = 共享 help 模板前后缀逐字 ＋ `help-data` 载荷（7 域／74 场景／两块 meta）；
//  ③ 独占与递补（用 `reuseHours:0` 验：并发调用落点两两不同、内容互不覆盖；同秒时后到者 `_2`）
//     ＋ ③b `#245` 复用（缺省一天：再跑一次复用已有那份，目录不涨、已有文件一字未动）；
//  ④ 两支产物互不串（缺省 HELP 文件 vs `mode:"lookup"` 速查表）。
// 课（#139）：模块级测试全绿 ≠ 用户拿到东西，故本文件**只经真 spawn**，不直接调模块。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HELP_SHELL_DATA_OPEN, HELP_SHELL_PREFIX, HELP_SHELL_SUFFIX, HELP_SHELL_TITLE_SLOT } from 'base-paint/help-shell';
import { billEnv, configDirOf } from './helpers/config-base.mjs';
import { realHomeDir } from '../../../test/helpers/real-home-snapshot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HELP_NAME_RE = /^饼干记账_HELP_\d{8}_\d{6}(_\d+)?\.html$/;
const LOOKUP_NAME_RE = /^饼干记账_速查表_\d{8}_\d{6}(_\d+)?\.html$/;
const KEY = 'bill.help.lookup';

/**
 * #763 护栏探针：一个只调 `resolveConfigDir()` 的子进程（**不碰盘**——`mkdir` 在它之后，故哪怕护栏
 * fail-open 这条用例也写不出真实数据）；直接拿技能命令做「缺隔离」实验，一旦护栏失效就会真写。
 *
 * 「忘了注入」＝把家目录两格**显式设成账号那一份**（不是删格：win32 上删掉 `USERPROFILE`，子进程仍会
 * 拿到父进程当刻那一格，到不了真实那一份）。反向对照经 `extraEnv` 给临时两格。
 */
const DIRS_URL = pathToFileURL(join(HERE, '..', '..', 'base-link-core', 'dist', 'config', 'dirs.js')).href;
function probeGuard(extraEnv = {}) {
  const code = 'const m = await import(' + JSON.stringify(DIRS_URL) + ');'
    + ' try { console.log("OK:" + m.resolveConfigDir()); } catch (e) { console.log("THREW:" + e.code); }';
  const real = realHomeDir().dir;
  const env = { ...process.env, USERPROFILE: real, HOME: real, NODE_TEST_CONTEXT: 'child-v8' };
  Object.assign(env, extraEnv);
  return String(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env }).stdout).trim();
}

const mkDir = (tag) => mkdtempSync(join(tmpdir(), 'bill148-' + tag + '-'));
const htmlDirOf = (dir) => join(dir, 'biscuit_accountant_html');
const envOf = (dir) => billEnv(dir);

function run(dir, args = [KEY]) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: envOf(dir) });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

/** 异步版（并发用；`spawnSync` 会把并发串成串行，测不出独占递补）。 */
function runAsync(dir, args = [KEY]) {
  return new Promise((resolve) => {
    const child = spawn(NODE_BIN, [BIN, ...args], { env: envOf(dir) });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      let env = null;
      try { env = JSON.parse(out); } catch { env = null; }
      resolve({ status: code, stdout: out, env });
    });
  });
}

function runOk(dir, args) {
  const r = run(dir, args);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是一行可解析 JSON');
  assert.equal(r.stdout.trim().split('\n').length, 1, 'P9：stdout 恒一行 JSON');
  return r;
}

/** 取 `<script id="help-data">` 载荷。 */
function helpData(html) {
  assert.ok(html.includes(HELP_SHELL_DATA_OPEN), '缺 help-data 锚点');
  const at = html.indexOf(HELP_SHELL_DATA_OPEN);
  return JSON.parse(html.slice(at + HELP_SHELL_DATA_OPEN.length, html.indexOf('</script>', at)));
}

const scenesOf = (data) => data.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const stampOf = (p) => (basename(p).match(/_(\d{8}_\d{6})(?:_(\d+))?\.html$/) || []).slice(1);

test('#148 ① 缺省＝HELP 文件：名字通式／落点／回执绝对路径，data 换成域级索引', () => {
  const dir = mkDir('default');
  const r = runOk(dir, undefined);
  const out = r.env.delivery.path;

  assert.equal(r.env.key, KEY);
  assert.ok(HELP_NAME_RE.test(basename(out)), '文件名通式：' + basename(out));
  assert.equal(basename(dirname(out)), 'biscuit_accountant_html', '落 <库目录>/biscuit_accountant_html/');
  assert.ok(out.startsWith(dir), 'delivery.path 为绝对路径且在该次库目录下：' + out);
  assert.ok(existsSync(out), '回执路径真的存在');
  assert.equal(statSync(out).size, r.env.delivery.bytes, 'delivery.bytes ＝ 落盘字节数');
  assert.equal(r.env.delivery.bytes, Buffer.byteLength(readFileSync(out, 'utf8'), 'utf8'));
  assert.equal(r.env.delivery.mode, 'file');
  assert.deepEqual(Object.keys(r.env), ['version', 'skill', 'shape', 'key', 'data', 'delivery'], 'delivery 顶层追加、五字段序不变');
  assert.equal(r.env.data.mode, 'file');
  assert.equal(r.env.data.total, 7, '域级索引 7 行');
  assert.equal(r.env.data.sceneTotal, 74);
  assert.equal(r.env.data.subgroupTotal, 20);
});

test('#148 ② 壳层锁：产物 = 共享 help 模板前后缀逐字 ＋ help-data 载荷（7 域／74 场景／两块 meta）', () => {
  const dir = mkDir('shell');
  const out = runOk(dir, undefined).env.delivery.path;
  const html = readFileSync(out, 'utf8');
  const data = helpData(html);

  // 前后缀逐字（标题槽按 #145 的 composeDocTitle 规则填：title 自带技能名 ⇒ 原样）
  const title = html.slice(html.indexOf('<title>') + 7, html.indexOf('</title>'));
  assert.equal(title, '饼干记账 · 使用手册(HELP)');
  assert.ok(html.startsWith(HELP_SHELL_PREFIX.split(HELP_SHELL_TITLE_SLOT).join(title)), '前缀逐字（仅填标题槽）');
  assert.ok(html.endsWith(HELP_SHELL_SUFFIX), '后缀逐字');
  assert.equal(html.includes(HELP_SHELL_TITLE_SLOT), false, '标题槽不得留占位');

  // 载荷（老实物两代共同口径）
  assert.equal(data.groups.length, 7, '7 域');
  assert.equal(scenesOf(data).length, 74, '71＋3 场景');
  assert.deepEqual(data.meta_blocks.map((m) => m.id), ['help_summary', 'help_wake_words'], '两块 meta 在');
  assert.equal(data.meta_blocks[1].html, '<p>饼干记账 HELP / 饼干记账帮助 / 查帮助 / 能做什么</p>');
  assert.ok(data.subtitle.includes('74 场景') && data.subtitle.includes('版本 2.0'), 'subtitle 派生：' + data.subtitle);
  assert.equal(data.contact.items.length, 3);
  assert.equal(data.groups[0].subgroups[0].scenes[0].prompt_template.length > 0, true, '场景卡带指令正文');
});

test('#148 ③ 独占与递补：并发 6 次内容互不覆盖；`reuseHours:0` ⇒ 6 个互异落点、目录恰 6 份', async () => {
  const dir = mkDir('race');
  // #245：缺省已带「一天内复用」窗口，故「独占递补」这条语义要用 `reuseHours:0`（每次都落新的）来验；
  // 缺省那条另有一处专门用例（#245 ①：连读 2 次目录不增）。
  const rs = await Promise.all(Array.from({ length: 6 }, () => runAsync(dir, [KEY, '--params', '{"reuseHours":0}'])));
  for (const r of rs) { assert.equal(r.status, 0); assert.ok(r.env, 'stdout 可解析'); }
  const paths = rs.map((r) => r.env.delivery.path);
  assert.equal(new Set(paths).size, 6, '六次调用六个不同落点：' + JSON.stringify(paths.map((p) => basename(p))));
  assert.equal(readdirSync(htmlDirOf(dir)).length, 6, '目录里恰好 6 份产物（无互相覆盖）');
  for (const r of rs) {
    const html = readFileSync(r.env.delivery.path, 'utf8');
    assert.equal(Buffer.byteLength(html, 'utf8'), r.env.delivery.bytes, '每份内容与自己的回执字节数一致');
    assert.equal(scenesOf(helpData(html)).length, 74, '每份都是完整壳（未被截断）');
  }
  // 同秒情形：各次必须占**不同槽位**，且必有一次拿到本体名（无 `_N`）——谁先到是任意的，
  // 故不断言「首个不带 _N」（那是把进程调度当作契约）；跨秒则各自独立，两种都合法（#139 去时间竞态口径）。
  const stamps = paths.map(stampOf);
  const sameSecond = stamps.filter((s) => s[0] === stamps[0][0]);
  if (sameSecond.length > 1) {
    const slots = sameSecond.map((s) => s[1] ?? '1');
    assert.equal(new Set(slots).size, slots.length, '同秒各次占的槽位互不相同：' + JSON.stringify(slots));
    assert.ok(slots.includes('1'), '同秒内必有一次拿到本体名（无 _N）：' + JSON.stringify(slots));
  }
});

test('#148 ③b #245 复用：并发后目录不涨（再跑一次复用已有那份，既不新建也不改写）', async () => {
  const dir = mkDir('race-reuse');
  await Promise.all(Array.from({ length: 6 }, () => runAsync(dir, [KEY, '--params', '{"reuseHours":0}'])));
  const before = readdirSync(htmlDirOf(dir)).sort();
  assert.equal(before.length, 6, '前置：六份都在');
  const bytesBefore = before.map((n) => statSync(join(htmlDirOf(dir), n)).size);

  const again = runOk(dir, undefined); // 缺省＝一天窗口 ⇒ 必须复用已有那份
  const reusePath = again.env.delivery.path;
  const after = readdirSync(htmlDirOf(dir)).sort();
  assert.equal(after.length, 6, '复用不新建，目录仍是 6 份：' + JSON.stringify(after));
  assert.deepEqual(after, before, '一份都没多、一份都没少');
  assert.ok(after.includes(basename(reusePath)), '复用回执指向目录里已有的一份：' + basename(reusePath));
  assert.deepEqual(before.map((n) => statSync(join(htmlDirOf(dir), n)).size), bytesBefore,
    '已有那些文件的字节数一字未动（复用＝只读，不改写）');
  assert.equal(again.env.delivery.bytes, statSync(reusePath).size, '回执的 bytes ＝复用那份的实际字节数');
  assert.equal(scenesOf(helpData(readFileSync(reusePath, 'utf8'))).length, 74, '复用的那份仍是完整壳');
});

test('#148 ④ 两支产物互不串：缺省 HELP 文件 vs mode=lookup 速查表', () => {
  const dir = mkDir('branches');
  const help = runOk(dir, undefined);
  const sheet = runOk(dir, [KEY, '--params', '{"mode":"lookup"}']);

  const hp = help.env.delivery.path;
  const sp = sheet.env.delivery.path;
  assert.ok(HELP_NAME_RE.test(basename(hp)), '缺省名：' + basename(hp));
  assert.ok(LOOKUP_NAME_RE.test(basename(sp)), '速查名：' + basename(sp));
  assert.notEqual(hp, sp, '两份产物分名');
  const hHtml = readFileSync(hp, 'utf8');
  const sHtml = readFileSync(sp, 'utf8');
  assert.ok(hHtml.includes('<!DOCTYPE html>') && hHtml.includes(HELP_SHELL_DATA_OPEN), '缺省＝全壳页');
  assert.equal(sHtml.includes(HELP_SHELL_DATA_OPEN), false, '速查表不是 HELP 壳');
  assert.match(sHtml, /<section/, '速查表＝分节页');
  assert.equal(sheet.env.data.total, 77, '速查表含全量 77 短语');
  assert.equal(help.env.data.total, 7, '缺省回的是域级索引（不是短语表）');
  assert.equal(readdirSync(htmlDirOf(dir)).length, 2, '两份产物同时在，互不覆盖');
});

test('#148 ⑤ 参数与退出码矩阵（真出口）＋ 失败时 stdout 空', () => {
  const dir = mkDir('codes');
  const cases = [
    { args: [KEY, '--params', '{"q":"查今天","mode":"lookup"}'], code: 2, why: 'q 与 mode 互斥' },
    { args: [KEY, '--params', '{"mode":"nope"}'], code: 2, why: 'mode 非法' },
    { args: ['bill.nope'], code: 3, why: '未知 key' },
  ];
  for (const c of cases) {
    const r = run(dir, c.args);
    assert.equal(r.status, c.code, c.why + '（stderr：' + r.stderr + '）');
    assert.equal(r.stdout, '', c.why + '：失败时 stdout 必须空');
    assert.match(r.stderr, new RegExp('ERR ' + c.code));
  }
  const bare = probeGuard();
  assert.equal(bare, 'THREW:CONFIG_TEST_ISOLATION_MISSING',
    '跑在测试运行器里却没注入家目录 ⇒ 配置落点当场响亮失败（读数：' + bare + '）');
  const fakeHome = mkdtempSync(join(tmpdir(), 'bill148-probe-'));
  assert.equal(probeGuard({ USERPROFILE: fakeHome, HOME: fakeHome }), 'OK:' + configDirOf(fakeHome),
    '给了临时家目录就照常算得出来（这道门只关「没注入家目录」这一档）');
  const badPath = join(dir, 'blocker', 'x.html');
  spawnSync(NODE_BIN, ['-e', 'require("fs").writeFileSync(process.argv[1],"x")', join(dir, 'blocker')], { encoding: 'utf8' });
  const bad = run(dir, [KEY, '--html', badPath]);
  assert.equal(bad.status, 5, '落点非法（父级是文件）＝exit 5（stderr：' + bad.stderr + '）');
});
