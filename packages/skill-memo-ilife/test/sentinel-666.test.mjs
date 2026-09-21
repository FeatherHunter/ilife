/**
 * #666 · 备忘侧：飞书自检 sentinel ＋ 授权引导（D-03 三处改造，本票落任务半场自检）
 *
 * 接缝与注入点同 wish-sync-661（统一出口 ＋ 临时库目录＝配置项 `db.dir` ＋ 挡板＝配置项 `lark.cliPath`，
 * 两者都经**家目录注入**指向的临时家目录里的 `.ilife/memo.yaml` 注入）。#695：那两个环境变量已按用户裁决删除。
 * 授权引导三步（init/qr/poll/status）已由 #665 落地（见 wizard-pages-665 W5/W6），本文件只覆盖自检：
 *
 *  D1 成功链：`memo.auth step:diag` → 建／改／完成／删各一次（argv 逐条可见），回执点名删干净，
 *     本地零写（库 0 行），远端 0 残留。
 *  D2 dryRun：四门过、零远端任务调用，回执 `dryRun:true`。
 *  D3 默认路径零写：`memo.auth` 缺省（status）零 `+create`（D-03 改造①）。
 *  D4 闸门关：挡板 unavailable → exit 4、`remote:'unavailable'`、零任务调用。
 *  D5 建失败：`createFails` → exit 4，`task_create` 记红，无残留。
 *  D6 删失败：内联包装板（只拦 `task tasks delete`，其余透传真挡板；**不碰共享挡板**）→
 *     exit 4，完成态残留＋`left/leftId/cleanup` 点名（D-03 改造②③）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argOf, envelope, makeSeam } from '../../../tooling/contract-seam.mjs';
import { mkMemoConfig, stubPathEnv } from './helpers/config-base.mjs';

function seam(prefix, state) { return makeSeam('memo', { prefix, state }); }

/** 两个注入点（#760 起挡板走 **PATH 首位**：`lark.cliPath` 删键，无显式覆盖）：
 *  临时库写 `db.dir`、挡板目录（`stubDir` 可换成本件自己的内联包装板）放 PATH 首位。 */
function envOfSeam(s, stubDir) {
  const home = mkMemoConfig({ db: { dir: s.dbPath } }, 't666-cfg-');
  return stubPathEnv(home, stubDir ?? s.stub.dir);
}

/** `opts.stubDir` 换挡板目录；`opts.env` 叠本件自己的两个环境变量（包装板用）。 */
function run(s, key, params, opts = {}) {
  s.stub.clearCalls();
  const r = s.runNew(key, params, { extraEnv: { ...envOfSeam(s, opts.stubDir), ...(opts.env ?? {}) } });
  let env = null; let why = null;
  try { env = envelope(r); } catch (e) { why = e.message; }
  return { r, env, why, exit: r.status, argv: s.calls().map((c) => c.argv), rows: s.localNew() };
}

const taskCalls = (argv) => argv.filter((a) => a[0] === 'task');
const opCalls = (argv, op) => argv.filter((a) => a[1] === op);

test('#666 D1 自检成功链：建／改／完成／删各一次，回执点名删干净，本地零写', () => {
  const s = seam('t666-a-');
  const x = run(s, 'memo.auth', { step: 'diag' });
  assert.equal(x.exit, 0, String(x.r.stderr));

  const ops = taskCalls(x.argv).map((a) => a[1]);
  assert.deepEqual(ops, ['+create', '+update', '+complete', 'tasks'], '任务域四步 argv 逐条可见：' + JSON.stringify(ops));
  const del = x.argv.find((a) => a[0] === 'task' && a[1] === 'tasks');
  assert.deepEqual(del.slice(2, 6), ['delete', '--task-guid', x.env.data.remoteId, '--yes'], '真删走原生 resource（#661 真形状）');

  const create = opCalls(x.argv, '+create')[0];
  const summary = argOf(create, '--summary');
  assert.ok(String(summary).startsWith('[备忘录测试]'), '前缀逐字（老 SENTINEL_PREFIX）：' + summary);
  assert.ok(String(summary).includes('任务权限验证'), '标题逐字（老 _sentinel_task）：' + summary);
  assert.equal(argOf(create, '--assignee'), 'ou_stub_user', '指派＝登录身份（老 _get_user_open_id）');
  assert.ok(String(argOf(create, '--description')).includes('memo.auth step:diag'), '新建带自检说明（D-32）');
  assert.equal(argOf(opCalls(x.argv, '+update')[0], '--summary'), summary + '(已更新)', '改题后缀逐字');

  assert.equal(x.env.data.ok, true);
  assert.equal(x.env.data.local, 'checked');
  assert.equal(x.env.data.remote, 'synced');
  assert.ok(String(x.env.data.remoteId).startsWith('tk_'));
  assert.equal(x.env.data.left, null, '删干净：无残留');
  assert.equal(x.env.data.leftId, null);
  assert.equal(x.env.data.cleanup, null);
  assert.deepEqual(x.env.data.steps.map((t) => t.name), ['task_create', 'task_update', 'task_complete', 'task_delete']);
  assert.ok(x.env.data.steps.every((t) => t.ok), '四步全绿');
  assert.deepEqual(x.env.data.errors, []);

  assert.equal(x.rows.length, 0, '本地零写（自检不开库）');
  assert.equal(s.remote().tasks.length, 0, '远端 0 残留');
});

test('#666 D2 dryRun：四门过、零任务调用', () => {
  const s = seam('t666-b-');
  const x = run(s, 'memo.auth', { step: 'diag', dryRun: true });
  assert.equal(x.exit, 0, String(x.r.stderr));
  assert.equal(taskCalls(x.argv).length, 0, 'dryRun 零任务调用');
  assert.equal(x.env.data.ok, true);
  assert.equal(x.env.data.dryRun, true);
  assert.equal(x.env.data.remote, 'not-applicable');
  assert.equal(x.env.data.left, null);
});

