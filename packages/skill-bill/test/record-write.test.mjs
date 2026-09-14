// 记账写入域：能力目录（声明／处理体／两张整页）＋ 注册表 ＋ 出口三条路的真跑断言。
// 基线：开工前 `node --test "packages/skill-bill/test/*.test.mjs"` ＝ 57 通过／0 失败（docs/skills/skill-bill/t406-验收-基线实测.md）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BILL_KEY_SHAPES, WAKE_TABLE, routeWakeword } from '../dist/index.js';
import { RECORD_COMMANDS, runRecordWrite } from '../dist/record/index.js';
import { REGISTRY, REGISTRY_KEYS } from '../dist/cli/registry.js';
import { RECORD_SLOTS, missingSlots } from '../dist/record/collect.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => {
    const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
    return p.status === 0 && /^v\d+/.test((p.stdout || '').trim());
  }) ?? process.execPath;

let DB = '';
let HTML = '';
before(() => {
  DB = mkdtempSync(join(tmpdir(), 'billrecord-'));
  HTML = mkdtempSync(join(tmpdir(), 'billrecord-html-'));
});

function run(args) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB } });
}
/** stdout 末行即 envelope（成功只打一行 JSON）。 */
function envOf(r) {
  const last = (r.stdout || '').trim().split(/\r?\n/).filter((s) => s !== '').pop() ?? '';
  try { return JSON.parse(last); } catch (e) { throw new Error('stdout 末行不是合法 envelope JSON：' + last + '｜stderr=' + r.stderr); }
}
function pageOf(file) {
  assert.ok(existsSync(file), '产物须落盘：' + file);
  const text = readFileSync(file, 'utf8');
  assert.match(text, /<!doctype html>/i, '整页须有 doctype');
  assert.ok(text.includes('<section'), '整页须有 section');
  assert.ok(text.includes('ilife-copy-btn'), '整页须有复制按钮（复制区）');
  return text;
}

describe('t406 · 记账写入域命令声明与注册表', () => {
  it('恰好两条命令，六件事齐全，形状一律 receipt', () => {
    assert.equal(RECORD_COMMANDS.length, 2);
    assert.deepEqual(RECORD_COMMANDS.map((c) => c.key), ['bill.record.add', 'bill.record.update']);
    for (const c of RECORD_COMMANDS) {
      assert.equal(c.kind, 'write', c.key);
      assert.equal(c.shape, 'receipt', c.key);
      assert.equal(typeof c.run, 'function', c.key);
      for (const f of ['key', 'title', 'wakeWord', 'example']) {
        assert.equal(typeof c[f], 'string', c.key + ' 的 ' + f + ' 须为字符串');
        assert.ok(c[f].length > 0, c.key + ' 的 ' + f + ' 不得为空');
      }
      assert.ok(c.example.includes(c.key), c.key + ' 的示例须含命令名（照抄即能跑）');
    }
    assert.equal(RECORD_COMMANDS[0].title, '记一笔');
    assert.equal(RECORD_COMMANDS[1].title, '改记录');
  });

  it('代表唤醒词是 WAKE_TABLE 里真有的词，且路由到本命令', () => {
    const phrases = new Set(WAKE_TABLE.map((e) => e.phrase));
    for (const c of RECORD_COMMANDS) {
      assert.ok(phrases.has(c.wakeWord), c.wakeWord + ' 不在 WAKE_TABLE');
      assert.equal(routeWakeword(c.wakeWord, { id: 1 }).key, c.key, c.wakeWord + ' 路由对不上 ' + c.key);
    }
  });

  it('两条示例照抄即能跑（本机真跑，空库）', () => {
    for (const c of RECORD_COMMANDS) {
      const m = /--params '(.+)'$/.exec(c.example);
      assert.ok(m, '示例须以 --params 结尾：' + c.example);
      const r = run([c.key, '--params', m[1]]);
      assert.equal(r.status, 0, c.key + ' 示例跑不动：' + r.stderr + '｜' + r.stdout);
      const env = envOf(r);
      assert.equal(env.shape, 'receipt', c.key + ' 示例的产物形状');
    }
  });

  it('注册表一能力一行；迁移过的命令的形状从它派生（形状事实不写在渲染层）', () => {
    assert.equal(REGISTRY_KEYS.length, 2);
    assert.deepEqual([...REGISTRY_KEYS].sort(), ['bill.record.add', 'bill.record.update']);
    assert.equal(Object.keys(BILL_KEY_SHAPES).length, 16, '16 条联动命令的形状表不缩水');
    for (const key of REGISTRY_KEYS) {
      assert.equal(BILL_KEY_SHAPES[key], REGISTRY[key].shape, key + ' 的形状须由注册表派生');
    }
  });

  it('入口不猜：不属于本域的命令即抛，不静默兜底', () => {
    assert.throws(() => runRecordWrite('bill.record.today', {}, null), /不是记账写入域的命令/);
    assert.throws(() => runRecordWrite('bill.goal.write', {}, null), /不是记账写入域的命令/);
  });

  it('槽位探针：缺的只有必需槽位；金额 0 算给了', () => {
    const add = RECORD_SLOTS['bill.record.add'];
    assert.deepEqual(missingSlots({}, add).map((s) => s.name), ['category', 'amount']);
    assert.deepEqual(missingSlots({ category: '餐饮' }, add).map((s) => s.name), ['amount']);
    assert.deepEqual(missingSlots({ category: '餐饮', amount: 0 }, add), []);
    const upd = RECORD_SLOTS['bill.record.update'];
    assert.deepEqual(missingSlots({ note: '改过' }, upd).map((s) => s.name), ['id']);
    assert.deepEqual(missingSlots({ id: 1 }, upd), []);
  });
});

