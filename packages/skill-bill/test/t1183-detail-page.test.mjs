// t1183 单笔详情页集成：复制恒等于已显示行＋列表行点进详情逐字段对得上＋旧 thin 零产出
// 跑法：包编过之后 node --test 本件（只走 CLI，不 import dist 源码，基线可跑出断言红）。
// 红线：只读临时库；只往临时目录写 --html 产物。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
let OUT = '';
const P = (o) => JSON.stringify(o);
function run(args, envExtra) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(DB, envExtra) });
}
function pageOf(key, params, name) {
  const file = join(OUT, name + '.html');
  const r = run([key, '--params', P(params), '--html', file]);
  assert.equal(r.status, 0, key + ' ' + P(params) + ' 应 exit 0：' + r.stderr);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  return { text: readFileSync(file, 'utf8'), stdout: r.stdout };
}

let ID1 = 1;

before(() => {
  DB = mkdtempSync(join(tmpdir(), 't1183-db-'));
  OUT = mkdtempSync(join(tmpdir(), 't1183-html-'));
  const seed = [
    { category: '餐饮/外卖/午餐', amount: -35.5, time: '2026-09-06 12:00:00', note: 't1183午饭 #工作餐', account: '支付宝', ledger: '生活', currency: '人民币' },
    { category: '工资/基本工资', amount: 8000.25, time: '2026-09-06 09:00:00', note: 't1183工资', account: '银行卡', ledger: '工资', currency: '人民币' },
  ];
  for (const s of seed) assert.equal(run(['bill.record.add', '--params', P(s)]).status, 0, '样本应写进临时库：' + P(s));
  const probe = JSON.parse(run(['bill.record.search', '--params', P({ q: 't1183午饭' })]).stdout);
  assert.equal(probe.data.total, 1);
  ID1 = probe.data.items[0].id;
});

describe('t1183 复制三份上屏：纵表头＋旧 thin 零产出', () => {
  it('新 CSV 纵表头在，旧 thin 表头不在', () => {
    const { text } = pageOf('bill.record.detail', { id: ID1 }, 't1183-detail');
    assert.ok(text.includes('field,value'), '新纵表头应在');
    assert.ok(!text.includes('section,row'), '旧 thin 表头应零产出');
  });
  it('人话行与纸面行一一对应：11 个字段值同屏', () => {
    const { text } = pageOf('bill.record.detail', { id: ID1 }, 't1183-detail-lines');
    for (const v of ['#' + ID1, '2026-09-06 12:00:00', '餐饮/外卖/午餐', '-35.50', '支出', '支付宝', '生活', '人民币', 't1183午饭']) {
      assert.ok(text.includes(v), '纸面与复制区应同含：' + v);
    }
    for (const label of ['编号', '账户', '账本', '币种', '创建时间', '状态']) {
      assert.ok(text.includes('>' + label + '<'), '纸面落点应有：' + label);
    }
    for (const line of ['编号 #' + ID1, '时间 2026-09-06 12:00:00', '分类 餐饮/外卖/午餐', '金额 -35.50', '方向 支出', '备注 t1183午饭 #工作餐']) {
      assert.ok(text.includes(line), '复制纯文本行应在（值与纸面同源）：' + line);
    }
    assert.ok(text.includes('编号,#' + ID1), '复制 CSV 行应在');
  });
});

describe('t1183 列表行点进详情逐字段对得上', () => {
  it('search 行与 detail 项逐字段一致', () => {
    const listItem = JSON.parse(run(['bill.record.search', '--params', P({ q: 't1183午饭' })]).stdout).data.items[0];
    const detailItem = JSON.parse(run(['bill.record.detail', '--params', P({ id: ID1 })]).stdout).data.item;
    assert.equal(String(detailItem.id), String(listItem.id));
    for (const k of ['time', 'category', 'account', 'ledger', 'note']) {
      assert.equal(detailItem[k], listItem[k], '字段对得上：' + k);
    }
    assert.equal(detailItem.amount, listItem.amount);
    assert.equal(typeof detailItem.amount, 'number', '载荷金额仍是数');
  });
  it('载荷键不动：仍是旧 8 字段＋created_at/deleted_at，不含方向状态', () => {
    const detailItem = JSON.parse(run(['bill.record.detail', '--params', P({ id: ID1 })]).stdout).data.item;
    const keys = Object.keys(detailItem).sort();
    const want = ['account', 'amount', 'category', 'created_at', 'currency', 'deleted_at', 'id', 'ledger', 'note', 'time'].sort();
    assert.deepEqual(keys, want);
    assert.ok(!('direction' in detailItem) && !('status' in detailItem), '方向状态只进复制，不进载荷');
  });
});

describe('t1183 已撤销加删除时间（复制与纸面同行）', () => {
  it('撤销后复制三份与纸面同出删除时间原值', () => {
    assert.equal(run(['bill.record.update', '--params', P({ op: 'undo', id: ID1 })]).status, 0, '撤销应成功');
    const { text, stdout } = pageOf('bill.record.detail', { id: ID1 }, 't1183-detail-deleted');
    const deletedAt = String(JSON.parse(stdout).data.item.deleted_at);
    assert.ok(deletedAt !== 'null' && deletedAt !== '', '载荷 deleted_at 非空');
    assert.ok(text.includes('>删除时间<'), '纸面应有删除时间行');
    assert.ok(text.includes(deletedAt), '删除时间原值可见');
    assert.ok(text.includes('删除时间 ' + deletedAt), '复制纯文本同行');
    assert.ok(text.includes('删除时间,' + deletedAt), '复制 CSV 同行');
    assert.ok(text.includes('>已撤销<'), '状态行写已撤销');
    assert.equal(run(['bill.record.update', '--params', P({ op: 'restore', id: ID1 })]).status, 0, '恢复应成功');
    const back = pageOf('bill.record.detail', { id: ID1 }, 't1183-detail-restored');
    assert.ok(!back.text.includes('>删除时间<'), '恢复后不再出删除时间行');
  });
});