test('#666 D3 默认路径零写：不带诊断参数时零 +create', () => {
  const s = seam('t666-c-');
  const x = run(s, 'memo.auth', {});
  assert.equal(x.exit, 0, String(x.r.stderr));
  assert.equal(opCalls(x.argv, '+create').length, 0, '缺省 status 不写任何对象');
  assert.equal(taskCalls(x.argv).length, 0, '缺省连任务域读都不碰');
});

test('#666 D4 闸门关：unavailable → exit 4 且零任务调用', () => {
  const s = seam('t666-d-');
  s.stub.setState({ mode: 'unavailable' });
  const x = run(s, 'memo.auth', { step: 'diag' });
  s.stub.setState({ mode: 'normal' });
  assert.equal(x.exit, 4, '最终没达成即非 0');
  assert.equal(x.env.data.ok, false);
  assert.equal(x.env.data.remote, 'unavailable');
  assert.equal(taskCalls(x.argv).length, 0, '闸门在任何写之前拦住');
  assert.equal(x.env.data.left, null);
});

test('#666 D5 建失败短路：createFails → exit 4，无残留', () => {
  const s = seam('t666-e-');
  s.stub.setState({ createFails: true });
  const x = run(s, 'memo.auth', { step: 'diag' });
  s.stub.setState({ createFails: false });
  assert.equal(x.exit, 4, String(x.r.stderr));
  assert.equal(x.env.data.steps[0].name, 'task_create');
  assert.equal(x.env.data.steps[0].ok, false);
  assert.equal(x.env.data.steps.length, 1, '建失败短路（老同形）');
  assert.equal(x.env.data.left, null, '没建成就没有残留');
  assert.equal(s.remote().tasks.length, 0);
});

/** 内联包装板：只让 `task tasks delete` 恒败，其余透传真挡板。文件落本接缝临时目录，不碰共享挡板。
 *  #760 起它以 `lark-cli` 之名放在独立目录里（`stubDir`），经 PATH 首位注入（`lark.cliPath` 删键）。 */
function failingDeleteShim(s) {
  const real = s.stub.stub;
  const log = s.stub.logFile;
  const wrapDir = join(s.dir, 'wrapshim');
  mkdirSync(wrapDir, { recursive: true });
  const mjs = join(wrapDir, 'fail-delete.mjs');
  writeFileSync(mjs, [
    "import { spawnSync } from 'node:child_process';",
    "import { appendFileSync } from 'node:fs';",
    'const argv = process.argv.slice(2);',
    "if (argv[0] === 'task' && argv[1] === 'tasks' && argv[2] === 'delete') {",
    '  try { appendFileSync(process.env.SENTINEL_CALLS_LOG, JSON.stringify({ argv }) + "\\n"); } catch {}',
    "  process.stderr.write('sentinel-test: task tasks delete 恒败\\n');",
    '  process.exit(4);',
    '}',
    'const r = spawnSync(process.execPath, [process.env.SENTINEL_REAL_STUB, ...argv], { encoding: \'utf8\' });',
    "process.stdout.write(r.stdout || '');",
    "process.stderr.write(r.stderr || '');",
    'process.exit(r.status ?? 1);',
    '',
  ].join('\n'), 'utf8');
  if (process.platform === 'win32') {
    writeFileSync(join(wrapDir, 'lark-cli.cmd'), '@node "' + mjs + '" %*\r\n', 'utf8');
  } else {
    writeFileSync(join(wrapDir, 'lark-cli'), '#!/usr/bin/env node\nimport "./fail-delete.mjs";\n', 'utf8');
    try { chmodSync(join(wrapDir, 'lark-cli'), 0o755); } catch { /* win 无 exec 位 */ }
  }
  return { stubDir: wrapDir, env: { SENTINEL_REAL_STUB: real, SENTINEL_CALLS_LOG: log } };
}

test('#666 D6 删不掉→完成态残留＋点名＋exit 4', () => {
  const s = seam('t666-f-');
  const x = run(s, 'memo.auth', { step: 'diag' }, failingDeleteShim(s));
  assert.equal(x.exit, 4, '删失败即非 0：' + String(x.r.stderr));
  assert.equal(x.env.data.ok, false);

  const guid = x.env.data.remoteId;
  assert.ok(String(guid).startsWith('tk_'));
  assert.equal(x.env.data.leftId, guid, '点名：在哪（远端标识）');
  assert.ok(String(x.env.data.left).includes('测试任务'), '点名：留下了什么：' + x.env.data.left);
  assert.ok(String(x.env.data.cleanup).includes(guid), '点名：怎么清（含标识）：' + x.env.data.cleanup);
  assert.ok(String(x.env.data.message).includes(guid), 'message 同格点名');

  const ops = taskCalls(x.argv).map((a) => a[1]);
  assert.deepEqual(ops, ['+create', '+update', '+complete', 'tasks', '+get-related-tasks'], '删尝试 argv 留痕（末次为删失败后的在不在复核）：' + JSON.stringify(ops));
  const steps = Object.fromEntries(x.env.data.steps.map((t) => [t.name, t.ok]));
  assert.deepEqual(steps, { task_create: true, task_update: true, task_complete: true, task_delete: false });

  const leftover = s.remote().tasks;
  assert.equal(leftover.length, 1, '远端留一条（删失败）');
  assert.ok(leftover[0].completed_at, '残留是完成态（老终态语义保留）');
});
