/**
 * #896 · 飞书探测自洽回归：同一页上档位与三道门必须自洽。
 *
 * 根因：`src/plan/handlers.ts` 重建 `TierReport` 时把 `openId` 写死 null，
 * 而页上「授权登录过」与进度条读 `openId === null` ⇒ 全通页显示「没过」＋ 67%。
 * 修复：回执只带 `authReady` 布尔位（不带 openId 原串，隐私），页上两处改读
 * `report.authenticated`（见 `src/plan/probe.ts` 件头）。
 *
 * 跑法：`node tooling/run-locked.mjs --ticket 896 -- node --test packages/skill-schedule/test/t896-飞书探测自洽.test.mjs`
 * （先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule`）。
 *
 * 变异自证：把 `handlers.ts` 的 `authenticated: data.authReady === true` 改回
 * `authenticated: false`（或把 `feishuDocs.ts` 改回读 `openId`）⇒ full 那一档立刻红
 * （第二道门变「没过」、进度条变 67%）。
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const P = (o) => JSON.stringify(o);
const DAY = '2026-09-21';

let HOME = '';
let SHIM_LOG = '';
let SHIM_MODE = 'full';

function run(args, env = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: homeEnvOf(HOME, { T896_SHIM_LOG: SHIM_LOG, T896_SHIM_MODE: SHIM_MODE, ...env }),
  });
}

function probePage(mode, env = {}) {
  SHIM_MODE = mode;
  const r = run(['schedule.plan.write', '--params', P({ op: 'sync', dryRun: true, date: DAY })], env);
  assert.equal(r.status, 0, '探测须 exit 0：' + String(r.stderr).slice(0, 300));
  const body = JSON.parse(String(r.stdout));
  const html = readFileSync(body.delivery.path, 'utf8');
  return { data: body.data, html };
}

const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const textOf = (html) => markupOf(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
/** KPI 卡「这一趟写了几笔」那一条的进度条（别处布局 width:100% 很多，只认这一颗）。 */
const kpiBarOf = (html) => {
  const m = html.match(/ilife-block-kpi-card-bar-fill[^>]*style="width:(\d+)%"/);
  assert.ok(m, '页上找不到 KPI 进度条');
  return m[1] + '%';
};
/** 「授权登录过」那一格的结果（过了／没过）。 */
const gate2Of = (html) => {
  const t = textOf(html);
  const m = t.match(/授权登录过\s*(过了|没过)/);
  assert.ok(m, '页上找不到「授权登录过」那一格');
  return m[1];
};

const SHIM_JS = `import { appendFileSync } from 'node:fs';
const mode = process.env.T896_SHIM_MODE || 'full';
const log = process.env.T896_SHIM_LOG || '';
const argv = process.argv.slice(2);
if (log) appendFileSync(log, mode + '\\t' + argv.join(' ') + '\\n');
const say = (o) => process.stdout.write(JSON.stringify(o));
if (argv[0] === '--version') { process.stdout.write('lark-cli version 9.9.9\\n'); process.exit(0); }
if (argv[0] === 'auth') { if (mode === 'no-auth') process.exit(1); say({ identities: { user: { openId: 'ou-t896' } } }); process.exit(0); }
if (argv[0] === 'calendar') {
  if (argv[1] !== '+agenda') process.exit(1);
  if (mode === 'no-calendar') process.exit(1);
  say({ data: [] }); process.exit(0);
}
process.exit(1);
`;

function installShim() {
  const log = join(HOME, 'shim.log');
  mkdirSync(join(HOME, 'AppData', 'Roaming', 'npm'), { recursive: true });
  const shimDir = join(HOME, 'shim');
  mkdirSync(shimDir, { recursive: true });
  writeFileSync(join(shimDir, 'shim.mjs'), SHIM_JS, 'utf8');
  writeFileSync(join(HOME, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd'),
    '@echo off\r\n"' + process.execPath + '" "' + join(shimDir, 'shim.mjs') + '" %*\r\n', 'utf8');
  writeFileSync(log, '', 'utf8');
  SHIM_LOG = log;
}

before(() => { HOME = mkdtempSync(join(tmpdir(), 'sched896-')); installShim(); });
after(() => { rmSync(HOME, { recursive: true, force: true }); });

test('全通档自洽：tier=full ＋ 第二道门=过了 ＋ 进度条=100%', () => {
  const { data, html } = probePage('full');
  assert.equal(data.tier, 'full');
  assert.equal(data.authReady, true, '回执须带 authReady=true（布尔位透传）');
  assert.equal(gate2Of(html), '过了');
  assert.equal(kpiBarOf(html), '100%');
  assert.ok(textOf(html).includes('全通'));
});

test('装了没登录档自洽：tier=partial ＋ 第二道门=没过 ＋ 进度条=33%', () => {
  const { data, html } = probePage('no-auth');
  assert.equal(data.tier, 'partial');
  assert.equal(data.authReady, false);
  assert.equal(gate2Of(html), '没过');
  assert.equal(kpiBarOf(html), '33%');
});

test('装了登了但日历拉不动档自洽：tier=partial ＋ 第二道门=过了 ＋ 进度条=67%', () => {
  const { data, html } = probePage('no-calendar');
  assert.equal(data.tier, 'partial');
  assert.equal(data.authReady, true, '日历没过但授权过了，布尔位须仍为 true');
  assert.equal(gate2Of(html), '过了');
  assert.equal(kpiBarOf(html), '67%');
});

test('没装档自洽：tier=missing ＋ 第二道门=没过 ＋ 进度条=0%', () => {
  const shimPath = join(HOME, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd');
  renameSync(shimPath, shimPath + '.off');
  let out;
  try {
    out = probePage('full', { PATH: '' });
  } finally {
    renameSync(shimPath + '.off', shimPath);
  }
  assert.equal(out.data.tier, 'missing');
  assert.equal(gate2Of(out.html), '没过');
  assert.equal(kpiBarOf(out.html), '0%');
});
