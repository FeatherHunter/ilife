// t410 · 写入16词真出口锁：以唤醒词为起点，逐条断言落盘/绝对路径/可打开/字节如实+字段正确。
// 红线：只钉现有行为（2026-09-16实测值），页面行为有误另开票，不改页。
// photo/batch降级语义同步断言：单笔化（affectedRows=1/7项）+摘要降级串+页内降级串。
// 不开新页面；只新增本文件，不碰源码/页面/旧测试/他包。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeWakeword } from '../dist/triggers/wakeTable.js';
import { billEnv } from './helpers/config-base.mjs';

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
  DB = mkdtempSync(join(tmpdir(), 't410-db-'));
  HTML = mkdtempSync(join(tmpdir(), 't410-html-'));
});

function run(args) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(DB) });
}
function envOf(r) {
  const last = (r.stdout || '').trim().split(/\r?\n/).filter((s) => s !== '').pop() ?? '';
  try { return JSON.parse(last); } catch (e) { throw new Error('stdout末行非envelope：' + last + '｜stderr=' + r.stderr); }
}
/** 结构化五断言：落盘/绝对路径/可打开/字节如实（调用方再做字段正确）。 */
function assertLanded(file, delivery) {
  assert.ok(existsSync(file), '须落盘：' + file);
  assert.ok(delivery && typeof delivery.path === 'string', '回执须带delivery.path');
  assert.ok(isAbsolute(delivery.path), '须绝对路径：' + delivery.path);
  assert.equal(resolve(delivery.path), resolve(file), '绝对路径须指向本次显式落点');
  const text = readFileSync(file, 'utf8');
  assert.match(text, /<!doctype html>/i, '可打开且为整页');
  assert.ok(text.includes('<section'), '整页须有section');
  assert.equal(statSync(file).size, delivery.bytes, '字节须如实（文件大小=delivery.bytes）');
  return text;
}
function seedAdd() {
  const r = run(['bill.record.add', '--params', JSON.stringify({ category: '餐饮', amount: -20, time: '2026-09-14 19:00:00' })]);
  assert.equal(r.status, 0, '铺底须成功：' + r.stderr);
  return envOf(r).data.receipt.recordId;
}

// 13条录入词：唤醒词→路由→真出口。补槽值沿t406覆盖表（实测可落库的合法L1组合）。
const ADDS = [
  { word: '记支出', kind: 'expense', category: '餐饮', amount: -12.5, summaryFrag: '（记支出）' },
  { word: '记收入', kind: 'income', category: '工资', amount: 8000, summaryFrag: '（记收入）' },
  { word: '拍账单', kind: 'photo', category: '餐饮', amount: -30, summaryFrag: '（三要素以外部识别为准）' },
  { word: '批量录入', kind: 'batch', category: '餐饮', amount: -10, summaryFrag: '（只落了其中一笔）' },
  { word: '记退款', kind: 'refund', category: '退款', amount: 20, summaryFrag: '（记退款）' },
  { word: '记报销', kind: 'reimburse', category: '出行', amount: -100, summaryFrag: '（记报销）' },
  { word: '报销到账', kind: 'reimburse-done', category: '其他收入', amount: 100, summaryFrag: '（报销到账）' },
  { word: '记借出', kind: 'lend', category: '借贷/借出', amount: -500, summaryFrag: '（记借出）' },
  { word: '记借入', kind: 'borrow', category: '借贷/借入', amount: 500, summaryFrag: '（记借入）' },
  { word: '记收回', kind: 'collect', category: '借贷/收回', amount: 500, summaryFrag: '（记收回）' },
  { word: '记偿还', kind: 'repay', category: '借贷/偿还', amount: -500, summaryFrag: '（记偿还）' },
  { word: '记分期', kind: 'installment', category: '分期', amount: -1200, summaryFrag: '（记分期）' },
  { word: '记一笔', kind: '', category: '餐饮', amount: -12.5, summaryFrag: null },
];

