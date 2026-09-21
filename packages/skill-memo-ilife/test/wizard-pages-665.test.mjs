/**
 * #665 · 向导三条 ＋ 批量改分类 ＋ 同步报告页 ＋ 授权引导 —— 一条命令出一张页
 *
 * 验收（票面）：每条路各一条读数——回执里的 `delivery{mode,path,bytes}` ＋ 落盘件存在且体积一致；
 * 页面渲染走共享渲染层（读数落在 `tooling/skill-html-snapshot.mjs --check` 产物面）；
 * 「改坏必红／还原必绿」两行机器读数见 `docs/skills/skill-memo-ilife/t658-C-向导与页面-证据.md`。
 *
 * 接缝与注入点同 wish-sync-661（统一出口 ＋ 临时库目录＝配置项 `db.dir` ＋ 挡板＝配置项 `lark.cliPath`，
 * 两者都经**家目录注入**指向的临时家目录里的 `.ilife/memo.yaml` 注入）。#695：那两个环境变量已按用户裁决删除。
 * 授权三步另用本文件自带的 mini 挡板（只认授权域三条 argv，老 `feishu_auth_helper.py` 形状）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope, makeSeam } from '../../../tooling/contract-seam.mjs';
import { mkMemoDb } from './helpers/memo-sqlite.mjs';
import { configEnv, mkMemoConfig } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist/cli/cmd_read.js');

function seam(prefix, state) { return makeSeam('memo', { prefix, state }); }

/** 两个注入点都改走**配置文件**（#695：`SKILLS_DB_PATH`／`LARK_CLI_PATH` 的读取已按用户裁决删除）：
 *  临时库写 `db.dir`、挡板写 `lark.cliPath`；测试隔离的唯一口子是**家目录注入**。 */
function envOfSeam(s, cliPath) {
  return configEnv(mkMemoConfig({ db: { dir: s.dbPath }, lark: { cliPath: cliPath ?? s.stub.file } }, 't665-cfg-'));
}

/** 出口调用器：`opts.html` 照旧透传，`opts.cliPath` 可换挡板，其余照 `makeSeam` 的 `runNew`。 */
function newRun(s, key, params, opts = {}) {
  const { cliPath, ...rest } = opts;
  return s.runNew(key, params, { ...rest, extraEnv: envOfSeam(s, cliPath) });
}

/** 跑一路，断言 delivery 三件套：回执有 delivery{mode,path,bytes}、落盘存在、体积一致。返回 envelope＋delivery。 */
function runPage(s, key, params, file) {
  const r = newRun(s, key, params, { html: file });
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + String(r.stderr).slice(0, 400));
  const env = envelope(r);
  const d = env.delivery;
  assert.ok(d && typeof d === 'object', key + ' 回执缺 delivery');
  assert.equal(typeof d.mode, 'string', key + ' delivery 缺 mode');
  assert.equal(typeof d.path, 'string', key + ' delivery 缺 path');
  assert.equal(typeof d.bytes, 'number', key + ' delivery 缺 bytes');
  assert.equal(d.path, file, key + ' 显式路径须逐字落点');
  assert.ok(existsSync(d.path), key + ' 落盘件不存在：' + d.path);
  assert.equal(statSync(d.path).size, d.bytes, key + ' 体积不一致');
  return { r, env, d };
}

/* ─────────────── 向导三条 ─────────────── */

test('#665 W1 排期向导：一路出一张排期页（delivery＋落盘＋内容）', () => {
  const s = seam('t665-w1-');
  assert.equal(newRun(s, 'memo.create', { title: '学游泳', body: '学游泳', category: '心愿' }).status, 0);
  assert.equal(newRun(s, 'memo.create', { title: '跑马', body: '跑马', category: '心愿', due: '2026-10-05' }).status, 0);
  const file = join(s.dir, 'wish-plan.html');
  const { env, d } = runPage(s, 'memo.wish', { wizard: 'plan', suggestDue: '2026-10-01' }, file);
  assert.equal(env.data.total, 1, '默认只列未排期');
  assert.equal(env.data.suggestDue, '2026-10-01');
  const html = readFileSync(d.path, 'utf8');
  assert.ok(html.includes('<title>心愿排期向导</title>'), '页面 chrome 须是排期向导（模板错位即红）');
  assert.ok(html.includes('学游泳'));
  assert.ok(!html.includes('<!--INJECT-DATA-->'), '三标记须填完');
  const all = newRun(s, 'memo.wish', { wizard: 'plan', all: true });
  assert.equal(all.status, 0, String(all.stderr));
  assert.equal(envelope(all).data.total, 2, 'all 含已排期');
});

test('#665 W2 完成向导：一路出一张完成页（默认不勾选）', () => {
  const s = seam('t665-w2-');
  assert.equal(newRun(s, 'memo.create', { title: '学琴', body: '学琴', category: '心愿' }).status, 0);
  const file = join(s.dir, 'wish-complete.html');
  const { env, d } = runPage(s, 'memo.wish', { wizard: 'complete' }, file);
  assert.equal(env.data.total, 1);
  assert.equal(env.data.items[0].selected, false);
  assert.ok(readFileSync(d.path, 'utf8').includes('心愿完成向导'));
});

