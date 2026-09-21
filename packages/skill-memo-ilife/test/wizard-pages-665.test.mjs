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
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope, makeSeam } from '../../../tooling/contract-seam.mjs';
import { mkMemoDb } from './helpers/memo-sqlite.mjs';
import { mkMemoConfig, noLarkPathEnv, stubPathEnv } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist/cli/cmd_read.js');

function seam(prefix, state) { return makeSeam('memo', { prefix, state }); }

/** 两个注入点（#760 起挡板走 **PATH 首位**：`lark.cliPath` 删键，无显式覆盖）：
 *  临时库写 `db.dir`、挡板目录放 PATH 首位；测试隔离的口子是**家目录注入**。 */
function envOfSeam(s) {
  const home = mkMemoConfig({ db: { dir: s.dbPath } }, 't665-cfg-');
  return stubPathEnv(home, s.stub.dir);
}

/** 出口调用器：其余照 `makeSeam` 的 `runNew`。 */
function newRun(s, key, params, opts = {}) {
  return s.runNew(key, params, { ...opts, extraEnv: envOfSeam(s) });
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

/* ─────────────── 授权引导已退役（#760） ─────────────── */

test('#665 W5 授权引导已退役：init／qr／poll 只认 status/diag，status 仍可用', () => {
  const s = seam('t665-w5-');
  for (const params of [{ step: 'init' }, { step: 'qr', url: 'https://x/1' }, { step: 'poll', deviceCode: 'dc_1' }]) {
    const r = newRun(s, 'memo.auth', params);
    assert.equal(r.status, 2, JSON.stringify(params) + ' 应 exit 2：' + String(r.stderr));
    assert.match(String(r.stderr), /已退役/, '退役分支须点名去处：' + String(r.stderr));
    assert.match(String(r.stderr), /lark\.prompt/, '退役分支须指到复制安装指引：' + String(r.stderr));
  }

  const st = newRun(s, 'memo.auth', { step: 'status' });
  assert.equal(st.status, 0, st.stderr);
  assert.equal(envelope(st).data.step, 'status');
  assert.ok(envelope(st).data.identities, 'status 回执带授权状态真值');
});

test('#665 W6 飞书缺席即大声失败＋带安装指引（#760）', () => {
  const dir = mkMemoDb('t665-authoff-');
  const home = mkMemoConfig({ db: { dir } }, 't665-authoffcfg-');
  const r = spawnSync(process.execPath, [bin, 'memo.auth', '--params', JSON.stringify({ step: 'status' })], {
    encoding: 'utf8',
    env: noLarkPathEnv(home),
  });
  assert.equal(r.status, 4, '缺席走 exit 4：' + String(r.stderr));
  assert.match(String(r.stderr), /lark-cli 未找到/, '点名缺席：' + String(r.stderr));
  assert.match(String(r.stderr), /飞书CLI官网为：https:\/\/www\.feishu\.cn\/feishu-cli/, '官网行逐字：' + String(r.stderr));
  assert.match(String(r.stderr), /lark\.prompt/, '指到复制安装指引：' + String(r.stderr));
});
