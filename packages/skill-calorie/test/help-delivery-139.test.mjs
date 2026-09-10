/** #139 · 「卡路里help」**真出口**锁（CLI 级，不是模块级）。
 *
 * 病根（#139 诊断，实测复现）：T2-②b 的接线件 `render/helpFile.ts:runHelpFile` 只被自己的
 * 单测调用，`cli/cmd_read.ts`（唯一出口）全文没 import → **单测全绿，而 live 出口产的是
 * M-era 的 `身材照HELP_*.html`**（速查台内容）。故本文件只跑真出口
 * （spawn `dist/cli/cmd_read.js`，argv＋JSON＋exit），锁四件事：
 *  ① 缺省（不给 `q`、不给 `mode`）＝「卡路里help」的交付物：名 `卡路里_HELP_<TS>[_N].html`、
 *     落 `<SKILLS_DB_PATH>/calorie_html/`、`data.output` 为绝对路径且与 `delivery.path` 同值、
 *     字节＝落盘大小、stdout 恒一行 JSON（P9）；
 *  ② 壳＝老实物同款 V4 三级目录（`<title>卡路里 · 唤醒词速查台</title>` ＋ `id="help-data"`，
 *     载荷 10 分类／436 场景（老实物 `:195` 口径）；
 *  ③ 反向锁（防退回孤岛／串产物）：缺省产物**不是**速查台（无 `id="ilife-help-shell"`），
 *     文件名**不得**再出现 `身材照`；速查台须显式 `mode` 且独立命名；
 *  ④ 并发两次调用 → 落点永不相同；同秒时后到者 `_2` 递补（`wx` 独占，#128 语义未被本改动破坏）。
 *
 * 运行：先 `npx tsc -b packages/skill-calorie`，再
 * `node --test packages/skill-calorie/test/help-delivery-139.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const NAME_RE = /^卡路里_HELP_\d{8}_\d{6}(_\d+)?\.html$/;

function mkDir(tag) {
  return mkdtempSync(join(tmpdir(), 't139-' + tag + '-'));
}

function run(dir, params) {
  const args = ['calorie.help.center'];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

/** 异步版（并发两次用；`spawnSync` 会把并发串成串行，测不出独占）。 */
function runAsync(dir) {
  return new Promise((resolve) => {
    const child = spawn(NODE_BIN, [BIN, 'calorie.help.center'], {
      env: { ...process.env, SKILLS_DB_PATH: dir },
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      let env = null;
      try { env = JSON.parse(out); } catch { env = null; }
      resolve({ status: code, stdout: out, env });
    });
  });
}

function runOk(dir, params) {
  const r = run(dir, params);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是一行可解析 JSON');
  return r;
}