test('#665 W3 批量改分类：收集出一张向导页，执行改分类', () => {
  const s = seam('t665-w3-');
  assert.equal(newRun(s, 'memo.create', { title: '买奶', body: '买奶', category: '备忘' }).status, 0);
  const file = join(s.dir, 'change-category.html');
  const { env, d } = runPage(s, 'memo.batch', { fromCategory: '备忘', toCategory: '打卡' }, file);
  assert.equal(env.data.total, 1);
  assert.ok(readFileSync(d.path, 'utf8').includes('批量改分类向导'));
  const id = env.data.items[0].id;
  const x = newRun(s, 'memo.batch', { ids: [id], toCategory: '打卡' });
  assert.equal(x.status, 0, String(x.stderr));
  assert.equal(envelope(x).data.updated, 1);
  assert.equal(s.localNew().find((n) => n.id === id).category, '打卡');
});

/* ─────────────── 同步报告页 ─────────────── */

test('#665 W4 同步报告：memo.sync 随行出报告页（默认落盘＋显式路径）', () => {
  const s = seam('t665-w4-');
  assert.equal(newRun(s, 'memo.create', { title: '学游泳', body: '学游泳', category: '心愿' }).status, 0);
  // 缺省（不带 --html）：落默认 memo_html/同步报告*.html，照样给 delivery。
  const plain = newRun(s, 'memo.sync', {});
  assert.equal(plain.status, 0, String(plain.stderr));
  const env0 = envelope(plain);
  assert.ok(env0.delivery && env0.delivery.path, '缺省也要出 delivery');
  assert.ok(existsSync(env0.delivery.path));
  assert.equal(statSync(env0.delivery.path).size, env0.delivery.bytes);
  // 显式路径：逐字落点。
  const file = join(s.dir, 'sync-report.html');
  const { d } = runPage(s, 'memo.sync', {}, file);
  assert.ok(readFileSync(d.path, 'utf8').includes('备忘录同步报告'));
});

/* ─────────────── 授权引导三步 ─────────────── */

function makeAuthFake(dir) {
  const log = join(dir, 'auth-calls.jsonl');
  writeFileSync(log, '', 'utf8');
  const logic = [
    "const fs = require('node:fs');",
    'const a = process.argv.slice(2);',
    'fs.appendFileSync(' + JSON.stringify(log) + ", JSON.stringify(a) + '\\n');",
    "if (a[0] === 'config' && a[1] === 'init') { console.log(JSON.stringify({ device_code: 'dc_1', verification_url: 'https://x/1', user_code: 'u1', expires_in: 600 })); }",
    "else if (a[0] === 'auth' && a[1] === 'qrcode') { console.log('qr-ok'); }",
    "else if (a[0] === 'auth' && a[1] === 'login') { console.log(JSON.stringify({ ok: true, user: { openId: 'ou_1' } })); }",
    "else if (a[0] === 'auth' && a[1] === 'status') { console.log(JSON.stringify({ ok: true })); }",
    "else { console.error('unknown'); process.exit(2); }",
    '',
  ].join('\n');
  if (process.platform === 'win32') {
    const cjs = join(dir, 'fakeauth.cjs');
    writeFileSync(cjs, logic);
    const cmd = join(dir, 'fakeauth.cmd');
    writeFileSync(cmd, '@node "' + cjs + '" %*\r\n');
    return { cli: cmd, log };
  }
  const sh = join(dir, 'fakeauth');
  writeFileSync(sh, '#!/usr/bin/env node\n' + logic);
  chmodSync(sh, 0o755);
  return { cli: sh, log };
}

function runAuth(cli, key, params) {
  const dir = mkMemoDb('t665-auth-');
  const cfg = mkMemoConfig({ db: { dir }, lark: { cliPath: cli } }, 't665-authcfg-');
  return spawnSync(process.execPath, [bin, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    env: configEnv(cfg),
  });
}

test('#665 W5 授权引导：init／qr／poll／status 四步形状（老 helper 三步＋诊断）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't665-authfake-'));
  const fake = makeAuthFake(dir);
  const calls = () =>
    readFileSync(fake.log, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));

  const init = runAuth(fake.cli, 'memo.auth', { step: 'init' });
  assert.equal(init.status, 0, init.stderr);
  assert.equal(envelope(init).data.device_code, 'dc_1');
  assert.deepEqual(calls()[0].slice(0, 6), ['config', 'init', '--new', '--brand', 'feishu', '--no-wait']);

  const qr = runAuth(fake.cli, 'memo.auth', { step: 'qr', url: 'https://x/1', outDir: dir });
  assert.equal(qr.status, 0, qr.stderr);
  assert.ok(envelope(qr).data.qrPath.endsWith('.png'));
  assert.deepEqual(calls()[1].slice(0, 3), ['auth', 'qrcode', 'https://x/1']);

  const poll = runAuth(fake.cli, 'memo.auth', { step: 'poll', deviceCode: 'dc_1' });
  assert.equal(poll.status, 0, poll.stderr);
  assert.equal(envelope(poll).data.ok, true);
  assert.deepEqual(calls()[2].slice(0, 5), ['auth', 'login', '--domain', 'task', '--device-code']);

  const st = runAuth(fake.cli, 'memo.auth', { step: 'status' });
  assert.equal(st.status, 0, st.stderr);
  assert.equal(envelope(st).data.step, 'status');
});

test('#665 W6 授权引导：lark 缺席即大声失败（不断言真飞书）', () => {
  const dir = mkMemoDb('t665-authoff-');
  const cfg = mkMemoConfig({ db: { dir }, lark: { cliPath: join(dir, 'no-lark') } }, 't665-authoffcfg-');
  const r = spawnSync(process.execPath, [bin, 'memo.auth', '--params', JSON.stringify({ step: 'init' })], {
    encoding: 'utf8',
    env: configEnv(cfg),
  });
  assert.equal(r.status, 4);
});
