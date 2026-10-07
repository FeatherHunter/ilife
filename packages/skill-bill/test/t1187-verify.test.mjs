// t1187 全绿验证加旧门下线：无新行为，只证明旧路已删、新三份仍对（收口验证）
// 跑法：node node_modules/typescript/bin/tsc -b packages/skill-bill 之后 node --test packages/skill-bill/test/t1187-verify.test.mjs
// 旧门对照：D:/ilife/.scratch/bill-copy-demo/old-{text,json,csv}（三行/section,row/引号message）；新门：new-{text,json,csv}（8行/field,value/message_derived）
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReceiptCopyText, buildReceiptCopyJson, buildReceiptCopyCsv } from '../dist/write/copyTextReceipt.js';
import { buildListCopyText, buildListCopyJson, buildListCopyCsv } from '../dist/query/list-copy.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(HERE, '..');
const SRC_ROOT = join(PKG_ROOT, 'src');

const COFFEE = {
  recordId: 7248, category: '餐饮/咖啡奶茶/咖啡', amount: -11.9,
  time: '2026-10-07 12:00:00', account: '支付宝', ledger: '生活', note: '', currency: 'CNY',
};

function walkTs(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walkTs(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('t1187 旧门零引用（src 面机器断言）', () => {
  it('引号message零命中：旧JSON message键已删', () => {
    const hits = [];
    for (const f of walkTs(SRC_ROOT)) {
      const s = readFileSync(f, 'utf8');
      if (s.includes('"message"')) hits.push(f);
    }
    assert.deepEqual(hits, []);
  });
  it('收据新人话门三份不含旧三行', () => {
    const t = buildReceiptCopyText('', COFFEE);
    assert.equal(t.includes('记账数据\nok: true\nmessage:'), false);
    assert.equal(t.split('\n')[0], '饼干记账 记一笔 回执');
  });
  it('收据JSON含message_derived不含旧message键', () => {
    const j = buildReceiptCopyJson('', COFFEE);
    assert.equal(j.includes('message_derived'), true);
    assert.equal(j.includes('"message"'), false);
  });
  it('收据CSV真表头field,value不含section,row', () => {
    const c = buildReceiptCopyCsv('', COFFEE);
    assert.equal(c.split('\n')[0], 'field,value');
    assert.equal(c.includes('section,row'), false);
  });
});

describe('t1187 新门仍对（列表代表页）', () => {
  const rows = [{
    time: '2026-09-14 19:00:00', category: '餐饮', amount: '-11.90',
    account: '支付宝', ledger: '生活', note: '未给', id: '7248',
  }];
  it('列表纯文本一笔一行含标签竖线', () => {
    const t = buildListCopyText({ title: '查账单', window: '今天', total: 1, shown: rows });
    assert.equal(t.split('\n')[0], '查账单');
    assert.equal(t.includes('时间 '), true);
  });
  it('列表CSV真表头field,value', () => {
    const c = buildListCopyCsv({ title: '查账单', window: '今天', total: 1, shown: rows });
    assert.equal(c.includes('section,row'), false);
  });
  it('列表JSON可解析且无旧message键', () => {
    const j = buildListCopyJson({ title: '查账单', window: '今天', total: 1, shown: rows });
    assert.equal(j.includes('"message"'), false);
    JSON.parse(j);
  });
});

describe('t1187 指纹账本44页存在', () => {
  it('t689账本pages恰44', () => {
    const j = JSON.parse(readFileSync(join(HERE, 't689-页面指纹.json'), 'utf8'));
    assert.equal(Object.keys(j.pages).length, 44);
  });
});