describe('t410 · 13条录入词真出口锁（唤醒词起点）', () => {
  for (const c of ADDS) {
    it(`${c.word}：路由→落盘→绝对路径→可打开→字节如实→字段正确`, () => {
      const r0 = routeWakeword(c.word, { id: 1 });
      assert.equal(r0.key, 'bill.record.add', c.word + '须路由到bill.record.add');
      assert.equal(String(r0.params.kind ?? ''), c.kind, c.word + '的kind须为' + (c.kind || '空'));
      const params = { ...r0.params, category: c.category, amount: c.amount, time: '2026-09-14 12:00:00' };
      const file = join(HTML, 't410-' + Buffer.from(c.word).toString('hex') + '.html');
      const r = run(['bill.record.add', '--params', JSON.stringify(params), '--html', file]);
      assert.equal(r.status, 0, c.word + '真出口须exit0：' + r.stderr);
      const env = envOf(r);
      assert.equal(env.shape, 'receipt');
      assert.equal(env.data.ok, true, JSON.stringify(env.data));
      assert.equal(env.data.receipt.op, 'add');
      assert.ok(Number.isInteger(env.data.receipt.recordId) && env.data.receipt.recordId > 0, '须带记录编号');
      assert.equal(env.data.receipt.affectedRows, 1, '单笔化：一次只落一笔');
      assert.equal(env.data.receipt.writtenFields.length, 7, '记一笔写整列全集7项');
      const text = assertLanded(file, env.delivery);
      // 字段正确：H1＝唤醒词（t728 去重：页型不再与 H1 同串）、页型落在徽章上、
      // 摘要含降级/型名串；明细含分类与两位小数金额；回执三件齐。
      assert.ok(text.includes('>' + c.word + '</h1>'), 'H1 须为唤醒词（页型不上 H1）：' + c.word);
      assert.ok(text.includes('>回执</span>'), '页型徽章须写回执：' + c.word);
      if (c.summaryFrag !== null) assert.ok(env.data.receipt.summary.includes(c.summaryFrag), '摘要须含' + c.summaryFrag + '：' + env.data.receipt.summary);
      else {
        assert.ok(env.data.receipt.summary.includes('（记录编号'), '记一笔摘要须直接接记录编号：' + env.data.receipt.summary);
        assert.equal((env.data.receipt.summary.match(/（/g) ?? []).length, 1, '记一笔摘要只有记录编号一组括号（无型名尾缀）：' + env.data.receipt.summary);
      }
      assert.ok(text.includes(c.category), '页内须有分类：' + c.category);
      assert.ok(text.includes(Number(c.amount).toFixed(2)), '页内金额须两位小数：' + Number(c.amount).toFixed(2));
      assert.ok(text.includes('data-slot="ilife:bill:receipt"'), '须有回执槽位');
      assert.equal((text.match(/data-page="receipt"/g) ?? []).length, 1, '整页只有一枚回执页标记');
      for (const n of ['对账信息', '复制数据', '复制日志']) assert.ok(text.includes(n), '回执三件缺：' + n);
    });
  }
});