/** 取 `<script id="help-data">` 载荷（老实物 `:195` 口径）。 */
function helpData(html) {
  const m = html.match(/<script id="help-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(m, '缺 help-data 载荷（老实物 :195）');
  return JSON.parse(m[1]);
}

/** 文件名里的秒级时间戳与 `_N` 递补段。 */
function stampOf(p) {
  return basename(p).match(/_(\d{8}_\d{6})(?:_(\d+))?\.html$/);
}

test('#139 ① 缺省＝「卡路里help」HELP 文件：卡路里_HELP_<TS>.html 落 calorie_html／回执绝对路径', () => {
  const dir = mkDir('default');
  const r = runOk(dir, undefined);
  const d = r.env.data;

  assert.equal(r.env.key, 'calorie.help.center');
  assert.equal(r.env.shape, 'list');
  assert.equal(r.stdout.trim().split('\n').length, 1, 'P9：stdout 恒一行 JSON');
  assert.equal(d.mode, 'file');
  assert.equal(d.sceneTotal, 436, '全量口径：436 场景');

  const out = d.output;
  assert.ok(isAbsolute(out), 'data.output 须绝对路径：' + out);
  assert.equal(basename(dirname(out)), 'calorie_html', '落 <SKILLS_DB_PATH>/calorie_html/');
  assert.match(basename(out), NAME_RE, '老命名（旧 html_paths.html_name 通式）：' + basename(out));
  assert.equal(basename(out).includes('身材照'), false, '不得再出现 M-era「身材照」');
  assert.equal(r.env.delivery.mode, 'file');
  assert.equal(r.env.delivery.path, out, 'delivery.path 与 data.output 同值同源');
  assert.ok(existsSync(out), '产物须真实落盘');

  const html = readFileSync(out, 'utf8');
  assert.equal(statSync(out).size, d.bytes, 'data.bytes ＝ 落盘字节数');
  assert.equal(r.env.delivery.bytes, d.bytes);
  assert.equal(d.bytes, Buffer.byteLength(html, 'utf8'));
});

test('#139 ② 壳＝老实物同款 V4 三级目录（10 分类／436 场景）', () => {
  const dir = mkDir('shell');
  const r = runOk(dir, undefined);
  const html = readFileSync(r.env.data.output, 'utf8');

  assert.ok(html.startsWith('<!DOCTYPE html>'), 'file 态＝完整文档');
  assert.ok(html.includes('<title>卡路里 · 唤醒词速查台</title>'), '文档标题＝skill_name · title（#141 去原型水印）');
  assert.ok(html.includes('id="' + 'help-data"'), '老实物 payload 容器 id');

  const data = helpData(html);
  assert.equal(data.skill_name, '卡路里');
  assert.equal(data.title, '唤醒词速查台');
  assert.equal(data.groups.length, 10, '10 分类');
  const scenes = data.groups.reduce(
    (n, g) => n + g.subgroups.reduce((m, s) => m + s.scenes.length, 0), 0);
  assert.equal(scenes, 436, '436 场景（老实物全表）');
  assert.ok(r.env.data.bytes > 200_000 && r.env.data.bytes < 400_000,
    '量级对齐老实物 303KB，实际 ' + r.env.data.bytes + ' B');
});

test('#139 ③ 反向：缺省不是速查台（无 ilife-help-shell 锚），速查台须显式 mode', () => {
  const dir = mkDir('negative');
  const r = runOk(dir, undefined);
  const html = readFileSync(r.env.data.output, 'utf8');
  assert.equal(html.includes('id="ilife-help-shell"'), false, '缺省产物不得是速查台壳');

  // 速查台仍在：显式 mode:'file' → 独立命名（卡路里_速查台_<TS>.html），与 HELP 文件不撞名。
  const sheet = runOk(dir, { mode: 'file' });
  assert.equal(sheet.env.delivery.template, 'help-shell', '速查台＝ilife-base 壳');
  assert.match(basename(sheet.env.data.output), /^卡路里_速查台_\d{8}_\d{6}(_\d+)?\.html$/,
    '速查台独立命名：' + basename(sheet.env.data.output));
  assert.equal(basename(sheet.env.data.output).includes('身材照'), false, 'M-era 名不得回归');
  assert.ok(sheet.env.data.bytes > 900_000, '速查台量级 ≈1 MB，实际 ' + sheet.env.data.bytes + ' B');
});

test('#139 ④ 并发两次调用：落点各自独立；同秒则后到者 _2 递补', async () => {
  const dir = mkDir('collide');
  const [a, b] = await Promise.all([runAsync(dir), runAsync(dir)]);
  assert.equal(a.status, 0, 'A exit ' + a.status);
  assert.equal(b.status, 0, 'B exit ' + b.status);
  assert.ok(a.env && b.env, '两个 stdout 都须可解析');
  assert.match(basename(a.env.data.output), NAME_RE);
  assert.match(basename(b.env.data.output), NAME_RE);
  assert.notEqual(b.env.data.output, a.env.data.output, '两次调用落点各自独立');
  assert.ok(existsSync(a.env.data.output) && existsSync(b.env.data.output), '两份产物都在');

  const A = stampOf(a.env.data.output);
  const B = stampOf(b.env.data.output);
  if (A[1] === B[1]) {
    // 同一秒：首候选被 `wx` 占住 → 后到者必须走 `EEXIST` 递补 _2（#128 语义）。
    assert.ok(A[2] === '2' || B[2] === '2',
      '同秒必有一方 _2：' + basename(a.env.data.output) + ' / ' + basename(b.env.data.output));
  } else {
    // 跨秒（并发两进程恰被秒边界切开）：各自名下独立落点，同样不覆盖。
    assert.equal(A[2], undefined);
    assert.equal(B[2], undefined);
  }
});
