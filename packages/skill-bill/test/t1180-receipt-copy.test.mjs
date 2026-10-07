// t1180 回执首切：咖啡三份如演示 + 13种结论词表 + 规则口径（红-绿 tracer）
// 跑法：node node_modules/typescript/bin/tsc -b packages/skill-bill --force 之后 node --test packages/skill-bill/test/t1180-receipt-copy.test.mjs
// 期望值独立源：.scratch/bill-copy-demo/new-{text,json,csv}（原型演示逐字抄为字面量，未进 packages/；另有证据脚本与 demo 文件逐字节 diff）
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildReceiptCopyText, buildReceiptCopyJson, buildReceiptCopyCsv, copyDirectionOf } from '../dist/write/copyTextReceipt.js';

const COFFEE = {
  recordId: 7248,
  category: '餐饮/咖啡奶茶/咖啡',
  amount: -11.9,
  time: '2026-10-07 12:00:00',
  account: '支付宝',
  ledger: '生活',
  note: '',
  currency: 'CNY',
};
const EXPECT_TEXT = '饼干记账 记一笔 回执\n已记好 支出 11.90 元\n分类 餐饮/咖啡奶茶/咖啡\n时间 2026-10-07 12:00:00\n账户 支付宝\n账本 生活\n备注 未给\n编号 7248';
const EXPECT_CSV = 'field,value\n结论,已记好 支出 11.90 元\n分类,餐饮/咖啡奶茶/咖啡\n金额,-11.90\n方向,支出\n时间,2026-10-07 12:00:00\n账户,支付宝\n账本,生活\n备注,未给\n编号,7248';
const EXPECT_JSON = '{\n  "version": "1.0",\n  "skill": "bill",\n  "shape": "receipt",\n  "key": "record.add",\n  "data": {\n    "ok": true,\n    "recordId": 7248,\n    "category": "餐饮/咖啡奶茶/咖啡",\n    "amount": -11.9,\n    "time": "2026-10-07 12:00:00",\n    "account": "支付宝",\n    "ledger": "生活",\n    "note": null,\n    "currency": "CNY",\n    "message_derived": "已记好 支出 11.90 元"\n  }\n}';

describe('t1180 咖啡一笔三份如演示（plain kind 空串）', () => {
  it('纯文本8行逐字节等于 demo', () => {
    assert.equal(buildReceiptCopyText('', COFFEE), EXPECT_TEXT);
  });
  it('JSON逐字节等于 demo（数仍数）', () => {
    const got = buildReceiptCopyJson('', COFFEE);
    assert.equal(got, EXPECT_JSON);
    const parsed = JSON.parse(got);
    assert.equal(typeof parsed.data.amount, 'number');
    assert.equal(typeof parsed.data.recordId, 'number');
  });
  it('CSV逐字节等于 demo（field,value纵表）', () => {
    assert.equal(buildReceiptCopyCsv('', COFFEE), EXPECT_CSV);
  });
});

describe('t1180 13种结论词表（动作与方向分离：已记好 + 方向词）', () => {
  const cases = [
    ['expense', -35, '支出'],
    ['income', 5000, '收入'],
    ['photo', -120, '账单'],
    ['batch', -20, '支出'],
    ['refund', 18.5, '退款'],
    ['reimburse', -300, '报销'],
    ['reimburse-done', 300, '到账'],
    ['lend', -500, '借出'],
    ['borrow', 500, '借入'],
    ['collect', 500, '收回'],
    ['repay', -500, '偿还'],
    ['installment', -1200, '分期'],
    ['', -11.9, '支出'],
  ];
  for (const [kind, amount, word] of cases) {
    it(kind === '' ? '(plain空串) -> ' + word : kind + ' -> ' + word, () => {
      assert.equal(copyDirectionOf(kind, amount), word);
      const facts = { ...COFFEE, amount };
      const text = buildReceiptCopyText(kind, facts);
      const line2 = text.split('\n')[1];
      assert.ok(line2.startsWith('已记好 ' + word + ' '), '结论行未分离：' + line2);
    });
  }
  it('plain正数派生收入', () => {
    assert.equal(copyDirectionOf('', 100), '收入');
    const line2 = buildReceiptCopyText('', { ...COFFEE, amount: 100 }).split('\n')[1];
    assert.equal(line2, '已记好 收入 100.00 元');
  });
});

describe('t1180 规则口径', () => {
  it('未给统一：空分类/账户/账本/时间/备注走未给，JSON note为null', () => {
    const facts = { recordId: 1, category: '', amount: -5, time: '', account: '', ledger: '', note: '', currency: 'CNY' };
    const text = buildReceiptCopyText('expense', facts);
    const lines = text.split('\n');
    assert.ok(lines[2] === '分类 未给');
    assert.ok(lines[6] === '备注 未给');
    const j = JSON.parse(buildReceiptCopyJson('expense', facts));
    assert.equal(j.data.note, null);
  });
  it('备注压行200字：换行压成空格并截断200', () => {
    const longNote = 'a\n'.repeat(150);
    const facts = { ...COFFEE, note: longNote };
    const text = buildReceiptCopyText('expense', facts);
    const noteLine = text.split('\n')[6];
    assert.ok(!noteLine.includes('\n'));
    const val = noteLine.slice('备注 '.length);
    assert.ok(Array.from(val).length <= 200);
    const j = JSON.parse(buildReceiptCopyJson('expense', facts));
    assert.ok(Array.from(j.data.note).length <= 200);
  });
  it('CSV RFC4180：含逗号引号换行加引号且双写引号', () => {
    const facts = { ...COFFEE, note: 'a,"b\nc' };
    const csv = buildReceiptCopyCsv('expense', facts);
    assert.ok(csv.includes('备注,"a,""b'));
  });
  it('方向词代符号：文本结论用绝对值，CSV金额保留符号，JSON数为数', () => {
    const csv = buildReceiptCopyCsv('', COFFEE);
    assert.ok(csv.includes('金额,-11.90'));
    const text = buildReceiptCopyText('', COFFEE);
    assert.ok(text.split('\n')[1] === '已记好 支出 11.90 元');
  });
});