describe('t410 · 3条修正词真出口锁（唤醒词起点）', () => {
  it('改记录：路由→落盘→字节如实→改了备注', () => {
    const id = seedAdd();
    const r0 = routeWakeword('改记录', { id });
    assert.equal(r0.key, 'bill.record.update');
    const file = join(HTML, 't410-update.html');
    const r = run(['bill.record.update', '--params', JSON.stringify({ ...r0.params, id, note: '改过' }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.ok, true);
    assert.equal(env.data.receipt.op, 'update');
    assert.deepEqual(env.data.receipt.writtenFields, ['note']);
    const text = assertLanded(file, env.delivery);
    assert.ok(text.includes('>改记录</h1>'), 'H1 须为唤醒词（页型不上 H1）：改记录');
    assert.ok(text.includes('>回执</span>'), '页型徽章须写回执：改记录');
    assert.ok(env.data.receipt.summary.includes('已修改'), '摘要须说已修改：' + env.data.receipt.summary);
    assert.ok(text.includes(String(id)), '页内须印记录编号');
  });
  it('撤销：路由→落盘→字节如实→软删口径', () => {
    const id = seedAdd();
    const r0 = routeWakeword('撤销', { id });
    assert.equal(r0.key, 'bill.record.update');
    assert.equal(String(r0.params.op), 'undo');
    const file = join(HTML, 't410-undo.html');
    const r = run(['bill.record.update', '--params', JSON.stringify({ ...r0.params, id, op: 'undo' }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.receipt.op, 'undo');
    assert.deepEqual(env.data.receipt.writtenFields, ['deleted_at']);
    const text = assertLanded(file, env.delivery);
    assert.ok(text.includes('>撤销</h1>'), 'H1 须为唤醒词（页型不上 H1）：撤销');
    assert.ok(text.includes('>回执</span>'), '页型徽章须写回执：撤销');
    assert.ok(env.data.receipt.summary.includes('已撤销'), '摘要须说已撤销');
    assert.ok(text.includes('记录还在'), '撤销页须说清记录还在');
  });
  it('恢复：路由→落盘→字节如实→置空口径', () => {
    const id = seedAdd();
    assert.equal(run(['bill.record.update', '--params', JSON.stringify({ op: 'undo', id })]).status, 0);
    const r0 = routeWakeword('恢复', { id });
    assert.equal(r0.key, 'bill.record.update');
    assert.equal(String(r0.params.op), 'restore');
    const file = join(HTML, 't410-restore.html');
    const r = run(['bill.record.update', '--params', JSON.stringify({ ...r0.params, id, op: 'restore' }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.receipt.op, 'restore');
    assert.deepEqual(env.data.receipt.writtenFields, ['deleted_at']);
    const text = assertLanded(file, env.delivery);
    assert.ok(text.includes('>恢复</h1>'), 'H1 须为唤醒词（页型不上 H1）：恢复');
    assert.ok(text.includes('>回执</span>'), '页型徽章须写回执：恢复');
    assert.ok(env.data.receipt.summary.includes('已恢复'), '摘要须说已恢复');
    assert.ok(text.includes('已恢复（记录编号 ' + id), '恢复页须印记录编号');
  });
});

describe('t410 · photo/batch降级语义同步锁', () => {
  it('拍账单降级：摘要+页内同说外置识别，不存图不读图', () => {
    const r0 = routeWakeword('拍账单', { id: 1 });
    const file = join(HTML, 't410-photo-degrade.html');
    const r = run(['bill.record.add', '--params', JSON.stringify({ ...r0.params, category: '餐饮', amount: -30, time: '2026-09-14 12:00:00' }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.ok(env.data.receipt.summary.includes('（三要素以外部识别为准）'), '摘要降级串须在：' + env.data.receipt.summary);
    assert.equal(env.data.receipt.affectedRows, 1, '降级仍单笔');
    const text = assertLanded(file, env.delivery);
    assert.ok(text.includes('本仓之外'), '页内须说识别在本仓之外');
    assert.ok(text.includes('三要素'), '页内须说三要素');
  });
  it('批量录入降级：摘要+页内同说现阶段单笔化', () => {
    const r0 = routeWakeword('批量录入', { id: 1 });
    const file = join(HTML, 't410-batch-degrade.html');
    const r = run(['bill.record.add', '--params', JSON.stringify({ ...r0.params, category: '餐饮', amount: -10, time: '2026-09-14 12:00:00' }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.ok(env.data.receipt.summary.includes('（只落了其中一笔）'), '摘要降级串须在：' + env.data.receipt.summary);
    assert.equal(env.data.receipt.affectedRows, 1, '降级仍单笔');
    const text = assertLanded(file, env.delivery);
    assert.ok(text.includes('一次只落'), '页内须说一次只落一笔');
  });
});
