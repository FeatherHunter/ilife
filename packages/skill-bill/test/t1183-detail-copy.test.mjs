// t1183 单笔详情复制三份：10 列展开的人话门（纸面不动，复制展开）
// 跑法：node node_modules/typescript/bin/tsc -b <包> 之后 node --test 本件（见证据 GATE-RUN）。
// 期望值独立源：按票面字段逐行手写（编号/时间/分类/金额/方向/账户/账本/币种/创建时间/状态+备注；
//   已撤销加删除时间）。纸面落点仍 6/7 行（t415 锁着），复制恒等于已显示行（每行纸面皆有出处）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDetailCopyText, buildDetailCopyJson, buildDetailCopyCsv } from '../dist/query/detail.js';

const WAKE = '查账单详情';
const ROW = {
  id: 7,
  category: '餐饮/咖啡奶茶/咖啡',
  time: '2026-10-07 12:00:00',
  amount: -11.9,
  account: '支付宝',
  ledger: '生活',
  currency: '人民币',
  note: '午饭',
  created_at: '2026-10-07 12:00:01',
  deleted_at: null,
};
const EXPECT_TEXT = ['饼干记账 查账单详情', '编号 #7', '时间 2026-10-07 12:00:00', '分类 餐饮/咖啡奶茶/咖啡', '金额 -11.90', '方向 支出', '账户 支付宝', '账本 生活', '币种 人民币', '创建时间 2026-10-07 12:00:01', '状态 有效', '备注 午饭'].join('\n');
const EXPECT_CSV = ['field,value', '编号,#7', '时间,2026-10-07 12:00:00', '分类,餐饮/咖啡奶茶/咖啡', '金额,-11.90', '方向,支出', '账户,支付宝', '账本,生活', '币种,人民币', '创建时间,2026-10-07 12:00:01', '状态,有效', '备注,午饭'].join('\n');
const EXPECT_JSON = ['{', '  "version": "1.0",', '  "skill": "bill",', '  "shape": "detail",', '  "key": "record.detail",', '  "data": {', '    "id": 7,', '    "time": "2026-10-07 12:00:00",', '    "category": "餐饮/咖啡奶茶/咖啡",', '    "amount": -11.9,', '    "direction": "支出",', '    "account": "支付宝",', '    "ledger": "生活",', '    "currency": "人民币",', '    "created_at": "2026-10-07 12:00:01",', '    "deleted_at": null,', '    "status": "有效",', '    "note": "午饭"', '  }', '}'].join('\n');

describe('t1183 纯文本 11 行＋页身份行逐字节', () => {
  it('正常态 12 行：页身份＋10 列＋备注', () => {
    assert.equal(buildDetailCopyText(ROW, WAKE), EXPECT_TEXT);
  });
  it('收入派生方向，金额保留符号两位', () => {
    const text = buildDetailCopyText({ ...ROW, amount: 8000.25 }, WAKE);
    const lines = text.split('\n');
    assert.equal(lines[4], '金额 8000.25');
    assert.equal(lines[5], '方向 收入');
  });
  it('已撤销加删除时间行（原值），状态行写已撤销', () => {
    const text = buildDetailCopyText({ ...ROW, deleted_at: '2026-10-08 09:00:00' }, WAKE);
    const lines = text.split('\n');
    assert.equal(lines.length, 13);
    assert.equal(lines[10], '删除时间 2026-10-08 09:00:00');
    assert.equal(lines[11], '状态 已撤销');
    assert.equal(lines[12], '备注 午饭');
  });
  it('空值统一占位：空备注与空账户走纸面同一占位', () => {
    const text = buildDetailCopyText({ ...ROW, note: '  ', account: '' }, WAKE);
    const lines = text.split('\n');
    assert.equal(lines[6], '账户 —');
    assert.equal(lines[lines.length - 1], '备注 —');
  });
  it('换行压单行：备注内换行不分裂行', () => {
    const text = buildDetailCopyText({ ...ROW, note: 'a\nb' }, WAKE);
    const lines = text.split('\n');
    assert.equal(lines.length, 12);
    assert.equal(lines[lines.length - 1], '备注 a b');
  });
});

describe('t1183 JSON 加厚：数仍数，空备注走 null', () => {
  it('逐字节等于手写期望', () => {
    assert.equal(buildDetailCopyJson(ROW), EXPECT_JSON);
  });
  it('数仍是数：id 与 amount 解析后为 number', () => {
    const parsed = JSON.parse(buildDetailCopyJson(ROW));
    assert.equal(typeof parsed.data.id, 'number');
    assert.equal(typeof parsed.data.amount, 'number');
    assert.equal(parsed.data.amount, -11.9);
    assert.equal(parsed.shape, 'detail');
    assert.equal(parsed.data.direction, '支出');
    assert.equal(parsed.data.status, '有效');
  });
  it('空备注走 null，其余空串保留空串', () => {
    const parsed = JSON.parse(buildDetailCopyJson({ ...ROW, note: '', account: '' }));
    assert.equal(parsed.data.note, null);
    assert.equal(parsed.data.account, '');
  });
  it('已撤销 deleted_at 原值，status 已撤销', () => {
    const parsed = JSON.parse(buildDetailCopyJson({ ...ROW, deleted_at: '2026-10-08 09:00:00' }));
    assert.equal(parsed.data.deleted_at, '2026-10-08 09:00:00');
    assert.equal(parsed.data.status, '已撤销');
  });
});

describe('t1183 CSV 纵表：field,value 头＋RFC4180', () => {
  it('逐字节等于手写期望', () => {
    assert.equal(buildDetailCopyCsv(ROW), EXPECT_CSV);
  });
  it('含逗号引号加引号且双写引号，不分裂行', () => {
    const csv = buildDetailCopyCsv({ ...ROW, note: 'a,"b' });
    assert.ok(csv.includes('备注,"a,""b"'));
    assert.equal(csv.split('\n').length, 12);
  });
  it('换行先压空格再编码：行数恒 12', () => {
    const csv = buildDetailCopyCsv({ ...ROW, note: 'a\nb' });
    assert.equal(csv.split('\n').length, 12);
    assert.ok(csv.includes('备注,a b'));
  });
  it('金额保留符号，方向单列', () => {
    const csv = buildDetailCopyCsv(ROW);
    assert.ok(csv.includes('金额,-11.90'));
    assert.ok(csv.includes('方向,支出'));
  });
});

