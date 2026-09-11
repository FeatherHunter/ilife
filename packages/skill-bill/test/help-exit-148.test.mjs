// #148 · 真出口锁：spawn `bill-cmd-read`（argv＋JSON＋exit），锁四件事——
//  ① 文件名通式与落点（`饼干记账_HELP_<TS>[_N].html` 落 biscuit_accountant_html，回执绝对路径）；
//  ② 壳层：产物 = 共享 help 模板前后缀逐字 ＋ `help-data` 载荷（7 域／74 场景／两块 meta）；
//  ③ 独占与递补：并发调用落点两两不同、内容互不覆盖（同秒时后到者 `_2`）；
//  ④ 两支产物互不串（缺省 HELP 文件 vs `mode:"lookup"` 速查表）。
// 课（#139）：模块级测试全绿 ≠ 用户拿到东西，故本文件**只经真 spawn**，不直接调模块。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HELP_SHELL_DATA_OPEN, HELP_SHELL_PREFIX, HELP_SHELL_SUFFIX, HELP_SHELL_TITLE_SLOT } from 'base-paint/help-shell';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HELP_NAME_RE = /^饼干记账_HELP_\d{8}_\d{6}(_\d+)?\.html$/;
const LOOKUP_NAME_RE = /^饼干记账_速查表_\d{8}_\d{6}(_\d+)?\.html$/;
const KEY = 'bill.help.lookup';

const mkDir = (tag) => mkdtempSync(join(tmpdir(), 'bill148-' + tag + '-'));
const htmlDirOf = (dir) => join(dir, 'biscuit_accountant_html');
const envOf = (dir) => ({ ...process.env, SKILLS_DB_PATH: dir });

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
  assert.equal(basename(dirname(out)), 'biscuit_accountant_html', '落 <SKILLS_DB_PATH>/biscuit_accountant_html/');
  assert.ok(out.startsWith(dir), 'delivery.path 为绝对路径且在该次 SKILLS_DB_PATH 下：' + out);
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

test('#148 ③ 独占与递补：并发 6 次落点两两不同、内容互不覆盖', async () => {
  const dir = mkDir('race');
  const rs = await Promise.all(Array.from({ length: 6 }, () => runAsync(dir)));
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
  const noEnv = spawnSync(NODE_BIN, [BIN, KEY], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: '' } });
  assert.equal(noEnv.status, 1, '缺 SKILLS_DB_PATH ＝exit 1');
  const badPath = join(dir, 'blocker', 'x.html');
  spawnSync(NODE_BIN, ['-e', 'require("fs").writeFileSync(process.argv[1],"x")', join(dir, 'blocker')], { encoding: 'utf8' });
  const bad = run(dir, [KEY, '--html', badPath]);
  assert.equal(bad.status, 5, '落点非法（父级是文件）＝exit 5（stderr：' + bad.stderr + '）');
});
