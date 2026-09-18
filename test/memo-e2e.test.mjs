import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readdirSync, chmodSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpLookup, routeWakeword } from '../packages/skill-memo-ilife/dist/index.js';
import { mkMemoDb, seedNote } from '../packages/skill-memo-ilife/test/helpers/memo-sqlite.mjs';
import { mkMemoConfig } from '../packages/skill-memo-ilife/test/helpers/config-base.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'tooling/skilllink.mjs');
let DB = '';
let CFG = '';

function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch { /* 试下一个 */ }
  }
  return process.execPath;
}
const NODE = nodeBin();
// #695：两个注入点都改成**配置文件**——库目录写 `db.dir`、假 lark 的路径写 `lark.cliPath`
// （两者都住 `CFG`／`memo.yaml`）。测试隔离的唯一口子是 `ILIFE_CONFIG_DIR`：
// 跑在 node 测试运行器里却没设它时，公共层直接抛 `CONFIG_TEST_ISOLATION_MISSING`（响亮失败）。
function run(args, envExtra) {
  return spawnSync(NODE, [cli, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...(envExtra || {}) } });
}

// fake lark-cli（sync 全链路用；posix shebang / win .cmd 转调）。
// #661：`memo.sync` 已是真反向对账（要拉远端任务列表），挡板得答任务域那条读命令——
// 答空列表＝「远端一条任务都没有」，对账应全 0 且全成（errors 为空 ⇒ 退出码 0）。
function makeFakeCli(dir) {
  const logic = [
    'const a = process.argv.slice(2);',
    "if (a[0] === '--version') { console.log('lark-cli 9.9.9-fake'); }",
    "else if (a[0] === 'auth' && a[1] === 'status') { console.log(JSON.stringify({ identities: { user: { openId: 'ou_fake' } } })); }",
    "else if (a[0] === 'auth' && a[1] === 'check') { process.exit(a[3] === 'task' ? 0 : 1); }",
    "else if (a[0] === 'task') { console.log(JSON.stringify({ ok: true, data: { items: [] } })); }",
    'else { console.error(\'unknown\'); process.exit(2); }',
    '',
  ].join('\n');
  if (process.platform === 'win32') {
    const mjs = join(dir, 'fakelark.mjs');
    writeFileSync(mjs, logic);
    const cmd = join(dir, 'fakelark.cmd');
    writeFileSync(cmd, '@node "' + mjs + '" %*\r\n');
    return cmd;
  }
  const sh = join(dir, 'fakelark');
  writeFileSync(sh, '#!/usr/bin/env node\n' + logic);
  try { chmodSync(sh, 0o755); } catch { /* win 无 exec 位 */ }
  return sh;
}

before(() => {
  // #665 DB 对齐：种子库是直连的 `memo.db`（老表形状），不再是 JSON 目录。
  DB = mkMemoDb('memoe2e-');
  seedNote(DB, { content: '今天去医院复查', category: '备忘' });
  seedNote(DB, { content: '今天跑步5公里', category: '打卡' });
  // #695 起配置文件的唯一真相是 `<ILIFE_CONFIG_DIR>/memo.yaml`（环境变量读取已删）：
  // 库目录用配置项 `db.dir` 指回种子库那本 `memo.db`（该件本就拿 `DB` 当库目录，路径断言不动）；
  // 假 lark 走配置项 `lark.cliPath`（原来那一格是环境变量 `LARK_CLI_PATH`）。
  CFG = mkMemoConfig({ db: { dir: DB }, lark: { cliPath: makeFakeCli(DB) } }, 'memoe2e-cfg-');
  process.env.ILIFE_CONFIG_DIR = CFG; // 本进程这一格给子进程继承（`run()` 是 `{...process.env}`）
});

function read(key, params) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  const r = run(['read', ...a]);
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + r.stderr);
  const env = JSON.parse(r.stdout);
  assert.equal(env.key, key);
  return env;
}

describe('备忘录联动端到端 M7', () => {
  it('读键全链路（registry→spawn 出口→envelope）', () => {
    assert.equal(read('memo.search', { q: '跑步' }).shape, 'list');
    assert.equal(read('memo.detail', { id: 1 }).shape, 'detail');
    assert.equal(read('memo.remind').data.total, 0);
    assert.equal(read('memo.wish').shape, 'list');
    assert.equal(read('memo.stats').data.metrics.count, 2);
    assert.equal(read('memo.sync').shape, 'receipt');
  });
  it('写键闭环（建→改→删）', () => {
    const c = read('memo.create', { title: '买奶', category: '备忘' });
    const id = Number(c.data.message.replace('已记一条：', ''));
    assert.ok(id > 0);
    assert.equal(read('memo.update', { id, body: '买牛奶' }).shape, 'receipt');
    assert.equal(read('memo.remove', { id, confirm: true }).shape, 'receipt');
    assert.equal(read('memo.batch').shape, 'receipt');
  });
  it('完成心愿走原子转换（建侧降级故无远端对象可标，完成即达成）', () => {
    // mini 挡板的 `task +create` 不回标识（只回空 items）：建心愿本地照落、退出码非 0；
    // skilllink 非 0 时不透传子进程 stdout（只看退出码），id 改走 memo.search 取。
    const c = run(['read', 'memo.create', '--params', JSON.stringify({ title: '学游泳', category: '心愿' })]);
    assert.equal(c.status, 4, 'stderr=' + c.stderr);
    const found = read('memo.search', { q: '学游泳' });
    assert.equal(found.data.total, 1);
    const id = found.data.items[0].id;
    // 本地无远端标识 ⇒ 完成只做本地原子转换即达成（不碰远端，exit 0）。
    const w = read('memo.update', { id, done: true, content: '第一次下水' });
    assert.match(w.data.message, /已完成，打卡/);
    assert.equal(read('memo.search', { q: '学游泳' }).data.total, 0);
    const checkin = read('memo.search', { q: '第一次下水' });
    assert.equal(checkin.data.total, 1);
    assert.equal(checkin.data.items[0].category, '打卡');
  });
  it('HELP 现找一句可执行（框架 6 条第 2 条）', () => {
    const hit = buildHelpLookup().find((h) => h.phrase === '查打卡');
    const rt = routeWakeword(hit.phrase, {});
    assert.equal(rt.key, hit.key);
    assert.equal(read(rt.key, rt.params).shape, 'list');
  });
  it('对不上即 fail，不返空', () => {
    const r = run(['read', 'memo.nope']);
    assert.equal(r.status, 3);
    assert.equal(r.stdout, '');
  });
  it('仓内无 py 残留（验收第 5 条）', () => {
    const bad = [];
    const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (f === 'node_modules' || f === '.git' || f === 'dist') continue; const s = statSync(p); if (s.isDirectory()) walk(p); else if (f.endsWith('.py')) bad.push(p); } };
    walk(join(root, 'packages'));
    assert.deepEqual(bad, []);
  });
});
