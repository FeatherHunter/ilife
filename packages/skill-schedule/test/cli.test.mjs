import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
/** 临时**家目录**（#763 起隔离＝家目录注入）：配置落 `<它>/.ilife/schedule.yaml`，库落 `<它>/.ilife/data/`。 */
let CFG = '';
/** 库目录＝`<家目录>/.ilife/data`（`db.dir` 空串即配置给出的数据目录）。 */
let DB = '';

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
const P = (o) => JSON.stringify(o);

/** 子进程的 PATH：只留 node 与系统目录——真机上可能装着真 lark-cli（`where` 会命中），
 *  本文件的判据要的是「远端一律不在场」的确定性红，故把那条路掐掉。
 *  （#764 起配置项 `lark.cliPath` 已删，钉红只能靠查无此 CLI。） */
function noLarkPath() {
  const nodeDir = NODE === 'node' ? dirname(process.execPath) : dirname(NODE);
  const parts = process.platform === 'win32'
    ? [nodeDir, join(process.env.SystemRoot || 'C:\\Windows', 'System32'), process.env.SystemRoot || 'C:\\Windows']
    : [nodeDir, '/usr/bin', '/bin'];
  return parts.join(delimiter);
}

function run(args, envExtra) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, ...homeEnvOf(CFG), PATH: noLarkPath(), ...(envExtra || {}) } });
}

before(() => {
  CFG = mkdtempSync(join(tmpdir(), 'schedcli-home-'));
  useHome(CFG);          // 本进程也要接管家目录（`saveConfig` 与子进程读的是同一份）
  requireIsolatedHome(); // 接完当场自证
  DB = join(configDirOf(CFG), 'data');
  // #764：远端一律不可用——配置项 `lark.cliPath` 已删（不再有显式覆盖点），
  // 这里靠 `run()` 的 PATH 掐掉真 CLI 的落点（npm 全局候选用临时家目录、本机 PATH 不继承），
  // 故远端门必红（`findLarkCli()` 返 null）、本地那一侧照写。
  // 种子：9 月两块 + 8 月一块（对比用）+ 日程一条
  assert.equal(run(['schedule.record.write', '--params', P({ op: 'add', date: '2026-09-06', time_start: '09:00', time_end: '10:00', activity: '调优', category: '工作.AI调优' })]).status, 0);
  assert.equal(run(['schedule.record.write', '--params', P({ op: 'add', date: '2026-09-07', time_start: '07:00', time_end: '08:00', activity: '跑步', category: '健康.运动' })]).status, 0);
  assert.equal(run(['schedule.record.write', '--params', P({ op: 'add', date: '2026-08-06', time_start: '09:00', time_end: '10:00', activity: '调优', category: '工作.AI调优' })]).status, 0);
  assert.equal(run(['schedule.plan.write', '--params', P({ op: 'ensure', date: '2026-09-06', time_start: '09:00', time_end: '10:00', title: '晨会', feishu: 'skip' })]).status, 0);
});