describe('t406 · 记一笔（bill.record.add）真跑', () => {
  const PARAMS = { category: '餐饮', amount: -12.5, time: '2026-09-14 12:00:00', account: '支付宝', ledger: '生活' };
  let id = 0;

  it('必需槽位齐全 → 写库 + 回执整页落盘', () => {
    const file = join(HTML, 'add.html');
    const r = run(['bill.record.add', '--params', JSON.stringify(PARAMS), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.shape, 'receipt');
    assert.equal(env.data.ok, true, JSON.stringify(env.data));
    id = env.data.receipt.recordId;
    assert.ok(Number.isInteger(id) && id > 0, '回执须带记录编号');
    assert.equal(env.data.receipt.op, 'add');
    assert.equal(env.data.receipt.affectedRows, 1, '影响行数＝total_changes 前后差');
    const text = pageOf(file);
    assert.ok(statSync(file).size > 10 * 1024, '走的是新装配的整页，不是老极简模板');
    for (const needle of ['data-slot="ilife:bill:receipt"', 'data-key="bill.record.add"', 'data-shape="receipt"', '已改动', '影响行数', '写入字段', '对账信息']) {
      assert.ok(text.includes(needle), '回执整页缺：' + needle);
    }
  });

  it('必需槽位缺失 → 采集页（不写库），退出码 0，含缺槽位明示与复制 prompt 区', () => {
    const before = envOf(run(['bill.record.today', '--params', '{"date":"2026-09-14"}'])).data.items.length;
    const file = join(HTML, 'form.html');
    const r = run(['bill.record.add', '--params', '{"kind":"expense"}', '--html', file]);
    assert.equal(r.status, 0, '缺槽位不再报参数错退出：' + r.stderr);
    const env = envOf(r);
    assert.equal(env.shape, 'receipt');
    assert.equal(env.data.ok, false, '这一次没写库，载荷照实说');
    assert.equal(env.data.message, '缺必需槽位：category、amount（已出采集页，补齐后重跑同一条命令）',
      'envelope 载荷与页内文案须同一句（同一件事实一处定义）');
    const text = pageOf(file);
    for (const needle of [
      'data-slot="ilife:bill:collect"', 'data-key="bill.record.add"', 'data-shape="receipt"',
      '缺必需槽位：category、amount（已出采集页，补齐后重跑同一条命令）', '待补槽位', '未发生',
      '复制 prompt', 'ilife-block-pre-block', 'ilife-block-param-form', '复制日志',
    ]) {
      assert.ok(text.includes(needle), '采集页缺：' + needle);
    }
    const after = envOf(run(['bill.record.today', '--params', '{"date":"2026-09-14"}'])).data.items.length;
    assert.equal(after, before, '采集页只采集：库里的条数不得变');
  });
});

describe('t406 · 改记录（bill.record.update）真跑', () => {
  let id = 0;
  before(() => {
    const r = run(['bill.record.add', '--params', JSON.stringify({ category: '餐饮', amount: -20, time: '2026-09-14 19:00:00' })]);
    assert.equal(r.status, 0, '铺底那笔须成功：' + r.stderr);
    id = envOf(r).data.receipt.recordId;
  });

  it('id 齐全 → 写库 + 回执整页落盘（页标题跟操作走）', () => {
    const file = join(HTML, 'update.html');
    const r = run(['bill.record.update', '--params', JSON.stringify({ id, note: '改过' }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.ok, true, JSON.stringify(env.data));
    assert.equal(env.data.receipt.op, 'update');
    assert.deepEqual(env.data.receipt.writtenFields, ['note']);
    const text = pageOf(file);
    for (const needle of ['data-slot="ilife:bill:receipt"', 'data-shape="receipt"', '改记录 · 回执', '已改动', '影响行数']) {
      assert.ok(text.includes(needle), '改记录回执缺：' + needle);
    }
  });

  it('改成与改前相同的值 → 回执说「无改动」（改前值取自库内那一行，不靠 unknown 中转）', () => {
    const file = join(HTML, 'nochange.html');
    const r = run(['bill.record.update', '--params', JSON.stringify({ id, note: '改过' }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.receipt.noChange, true, '值与改前一致时 noChange 须为真');
    assert.deepEqual(env.data.receipt.writtenFields, ['note']);
    const text = pageOf(file);
    assert.ok(text.includes('无改动'), '无改动那一格须照实说');
    assert.ok(text.includes('值与改前一致'), '无改动须带依据');
  });

  it('撤销与恢复各出一页（软删口径不得写成可恢复承诺）', () => {
    const undoFile = join(HTML, 'undo.html');
    const undo = run(['bill.record.update', '--params', JSON.stringify({ op: 'undo', id }), '--html', undoFile]);
    assert.equal(undo.status, 0, 'stderr=' + undo.stderr);
    assert.equal(envOf(undo).data.receipt.op, 'undo');
    assert.ok(pageOf(undoFile).includes('软删'), '撤销页须说软删');
    const restoreFile = join(HTML, 'restore.html');
    const restore = run(['bill.record.update', '--params', JSON.stringify({ op: 'restore', id }), '--html', restoreFile]);
    assert.equal(restore.status, 0, 'stderr=' + restore.stderr);
    assert.equal(envOf(restore).data.receipt.op, 'restore');
    assert.ok(pageOf(restoreFile).includes('已恢复：' + id), '恢复页须印记录编号');
  });

  it('缺 id → 采集页（不写库）', () => {
    const file = join(HTML, 'form-update.html');
    const r = run(['bill.record.update', '--params', '{"note":"改过"}', '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.ok, false);
    assert.ok(env.data.message.includes('缺必需槽位：id'), env.data.message);
    const text = pageOf(file);
    for (const needle of ['data-slot="ilife:bill:collect"', '缺必需槽位：id', '复制 prompt', 'ilife-block-param-form']) {
      assert.ok(text.includes(needle), '改记录采集页缺：' + needle);
    }
  });

  it('id 有值但不是记录编号 → 仍走口径失败（不静默兜底成采集页）', () => {
    const r = run(['bill.record.update', '--params', '{"id":"abc","note":"改过"}']);
    assert.equal(r.status, 2, 'stderr=' + r.stderr);
    assert.match(r.stderr, /口径失败/);
  });
});
