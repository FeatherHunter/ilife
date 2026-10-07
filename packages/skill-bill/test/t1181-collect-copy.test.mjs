// t1181 采集未写库：已给/还差/下一步分行 + 三份人话（红-绿 tracer）
// 跑法：node node_modules/typescript/bin/tsc -b packages/skill-bill --force 之后 node --test packages/skill-bill/test/t1181-collect-copy.test.mjs
// 期望值独立源：本文件字面量（已给/还差/下一步分行，不挤长句；英文键不出纯文本；旧 thin 长句零产出）
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCollectCopyText, buildCollectCopyJson, buildCollectCopyCsv } from '../dist/write/collectCopyText.js';
import { copyDirectionOf } from '../dist/write/copyTextReceipt.js';

const WORD = '记支出';
const KIND = 'expense';
const KEY = 'bill.record.add';

// 空：什么都没给，缺分类/金额
const EMPTY = {
  category: '',
  amount: null,
  time: '',
  account: '',
  ledger: '',
  note: '',
  currency: '',
  missing: ['分类', '金额'],
};

// 半给：给了分类/金额/账户，缺时间
const PARTIAL = {
  category: '餐饮',
  amount: -12.5,
  time: '',
  account: '支付宝',
  ledger: '',
  note: '',
  currency: '',
  missing: ['时间'],
};

const EXPECT_EMPTY_TEXT = '饼干记账 记支出 采集\n已给 无\n还差 分类 金额\n下一步 补齐后跟助手说一遍「记支出」';
const EXPECT_PARTIAL_TEXT = '饼干记账 记支出 采集\n已给 分类 餐饮 金额 -12.50 账户 支付宝\n还差 时间\n下一步 补齐后跟助手说一遍「记支出」';

describe('t1181 采集三份：纯文本分行无长句无英文键', () => {
  it('空：4行分行，已给/还差/下一步各一行', () => {
    assert.equal(buildCollectCopyText(WORD, KIND, EMPTY), EXPECT_EMPTY_TEXT);
  });
  it('半给：已给行带值，还差行只剩时间', () => {
    assert.equal(buildCollectCopyText(WORD, KIND, PARTIAL), EXPECT_PARTIAL_TEXT);
  });
  it('无顿号无英文键无旧长句', () => {
    for (const facts of [EMPTY, PARTIAL]) {
      const text = buildCollectCopyText(WORD, KIND, facts);
      const lines = text.split('\n');
      assert.equal(lines.length, 4);
      assert.ok(lines[0].startsWith('饼干记账 '));
      assert.ok(lines[1].startsWith('已给 '));
      assert.ok(lines[2].startsWith('还差 '));
      assert.ok(lines[3].startsWith('下一步 '));
      assert.ok(!text.includes('、'), '挤长句顿号不应出现：' + text);
      assert.ok(!text.includes('bill.'), '英文键不应进纯文本');
      assert.ok(!text.includes('category') && !text.includes('amount'), '库列名不应进纯文本');
      assert.ok(!text.includes('缺必需槽位') && !text.includes('写库已阻断'), '旧 thin 长句应零产出');
      assert.ok(!/[A-Za-z]{3,}/.test(text), '纯文本不应含英文词：' + text);
    }
  });
  it('就绪态：还差无，下一步已填齐', () => {
    const ready = { category: '餐饮', amount: -12.5, time: '2026-09-14', account: '支付宝', ledger: '生活', note: '', currency: '', missing: [] };
    const text = buildCollectCopyText(WORD, KIND, ready);
    const lines = text.split('\n');
    assert.equal(lines[2], '还差 无');
    assert.equal(lines[3], '下一步 已填齐，可以复制去说了。');
  });
});

describe('t1181 JSON加厚：数仍数，真表头在CSV', () => {
  it('JSON数仍数，note空为null，加厚含missing/next', () => {
    const got = buildCollectCopyJson(WORD, KIND, KEY, PARTIAL);
    const parsed = JSON.parse(got);
    assert.equal(parsed.skill, 'bill');
    assert.equal(parsed.shape, 'collect');
    assert.equal(parsed.key, 'record.add');
    assert.equal(parsed.data.ok, false);
    assert.equal(typeof parsed.data.given.amount, 'number');
    assert.equal(parsed.data.given.amount, -12.5);
    assert.deepEqual(parsed.data.missing, ['时间']);
    assert.equal(parsed.data.next, '补齐后跟助手说一遍「记支出」');
    assert.equal(parsed.data.message_derived, '补齐后跟助手说一遍「记支出」');
    assert.equal(parsed.data.given.note, null);
    assert.equal(parsed.data.message, undefined);
    // 无尾换行，2空格
    assert.ok(!got.endsWith('\n'));
    assert.ok(got.includes('  "skill"'));
  });
  it('CSV纵表真表头field,value，方向列与符号金额', () => {
    const csv = buildCollectCopyCsv(WORD, KIND, PARTIAL);
    const lines = csv.split('\n');
    assert.equal(lines[0], 'field,value');
    assert.ok(!csv.includes('section,row'), '旧 CSV 表头应零产出');
    assert.ok(csv.includes('还差,时间'));
    assert.ok(csv.includes('金额,-12.50'));
    assert.ok(csv.includes('方向,支出'));
    const text = buildCollectCopyText(WORD, KIND, PARTIAL);
    // CSV值与文本同源：分类/账户一致
    assert.ok(csv.includes('餐饮'));
    assert.ok(csv.includes('支付宝'));
    assert.ok(!csv.endsWith('\n'));
  });
});

describe('t1181 复用1180门：方向/未给/压行/转义同一口径', () => {
  it('方向词走copyDirectionOf同一门', () => {
    assert.equal(copyDirectionOf('expense', -12.5), '支出');
    const csv = buildCollectCopyCsv(WORD, KIND, PARTIAL);
    assert.ok(csv.includes('方向,支出'));
  });
  it('未给统一：空分类走未给，JSON note为null', () => {
    const facts = { category: '', amount: null, time: '', account: '', ledger: '', note: '', currency: '', missing: ['分类'] };
    const text = buildCollectCopyText(WORD, KIND, facts);
    assert.ok(text.split('\n')[1] === '已给 无');
    const j = JSON.parse(buildCollectCopyJson(WORD, KIND, KEY, facts));
    assert.equal(j.data.given.note, null);
  });
  it('备注压行200字：换行压空格并截断', () => {
    const longNote = 'a\n'.repeat(150);
    const facts = { ...PARTIAL, note: longNote, missing: ['时间'] };
    const text = buildCollectCopyText(WORD, KIND, facts);
    assert.ok(!text.includes('\n\n'));
    const j = JSON.parse(buildCollectCopyJson(WORD, KIND, KEY, facts));
    assert.ok(Array.from(j.data.given.note).length <= 200);
  });
  it('CSV RFC4180：含逗号引号换行加引号双写', () => {
    const facts = { ...PARTIAL, note: 'a,"b\nc', missing: ['时间'] };
    const csv = buildCollectCopyCsv(WORD, KIND, facts);
    assert.ok(csv.includes('"a,""b'));
  });
});