describe('作息唯一出口 cmd_read（8 键全票）', () => {
  it('record.today：exit 0 + 纯 JSON list + 相对日期', () => {
    const r = run(['schedule.record.today', '--params', P({ date: '2026-09-06' })]);
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.skill, 'schedule');
    assert.equal(env.data.total, 1);
    assert.equal(env.data.items[0].activity, '调优');
  });
  it('record.range：stat metrics 全 number；空区间 exit 4', () => {
    const r = run(['schedule.record.range', '--params', P({ start: '2026-09-01', end: '2026-09-30' })]);
    assert.equal(r.status, 0);
    const { metrics } = JSON.parse(r.stdout).data;
    for (const v of Object.values(metrics)) assert.equal(typeof v, 'number');
    assert.equal(metrics.blocks, 2);
    assert.equal(run(['schedule.record.range', '--params', P({ start: '2020-01-01', end: '2020-01-02' })]).status, 4);
  });
  it('record.detail：按 id；查无对条 exit 4', () => {
    assert.equal(JSON.parse(run(['schedule.record.detail', '--params', P({ id: 1 })]).stdout).data.item.activity, '调优');
    const miss = run(['schedule.record.detail', '--params', P({ id: 999 })]);
    assert.equal(miss.status, 4);
    assert.equal(miss.stdout, '');
  });
  it('record.write：修正闭环 + 写摘要', () => {
    const u = run(['schedule.record.write', '--params', P({ op: 'amend', id: 1, activity: '调优v2' })]);
    assert.equal(u.status, 0);
    assert.match(JSON.parse(u.stdout).data.message, /edit_count=1/);
    const s = run(['schedule.record.write', '--params', P({ op: 'summary', date: '2026-09-06', category: '工作', total_minutes: 60 })]);
    assert.equal(s.status, 0);
    assert.equal(run(['schedule.record.write', '--params', P({ op: 'add', date: '2026-09-06', time_start: '10:00', time_end: '09:00', activity: 'x', category: '工作' })]).status, 2);
  });
  it('record.compare：months 对比 analysis 非空', () => {
    const r = run(['schedule.record.compare', '--params', P({ kind: 'months', monthA: '2026-08', monthB: '2026-09' })]);
    assert.equal(r.status, 0);
    assert.match(JSON.parse(r.stdout).data.summary, /健康分/);
    const a = run(['schedule.record.compare', '--params', P({ kind: 'anomaly', windowDays: 7, end: '2026-09-07' })]);
    assert.equal(a.status, 0);
  });
  it('plan.today：查日程 + 标题搜 + 多日', () => {
    const r = run(['schedule.plan.today', '--params', P({ date: '2026-09-06' })]);
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).data.total, 1);
    const t = run(['schedule.plan.today', '--params', P({ date: '2026-09-06', title: '晨会' })]);
    assert.equal(JSON.parse(t.stdout).data.total, 1);
    const m = run(['schedule.plan.today', '--params', P({ dates: ['2026-09-06', '2026-09-07'] })]);
    assert.equal(m.status, 0);
  });
  it('plan.write：preview/upsert/ensure 幂等/update/deactivate/review', () => {
    // #660 起写 op 统一成合成写（本地 ＋ 远端一条命令）：本用例只判本地那一半，故显式 `feishu:'skip'`；
    // 合成写的四条读数与退出码语义见 `test/plan-feishu-660.test.mjs`（打挡板）。
    const ev = (s, e, title) => ({ time_start: s, time_end: e, title });
    const pv = run(['schedule.plan.write', '--params', P({ op: 'preview', date: '2026-09-09', events: [ev('00:00', '12:00', '上'), ev('12:00', '23:59', '下')] })]);
    assert.equal(pv.status, 0);
    assert.match(JSON.parse(pv.stdout).data.message, /预览通过/);
    assert.equal(run(['schedule.plan.write', '--params', P({ op: 'preview', date: '2026-09-09', events: [ev('01:00', '12:00', '上')] })]).status, 2);
    const up = run(['schedule.plan.write', '--params', P({ op: 'upsert', date: '2026-09-09', events: [ev('00:00', '12:00', '上'), ev('12:00', '23:59', '下')], feishu: 'skip' })]);
    assert.equal(up.status, 0);
    const en = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: '2026-09-10', time_start: '09:00', time_end: '10:00', title: '补', feishu: 'skip' })]);
    assert.match(JSON.parse(en.stdout).data.message, /已补计划/);
    const en2 = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: '2026-09-10', time_start: '09:00', time_end: '10:00', title: '补', feishu: 'skip' })]);
    assert.match(JSON.parse(en2.stdout).data.message, /幂等/);
    const id = JSON.parse(run(['schedule.plan.today', '--params', P({ date: '2026-09-09' })]).stdout).data.items[0].id;
    assert.equal(run(['schedule.plan.write', '--params', P({ op: 'update', id, completion: '已完成', feishu: 'skip' })]).status, 0);
    assert.equal(run(['schedule.plan.write', '--params', P({ op: 'deactivate', id, feishu: 'skip' })]).status, 0);
    const rv = run(['schedule.plan.write', '--params', P({ op: 'review', date: '2026-09-09' })]);
    assert.equal(rv.status, 0);
    assert.match(JSON.parse(rv.stdout).data.message, /已复盘/);
  });
  it('#660 退出码：远端不在场时本地照写、回执分字段、退出码非 0（降级那一条）', () => {
    const r = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: '2026-09-11', time_start: '09:00', time_end: '10:00', title: '降级读' })]);
    assert.equal(r.status, 4, '本地成了但远端没成 ⇒ 退出码非 0');
    const d = JSON.parse(r.stdout).data;
    assert.equal(d.local, 'created');
    assert.equal(d.remote, 'unavailable');
    assert.equal(d.remoteId, null);
    assert.equal(d.achieved, false);
  });
  it('help.lookup：全表 + 现找 + 空结果指引 + 飞书缺失阻断', () => {
    // #203：缺省（不给参）改走「HELP 文件交付」支（见 test/help-delivery-203.test.mjs）；
    // 速查全表改由显式 `q:''`（空检索＝不过滤）取，断言原样保留。
    const h = run(['schedule.help.lookup', '--params', P({ q: '' })]);
    assert.equal(h.status, 0);
    assert.ok(JSON.parse(h.stdout).data.total >= 40);
    const q = run(['schedule.help.lookup', '--params', P({ q: '帮我查作息' })]);
    assert.ok(JSON.parse(q.stdout).data.items.some((x) => x.key === 'schedule.record.today'));
    const empty = run(['schedule.help.lookup', '--params', P({ q: '不存在的词zzz' })]);
    assert.equal(empty.status, 0);
    const ed = JSON.parse(empty.stdout).data;
    assert.equal(ed.total, 0);
    assert.ok(typeof ed.hint === 'string' && ed.hint.includes('定时') && ed.hint.includes('早睡') && ed.hint.includes('以外置为准'));
    const sync = run(['schedule.plan.write', '--params', P({ op: 'sync', date: '2026-09-06' })]);
    assert.equal(sync.status, 4);
  });
  it('契约：未知 key 3 且 stdout 空；坏参 2；配置件读不出来 1；--html 落盘', () => {
    const k = run(['schedule.nope']);
    assert.equal(k.status, 3);
    assert.equal(k.stdout, '');
    assert.equal(run(['schedule.record.today', '--params', '[]']).status, 2);
    assert.equal(run(['schedule.record.today', '--timeout', 'abc']).status, 2);
    assert.equal(run(['nope']).status, 3);
    // #695／#763：库目录不再吃环境变量（`SKILLS_DB_PATH` 已删），配置改由**家目录**定位，
    // 于是「没配」这一档（原 `SKILLS_DB_PATH: ''`）不存在了；同一位上现在锁「配置件读不出来 ⇒ 预检 exit 1」。
    // 办法：另造一份**家目录**，把它的 `.ilife/schedule.yaml` 写坏（不认识的键），再用家目录两格把子进程指过去——
    // 故意**不**拿「缺隔离」做真出口实验：守卫万一 fail-open，真出口就会落到真实家目录（那种实验见 config-695 ④ 的探针）。
    const badHome = mkdtempSync(join(tmpdir(), 'schedcli-bad-'));
    mkdirSync(configDirOf(badHome), { recursive: true });
    writeFileSync(join(configDirOf(badHome), 'schedule.yaml'), 'db:\n  dirx: "x"\n', 'utf8');
    const noCfg = run(['schedule.record.today'], { USERPROFILE: badHome, HOME: badHome });
    assert.equal(noCfg.status, 1, '配置件读不出来归「预检」那一档：' + noCfg.stderr);
    assert.equal(noCfg.stdout, '', '失败时 stdout 不吐任何 JSON（不假装成功）');
    assert.match(noCfg.stderr, /不认识的配置项/, 'stderr 须是配置件那句人话：' + noCfg.stderr);
    assert.match(noCfg.stderr, /schedule\.yaml/, '报错须点名坏在哪份配置件：' + noCfg.stderr);
    const p = join(DB, 'out.html');
    const r = run(['schedule.record.today', '--params', P({ date: '2026-09-06' }), '--html', p]);
    assert.equal(r.status, 0);
    assert.match(readFileSync(p, 'utf8'), /<section/);
  });
});
