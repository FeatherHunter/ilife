import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { billEnv, configDirOf, saveHomeEnv } from './helpers/config-base.mjs';
import { realHomeDir } from '../../../test/helpers/real-home-snapshot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
let DB = '';

function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch {}
  }
  return process.execPath;
}
const NODE = nodeBin();
function run(args, envExtra) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(DB, envExtra) });
}
const P = (o) => JSON.stringify(o);

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'billcli-'));
  assert.equal(run(['bill.record.add', '--params', P({ category: '餐饮/外卖/午餐', amount: -35, time: '2026-09-06 12:00:00', note: '午饭 #工作餐', account: '支付宝' })]).status, 0);
  assert.equal(run(['bill.record.add', '--params', P({ category: '餐饮/堂食/晚餐', amount: -58, time: '2026-09-06 19:00:00', note: '晚饭', account: '微信' })]).status, 0);
  assert.equal(run(['bill.record.add', '--params', P({ category: '工资/基本工资', amount: 8000, time: '2026-09-01 09:00:00', note: '9月工资' })]).status, 0);
  assert.equal(run(['bill.record.add', '--params', P({ category: '餐饮/外卖/午餐', amount: -42, time: '2026-08-06 12:00:00', note: '午饭' })]).status, 0);
});

describe('饼干记账唯一出口 cmd_read（16 键全票）', () => {
  it('record.today：exit 0 + 纯 JSON list', () => {
    const r = run(['bill.record.today', '--params', P({ date: '2026-09-06' })]);
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.skill, 'bill');
    assert.equal(env.data.total, 2);
  });
  it('record.range：条件查 + 空区间 exit 4', () => {
    const r = run(['bill.record.range', '--params', P({ start: '2026-09-01', end: '2026-09-30' })]);
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).data.total, 3);
    const c = run(['bill.record.range', '--params', P({ category: '餐饮' })]);
    assert.equal(c.status, 0);
    assert.ok(JSON.parse(c.stdout).data.total >= 3);
    assert.equal(run(['bill.record.range', '--params', P({ start: '2020-01-01', end: '2020-01-02' })]).status, 4);
  });
  it('record.search：备注/标签/欠款 + record.detail 闭环', () => {
    const s = run(['bill.record.search', '--params', P({ q: '午饭' })]);
    assert.equal(s.status, 0);
    assert.equal(JSON.parse(s.stdout).data.total, 2);
    const d = run(['bill.record.search', '--params', P({ kind: 'debt' })]);
    assert.equal(d.status, 0);
    const id = JSON.parse(s.stdout).data.items[0].id;
    assert.equal(JSON.parse(run(['bill.record.detail', '--params', P({ id })]).stdout).data.item.id, id);
    assert.equal(run(['bill.record.detail', '--params', P({ id: 99999 })]).status, 4);
  });
  it('record.update：改 + 撤销恢复闭环', () => {
    const id = JSON.parse(run(['bill.record.search', '--params', P({ q: '晚饭' })]).stdout).data.items[0].id;
    assert.equal(run(['bill.record.update', '--params', P({ id, note: '晚饭v2' })]).status, 0);
    assert.equal(run(['bill.record.update', '--params', P({ op: 'undo', id })]).status, 0);
    assert.equal(run(['bill.record.update', '--params', P({ op: 'restore', id })]).status, 0);
    // t406 新规矩：缺必需槽位（这里缺 id）不再报参数错退出，改出过程型采集页 —— 退出码 0、不写库。
    const form = run(['bill.record.update', '--params', P({})]);
    assert.equal(form.status, 0, '缺 id 出采集页：' + form.stderr);
    assert.equal(JSON.parse(form.stdout).data.ok, false);
    assert.match(JSON.parse(form.stdout).data.message, /缺必需槽位：记录编号/);
  });
  it('analysis 三键：overview stat + compare/trend analysis', () => {
    const o = run(['bill.analysis.overview', '--params', P({ month: '2026-09' })]);
    assert.equal(o.status, 0);
    const { metrics } = JSON.parse(o.stdout).data;
    for (const v of Object.values(metrics)) assert.equal(typeof v, 'number');
    assert.ok(metrics.expense > 0 && metrics.income > 0);
    const c = run(['bill.analysis.compare', '--params', P({ kind: 'period', monthA: '2026-08', monthB: '2026-09' })]);
    assert.equal(c.status, 0);
    assert.match(JSON.parse(c.stdout).data.summary, /支出/);
    const t = run(['bill.analysis.trend', '--params', P({ kind: 'top', limit: 2 })]);
    assert.equal(t.status, 0);
  });
  it('goal/account 写读闭环（写走 receipt）', () => {
    assert.equal(run(['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 3000 })]).status, 0);
    // #730 起同月同类已存在走**阻断页**（exit 0、ok:false、不写库）——照 #688 裁定 9 的同一路径，
    // 与账户域「撞重名」同一处置；本条此前按搬迁前那份过渡实现断言 exit 2（一句 POLICY_CONFLICT 错误串）。
    const conflict = run(['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 3000 })]);
    assert.equal(conflict.status, 0, '冲突应出阻断页而不是报错退出');
    assert.equal(JSON.parse(conflict.stdout).data.ok, false);
    assert.equal(run(['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 3500, force: true })]).status, 0);
    assert.match(JSON.parse(run(['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })]).stdout).data.items[0].month, /2026-09/);
    assert.equal(run(['bill.account.write', '--params', P({ op: 'add', name: '招行卡' })]).status, 0);
    assert.equal(run(['bill.account.write', '--params', P({ op: 'transfer', amount: 500, from: '支付宝', to: '招行卡' })]).status, 0);
    // #691 起 `total` 照老侧口径：账户全集＝登记过的账户 ＋ 只在流水里出现过的账户。
    // 本条此前按「只数登记过的账户」写 1；上面第 31–32 行两笔样本带的账户也进全集 ⇒ 3。
    assert.equal(JSON.parse(run(['bill.account.query']).stdout).data.total, 3);
  });
  it('link/setup/help：联动采单 + 初始化 + 现找', () => {
    const l = run(['bill.link.submit', '--params', P({ scene: 'meal', ate: '鸡腿饭', amount: -35 })]);
    assert.equal(l.status, 0);
    assert.match(JSON.parse(l.stdout).data.message, /卡路里/);
    assert.equal(run(['bill.setup.run', '--params', P({ op: 'init' })]).status, 0);
    assert.equal(run(['bill.setup.run', '--params', P({ op: 'init-status' })]).status, 0);
    const h = run(['bill.help.lookup']);
    assert.equal(h.status, 0);
    // #144：缺省＝老实物同款 HELP 文件（`data` 换成域级索引），全量 77 条改走显式 `mode`。
    const he = JSON.parse(h.stdout);
    assert.equal(he.data.mode, 'file');
    assert.equal(he.data.total, 7);
    assert.ok(he.delivery.path.endsWith('.html') && he.delivery.path.includes('biscuit_accountant_html'));
    const all = run(['bill.help.lookup', '--params', P({ mode: 'lookup' })]);
    assert.equal(JSON.parse(all.stdout).data.total, 77);
    const q = run(['bill.help.lookup', '--params', P({ q: '帮我查今天花了多少' })]);
    assert.ok(JSON.parse(q.stdout).data.items.some((x) => x.key === 'bill.record.today'));
  });
  it('契约：未知 key 3 且 stdout 空；坏参 2；配置面硬失败 1；--html 落盘', () => {
    const k = run(['bill.nope']);
    assert.equal(k.status, 3);
    assert.equal(k.stdout, '');
    assert.equal(run(['bill.record.today', '--params', '[]']).status, 2);
    assert.equal(run(['bill.record.today', '--timeout', 'abc']).status, 2);
    // 「配置面硬失败 ＝exit 1 且 stdout 空」这一档的真出口读数。
    // 老写法是 `ILIFE_CONFIG_DIR=''`（那个变量已随 #763 退役）；这里换两个新来源，都仍然走真出口：
    //   ① **缺隔离**：家目录两格显式指回账号那一份 ⇒ 公共层抛 CONFIG_TEST_ISOLATION_MISSING（在 `mkdir`
    //      之前抛，所以这条实验一个字节都写不出去）；同一判据另有两条零写探针（`help-exit-148`／`fetch`）。
    //   ② **配置面校验没过**：配置文件里放一个名单外的键 ⇒ CONFIG_UNKNOWN_KEY。
    const real = realHomeDir().dir;
    const blocked = spawnSync(NODE, [bin, 'bill.record.today'],
      { cwd: here, encoding: 'utf8', env: { ...process.env, USERPROFILE: real, HOME: real } });
    assert.equal(blocked.status, 1, '缺隔离＝exit 1（stderr：' + blocked.stderr + '）');
    assert.equal(blocked.stdout, '', '失败时 stdout 必须空');
    assert.match(blocked.stderr, /CONFIG_TEST_ISOLATION_MISSING|测试缺隔离/,
      '报的是「缺隔离」这一档，不是别的失败：' + blocked.stderr);
    const broken = mkdtempSync(join(tmpdir(), 'billcli-badcfg-'));
    const restoreHome = saveHomeEnv();
    try {
      // 这一档要的是「已经有一份配置、但它读不过去」：先把现场布出来，再把那一行替换成名单外的键。
      // 注意不能走 `run()`——那支把家目录钉在 `DB` 上；这条实验的家目录是 `broken`。
      const env = billEnv(broken);
      writeFileSync(join(configDirOf(broken), 'bill.yaml'), 'db:\n  dirr: typo\n', 'utf8');
      const bad = spawnSync(NODE, [bin, 'bill.record.today'], { cwd: here, encoding: 'utf8', env });
      assert.equal(bad.status, 1, '配置面校验没过＝exit 1（stderr：' + bad.stderr + '）');
      assert.equal(bad.stdout, '', '失败时 stdout 必须空');
      assert.match(bad.stderr, /不认识的配置项「db\.dirr」/, '报的是那一行本身：' + bad.stderr);
    } finally { restoreHome(); }
    const p = join(DB, 'out.html');
    const r = run(['bill.record.today', '--params', P({ date: '2026-09-06' }), '--html', p]);
    assert.equal(r.status, 0);
    const html = readFileSync(p, 'utf8');
    assert.match(html, /<section/);
    assert.match(html, /<!DOCTYPE html/);
    assert.match(html, /bill-cmd-read bill\.record\.today/);
  });
});
